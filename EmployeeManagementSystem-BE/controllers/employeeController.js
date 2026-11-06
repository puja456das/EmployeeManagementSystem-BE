const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const pool = require("../config/db");
const generateEmployeeId = require("../utils/generateEmployeeId");
const asyncHandler = require("../utils/asyncHandler");
const { sendEmployeeInvite } = require("../utils/email");
const { encryptBankAccount, maskBankAccount } = require("../utils/bankDetails");
const { validateProfileImage } = require("../utils/profileImage");

const employeeSelection = `id, employee_code, user_id, name, email, department, department_id, salary, phone, designation,
    joining_date, status, created_at, address, emergency_contact_name, emergency_contact_phone, annual_paid_leave_days,
    bank_account_encrypted, profile_image IS NOT NULL AS has_profile_image`;

const isHrDepartment = (name) => ["hr", "human resources", "human resource"]
    .includes(String(name || "").trim().toLowerCase());

const resolveDepartment = async (client, departmentId, departmentName) => {
    if (departmentId !== undefined && departmentId !== null && departmentId !== "") {
        const id = Number(departmentId);
        if (!Number.isSafeInteger(id) || id < 1) {
            const error = new Error("Choose a valid department");
            error.status = 400;
            throw error;
        }
        const result = await client.query("SELECT id, name FROM departments WHERE id = $1", [id]);
        if (!result.rowCount) {
            const error = new Error("The selected department does not exist");
            error.status = 400;
            throw error;
        }
        return result.rows[0];
    }
    if (departmentName === undefined || departmentName === null || !String(departmentName).trim()) {
        return { id: null, name: null };
    }
    const result = await client.query(
        `SELECT id, name FROM departments
         WHERE lower(trim(name)) = lower(trim($1))
         ORDER BY id LIMIT 1`,
        [String(departmentName)]
    );
    if (!result.rowCount) {
        const error = new Error("Choose a department from the department list");
        error.status = 400;
        throw error;
    }
    return result.rows[0];
};

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
        `SELECT ${employeeSelection},
                COALESCE((
                    SELECT linked_user.role
                    FROM users linked_user
                    WHERE linked_user.id = e.user_id OR linked_user.linked_employee_id = e.id
                    ORDER BY CASE WHEN linked_user.role = 'hr' THEN 0 ELSE 1 END
                    LIMIT 1
                ), 'employee') AS login_role
         FROM employees e ORDER BY e.id DESC`
    );
    res.json({ success: true, employees: result.rows.map(presentEmployee) });
});

