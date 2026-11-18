const pool = require("../config/db");
const path = require("path");
const asyncHandler = require("../utils/asyncHandler");
const { getEmployeeIdForUser } = require("../utils/employeeAccount");
const employeeLeaveTypes = ["casual", "sick", "unpaid"];
const leaveTypeLabel = { casual: "Casual", sick: "Sick", unpaid: "Unpaid" };

const validateMedicalDocument = (file) => {
    if (!file) return null;
    const data = file.buffer;
    const validSignature = file.mimetype === "application/pdf"
        ? data.subarray(0, 5).toString("ascii") === "%PDF-"
        : file.mimetype === "image/jpeg"
            ? data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff
            : file.mimetype === "image/png"
                ? data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
                : file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    ? data[0] === 0x50 && data[1] === 0x4b
                    : false;
    if (!validSignature) {
        const error = new Error("The medical document contents do not match the selected file type");
        error.status = 400;
        throw error;
    }
    const safeName = String(file.originalname || "medical-document").replace(/[\r\n\0]/g, "").replace(/\\/g, "/");
    return path.basename(safeName).slice(0, 255) || "medical-document";
};

const isDateOnly = (value) => {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00.000Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

const findOverlappingLeave = async (db, employeeId, startDate, endDate, excludeId = null) => db.query(
    `SELECT id FROM leaves
     WHERE employee_id = $1 AND status IN ('pending', 'approved')
       AND start_date <= $3::date AND end_date >= $2::date
       AND ($4::bigint IS NULL OR id <> $4)
     LIMIT 1`,
    [employeeId, startDate, endDate, excludeId]
);

const leaveDayCount = (startDate, endDate) => {
    const dateKey = (value) => value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
    const start = new Date(`${dateKey(startDate)}T00:00:00Z`);
    const end = new Date(`${dateKey(endDate)}T00:00:00Z`);
    return Math.floor((end - start) / 86400000) + 1;
};

const getBalance = async (employeeId, year = new Date().getFullYear(), db = pool) => {
    const result = await db.query(
        `SELECT e.id AS employee_id, e.employee_code, e.name AS employee_name,
                e.casual_leave_days AS allocated_days,
                COALESCE(SUM(
                    GREATEST(0, LEAST(l.end_date, make_date($2::int + 1, 1, 1) - 1)
                        - GREATEST(l.start_date, make_date($2::int, 1, 1)) + 1)
                ) FILTER (WHERE l.status = 'approved' AND l.leave_type = 'casual'), 0)::int AS approved_days_used
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
                    ld.original_name AS medical_document_name,
                    (l.end_date - l.start_date + 1)::int AS requested_days
             FROM leaves l JOIN employees e ON e.id = l.employee_id
             LEFT JOIN leave_documents ld ON ld.leave_id = l.id
             WHERE l.employee_id = $1 ORDER BY l.created_at DESC`,
            [employeeId]
        )
        : await pool.query(
            `SELECT l.*, e.name AS employee_name, e.employee_code,
                    ld.original_name AS medical_document_name,
                    (l.end_date - l.start_date + 1)::int AS requested_days
             FROM leaves l JOIN employees e ON e.id = l.employee_id
             LEFT JOIN leave_documents ld ON ld.leave_id = l.id
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
        `SELECT l.*, e.name AS employee_name, ld.original_name AS medical_document_name FROM leaves l
         JOIN employees e ON e.id = l.employee_id
         LEFT JOIN leave_documents ld ON ld.leave_id = l.id
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
    const { start_date, end_date, reason, leave_type } = req.body;
    if (Object.hasOwn(req.body, "start_date") && !isDateOnly(start_date)) {
        return res.status(400).json({ success: false, message: "Invalid start date" });
    }
    if (Object.hasOwn(req.body, "end_date") && !isDateOnly(end_date)) {
        return res.status(400).json({ success: false, message: "Invalid end date" });
    }
    const documentName = validateMedicalDocument(req.file);
    if (reason !== undefined && (typeof reason !== "string" || !reason.trim())) {
        return res.status(400).json({ success: false, message: "Reason cannot be empty" });
    }
    const fields = Object.keys(req.body).filter((field) => ["start_date", "end_date", "reason", "leave_type"].includes(field));
    if (!fields.length && !req.file) return res.status(400).json({ success: false, message: "No valid leave fields provided" });
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const current = await client.query(
            `SELECT l.employee_id, l.start_date, l.end_date, l.leave_type,
                    EXISTS (SELECT 1 FROM leave_documents ld WHERE ld.leave_id = l.id) AS has_medical_document
             FROM leaves l
             WHERE l.id = $1 AND l.status = 'pending'
               AND ($2::bigint IS NULL OR l.employee_id = $2)
             FOR UPDATE`,
            [req.params.id, employeeId]
        );
        if (!current.rowCount) {
            await client.query("ROLLBACK");
            return res.status(404).json({ success: false, message: "Pending leave request not found" });
        }
        const existing = current.rows[0];
        const nextLeaveType = leave_type || existing.leave_type;
        if (leave_type !== undefined && leave_type !== existing.leave_type && !employeeLeaveTypes.includes(leave_type)) {
            await client.query("ROLLBACK");
            return res.status(400).json({ success: false, message: `Employees can select only ${employeeLeaveTypes.map((type) => leaveTypeLabel[type]).join(", ")}` });
        }
        if (req.file && nextLeaveType !== "sick") {
            await client.query("ROLLBACK");
            return res.status(400).json({ success: false, message: "A supporting document can only be attached to a Sick Leave request" });
        }
        if (nextLeaveType === "sick" && !req.file && !existing.has_medical_document) {
            await client.query("ROLLBACK");
            return res.status(400).json({ success: false, message: "Upload a supporting medical document for Sick Leave" });
        }
        const nextStartDate = req.body.start_date || existing.start_date;
        const nextEndDate = req.body.end_date || existing.end_date;
        if (new Date(nextEndDate) < new Date(nextStartDate)) {
            await client.query("ROLLBACK");
            return res.status(400).json({ success: false, message: "End date cannot be before start date" });
        }
        const overlap = await findOverlappingLeave(client, existing.employee_id, nextStartDate, nextEndDate, req.params.id);
        if (overlap.rowCount) {
            await client.query("ROLLBACK");
            return res.status(409).json({ success: false, message: "This request overlaps another pending or approved leave." });
        }
        const values = fields.map((field) => field === "reason" ? reason.trim() : req.body[field]);
        const assignments = fields.map((field, index) => `${field} = $${index + 1}`).join(", ");
        values.push(req.params.id, employeeId);
        const result = fields.length
            ? await client.query(
                `UPDATE leaves SET ${assignments}
                 WHERE id = $${fields.length + 1} AND status = 'pending'
                   AND ($${fields.length + 2}::bigint IS NULL OR employee_id = $${fields.length + 2})
                 RETURNING *`,
                values
            )
            : await client.query("SELECT * FROM leaves WHERE id = $1", [req.params.id]);
        if (req.file) {
            await client.query(
                `INSERT INTO leave_documents (leave_id, original_name, mime_type, file_size, file_data)
                 VALUES ($1, $2, $3, $4, $5)
                 ON CONFLICT (leave_id) DO UPDATE SET original_name = EXCLUDED.original_name,
                     mime_type = EXCLUDED.mime_type, file_size = EXCLUDED.file_size,
                     file_data = EXCLUDED.file_data, uploaded_at = NOW()`,
                [req.params.id, documentName, req.file.mimetype, req.file.size, req.file.buffer]
            );
        } else if (nextLeaveType !== "sick") {
            await client.query("DELETE FROM leave_documents WHERE leave_id = $1", [req.params.id]);
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

const downloadMedicalDocument = asyncHandler(async (req, res) => {
    const employeeId = req.user.role === "employee" ? await getEmployeeIdForUser(req.user.id) : null;
    if (req.user.role === "employee" && !employeeId) {
        return res.status(404).json({ success: false, message: "Employee account is not linked" });
    }
    const result = await pool.query(
        `SELECT ld.original_name, ld.mime_type, ld.file_data
         FROM leave_documents ld JOIN leaves l ON l.id = ld.leave_id
         WHERE l.id = $1 AND ($2::bigint IS NULL OR l.employee_id = $2)`,
        [req.params.id, employeeId]
    );
    if (!result.rowCount) return res.status(404).json({ success: false, message: "Medical document not found" });
    res.set("Cache-Control", "private, no-store");
    res.type(result.rows[0].mime_type).attachment(result.rows[0].original_name).send(result.rows[0].file_data);
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
    if (req.user.role !== "employee") {
        return res.status(403).json({ success: false, message: "Employees must submit their own leave requests." });
    }
    const { start_date, end_date, reason, leave_type } = req.body;
    const normalizedLeaveType = String(leave_type || "casual").toLowerCase();
    const documentName = validateMedicalDocument(req.file);
    if (!start_date || !end_date || !reason?.trim()) {
        return res.status(400).json({ success: false, message: "Start date, end date, and reason are required" });
    }
    if (!employeeLeaveTypes.includes(normalizedLeaveType)) {
        return res.status(400).json({ success: false, message: `Choose Casual, Sick, or Unpaid Leave` });
    }
    if (normalizedLeaveType === "sick" && !req.file) {
        return res.status(400).json({ success: false, message: "Upload a supporting medical document for Sick Leave" });
    }
    if (normalizedLeaveType !== "sick" && req.file) {
        return res.status(400).json({ success: false, message: "A supporting document can only be attached to a Sick Leave request" });
    }
    if (!isDateOnly(start_date) || !isDateOnly(end_date) || end_date < start_date) {
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
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        await client.query("SELECT pg_advisory_xact_lock($1::bigint)", [employeeId]);
        const employee = await client.query("SELECT id FROM employees WHERE id = $1", [employeeId]);
        if (!employee.rowCount) {
            await client.query("ROLLBACK");
            return res.status(404).json({ success: false, message: "Employee profile is not linked" });
        }
        const overlap = await findOverlappingLeave(client, employeeId, start_date, end_date);
        if (overlap.rowCount) {
            await client.query("ROLLBACK");
            return res.status(409).json({ success: false, message: "This request overlaps another pending or approved leave." });
        }
        const result = await client.query(
            `INSERT INTO leaves (employee_id, start_date, end_date, reason, leave_type)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [employeeId, start_date, end_date, reason.trim(), normalizedLeaveType]
        );
        if (req.file) {
            await client.query(
                `INSERT INTO leave_documents (leave_id, original_name, mime_type, file_size, file_data)
                 VALUES ($1, $2, $3, $4, $5)`,
                [result.rows[0].id, documentName, req.file.mimetype, req.file.size, req.file.buffer]
            );
        }
        await client.query("COMMIT");
        res.status(201).json({ success: true, data: { ...result.rows[0], medical_document_name: documentName } });
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
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
            `SELECT l.*, e.casual_leave_days
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
            await client.query("SELECT pg_advisory_xact_lock($1::bigint)", [leave.employee_id]);
            const overlap = await client.query(
                `SELECT id FROM leaves WHERE employee_id = $1 AND id <> $2
                 AND status = 'approved' AND start_date <= $4 AND end_date >= $3 LIMIT 1`,
                [leave.employee_id, leave.id, leave.start_date, leave.end_date]
            );
            if (overlap.rowCount) {
                await client.query("ROLLBACK");
                return res.status(409).json({ success: false, message: "Cannot approve: this leave overlaps an already approved request." });
            }
        }
        if (status === "approved" && leave.leave_type === "casual") {
            const dateKey = (value) => value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
            const leaveStart = dateKey(leave.start_date);
            const leaveEnd = dateKey(leave.end_date);
            const startYear = new Date(`${leaveStart}T00:00:00Z`).getUTCFullYear();
            const endYear = new Date(`${leaveEnd}T00:00:00Z`).getUTCFullYear();
            const allowance = Number(leave.casual_leave_days);
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
    downloadMedicalDocument,
    reviewLeave,
    deleteLeave
};
