const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const pool = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");
const { sendEmployeeInvite } = require("../utils/email");

const userSelection = `u.id, u.name, u.email, u.role, COALESCE(u.linked_employee_id, e.id) AS linked_employee_id,
    e.employee_code AS linked_employee_code, e.name AS linked_employee_name, u.created_at`;

const getLinkedEmployeeId = (role, value) => {
    if (value === undefined || value === null || value === "") {
        if (role === "employee" || role === "hr") {
            const error = new Error(`Choose the existing employee profile for this ${role === "hr" ? "HR" : "employee"} login`);
            error.status = 400;
            throw error;
        }
        return null;
    }
    const employeeId = Number(value);
    if (!Number.isSafeInteger(employeeId) || employeeId < 1) {
        const error = new Error("Choose a valid employee profile to link");
        error.status = 400;
        throw error;
    }
    return employeeId;
};

const ensureEmployeeExists = async (client, employeeId) => {
    if (!employeeId) return;
    const result = await client.query("SELECT id FROM employees WHERE id = $1", [employeeId]);
    if (!result.rowCount) {
        const error = new Error("The selected employee profile does not exist");
        error.status = 400;
        throw error;
    }
};

const ensureEmployeeLogin = async (client, employeeId) => {
    const employeeResult = await client.query(
        `SELECT id, user_id, name, email, employee_code
         FROM employees WHERE id = $1 FOR UPDATE`,
        [employeeId]
    );
    if (!employeeResult.rowCount) {
        const error = new Error("The selected employee profile does not exist");
        error.status = 400;
        throw error;
    }
    const employee = employeeResult.rows[0];
    if (employee.user_id) {
        const linkedUser = await client.query("SELECT role FROM users WHERE id = $1", [employee.user_id]);
        if (linkedUser.rows[0]?.role !== "employee") {
            const error = new Error("This employee profile is linked to a non-employee login");
            error.status = 409;
            throw error;
        }
        const duplicateLogin = await client.query(
            `SELECT id FROM users
             WHERE lower(email) = lower($1) AND role = 'employee' AND id <> $2`,
            [employee.email, employee.user_id]
        );
        if (duplicateLogin.rowCount) {
            const error = new Error("Another employee login already uses this work email");
            error.status = 409;
            throw error;
        }
        await client.query(
            "UPDATE users SET name = $1, email = lower($2) WHERE id = $3",
            [employee.name, employee.email, employee.user_id]
        );
        return false;
    }

    const existingUser = await client.query(
        "SELECT id, role FROM users WHERE lower(email) = lower($1) AND role = 'employee'",
        [employee.email]
    );
    if (existingUser.rowCount) {
        const user = existingUser.rows[0];
        const linkedProfile = await client.query(
            "SELECT id FROM employees WHERE user_id = $1 AND id <> $2",
            [user.id, employeeId]
        );
        if (linkedProfile.rowCount) {
            const error = new Error("The employee work-email login is already linked to another profile");
            error.status = 409;
            throw error;
        }
        await client.query("UPDATE employees SET user_id = $1 WHERE id = $2", [user.id, employeeId]);
        return false;
    }

    const passwordHash = await bcrypt.hash(crypto.randomBytes(48).toString("hex"), 12);
    const userResult = await client.query(
        `INSERT INTO users (name, email, password_hash, role)
         VALUES ($1, lower($2), $3, 'employee')
         RETURNING id`,
        [employee.name, employee.email, passwordHash]
    );
    const employeeUserId = userResult.rows[0].id;
    await client.query("UPDATE employees SET user_id = $1 WHERE id = $2", [employeeUserId, employeeId]);

    const code = String(crypto.randomInt(0, 1000000)).padStart(6, "0");
    const codeHash = crypto.createHmac("sha256", process.env.JWT_SECRET)
        .update(`${employeeUserId}:${code}`)
        .digest("hex");
    await client.query(
        `INSERT INTO password_reset_otps (user_id, code_hash, purpose, expires_at)
         VALUES ($1, $2, 'employee_invite', NOW() + INTERVAL '24 hours')`,
        [employeeUserId, codeHash]
    );
    await sendEmployeeInvite({ name: employee.name, email: employee.email }, employee, code);
    return true;
};

const listUsers = asyncHandler(async (req, res) => {
    const result = await pool.query(
        `SELECT ${userSelection} FROM users u
         LEFT JOIN employees e ON e.id = COALESCE(
             u.linked_employee_id,
             (SELECT primary_employee.id FROM employees primary_employee WHERE primary_employee.user_id = u.id)
         )
         ORDER BY u.id DESC`
    );
    res.json({ success: true, users: result.rows });
});

