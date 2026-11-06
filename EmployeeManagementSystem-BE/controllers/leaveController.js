const pool = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");
const { getEmployeeIdForUser } = require("../utils/employeeAccount");

const leaveDayCount = (startDate, endDate) => {
    const dateKey = (value) => value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
    const start = new Date(`${dateKey(startDate)}T00:00:00Z`);
    const end = new Date(`${dateKey(endDate)}T00:00:00Z`);
    return Math.floor((end - start) / 86400000) + 1;
};

const getBalance = async (employeeId, year = new Date().getFullYear(), db = pool) => {
    const result = await db.query(
        `SELECT e.id AS employee_id, e.employee_code, e.name AS employee_name,
                e.annual_paid_leave_days AS allocated_days,
                COALESCE(SUM(
                    GREATEST(0, LEAST(l.end_date, make_date($2::int + 1, 1, 1) - 1)
                        - GREATEST(l.start_date, make_date($2::int, 1, 1)) + 1)
                ) FILTER (WHERE l.status = 'approved'), 0)::int AS approved_days_used
         FROM employees e
         LEFT JOIN leaves l ON l.employee_id = e.id
             AND l.status = 'approved'
             AND l.start_date < make_date($2::int + 1, 1, 1)
             AND l.end_date >= make_date($2::int, 1, 1)
         WHERE e.id = $1
         GROUP BY e.id`,
        [employeeId, year]
    );
    if (!result.rowCount) return null;
    const balance = result.rows[0];
    return {
        ...balance,
        year,
        remaining_days: Math.max(0, Number(balance.allocated_days) - Number(balance.approved_days_used))
    };
};

const getLeaves = asyncHandler(async (req, res) => {
    const employeeId = req.user.role === "employee" ? await getEmployeeIdForUser(req.user.id) : null;
    if (req.user.role === "employee" && !employeeId) {
        return res.status(404).json({ success: false, message: "Employee account is not linked" });
    }
    const result = req.user.role === "employee"
        ? await pool.query(
            `SELECT l.*, e.name AS employee_name, e.employee_code,
                    (l.end_date - l.start_date + 1)::int AS requested_days
             FROM leaves l JOIN employees e ON e.id = l.employee_id
             WHERE l.employee_id = $1 ORDER BY l.created_at DESC`,
            [employeeId]
        )
        : await pool.query(
            `SELECT l.*, e.name AS employee_name, e.employee_code,
                    (l.end_date - l.start_date + 1)::int AS requested_days
             FROM leaves l JOIN employees e ON e.id = l.employee_id
             ORDER BY l.created_at DESC`
        );
    res.json({ success: true, data: result.rows });
});

const getLeave = asyncHandler(async (req, res) => {
    const employeeId = req.user.role === "employee" ? await getEmployeeIdForUser(req.user.id) : null;
    if (req.user.role === "employee" && !employeeId) {
        return res.status(404).json({ success: false, message: "Employee account is not linked" });
    }
    const result = await pool.query(
        `SELECT l.*, e.name AS employee_name FROM leaves l
         JOIN employees e ON e.id = l.employee_id
         WHERE l.id = $1 AND ($2::bigint IS NULL OR e.id = $2)`,
        [req.params.id, employeeId]
    );
    if (!result.rowCount) return res.status(404).json({ success: false, message: "Leave request not found" });
    res.json({ success: true, data: result.rows[0] });
});

