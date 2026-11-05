const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const pool = require("../config/db");
const generateEmployeeId = require("../utils/generateEmployeeId");
const asyncHandler = require("../utils/asyncHandler");
const { sendEmployeeInvite } = require("../utils/email");
const { encryptBankAccount, maskBankAccount } = require("../utils/bankDetails");
const { validateProfileImage } = require("../utils/profileImage");

const employeeSelection = `id, employee_code, user_id, name, email, department, salary, phone, designation,
    joining_date, status, created_at, address, emergency_contact_name, emergency_contact_phone, annual_paid_leave_days,
    bank_account_encrypted, profile_image IS NOT NULL AS has_profile_image`;

const presentEmployee = (employee) => {
    const {
        bank_account_encrypted: encrypted,
        profile_image: image,
        profile_image_mime: imageMime,
        ...safeEmployee
    } = employee;
    return {
        ...safeEmployee,
        has_profile_image: safeEmployee.has_profile_image ?? Boolean(image && imageMime),
        bank_account_masked: maskBankAccount(encrypted)
    };
};

const getEmployees = asyncHandler(async (req, res) => {
    const result = await pool.query(
        `SELECT ${employeeSelection} FROM employees ORDER BY id DESC`
    );
    res.json({ success: true, employees: result.rows.map(presentEmployee) });
});

const getEmployeeById = asyncHandler(async (req, res) => {
    const result = await pool.query(
        `SELECT ${employeeSelection} FROM employees WHERE id = $1`,
        [req.params.id]
    );
    if (!result.rowCount) {
        return res.status(404).json({ success: false, message: "Employee not found" });
    }
    res.json({ success: true, employee: presentEmployee(result.rows[0]) });
});

const getEmployeePhoto = asyncHandler(async (req, res) => {
    const result = await pool.query(
        "SELECT profile_image, profile_image_mime FROM employees WHERE id = $1",
        [req.params.id]
    );
    if (!result.rowCount || !result.rows[0].profile_image) {
        return res.status(404).json({ success: false, message: "Employee profile photo not found" });
    }
    res.set("Cache-Control", "private, no-store");
    res.type(result.rows[0].profile_image_mime).send(result.rows[0].profile_image);
});

