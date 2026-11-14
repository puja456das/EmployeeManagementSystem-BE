const pool = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");
const { getEmployeeIdForUser } = require("../utils/employeeAccount");

const listDocuments = asyncHandler(async (req, res) => {
    const employeeId = req.user.role === "employee" ? await getEmployeeIdForUser(req.user.id) : null;
    if (req.user.role === "employee" && !employeeId) {
        return res.status(404).json({ success: false, message: "Employee account is not linked" });
    }
    const result = req.user.role === "employee"
        ? await pool.query(
            `SELECT d.id, d.employee_id, d.original_name, d.mime_type, d.description, d.created_at,
                    e.name AS employee_name
             FROM documents d JOIN employees e ON e.id = d.employee_id
             WHERE d.employee_id = $1 ORDER BY d.created_at DESC`,
            [employeeId]
        )
        : await pool.query(
            `SELECT d.id, d.employee_id, d.original_name, d.mime_type, d.description, d.created_at,
                    e.name AS employee_name
             FROM documents d JOIN employees e ON e.id = d.employee_id ORDER BY d.created_at DESC`
        );
    res.json({ success: true, data: result.rows });
});

const uploadDocument = asyncHandler(async (req, res) => {
    if (!req.file) return res.status(400).json({ success: false, message: "Choose a file to upload" });
    const description = String(req.body.description || "").trim();
    if (description.length > 500) {
        return res.status(400).json({ success: false, message: "Document description must be 500 characters or fewer" });
    }

    let employeeIds;
    if (req.user.role === "employee") {
        const employeeId = await getEmployeeIdForUser(req.user.id);
        if (!employeeId) return res.status(404).json({ success: false, message: "Employee account is not linked" });
        employeeIds = [employeeId];
    } else {
        if (!description) {
            return res.status(400).json({ success: false, message: "Describe the document before uploading" });
        }
        let recipientIds = req.body.employee_ids;
        if (typeof recipientIds === "string") {
            try {
                recipientIds = JSON.parse(recipientIds);
            } catch {
                recipientIds = [recipientIds];
            }
        }
        if (recipientIds === undefined && req.body.employee_id !== undefined) {
            recipientIds = [req.body.employee_id];
        }
        if (!Array.isArray(recipientIds) || recipientIds.length === 0) {
            return res.status(400).json({ success: false, message: "Choose at least one employee for this document" });
        }
        employeeIds = [...new Set(recipientIds.map(Number))];
        if (employeeIds.some((id) => !Number.isSafeInteger(id) || id < 1)) {
            return res.status(400).json({ success: false, message: "Choose valid employee profiles" });
        }
        const employees = await pool.query(
            "SELECT id FROM employees WHERE id = ANY($1::bigint[])",
            [employeeIds]
        );
        if (employees.rowCount !== employeeIds.length) {
            return res.status(400).json({ success: false, message: "One or more selected employees do not exist" });
        }
    }

    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const result = await client.query(
            `INSERT INTO documents (employee_id, original_name, mime_type, file_data, description)
             SELECT recipient.employee_id, $2, $3, $4, $5
             FROM unnest($1::bigint[]) AS recipient(employee_id)
             RETURNING id, employee_id, original_name, mime_type, description, created_at`,
            [employeeIds, req.file.originalname, req.file.mimetype, req.file.buffer, description || null]
        );
        await client.query("COMMIT");
        res.status(201).json({ success: true, data: result.rows, count: result.rowCount });
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
});

const getDocument = asyncHandler(async (req, res) => {
    const employeeId = req.user.role === "employee" ? await getEmployeeIdForUser(req.user.id) : null;
    const result = await pool.query(
        `SELECT d.id, d.employee_id, d.original_name, d.mime_type, d.description, d.created_at,
                e.name AS employee_name
         FROM documents d JOIN employees e ON e.id = d.employee_id
         WHERE d.id = $1 AND ($2 <> 'employee' OR e.id = $3)`,
        [req.params.id, req.user.role, employeeId]
    );
    if (!result.rowCount) return res.status(404).json({ success: false, message: "Document not found" });
    res.json({ success: true, data: result.rows[0] });
});

const downloadDocument = asyncHandler(async (req, res) => {
    const employeeId = req.user.role === "employee" ? await getEmployeeIdForUser(req.user.id) : null;
    const result = await pool.query(
        `SELECT d.original_name, d.mime_type, d.file_data, e.id AS employee_id
         FROM documents d JOIN employees e ON e.id = d.employee_id WHERE d.id = $1`,
        [req.params.id]
    );
    const document = result.rows[0];
    if (!document || (req.user.role === "employee" && Number(document.employee_id) !== employeeId)) {
        return res.status(404).json({ success: false, message: "Document not found" });
    }
    res.type(document.mime_type);
    res.attachment(document.original_name);
    res.send(document.file_data);
});

const deleteDocument = asyncHandler(async (req, res) => {
    const employeeId = req.user.role === "employee" ? await getEmployeeIdForUser(req.user.id) : null;
    const result = req.user.role === "employee"
        ? await pool.query(
            `DELETE FROM documents d USING employees e
             WHERE d.employee_id = e.id AND e.id = $1 AND d.id = $2 RETURNING d.id`,
            [employeeId, req.params.id]
        )
        : await pool.query("DELETE FROM documents WHERE id = $1 RETURNING id", [req.params.id]);
    if (!result.rowCount) return res.status(404).json({ success: false, message: "Document not found" });
    res.json({ success: true, message: "Document deleted successfully" });
});

module.exports = { listDocuments, getDocument, uploadDocument, downloadDocument, deleteDocument };
