const pool = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");
const { getEmployeeIdForUser } = require("../utils/employeeAccount");

const findEmployeeId = async (req) => {
    if (req.user.role !== "employee") return Number(req.body.employee_id);
    return getEmployeeIdForUser(req.user.id);
};

const listAttendance = asyncHandler(async (req, res) => {
    const employeeId = req.user.role === "employee" ? await getEmployeeIdForUser(req.user.id) : null;
    if (req.user.role === "employee" && !employeeId) {
        return res.status(404).json({ success: false, message: "Employee account is not linked" });
    }
    const result = req.user.role === "employee"
        ? await pool.query(
            `SELECT a.*, e.name AS employee_name, e.employee_code FROM attendance a
             JOIN employees e ON e.id = a.employee_id WHERE a.employee_id = $1 ORDER BY a.work_date DESC`,
            [employeeId]
        )
        : await pool.query(
            `SELECT a.*, e.name AS employee_name, e.employee_code FROM attendance a
             JOIN employees e ON e.id = a.employee_id ORDER BY a.work_date DESC`
        );
    res.json({ success: true, data: result.rows });
});

const getAttendance = asyncHandler(async (req, res) => {
    const employeeId = req.user.role === "employee" ? await getEmployeeIdForUser(req.user.id) : null;
    const result = await pool.query(
        `SELECT a.*, e.name AS employee_name FROM attendance a
         JOIN employees e ON e.id = a.employee_id
         WHERE a.id = $1 AND ($2 <> 'employee' OR e.id = $3)`,
        [req.params.id, req.user.role, employeeId]
    );
    if (!result.rowCount) return res.status(404).json({ success: false, message: "Attendance record not found" });
    res.json({ success: true, data: result.rows[0] });
});

const updateAttendance = asyncHandler(async (req, res) => {
    const allowed = new Set(["work_date", "check_in", "check_out", "status"]);
    const fields = Object.keys(req.body).filter((field) => allowed.has(field));
    if (!fields.length) return res.status(400).json({ success: false, message: "No valid attendance fields provided" });
    if (req.body.work_date && Number.isNaN(Date.parse(req.body.work_date))) {
        return res.status(400).json({ success: false, message: "Provide a valid work date" });
    }
    for (const [label, value] of [["Check-in", req.body.check_in], ["Check-out", req.body.check_out]]) {
        if (value && Number.isNaN(Date.parse(value))) {
            return res.status(400).json({ success: false, message: `${label} must be a valid date and time` });
        }
    }
    if (req.body.check_in && req.body.check_out && new Date(req.body.check_out) < new Date(req.body.check_in)) {
        return res.status(400).json({ success: false, message: "Check-out cannot be before check-in" });
    }
    if (req.body.status && !["present", "absent", "late", "half-day"].includes(req.body.status)) {
        return res.status(400).json({ success: false, message: "Invalid attendance status" });
    }
    const values = fields.map((field) => req.body[field]);
    const assignments = fields.map((field, index) => `${field} = $${index + 1}`).join(", ");
    values.push(req.params.id);
    const result = await pool.query(
        `UPDATE attendance SET ${assignments} WHERE id = $${values.length} RETURNING *`,
        values
    );
    if (!result.rowCount) return res.status(404).json({ success: false, message: "Attendance record not found" });
    res.json({ success: true, data: result.rows[0] });
});

