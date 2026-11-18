const pool = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");
const categories = ["it", "support", "maintenance"];
// One employee queue serves every team. Departments describe a request, but do
// not create separate inboxes or dashboards. HR and Admin can monitor the full queue.
const getScope = (user) => {
    if (["admin", "hr", "employee"].includes(user.role)) return { clause: "TRUE", values: [] };
    return { clause: "FALSE", values: [] };
};

const listRequests = asyncHandler(async (req, res) => {
    const scope = await getScope(req.user);
    const result = await pool.query(
        `SELECT r.*, requester.name AS requester_name, requester.email AS requester_email,
                assignee.name AS assignee_name
         FROM service_requests r
         JOIN users requester ON requester.id = r.requester_user_id
         LEFT JOIN users assignee ON assignee.id = r.assigned_to_user_id
         WHERE ${scope.clause}
         ORDER BY CASE r.status WHEN 'open' THEN 0 WHEN 'in_progress' THEN 1 ELSE 2 END,
                  CASE r.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END,
                  r.created_at DESC`,
        scope.values
    );
    res.json({ success: true, data: result.rows });
});

const getSummary = asyncHandler(async (req, res) => {
    const scope = await getScope(req.user);
    const result = await pool.query(
        `SELECT status, COUNT(*)::int AS count
         FROM service_requests r WHERE ${scope.clause} GROUP BY status`,
        scope.values
    );
    const counts = { open: 0, in_progress: 0, resolved: 0, closed: 0 };
    result.rows.forEach((row) => { counts[row.status] = row.count; });
    res.json({ success: true, data: { counts, total: Object.values(counts).reduce((sum, value) => sum + value, 0) } });
});

const createRequest = asyncHandler(async (req, res) => {
    if (!['hr', 'employee'].includes(req.user.role)) {
        return res.status(403).json({ success: false, message: "Service requests can be submitted by HR and employee accounts." });
    }
    const category = String(req.body.category || "").toLowerCase();
    const title = String(req.body.title || "").trim();
    const description = String(req.body.description || "").trim();
    const priority = String(req.body.priority || "normal").toLowerCase();
    if (!categories.includes(category)) return res.status(400).json({ success: false, message: "Choose IT, Support, or Maintenance." });
    if (title.length < 4 || title.length > 180 || description.length < 10 || description.length > 5000) return res.status(400).json({ success: false, message: "Enter a request title (4–180 characters) and details (10–5,000 characters)." });
    if (!["low", "normal", "high", "urgent"].includes(priority)) return res.status(400).json({ success: false, message: "Choose a valid priority." });
    const result = await pool.query(
        `INSERT INTO service_requests (requester_user_id, category, title, description, priority)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [req.user.id, category, title, description, priority]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
});

const updateRequest = asyncHandler(async (req, res) => {
    if (req.user.role !== "employee") {
        return res.status(403).json({ success: false, message: "Only employees can process service requests. HR and Admin have view access." });
    }
    const status = String(req.body.status || "").toLowerCase();
    if (!["open", "in_progress", "resolved", "closed"].includes(status)) {
        return res.status(400).json({ success: false, message: "Choose a valid request status." });
    }
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const current = await client.query(
            `SELECT * FROM service_requests WHERE id = $1 FOR UPDATE`,
            [req.params.id]
        );
        if (!current.rowCount) {
            await client.query("ROLLBACK");
            return res.status(404).json({ success: false, message: "Request not found in the employee queue." });
        }
        const allowedNext = { open: ["in_progress"], in_progress: ["resolved"], resolved: ["closed"], closed: [] };
        if (!allowedNext[current.rows[0].status].includes(status)) {
            await client.query("ROLLBACK");
            return res.status(409).json({ success: false, message: `Cannot move a ${current.rows[0].status.replaceAll("_", " ")} request to ${status.replaceAll("_", " ")}. Follow the request workflow.` });
        }
        const result = await client.query(
            `UPDATE service_requests
             SET status = $1,
                 assigned_to_user_id = CASE WHEN $1 = 'in_progress' THEN COALESCE(assigned_to_user_id, $2) ELSE assigned_to_user_id END,
                 resolved_at = CASE WHEN $1 = 'resolved' THEN NOW() WHEN $1 = 'closed' THEN resolved_at ELSE NULL END,
                 updated_at = NOW()
             WHERE id = $3 RETURNING *`,
            [status, req.user.id, req.params.id]
        );
        await client.query("COMMIT");
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
});

module.exports = { listRequests, getSummary, createRequest, updateRequest };
