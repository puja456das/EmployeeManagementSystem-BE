const pool = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");
const controller = require("../utils/resourceController")({
    table: "departments",
    fields: ["name", "description", "manager"],
    required: ["name"],
    orderBy: "name ASC"
});

controller.list = asyncHandler(async (req, res) => {
    const result = await pool.query(
        `SELECT d.id, d.name, d.description, d.manager, d.created_at,
                COUNT(e.id)::int AS employee_count
         FROM departments d
        LEFT JOIN employees e ON e.department_id = d.id
         GROUP BY d.id
         ORDER BY d.name ASC`
    );
    res.json({ success: true, departments: result.rows });
});

controller.listEmployees = asyncHandler(async (req, res) => {
    const department = await pool.query("SELECT id, name FROM departments WHERE id = $1", [req.params.id]);
    if (!department.rowCount) return res.status(404).json({ success: false, message: "Department not found" });
    const result = await pool.query(
        `SELECT id, employee_code, name, email, department, designation, status
         FROM employees WHERE department_id = $1 ORDER BY name ASC`,
        [department.rows[0].id]
    );
    res.json({ success: true, employees: result.rows });
});

controller.update = asyncHandler(async (req, res) => {
    const fields = ["name", "description", "manager"].filter((field) => Object.hasOwn(req.body || {}, field));
    if (!fields.length) return res.status(400).json({ success: false, message: "No valid fields provided" });
    if (fields.includes("name") && !String(req.body.name || "").trim()) {
        return res.status(400).json({ success: false, message: "Department name is required" });
    }

    const values = fields.map((field) => field === "name" ? req.body[field].trim() : req.body[field]);
    const assignments = fields.map((field, index) => `${field} = $${index + 1}`).join(", ");
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        values.push(req.params.id);
        const result = await client.query(
            `UPDATE departments SET ${assignments} WHERE id = $${values.length} RETURNING *`,
            values
        );
        if (!result.rowCount) {
            await client.query("ROLLBACK");
            return res.status(404).json({ success: false, message: "Department not found" });
        }
        if (fields.includes("name")) {
            await client.query(
                "UPDATE employees SET department = $1 WHERE department_id = $2",
                [result.rows[0].name, result.rows[0].id]
            );
        }
        await client.query("COMMIT");
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
});

controller.remove = asyncHandler(async (req, res) => {
    try {
        const result = await pool.query(
            "DELETE FROM departments WHERE id = $1 RETURNING id",
            [req.params.id]
        );
        if (!result.rowCount) return res.status(404).json({ success: false, message: "Department not found" });
        res.json({ success: true, message: "Record deleted successfully" });
    } catch (error) {
        if (error.code === "23503") {
            return res.status(409).json({
                success: false,
                message: "This department still has employees. Move them to another department before deleting it."
            });
        }
        throw error;
    }
});

module.exports = controller;