const addEmployee = asyncHandler(async (req, res) => {
    const {
        name, email, department, salary, phone, designation, joining_date, status,
        address, emergency_contact_name, emergency_contact_phone, bank_account_number,
        annual_paid_leave_days
    } = req.body;
    const profileImageMime = validateProfileImage(req.file);
    const client = await pool.connect();
    let employee;
    try {
        await client.query("BEGIN");
        const passwordHash = await bcrypt.hash(crypto.randomBytes(48).toString("hex"), 12);
        const userResult = await client.query(
            `INSERT INTO users (name, email, password_hash, role)
             VALUES ($1, lower($2), $3, 'employee')
             RETURNING id`,
            [name.trim(), email.trim(), passwordHash]
        );
        const result = await client.query(
            `INSERT INTO employees
             (employee_code, user_id, name, email, department, salary, phone, designation, joining_date,
              status, address, emergency_contact_name, emergency_contact_phone, bank_account_encrypted,
              profile_image, profile_image_mime, annual_paid_leave_days)
             VALUES ($1, $2, $3, lower($4), $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
             RETURNING ${employeeSelection}`,
            [
                generateEmployeeId(), userResult.rows[0].id, name.trim(), email.trim(),
                department, salary, phone || null, designation || null, joining_date || null, status || "Active",
                address || null, emergency_contact_name || null, emergency_contact_phone || null,
                encryptBankAccount(bank_account_number), req.file?.buffer || null, profileImageMime,
                annual_paid_leave_days === undefined ? 12 : Number(annual_paid_leave_days)
            ]
        );
        employee = result.rows[0];
        const code = String(crypto.randomInt(0, 1000000)).padStart(6, "0");
        const codeHash = crypto.createHmac("sha256", process.env.JWT_SECRET)
            .update(`${userResult.rows[0].id}:${code}`).digest("hex");
        await client.query(
            "UPDATE password_reset_otps SET used_at = NOW() WHERE user_id = $1 AND purpose = 'employee_invite' AND used_at IS NULL",
            [userResult.rows[0].id]
        );
        await client.query(
            `INSERT INTO password_reset_otps (user_id, code_hash, purpose, expires_at)
             VALUES ($1, $2, 'employee_invite', NOW() + INTERVAL '24 hours')`,
            [userResult.rows[0].id, codeHash]
        );
        await sendEmployeeInvite(
            { name: employee.name, email: employee.email },
            employee,
            code
        );
        await client.query("COMMIT");
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
    res.status(201).json({
        success: true,
        message: "Employee account created and setup code emailed to the employee",
        employee: presentEmployee(employee)
    });
});

const updateEmployee = asyncHandler(async (req, res) => {
    const {
        name, email, department, salary, phone, designation, joining_date, status,
        address, emergency_contact_name, emergency_contact_phone, bank_account_number,
        annual_paid_leave_days
    } = req.body;
    const profileImageMime = validateProfileImage(req.file);
    const client = await pool.connect();
    let employee;
    try {
        await client.query("BEGIN");
        const result = await client.query(
            `UPDATE employees
             SET name = $1, email = $2, department = $3, salary = $4, phone = $5,
                 designation = $6, joining_date = $7, status = $8, address = $9,
                 emergency_contact_name = $10, emergency_contact_phone = $11,
                 bank_account_encrypted = COALESCE($12, bank_account_encrypted),
                 profile_image = COALESCE($13, profile_image),
                 profile_image_mime = COALESCE($14, profile_image_mime),
                 annual_paid_leave_days = $15
             WHERE id = $16
             RETURNING ${employeeSelection}`,
            [
                name.trim(), email.trim().toLowerCase(), department, salary,
                phone || null, designation || null, joining_date || null, status || "Active",
                address || null, emergency_contact_name || null, emergency_contact_phone || null,
                String(bank_account_number || "").trim() ? encryptBankAccount(bank_account_number) : null,
                req.file?.buffer || null, profileImageMime,
                annual_paid_leave_days === undefined ? 12 : Number(annual_paid_leave_days), req.params.id
            ]
        );
        if (!result.rowCount) {
            await client.query("ROLLBACK");
            return res.status(404).json({ success: false, message: "Employee not found" });
        }
        employee = result.rows[0];
        if (employee.user_id) {
            await client.query(
                "UPDATE users SET name = $1, email = lower($2) WHERE id = $3",
                [name.trim(), email.trim(), employee.user_id]
            );
        }
        await client.query("COMMIT");
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
    res.json({
        success: true,
        message: "Employee updated successfully",
        employee: presentEmployee(employee)
    });
});

const patchEmployee = asyncHandler(async (req, res) => {
    const profileImageMime = validateProfileImage(req.file);
    if (req.body.annual_paid_leave_days !== undefined &&
        (!Number.isInteger(Number(req.body.annual_paid_leave_days)) ||
            Number(req.body.annual_paid_leave_days) < 0 ||
            Number(req.body.annual_paid_leave_days) > 365)) {
        return res.status(400).json({ success: false, message: "Annual paid leave allowance must be between 0 and 365 days" });
    }
    const allowedFields = new Set([
        "name", "email", "department", "salary", "phone", "designation", "joining_date", "status",
        "address", "emergency_contact_name", "emergency_contact_phone", "annual_paid_leave_days"
    ]);
    const fields = Object.keys(req.body || {}).filter((field) => allowedFields.has(field));
    if (!fields.length && !req.file) {
        return res.status(400).json({ success: false, message: "No valid fields provided for update" });
    }
    const values = fields.map((field) => field === "email"
        ? String(req.body[field]).trim().toLowerCase()
        : field === "annual_paid_leave_days" ? Number(req.body[field]) : req.body[field]);
    if (req.body.bank_account_number !== undefined) {
        if (String(req.body.bank_account_number).trim()) {
            fields.push("bank_account_encrypted");
            values.push(encryptBankAccount(req.body.bank_account_number));
        }
    }
    if (req.file) {
        fields.push("profile_image", "profile_image_mime");
        values.push(req.file.buffer, profileImageMime);
    }
    const assignments = fields.map((field, index) => `${field} = $${index + 1}`).join(", ");
    values.push(req.params.id);
    const client = await pool.connect();
    let employee;
    try {
        await client.query("BEGIN");
        const result = await client.query(
            `UPDATE employees SET ${assignments} WHERE id = $${values.length} RETURNING ${employeeSelection}`,
            values
        );
        if (!result.rowCount) {
            await client.query("ROLLBACK");
            return res.status(404).json({ success: false, message: "Employee not found" });
        }
        employee = result.rows[0];
        if (employee.user_id && (fields.includes("name") || fields.includes("email"))) {
            await client.query(
                "UPDATE users SET name = $1, email = lower($2) WHERE id = $3",
                [employee.name, employee.email, employee.user_id]
            );
        }
        await client.query("COMMIT");
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
    res.json({
        success: true,
        message: "Employee partially updated successfully",
        employee: presentEmployee(employee)
    });
});

const deleteEmployee = asyncHandler(async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        await client.query(
            "DELETE FROM users WHERE role = 'employee' AND linked_employee_id = $1",
            [req.params.id]
        );
        const result = await client.query(
            "DELETE FROM employees WHERE id = $1 RETURNING user_id",
            [req.params.id]
        );
        if (!result.rowCount) {
            await client.query("ROLLBACK");
            return res.status(404).json({ success: false, message: "Employee not found" });
        }
        if (result.rows[0].user_id) {
            await client.query(
                "DELETE FROM users WHERE id = $1 AND role = 'employee'",
                [result.rows[0].user_id]
            );
        }
        await client.query("COMMIT");
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
    res.json({ success: true, message: "Employee deleted successfully" });
});

module.exports = {
    getEmployees,
    getEmployeeById,
    getEmployeePhoto,
    addEmployee,
    updateEmployee,
    patchEmployee,
    deleteEmployee
};