const getUser = asyncHandler(async (req, res) => {
    const result = await pool.query(
        `SELECT ${userSelection} FROM users u
         LEFT JOIN employees e ON e.id = COALESCE(
             u.linked_employee_id,
             (SELECT primary_employee.id FROM employees primary_employee WHERE primary_employee.user_id = u.id)
         )
         WHERE u.id = $1`,
        [req.params.id]
    );
    if (!result.rowCount) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, user: result.rows[0] });
});

const listRoles = (req, res) => {
    res.json({ success: true, roles: ["hr", "employee"] });
};

const createUser = asyncHandler(async (req, res) => {
    const { name, email, password, role = "employee" } = req.body;
    if (!name?.trim() || !email?.trim() || !password) {
        return res.status(400).json({ success: false, message: "Name, email, and password are required" });
    }
    if (!["hr", "employee"].includes(role)) {
        return res.status(400).json({ success: false, message: "Only HR and employee accounts can be created here. The system admin is provisioned from ADMIN_EMAIL." });
    }
    if (password.length < 8) {
        return res.status(400).json({ success: false, message: "Password must contain at least 8 characters" });
    }
    const linkedEmployeeId = getLinkedEmployeeId(role, req.body.employee_id);
    const hash = await bcrypt.hash(password, 12);
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        await ensureEmployeeExists(client, linkedEmployeeId);
        if (role === "employee") {
            const profile = await client.query(
                "SELECT email, user_id FROM employees WHERE id = $1 FOR UPDATE",
                [linkedEmployeeId]
            );
            if (profile.rows[0].email.toLowerCase() !== email.trim().toLowerCase()) {
                const error = new Error("Employee login email must match the selected profile's work email");
                error.status = 400;
                throw error;
            }
            if (profile.rows[0].user_id) {
                const error = new Error("This employee profile already has a login account. Edit the existing account instead.");
                error.status = 409;
                throw error;
            }
        }
        const result = await client.query(
            `INSERT INTO users (name, email, password_hash, role, linked_employee_id)
             VALUES ($1, lower($2), $3, $4, $5)
             RETURNING id, name, email, role, linked_employee_id, created_at`,
            [name.trim(), email.trim(), hash, role, linkedEmployeeId]
        );
        if (role === "employee") {
            await client.query("UPDATE employees SET user_id = $1 WHERE id = $2", [result.rows[0].id, linkedEmployeeId]);
        }
        await client.query("COMMIT");
        res.status(201).json({ success: true, user: result.rows[0] });
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
});

const updateUser = asyncHandler(async (req, res) => {
    const { name, role, password } = req.body;
    if (role !== undefined && !["admin", "hr", "employee"].includes(role)) {
        return res.status(400).json({ success: false, message: "Role must be admin, hr, or employee" });
    }
    if (role !== undefined && String(req.params.id) === String(req.user.id) && role !== "admin") {
        return res.status(400).json({ success: false, message: "You cannot remove your own admin role" });
    }
    if (role !== undefined) {
        const currentUser = await pool.query("SELECT role FROM users WHERE id = $1", [req.params.id]);
        if (!currentUser.rowCount) return res.status(404).json({ success: false, message: "User not found" });
        if (role === "admin" || currentUser.rows[0].role === "admin") {
            return res.status(400).json({ success: false, message: "The system admin role can only be provisioned during initial setup" });
        }
        if ((role === "employee") !== (currentUser.rows[0].role === "employee")) {
            return res.status(400).json({
                success: false,
                message: "Employee login accounts must be created and managed from the Employees page"
            });
        }
    }
    const assignments = [];
    const values = [];
    if (name !== undefined) {
        values.push(name.trim());
        assignments.push(`name = $${values.length}`);
    }
    if (role !== undefined) {
        values.push(role);
        assignments.push(`role = $${values.length}`);
    }
    if (password) {
        if (password.length < 8) {
            return res.status(400).json({ success: false, message: "Password must contain at least 8 characters" });
        }
        values.push(await bcrypt.hash(password, 12));
        assignments.push(`password_hash = $${values.length}`);
    }
    if (!assignments.length) return res.status(400).json({ success: false, message: "No valid fields provided" });
    values.push(req.params.id);
    const result = await pool.query(
        `UPDATE users SET ${assignments.join(", ")}
         WHERE id = $${values.length}
         RETURNING id, name, email, role, linked_employee_id, created_at`,
        values
    );
    if (!result.rowCount) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, user: result.rows[0] });
});

