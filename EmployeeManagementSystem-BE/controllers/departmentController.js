const pool = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");
const controller = require("../utils/resourceController")({
    table: "departments",
    fields: ["name", "description", "manager"],
    required: ["name"],
    orderBy: "name ASC"
});

controller.listEmployees = asyncHandler(async (req, res) => {
    const department = await pool.query("SELECT id, name FROM departments WHERE id = $1", [req.params.id]);
    if (!department.rowCount) return res.status(404).json({ success: false, message: "Department not found" });
    const result = await pool.query(
        `SELECT id, employee_code, name, email, department, designation, status
         FROM employees WHERE lower(department) = lower($1) ORDER BY name ASC`,
        [department.rows[0].name]
    );
    res.json({ success: true, employees: result.rows });
});

module.exports = controller;