const updateLeave = asyncHandler(async (req, res) => {
    const employeeId = req.user.role === "employee" ? await getEmployeeIdForUser(req.user.id) : null;
    if (req.user.role === "employee" && !employeeId) {
        return res.status(404).json({ success: false, message: "Employee account is not linked" });
    }
    const { start_date, end_date, reason } = req.body;
    if (start_date && Number.isNaN(Date.parse(start_date))) {
        return res.status(400).json({ success: false, message: "Invalid start date" });
    }
    if (end_date && Number.isNaN(Date.parse(end_date))) {
        return res.status(400).json({ success: false, message: "Invalid end date" });
    }
    if (reason !== undefined && !reason.trim()) {
        return res.status(400).json({ success: false, message: "Reason cannot be empty" });
    }
    const fields = Object.keys(req.body).filter((field) => ["start_date", "end_date", "reason"].includes(field));
    if (!fields.length) return res.status(400).json({ success: false, message: "No valid leave fields provided" });
    const current = await pool.query(
        `SELECT l.start_date, l.end_date FROM leaves l
         WHERE l.id = $1 AND l.status = 'pending'
           AND ($2::bigint IS NULL OR l.employee_id = $2)`,
        [req.params.id, employeeId]
    );
    if (!current.rowCount) return res.status(404).json({ success: false, message: "Pending leave request not found" });
    const nextStartDate = req.body.start_date || current.rows[0].start_date;
    const nextEndDate = req.body.end_date || current.rows[0].end_date;
    if (new Date(nextEndDate) < new Date(nextStartDate)) {
        return res.status(400).json({ success: false, message: "End date cannot be before start date" });
    }
    const values = fields.map((field) => field === "reason" ? reason.trim() : req.body[field]);
    const assignments = fields.map((field, index) => `${field} = $${index + 1}`).join(", ");
    values.push(req.params.id, employeeId);
    const result = await pool.query(
        `UPDATE leaves SET ${assignments}
         WHERE id = $${fields.length + 1} AND status = 'pending'
           AND ($${fields.length + 2}::bigint IS NULL OR employee_id = $${fields.length + 2})
         RETURNING *`,
        values
    );
    if (!result.rowCount) return res.status(404).json({ success: false, message: "Pending leave request not found" });
    res.json({ success: true, data: result.rows[0] });
});

const cancelLeave = asyncHandler(async (req, res) => {
    const employeeId = req.user.role === "employee" ? await getEmployeeIdForUser(req.user.id) : null;
    if (req.user.role === "employee" && !employeeId) {
        return res.status(404).json({ success: false, message: "Employee account is not linked" });
    }
    const result = await pool.query(
        `UPDATE leaves SET status = 'cancelled'
         WHERE id = $1 AND status = 'pending'
           AND ($2::bigint IS NULL OR employee_id = $2)
         RETURNING *`,
        [req.params.id, employeeId]
    );
    if (!result.rowCount) return res.status(404).json({ success: false, message: "Pending leave request not found" });
    res.json({ success: true, data: result.rows[0] });
});

const getMyLeaveBalance = asyncHandler(async (req, res) => {
    const employeeId = await getEmployeeIdForUser(req.user.id);
    if (!employeeId) return res.status(404).json({ success: false, message: "Employee account is not linked" });
    const balance = await getBalance(employeeId);
    res.json({ success: true, data: balance });
});

const getLeaveBalances = asyncHandler(async (req, res) => {
    const year = Number(req.query.year || new Date().getFullYear());
    if (!Number.isInteger(year) || year < 2000 || year > 9998) {
        return res.status(400).json({ success: false, message: "Provide a valid calendar year" });
    }
    const employees = await pool.query("SELECT id FROM employees ORDER BY name");
    const balances = await Promise.all(employees.rows.map(({ id }) => getBalance(id, year)));
    res.json({ success: true, data: balances });
});

