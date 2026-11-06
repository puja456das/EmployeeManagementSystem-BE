const pool = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");

const getDashboard = asyncHandler(async (req, res) => {
    const [employees, totalEmployees, departments, pendingLeaves, presentToday, payroll] = await Promise.all([
        pool.query("SELECT COUNT(*)::int AS count FROM employees WHERE status = 'Active'"),
        pool.query("SELECT COUNT(*)::int AS count FROM employees"),
        pool.query("SELECT COUNT(*)::int AS count FROM departments"),
        pool.query("SELECT COUNT(*)::int AS count FROM leaves WHERE status = 'pending'"),
        pool.query("SELECT COUNT(*)::int AS count FROM attendance WHERE work_date = CURRENT_DATE"),
        pool.query(
            `SELECT COALESCE(SUM(net_salary), 0)::numeric AS total FROM payroll
             WHERE date_trunc('month', pay_period) = date_trunc('month', CURRENT_DATE)`
        )
    ]);
    res.json({
        success: true,
        data: {
            activeEmployees: employees.rows[0].count,
            totalEmployees: totalEmployees.rows[0].count,
            departments: departments.rows[0].count,
            pendingLeaves: pendingLeaves.rows[0].count,
            presentToday: presentToday.rows[0].count,
            monthlyPayroll: payroll.rows[0].total
        }
    });
});

const getAttendanceOverview = asyncHandler(async (req, res) => {
    const result = await pool.query(
        `SELECT work_date, status, COUNT(*)::int AS employee_count
         FROM attendance WHERE work_date >= CURRENT_DATE - INTERVAL '30 days'
         GROUP BY work_date, status ORDER BY work_date DESC`
    );
    res.json({ success: true, data: result.rows });
});

const getLeaveOverview = asyncHandler(async (req, res) => {
    const result = await pool.query(
        `SELECT status, COUNT(*)::int AS request_count
         FROM leaves WHERE created_at >= NOW() - INTERVAL '12 months'
         GROUP BY status ORDER BY status`
    );
    res.json({ success: true, data: result.rows });
});

const getPayrollOverview = asyncHandler(async (req, res) => {
    const result = await pool.query(
        `SELECT date_trunc('month', pay_period)::date AS month,
                SUM(gross_salary)::numeric AS gross_total,
                SUM(deductions)::numeric AS deductions_total,
                SUM(net_salary)::numeric AS net_total
         FROM payroll
         WHERE pay_period >= date_trunc('month', CURRENT_DATE) - INTERVAL '11 months'
         GROUP BY date_trunc('month', pay_period)
         ORDER BY month`
    );
    res.json({ success: true, data: result.rows });
});

const getEmployeeOverview = asyncHandler(async (req, res) => {
    const result = await pool.query(
        `SELECT COALESCE(d.name, e.department, 'Unassigned') AS department,
                COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE e.status = 'Active')::int AS active
         FROM employees e
         LEFT JOIN departments d ON d.id = e.department_id
         GROUP BY COALESCE(d.name, e.department, 'Unassigned')
         ORDER BY department`
    );
    res.json({ success: true, data: result.rows });
});

module.exports = {
    getDashboard,
    getAttendanceOverview,
    getLeaveOverview,
    getPayrollOverview,
    getEmployeeOverview
};
