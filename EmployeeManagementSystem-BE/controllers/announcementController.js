const pool = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");

const announcementSelection = `
    SELECT a.id, a.title, a.body, a.published_at, a.expires_at, a.created_at,
           a.created_by_user_id, creator.name AS created_by_name,
           COALESCE(array_agg(ar.user_id) FILTER (WHERE ar.user_id IS NOT NULL), '{}') AS recipient_ids,
           COALESCE(array_agg(recipient.name) FILTER (WHERE recipient.name IS NOT NULL), '{}') AS recipient_names
    FROM announcements a
    LEFT JOIN users creator ON creator.id = a.created_by_user_id
    LEFT JOIN announcement_recipients ar ON ar.announcement_id = a.id
    LEFT JOIN users recipient ON recipient.id = ar.user_id`;

const list = asyncHandler(async (req, res) => {
    const result = await pool.query(
        `${announcementSelection}
         WHERE $1 = 'admin'
            OR NOT EXISTS (
                SELECT 1 FROM announcement_recipients existing
                WHERE existing.announcement_id = a.id
            )
            OR ($1 = 'hr' AND EXISTS (
                SELECT 1 FROM announcement_recipients targeted
                WHERE targeted.announcement_id = a.id AND targeted.user_id = $2
            ))
         GROUP BY a.id, creator.name
         ORDER BY a.published_at DESC`,
        [req.user.role, req.user.id]
    );
    res.json({ success: true, data: result.rows });
});

const get = asyncHandler(async (req, res) => {
    const result = await pool.query(
        `${announcementSelection}
         WHERE a.id = $1
           AND ($2 = 'admin'
                OR NOT EXISTS (
                    SELECT 1 FROM announcement_recipients existing
                    WHERE existing.announcement_id = a.id
                )
                OR ($2 = 'hr' AND EXISTS (
                    SELECT 1 FROM announcement_recipients targeted
                    WHERE targeted.announcement_id = a.id AND targeted.user_id = $3
                )))
         GROUP BY a.id, creator.name`,
        [req.params.id, req.user.role, req.user.id]
    );
    if (!result.rowCount) return res.status(404).json({ success: false, message: "Announcement not found" });
    res.json({ success: true, data: result.rows[0] });
});

const parseRecipientIds = (recipientIds) => {
    if (!Array.isArray(recipientIds) || !recipientIds.length) {
        const error = new Error("Choose at least one HR account to receive this announcement");
        error.status = 400;
        throw error;
    }
    const ids = [...new Set(recipientIds.map(Number))];
    if (ids.some((id) => !Number.isSafeInteger(id) || id < 1)) {
        const error = new Error("Choose valid HR accounts");
        error.status = 400;
        throw error;
    }
    return ids;
};

const validateHrRecipients = async (client, recipientIds) => {
    const ids = parseRecipientIds(recipientIds);
    const result = await client.query(
        "SELECT id FROM users WHERE role = 'hr' AND id = ANY($1::bigint[])",
        [ids]
    );
    if (result.rowCount !== ids.length) {
        const error = new Error("Announcements can only be sent to existing HR accounts");
        error.status = 400;
        throw error;
    }
    return ids;
};

const create = asyncHandler(async (req, res) => {
    const title = String(req.body.title || "").trim();
    const body = String(req.body.body || "").trim();
    if (!title || !body) return res.status(400).json({ success: false, message: "Title and announcement are required" });

    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const recipientIds = req.user.role === "admin"
            ? await validateHrRecipients(client, req.body.recipient_ids)
            : [];
        const result = await client.query(
            `INSERT INTO announcements (title, body, published_at, expires_at, created_by_user_id)
             VALUES ($1, $2, COALESCE($3, NOW()), $4, $5)
             RETURNING id, title, body, published_at, expires_at, created_at, created_by_user_id`,
            [title, body, req.body.published_at || null, req.body.expires_at || null, req.user.id]
        );
        if (recipientIds.length) {
            await client.query(
                `INSERT INTO announcement_recipients (announcement_id, user_id)
                 SELECT $1, unnest($2::bigint[])`,
                [result.rows[0].id, recipientIds]
            );
        }
        await client.query("COMMIT");
        res.status(201).json({ success: true, data: { ...result.rows[0], recipient_ids: recipientIds } });
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
});

const update = asyncHandler(async (req, res) => {
    const title = String(req.body.title || "").trim();
    const body = String(req.body.body || "").trim();
    if (!title || !body) return res.status(400).json({ success: false, message: "Title and announcement are required" });

    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const existing = await client.query(
            "SELECT id, created_by_user_id FROM announcements WHERE id = $1 FOR UPDATE",
            [req.params.id]
        );
        if (!existing.rowCount) {
            await client.query("ROLLBACK");
            return res.status(404).json({ success: false, message: "Announcement not found" });
        }
        if (String(existing.rows[0].created_by_user_id) !== String(req.user.id)) {
            await client.query("ROLLBACK");
            return res.status(403).json({ success: false, message: "You can only edit announcements you created" });
        }
        const recipientIds = req.user.role === "admin"
            ? await validateHrRecipients(client, req.body.recipient_ids)
            : [];
        await client.query(
            `UPDATE announcements SET title = $1, body = $2, published_at = COALESCE($3, published_at),
                 expires_at = $4
             WHERE id = $5`,
            [title, body, req.body.published_at || null, req.body.expires_at || null, req.params.id]
        );
        if (req.user.role === "admin") {
            await client.query("DELETE FROM announcement_recipients WHERE announcement_id = $1", [req.params.id]);
            await client.query(
                `INSERT INTO announcement_recipients (announcement_id, user_id)
                 SELECT $1, unnest($2::bigint[])`,
                [req.params.id, recipientIds]
            );
        }
        await client.query("COMMIT");
        res.json({ success: true, message: "Announcement updated" });
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
});

const remove = asyncHandler(async (req, res) => {
    const result = await pool.query(
        "DELETE FROM announcements WHERE id = $1 AND created_by_user_id = $2 RETURNING id",
        [req.params.id, req.user.id]
    );
    if (!result.rowCount) {
        return res.status(404).json({ success: false, message: "Announcement not found or not created by you" });
    }
    res.json({ success: true, message: "Announcement deleted" });
});

module.exports = { list, get, create, update, remove };
