const pool = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");
const { getEmployeeIdForUser } = require("../utils/employeeAccount");
const crud = require("../utils/resourceController")({
    table: "payroll",
    fields: ["employee_id", "pay_period", "gross_salary", "deductions", "net_salary", "payment_date", "status"],
    required: ["employee_id", "pay_period", "gross_salary", "net_salary"]
});

const listPayroll = asyncHandler(async (req, res) => {
    const employeeId = req.user.role === "employee" ? await getEmployeeIdForUser(req.user.id) : null;
    if (req.user.role === "employee" && !employeeId) {
        return res.status(404).json({ success: false, message: "Employee account is not linked" });
    }
    const result = req.user.role === "employee"
        ? await pool.query(
            `SELECT p.*, e.name AS employee_name FROM payroll p JOIN employees e ON e.id = p.employee_id
             WHERE p.employee_id = $1 ORDER BY p.pay_period DESC`,
            [employeeId]
        )
        : await pool.query(
            `SELECT p.*, e.name AS employee_name FROM payroll p JOIN employees e ON e.id = p.employee_id
             ORDER BY p.pay_period DESC`
        );
    res.json({ success: true, data: result.rows });
});

const getPayrollSummary = asyncHandler(async (req, res) => {
    const employeeId = req.user.role === "employee" ? await getEmployeeIdForUser(req.user.id) : null;
    if (req.user.role === "employee" && !employeeId) {
        return res.status(404).json({ success: false, message: "Employee account is not linked" });
    }
    const result = await pool.query(
        `SELECT COUNT(*)::int AS pay_periods,
                COALESCE(SUM(gross_salary), 0)::numeric AS gross_total,
                COALESCE(SUM(deductions), 0)::numeric AS deductions_total,
                COALESCE(SUM(net_salary), 0)::numeric AS net_total,
                COUNT(*) FILTER (WHERE status = 'paid')::int AS paid_periods
         FROM payroll WHERE ($1::bigint IS NULL OR employee_id = $1)`,
        [employeeId]
    );
    res.json({ success: true, data: result.rows[0] });
});

const getEmployeePayroll = asyncHandler(async (req, res) => {
    const result = await pool.query(
        `SELECT p.*, e.name AS employee_name FROM payroll p
         JOIN employees e ON e.id = p.employee_id
         WHERE p.employee_id = $1 ORDER BY p.pay_period DESC`,
        [req.params.employeeId]
    );
    res.json({ success: true, data: result.rows });
});

const getPayslip = asyncHandler(async (req, res) => {
    const employeeId = req.user.role === "employee" ? await getEmployeeIdForUser(req.user.id) : null;
    const result = await pool.query(
        `SELECT p.*, e.name AS employee_name, e.employee_code,
                COALESCE(d.name, e.department) AS department, e.designation
         FROM payroll p JOIN employees e ON e.id = p.employee_id
         LEFT JOIN departments d ON d.id = e.department_id
         WHERE p.id = $1 AND ($2 <> 'employee' OR e.id = $3)`,
        [req.params.id, req.user.role, employeeId]
    );
    if (!result.rowCount) return res.status(404).json({ success: false, message: "Payslip not found" });
    res.json({ success: true, payslip: result.rows[0] });
});

const markPayrollPaid = asyncHandler(async (req, res) => {
    const result = await pool.query(
        `UPDATE payroll SET status = 'paid', payment_date = COALESCE($1::date, CURRENT_DATE)
         WHERE id = $2 RETURNING *`,
        [req.body.payment_date || null, req.params.id]
    );
    if (!result.rowCount) return res.status(404).json({ success: false, message: "Payroll record not found" });
    res.json({ success: true, data: result.rows[0] });
});

module.exports = {
    ...crud,
    listPayroll,
    getPayrollSummary,
    getEmployeePayroll,
    getPayslip,
    markPayrollPaid
};