const createAttendance = asyncHandler(async (req, res) => {
    const employeeId = Number(req.body.employee_id);
    const { work_date, check_in, check_out, status } = req.body;
    if (!Number.isSafeInteger(employeeId) || employeeId < 1) {
        return res.status(400).json({ success: false, message: "Choose a valid employee" });
    }
    if (work_date && Number.isNaN(Date.parse(work_date))) {
        return res.status(400).json({ success: false, message: "Provide a valid work date" });
    }
    for (const [label, value] of [["Check-in", check_in], ["Check-out", check_out]]) {
        if (value && Number.isNaN(Date.parse(value))) {
            return res.status(400).json({ success: false, message: `${label} must be a valid date and time` });
        }
    }
    if (check_in && check_out && new Date(check_out) < new Date(check_in)) {
        return res.status(400).json({ success: false, message: "Check-out cannot be before check-in" });
    }
    if (status && !["present", "absent", "late", "half-day"].includes(status)) {
        return res.status(400).json({ success: false, message: "Invalid attendance status" });
    }
    const employee = await pool.query("SELECT id FROM employees WHERE id = $1", [employeeId]);
    if (!employee.rowCount) {
        return res.status(400).json({ success: false, message: "Employee not found" });
    }
    const result = await pool.query(
        `INSERT INTO attendance (employee_id, work_date, check_in, check_out, status)
         VALUES ($1, COALESCE($2::date, CURRENT_DATE), $3, $4, COALESCE($5, 'present'))
         RETURNING *`,
        [employeeId, work_date || null, check_in || null, check_out || null, status || null]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
});

const deleteAttendance = asyncHandler(async (req, res) => {
    const result = await pool.query("DELETE FROM attendance WHERE id = $1 RETURNING id", [req.params.id]);
    if (!result.rowCount) return res.status(404).json({ success: false, message: "Attendance record not found" });
    res.json({ success: true, message: "Attendance record deleted" });
});

const getAttendanceSummary = asyncHandler(async (req, res) => {
    const employeeId = req.user.role === "employee" ? await getEmployeeIdForUser(req.user.id) : null;
    if (req.user.role === "employee" && !employeeId) {
        return res.status(404).json({ success: false, message: "Employee account is not linked" });
    }
    const result = await pool.query(
        `SELECT COUNT(*)::int AS total_days,
                COUNT(*) FILTER (WHERE status = 'present')::int AS present_days,
                COUNT(*) FILTER (WHERE status = 'absent')::int AS absent_days,
                COUNT(*) FILTER (WHERE check_in IS NOT NULL AND check_out IS NULL)::int AS open_shifts,
                COALESCE(SUM(EXTRACT(EPOCH FROM (check_out - check_in)) / 3600)
                    FILTER (WHERE check_in IS NOT NULL AND check_out IS NOT NULL), 0)::numeric(10, 2) AS hours_worked
         FROM attendance
         WHERE ($1::bigint IS NULL OR employee_id = $1)
           AND work_date >= COALESCE($2::date, date_trunc('month', CURRENT_DATE)::date)
           AND work_date <= COALESCE($3::date, CURRENT_DATE)`,
        [employeeId, req.query.start_date || null, req.query.end_date || null]
    );
    res.json({ success: true, data: result.rows[0] });
});

const checkIn = asyncHandler(async (req, res) => {
    const employeeId = await findEmployeeId(req);
    if (!Number.isSafeInteger(employeeId) || employeeId < 1) {
        return res.status(400).json({ success: false, message: req.user.role === "employee"
            ? "Employee account is not linked"
            : "Choose a valid employee" });
    }
    const result = await pool.query(
        `INSERT INTO attendance (employee_id, work_date, check_in)
         VALUES ($1, CURRENT_DATE, NOW())
         ON CONFLICT (employee_id, work_date) DO UPDATE
         SET check_in = EXCLUDED.check_in,
             status = CASE WHEN attendance.status = 'absent' THEN 'present' ELSE attendance.status END
         WHERE attendance.check_in IS NULL AND attendance.check_out IS NULL
         RETURNING *`,
        [employeeId]
    );
    if (!result.rowCount) {
        return res.status(409).json({ success: false, message: "Check-in has already been recorded for today" });
    }
    res.status(201).json({ success: true, data: result.rows[0] });
});

const checkOut = asyncHandler(async (req, res) => {
    const employeeId = await findEmployeeId(req);
    if (!employeeId) return res.status(400).json({ success: false, message: "Employee account is not linked" });
    const result = await pool.query(
        "UPDATE attendance SET check_out = NOW() WHERE employee_id = $1 AND work_date = CURRENT_DATE AND check_in IS NOT NULL AND check_out IS NULL RETURNING *",
        [employeeId]
    );
    if (!result.rowCount) {
        const existing = await pool.query(
            "SELECT check_in, check_out FROM attendance WHERE employee_id = $1 AND work_date = CURRENT_DATE",
            [employeeId]
        );
        if (existing.rows[0]?.check_out) {
            return res.status(409).json({ success: false, message: "Check-out has already been recorded for today" });
        }
        return res.status(404).json({ success: false, message: "Today's check-in was not found" });
    }
    res.json({ success: true, data: result.rows[0] });
});

module.exports = {
    listAttendance,
    getAttendance,
    updateAttendance,
    createAttendance,
    deleteAttendance,
    getAttendanceSummary,
    checkIn,
    checkOut
};
