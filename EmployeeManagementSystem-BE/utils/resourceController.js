const pool = require("../config/db");
const asyncHandler = require("./asyncHandler");

module.exports = ({ table, fields, required = [], orderBy = "id DESC" }) => {
    const allowedFields = new Set(fields);

    return {
        list: asyncHandler(async (req, res) => {
            const result = await pool.query(`SELECT * FROM ${table} ORDER BY ${orderBy}`);
            res.json({ success: true, data: result.rows });
        }),
        get: asyncHandler(async (req, res) => {
            const result = await pool.query(`SELECT * FROM ${table} WHERE id = $1`, [req.params.id]);
            if (!result.rowCount) return res.status(404).json({ success: false, message: "Record not found" });
            res.json({ success: true, data: result.rows[0] });
        }),
        create: asyncHandler(async (req, res) => {
            const missing = required.filter((field) => req.body[field] === undefined || req.body[field] === "");
            if (missing.length) {
                return res.status(400).json({ success: false, message: `Required fields: ${missing.join(", ")}` });
            }
            const names = Object.keys(req.body).filter((field) => allowedFields.has(field));
            if (!names.length) return res.status(400).json({ success: false, message: "No valid fields provided" });
            const values = names.map((field) => req.body[field]);
            const placeholders = values.map((_, index) => `$${index + 1}`).join(", ");
            const result = await pool.query(
                `INSERT INTO ${table} (${names.join(", ")}) VALUES (${placeholders}) RETURNING *`,
                values
            );
            res.status(201).json({ success: true, data: result.rows[0] });
        }),
        update: asyncHandler(async (req, res) => {
            const names = Object.keys(req.body).filter((field) => allowedFields.has(field));
            if (!names.length) return res.status(400).json({ success: false, message: "No valid fields provided" });
            const values = names.map((field) => req.body[field]);
            const assignments = names.map((field, index) => `${field} = $${index + 1}`).join(", ");
            values.push(req.params.id);
            const result = await pool.query(
                `UPDATE ${table} SET ${assignments} WHERE id = $${values.length} RETURNING *`,
                values
            );
            if (!result.rowCount) return res.status(404).json({ success: false, message: "Record not found" });
            res.json({ success: true, data: result.rows[0] });
        }),
        remove: asyncHandler(async (req, res) => {
            const result = await pool.query(`DELETE FROM ${table} WHERE id = $1 RETURNING id`, [req.params.id]);
            if (!result.rowCount) return res.status(404).json({ success: false, message: "Record not found" });
            res.json({ success: true, message: "Record deleted successfully" });
        })
    };
};
