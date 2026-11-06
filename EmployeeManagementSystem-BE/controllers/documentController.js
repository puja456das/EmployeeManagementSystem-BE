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
            `SELECT d.id, d.employee_id, d.original_name, d.mime_type, d.created_at, e.name AS employee_name
             FROM documents d JOIN employees e ON e.id = d.employee_id
             WHERE d.employee_id = $1 ORDER BY d.created_at DESC`,
            [employeeId]
        )
        : await pool.query(
            `SELECT d.id, d.employee_id, d.original_name, d.mime_type, d.created_at, e.name AS employee_name
             FROM documents d JOIN employees e ON e.id = d.employee_id ORDER BY d.created_at DESC`
        );
    res.json({ success: true, data: result.rows });
});

const uploadDocument = asyncHandler(async (req, res) => {
    if (!req.file) return res.status(400).json({ success: false, message: "Choose a file to upload" });
    const employeeId = req.user.role === "employee"
        ? await getEmployeeIdForUser(req.user.id)
        : Number(req.body.employee_id);
    const employee = Number.isSafeInteger(employeeId) && employeeId > 0
        ? await pool.query("SELECT id FROM employees WHERE id = $1", [employeeId])
        : { rows: [], rowCount: 0 };
    if (!employee.rowCount) return res.status(400).json({ success: false, message: "Employee account is not linked" });
    const result = await pool.query(
        `INSERT INTO documents (employee_id, original_name, mime_type, file_data)
         VALUES ($1, $2, $3, $4)
         RETURNING id, employee_id, original_name, mime_type, created_at`,
        [employee.rows[0].id, req.file.originalname, req.file.mimetype, req.file.buffer]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
});

const getDocument = asyncHandler(async (req, res) => {
    const employeeId = req.user.role === "employee" ? await getEmployeeIdForUser(req.user.id) : null;
    const result = await pool.query(
        `SELECT d.id, d.employee_id, d.original_name, d.mime_type, d.created_at, e.name AS employee_name
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