const getEmployeeById = asyncHandler(async (req, res) => {
    const result = await pool.query(
        `SELECT ${employeeSelection},
                COALESCE((
                    SELECT linked_user.role
                    FROM users linked_user
                    WHERE linked_user.id = e.user_id OR linked_user.linked_employee_id = e.id
                    ORDER BY CASE WHEN linked_user.role = 'hr' THEN 0 ELSE 1 END
                    LIMIT 1
                ), 'employee') AS login_role
         FROM employees e WHERE e.id = $1`,
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
    let accountRole;
    try {
        await client.query("BEGIN");
        const existingEmployee = await client.query(
            "SELECT employee_code FROM employees WHERE lower(email) = lower($1)",
            [email.trim()]
        );
        if (existingEmployee.rowCount) {
            const error = new Error(
                `An employee profile already exists with ID ${existingEmployee.rows[0].employee_code}. Edit that profile instead of adding it again.`
            );
            error.status = 409;
            throw error;
        }
        const selectedDepartment = await resolveDepartment(client, req.body.department_id, department);
        if (selectedDepartment.name?.trim().toLowerCase() === "admin") {
            const error = new Error("Employees cannot be assigned to the Admin department");
            error.status = 400;
            throw error;
        }
        accountRole = isHrDepartment(selectedDepartment.name) ? "hr" : "employee";
        const passwordHash = await bcrypt.hash(crypto.randomBytes(48).toString("hex"), 12);
        const userResult = await client.query(
            `INSERT INTO users (name, email, password_hash, role)
             VALUES ($1, lower($2), $3, $4)
             RETURNING id`,
            [name.trim(), email.trim(), passwordHash, accountRole]
        );
        const result = await client.query(
            `INSERT INTO employees
             (employee_code, user_id, name, email, department, department_id, salary, phone, designation, joining_date,
              status, address, emergency_contact_name, emergency_contact_phone, bank_account_encrypted,
              profile_image, profile_image_mime, annual_paid_leave_days)
             VALUES ($1, $2, $3, lower($4), $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
             RETURNING ${employeeSelection}`,
            [
                generateEmployeeId(), userResult.rows[0].id, name.trim(), email.trim(),
                selectedDepartment.name, selectedDepartment.id, salary, phone || null, designation || null, joining_date || null, status || "Active",
                address || null, emergency_contact_name || null, emergency_contact_phone || null,
                encryptBankAccount(bank_account_number), req.file?.buffer || null, profileImageMime,
                annual_paid_leave_days === undefined ? 12 : Number(annual_paid_leave_days)
            ]
        );
        employee = result.rows[0];
        if (accountRole === "hr") {
            await client.query(
                "UPDATE users SET linked_employee_id = $1 WHERE id = $2",
                [employee.id, userResult.rows[0].id]
            );
        }
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
            code,
            accountRole
        );
        await client.query("COMMIT");
    } catch (error) {
        await client.query("ROLLBACK");
        if (error.code === "23505") {
            const existingEmployee = await pool.query(
                "SELECT employee_code FROM employees WHERE lower(email) = lower($1)",
                [email.trim()]
            );
            if (existingEmployee.rowCount) {
                const duplicateError = new Error(
                    `An employee profile already exists with ID ${existingEmployee.rows[0].employee_code}. Edit that profile instead of adding it again.`
                );
                duplicateError.status = 409;
                throw duplicateError;
            }
            if (error.constraint === "users_email_key" || error.constraint === "users_role_email_key") {
                const duplicateError = new Error(
                    "This work email already belongs to a login account. Use a different employee work email."
                );
                duplicateError.status = 409;
                throw duplicateError;
            }
        }
        throw error;
    } finally {
        client.release();
    }
    res.status(201).json({
        success: true,
        message: accountRole === "hr"
            ? "HR account created and setup code emailed to the HR employee"
            : "Employee account created and setup code emailed to the employee",
        employee: { ...presentEmployee(employee), login_role: accountRole }
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
        const selectedDepartment = await resolveDepartment(client, req.body.department_id, department);
        const result = await client.query(
            `UPDATE employees
             SET name = $1, email = $2, department = $3, department_id = $4, salary = $5, phone = $6,
                 designation = $7, joining_date = $8, status = $9, address = $10,
                 emergency_contact_name = $11, emergency_contact_phone = $12,
                 bank_account_encrypted = COALESCE($13, bank_account_encrypted),
                 profile_image = COALESCE($14, profile_image),
                 profile_image_mime = COALESCE($15, profile_image_mime),
                 annual_paid_leave_days = $16
             WHERE id = $17
             RETURNING ${employeeSelection}`,
            [
                name.trim(), email.trim().toLowerCase(), selectedDepartment.name, selectedDepartment.id, salary,
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
    const hasDepartment = Object.hasOwn(req.body || {}, "department") || Object.hasOwn(req.body || {}, "department_id");
    const fields = Object.keys(req.body || {}).filter((field) => allowedFields.has(field));
    if (!fields.length && !req.file && !hasDepartment) {
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
    const client = await pool.connect();
    let employee;
    try {
        await client.query("BEGIN");
        if (hasDepartment) {
            const selectedDepartment = await resolveDepartment(client, req.body.department_id, req.body.department);
            fields.push("department", "department_id");
            values.push(selectedDepartment.name, selectedDepartment.id);
        }
        const assignments = fields.map((field, index) => `${field} = $${index + 1}`).join(", ");
        values.push(req.params.id);
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
            `DELETE FROM users
             WHERE role IN ('employee', 'hr')
               AND (linked_employee_id = $1 OR id = (
                   SELECT user_id FROM employees WHERE id = $1
               ))`,
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
                "DELETE FROM users WHERE id = $1 AND role IN ('employee', 'hr')",
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
