const pool = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");
const { getEmployeeIdForUser } = require("../utils/employeeAccount");
const validDate = (value) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(new Date(`${value}T00:00:00.000Z`).getTime()) &&
    new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value;
const money = (value) => value !== "" && value !== null && value !== undefined &&
    Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= 9999999999.99 &&
    Math.abs(Math.round(Number(value) * 100) - Number(value) * 100) < 1e-7;
const validatePayroll = (body, partial = false) => {
    const fields = ["gross_salary", "deductions", "net_salary"];
    for (const field of fields) {
        if ((partial || body[field] !== undefined) && !money(body[field])) return `${field.replaceAll("_", " ")} must be a non-negative amount with at most two decimal places`;
    }
    if ((!partial || body.pay_period !== undefined) && !validDate(body.pay_period)) return "Pay period must be a valid date";
    if (body.gross_salary !== undefined && body.deductions !== undefined && body.net_salary !== undefined &&
        Math.round(Number(body.gross_salary) * 100) - Math.round(Number(body.deductions) * 100) !== Math.round(Number(body.net_salary) * 100)) {
        return "Net salary must equal gross salary minus deductions";
    }
    if (body.deductions !== undefined && body.gross_salary !== undefined && Number(body.deductions) > Number(body.gross_salary)) return "Deductions cannot exceed gross salary";
    return null;
};

const create = asyncHandler(async (req, res) => {
    const employeeId = Number(req.body.employee_id);
    if (!Number.isSafeInteger(employeeId) || employeeId < 1) return res.status(400).json({ success: false, message: "Choose a valid employee" });
    if (req.body.gross_salary === undefined || req.body.net_salary === undefined) return res.status(400).json({ success: false, message: "Gross salary and net salary are required" });
    const payrollInput = { ...req.body, deductions: req.body.deductions ?? 0 };
    const error = validatePayroll(payrollInput);
    if (error) return res.status(400).json({ success: false, message: error });
    const employee = await pool.query("SELECT id FROM employees WHERE id = $1", [employeeId]);
    if (!employee.rowCount) return res.status(404).json({ success: false, message: "Employee not found" });
    try {
        const result = await pool.query(
            `INSERT INTO payroll (employee_id, pay_period, gross_salary, deductions, net_salary)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [employeeId, `${req.body.pay_period.slice(0, 7)}-01`, req.body.gross_salary, req.body.deductions ?? 0, req.body.net_salary]
        );
        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        if (error.code === "23505") return res.status(409).json({ success: false, message: "Payroll already exists for this employee and pay period" });
        throw error;
    }
});

const update = asyncHandler(async (req, res) => {
    const allowed = ["pay_period", "gross_salary", "deductions", "net_salary"];
    const fields = Object.keys(req.body).filter((field) => allowed.includes(field));
    if (!fields.length) return res.status(400).json({ success: false, message: "No editable payroll fields provided" });
    const currentResult = await pool.query("SELECT * FROM payroll WHERE id = $1", [req.params.id]);
    if (!currentResult.rowCount) return res.status(404).json({ success: false, message: "Payroll record not found" });
    if (currentResult.rows[0].status === "paid") return res.status(409).json({ success: false, message: "Paid payroll records cannot be edited" });
    const next = { ...currentResult.rows[0], ...req.body };
    if (req.body.pay_period) next.pay_period = `${req.body.pay_period.slice(0, 7)}-01`;
    const error = validatePayroll(next);
    if (error) return res.status(400).json({ success: false, message: error });
    const values = fields.map((field) => next[field]);
    const assignments = fields.map((field, index) => `${field} = $${index + 1}`).join(", ");
    values.push(req.params.id);
    try {
        const result = await pool.query(`UPDATE payroll SET ${assignments} WHERE id = $${values.length} AND status <> 'paid' RETURNING *`, values);
        if (!result.rowCount) return res.status(409).json({ success: false, message: "Payroll was paid or removed; reload and try again" });
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        if (error.code === "23505") return res.status(409).json({ success: false, message: "Payroll already exists for this employee and pay period" });
        throw error;
    }
});

const remove = asyncHandler(async (req, res) => {
    const result = await pool.query("DELETE FROM payroll WHERE id = $1 AND status <> 'paid' RETURNING id", [req.params.id]);
    if (!result.rowCount) return res.status(409).json({ success: false, message: "Payroll record was not found or has already been paid" });
    res.json({ success: true, message: "Payroll record deleted successfully" });
});

const get = asyncHandler(async (req, res) => {
    const result = await pool.query("SELECT * FROM payroll WHERE id = $1", [req.params.id]);
    if (!result.rowCount) return res.status(404).json({ success: false, message: "Payroll record not found" });
    res.json({ success: true, data: result.rows[0] });
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
    if (!Number.isSafeInteger(Number(req.params.employeeId)) || Number(req.params.employeeId) < 1) return res.status(400).json({ success: false, message: "Choose a valid employee" });
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
    if (req.body.payment_date && !validDate(req.body.payment_date)) return res.status(400).json({ success: false, message: "Payment date must be a valid date" });
    const result = await pool.query(
        `UPDATE payroll SET status = 'paid', payment_date = COALESCE($1::date, CURRENT_DATE)
         WHERE id = $2 AND status = 'pending' RETURNING *`,
        [req.body.payment_date || null, req.params.id]
    );
    if (!result.rowCount) return res.status(409).json({ success: false, message: "Payroll record was not found or is already paid" });
    res.json({ success: true, data: result.rows[0] });
});

module.exports = {
    create,
    get,
    update,
    remove,
    listPayroll,
    getPayrollSummary,
    getEmployeePayroll,
    getPayslip,
    markPayrollPaid
};