const requestLeave = asyncHandler(async (req, res) => {
    const { start_date, end_date, reason } = req.body;
    if (!start_date || !end_date || !reason?.trim()) {
        return res.status(400).json({ success: false, message: "Start date, end date, and reason are required" });
    }
    if (Number.isNaN(Date.parse(start_date)) || Number.isNaN(Date.parse(end_date)) ||
        new Date(end_date) < new Date(start_date)) {
        return res.status(400).json({ success: false, message: "Provide valid dates and ensure end date is not before start date" });
    }
    const employeeId = req.user.role === "employee"
        ? await getEmployeeIdForUser(req.user.id)
        : Number(req.body.employee_id);
    if (!Number.isSafeInteger(employeeId) || employeeId < 1) {
        return res.status(400).json({ success: false, message: req.user.role === "employee"
            ? "Employee account is not linked"
            : "Choose a valid employee" });
    }
    const employee = await pool.query("SELECT id FROM employees WHERE id = $1", [employeeId]);
    if (!employee.rowCount) return res.status(400).json({ success: false, message: "Employee not found" });
    const result = await pool.query(
        `INSERT INTO leaves (employee_id, start_date, end_date, reason)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [employeeId, start_date, end_date, reason.trim()]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
});

const reviewLeave = asyncHandler(async (req, res) => {
    const { status } = req.body;
    if (!["approved", "rejected"].includes(status)) {
        return res.status(400).json({ success: false, message: "Status must be approved or rejected" });
    }
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const request = await client.query(
            `SELECT l.*, e.annual_paid_leave_days
             FROM leaves l JOIN employees e ON e.id = l.employee_id
             WHERE l.id = $1 AND l.status = 'pending'
             FOR UPDATE OF l, e`,
            [req.params.id]
        );
        if (!request.rowCount) {
            await client.query("ROLLBACK");
            return res.status(404).json({ success: false, message: "Pending leave request not found" });
        }
        const leave = request.rows[0];
        if (status === "approved") {
            const dateKey = (value) => value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
            const leaveStart = dateKey(leave.start_date);
            const leaveEnd = dateKey(leave.end_date);
            const startYear = new Date(`${leaveStart}T00:00:00Z`).getUTCFullYear();
            const endYear = new Date(`${leaveEnd}T00:00:00Z`).getUTCFullYear();
            const allowance = Number(leave.annual_paid_leave_days);
            for (let year = startYear; year <= endYear; year += 1) {
                const yearStart = `${year}-01-01`;
                const yearEnd = `${year}-12-31`;
                const requestedDays = leaveDayCount(
                    leaveStart > yearStart ? leaveStart : yearStart,
                    leaveEnd < yearEnd ? leaveEnd : yearEnd
                );
                const balance = await getBalance(leave.employee_id, year, client);
                if (requestedDays > Number(balance.remaining_days)) {
                    await client.query("ROLLBACK");
                    return res.status(400).json({
                        success: false,
                        message: `Cannot approve: this request needs ${requestedDays} paid leave day(s) in ${year}, but only ${balance.remaining_days} remain`
                    });
                }
                if (allowance === 0) {
                    await client.query("ROLLBACK");
                    return res.status(400).json({ success: false, message: `This employee has no paid leave allowance for ${year}` });
                }
            }
        }
        const result = await client.query(
            `UPDATE leaves SET status = $1, reviewed_by = $2, reviewed_at = NOW()
             WHERE id = $3 AND status = 'pending' RETURNING *`,
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

const deleteLeave = asyncHandler(async (req, res) => {
    const employeeId = req.user.role === "employee" ? await getEmployeeIdForUser(req.user.id) : null;
    if (req.user.role === "employee" && !employeeId) {
        return res.status(404).json({ success: false, message: "Employee account is not linked" });
    }
    const result = req.user.role === "employee"
        ? await pool.query(
            `DELETE FROM leaves WHERE employee_id = $1 AND id = $2
             AND status = 'pending' RETURNING id`,
            [employeeId, req.params.id]
        )
        : await pool.query("DELETE FROM leaves WHERE id = $1 RETURNING id", [req.params.id]);
    if (!result.rowCount) return res.status(404).json({ success: false, message: "Leave request not found" });
    res.json({ success: true, message: "Leave request deleted" });
});

module.exports = {
    getLeaves,
    getLeave,
    updateLeave,
    cancelLeave,
    getMyLeaveBalance,
    getLeaveBalances,
    requestLeave,
    reviewLeave,
    deleteLeave
};