const replaceUser = asyncHandler(async (req, res) => {
    const { name, email, role, password } = req.body;
    if (!name?.trim() || !email?.trim() || !["admin", "hr", "employee"].includes(role)) {
        return res.status(400).json({ success: false, message: "Name, email, and a valid role are required" });
    }
    if (password && password.length < 8) {
        return res.status(400).json({ success: false, message: "Password must contain at least 8 characters" });
    }
    if (String(req.params.id) === String(req.user.id) && role !== "admin") {
        return res.status(400).json({ success: false, message: "You cannot remove your own admin role" });
    }
    if (role === "admin" && process.env.ADMIN_EMAIL &&
        email.trim().toLowerCase() !== process.env.ADMIN_EMAIL.trim().toLowerCase()) {
        return res.status(400).json({ success: false, message: "The system admin login email is managed by ADMIN_EMAIL in the backend environment." });
    }
    const currentUser = await pool.query("SELECT role FROM users WHERE id = $1", [req.params.id]);
    if (!currentUser.rowCount) return res.status(404).json({ success: false, message: "User not found" });
    if (currentUser.rows[0].role === "admin" && String(req.params.id) !== String(req.user.id)) {
        return res.status(403).json({ success: false, message: "The system admin account cannot be changed here" });
    }
    if ((role === "admin") !== (currentUser.rows[0].role === "admin")) {
        return res.status(400).json({ success: false, message: "The system admin role can only be provisioned during initial setup" });
    }
    if ((role === "employee") !== (currentUser.rows[0].role === "employee")) {
        return res.status(400).json({
            success: false,
            message: "Employee login accounts must be created and managed from the Employees page"
        });
    }
    const linkedEmployeeId = getLinkedEmployeeId(role, req.body.employee_id);
    const client = await pool.connect();
    let employeeLoginCreated = false;
    try {
        await client.query("BEGIN");
        await ensureEmployeeExists(client, linkedEmployeeId);
        const values = [name.trim(), email.trim(), role, linkedEmployeeId];
        let passwordAssignment = "";
        if (password) {
            values.push(await bcrypt.hash(password, 12));
            passwordAssignment = `, password_hash = $${values.length}`;
        }
        const result = await client.query(
            `UPDATE users SET name = $1, email = lower($2), role = $3,
                 linked_employee_id = $4${passwordAssignment}
             WHERE id = $${values.length + 1}
             RETURNING id, name, email, role, linked_employee_id, created_at`,
            [...values, req.params.id]
        );
        if (!result.rowCount) {
            await client.query("ROLLBACK");
            return res.status(404).json({ success: false, message: "User not found" });
        }
        if (role === "admin" && linkedEmployeeId) {
            employeeLoginCreated = await ensureEmployeeLogin(client, linkedEmployeeId);
        }
        await client.query("COMMIT");
        res.json({
            success: true,
            user: result.rows[0],
            ...(employeeLoginCreated && {
                message: "System admin profile linked. A separate employee login setup email was sent to the employee work email."
            })
        });
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
});

const updateUserRole = asyncHandler(async (req, res) => {
    const { role } = req.body;
    if (!["admin", "hr", "employee"].includes(role)) {
        return res.status(400).json({ success: false, message: "Role must be admin, hr, or employee" });
    }
    if (role === "admin") {
        return res.status(400).json({ success: false, message: "The system admin role can only be provisioned during initial setup" });
    }
    if (String(req.params.id) === String(req.user.id) && role !== "admin") {
        return res.status(400).json({ success: false, message: "You cannot remove your own admin role" });
    }
    const currentUser = await pool.query("SELECT role FROM users WHERE id = $1", [req.params.id]);
    if (!currentUser.rowCount) return res.status(404).json({ success: false, message: "User not found" });
    if (currentUser.rows[0].role === "admin") {
        return res.status(403).json({ success: false, message: "The system admin account cannot be deleted here" });
    }
    if ((role === "employee") !== (currentUser.rows[0].role === "employee")) {
        return res.status(400).json({
            success: false,
            message: "Employee login accounts must be created and managed from the Employees page"
        });
    }
    const result = await pool.query(
        `UPDATE users SET role = $1
         WHERE id = $2
         RETURNING id, name, email, role, linked_employee_id, created_at`,
        [role, req.params.id]
    );
    if (!result.rowCount) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, user: result.rows[0] });
});

const resetUserPassword = asyncHandler(async (req, res) => {
    const { password } = req.body;
    if (!password || password.length < 8) {
        return res.status(400).json({ success: false, message: "Password must contain at least 8 characters" });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const result = await pool.query(
        "UPDATE users SET password_hash = $1 WHERE id = $2 RETURNING id",
        [passwordHash, req.params.id]
    );
    if (!result.rowCount) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, message: "User password reset successfully" });
});

const deleteUser = asyncHandler(async (req, res) => {
    if (String(req.params.id) === String(req.user.id)) {
        return res.status(400).json({ success: false, message: "You cannot delete your own account" });
    }
    const result = await pool.query("DELETE FROM users WHERE id = $1 RETURNING id", [req.params.id]);
    if (!result.rowCount) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, message: "User deleted successfully" });
});

module.exports = {
    listUsers,
    getUser,
    listRoles,
    createUser,
    updateUser,
    replaceUser,
    updateUserRole,
    resetUserPassword,
    deleteUser
};
