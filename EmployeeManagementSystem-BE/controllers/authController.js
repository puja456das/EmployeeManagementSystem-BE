const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const pool = require("../config/db");
const generateToken = require("../utils/generateToken");
const generateEmployeeId = require("../utils/generateEmployeeId");
const asyncHandler = require("../utils/asyncHandler");
const { sendPasswordResetOtp } = require("../utils/email");

const matchesOtpHash = (storedHash, expectedHash) => {
    if (!/^[a-f0-9]{64}$/i.test(storedHash || "")) return false;
    const stored = Buffer.from(storedHash, "hex");
    const expected = Buffer.from(expectedHash, "hex");
    return stored.length === expected.length && crypto.timingSafeEqual(stored, expected);
};

const register = asyncHandler(async (req, res) => {
    const { name, email, password } = req.body;
    if (!name?.trim() || !email?.trim() || !password) {
        return res.status(400).json({ success: false, message: "Name, email, and password are required" });
    }
    if (password.length < 8) {
        return res.status(400).json({ success: false, message: "Password must contain at least 8 characters" });
    }
    const client = await pool.connect();
    let user;
    try {
        await client.query("BEGIN");
        const passwordHash = await bcrypt.hash(password, 12);
        const result = await client.query(
            `INSERT INTO users (name, email, password_hash, role)
             VALUES ($1, lower($2), $3, 'employee')
             RETURNING id, name, email, role, created_at`,
            [name.trim(), email.trim(), passwordHash]
        );
        user = result.rows[0];
        const linkedEmployee = await client.query(
            `UPDATE employees SET user_id = $1
             WHERE lower(email) = lower($2) AND user_id IS NULL RETURNING id`,
            [user.id, email.trim()]
        );
        if (!linkedEmployee.rowCount) {
            await client.query(
                `INSERT INTO employees (employee_code, user_id, name, email, joining_date)
                 VALUES ($1, $2, $3, lower($4), CURRENT_DATE)`,
                [generateEmployeeId(), user.id, name.trim(), email.trim()]
            );
        }
        await client.query("COMMIT");
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
    res.status(201).json({ success: true, user, token: generateToken(user) });
});

const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ success: false, message: "Email and password are required" });
    }
    const result = await pool.query(
        "SELECT id, name, email, role, password_hash FROM users WHERE lower(email) = lower($1)",
        [email.trim()]
    );
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
        return res.status(401).json({ success: false, message: "Invalid email or password" });
    }
    delete user.password_hash;
    res.json({ success: true, user, token: generateToken(user) });
});

const me = asyncHandler(async (req, res) => {
    const result = await pool.query(
        "SELECT id, name, email, role, created_at FROM users WHERE id = $1",
        [req.user.id]
    );
    if (!result.rowCount) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, user: result.rows[0] });
});

const changePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
        return res.status(400).json({ success: false, message: "Current and new passwords are required" });
    }
    if (newPassword.length < 8) {
        return res.status(400).json({ success: false, message: "New password must contain at least 8 characters" });
    }
    const result = await pool.query("SELECT password_hash FROM users WHERE id = $1", [req.user.id]);
    if (!result.rowCount || !(await bcrypt.compare(currentPassword, result.rows[0].password_hash))) {
        return res.status(400).json({ success: false, message: "Current password is incorrect" });
    }
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await pool.query("UPDATE users SET password_hash = $1 WHERE id = $2", [passwordHash, req.user.id]);
    res.json({ success: true, message: "Password changed successfully" });
});

const requestPasswordReset = asyncHandler(async (req, res) => {
    const email = String(req.body.email || "").trim().toLowerCase();
    if (!email) {
        return res.status(400).json({ success: false, message: "Enter the email address for your account" });
    }
    const result = await pool.query(
        "SELECT id, name, email FROM users WHERE lower(email) = $1",
        [email]
    );

    if (result.rowCount) {
        const user = result.rows[0];
        const recentCode = await pool.query(
            `SELECT id FROM password_reset_otps
             WHERE user_id = $1 AND purpose = 'password_reset'
               AND created_at > NOW() - INTERVAL '1 minute'
             LIMIT 1`,
            [user.id]
        );
        if (recentCode.rowCount) {
            return res.json({
                success: true,
                message: "If an account exists for that email, a verification code has been sent."
            });
        }
        const code = String(crypto.randomInt(0, 1000000)).padStart(6, "0");
        const codeHash = crypto.createHmac("sha256", process.env.JWT_SECRET)
            .update(`${user.id}:${code}`).digest("hex");
        const client = await pool.connect();
        try {
            await client.query("BEGIN");
            await client.query(
                "UPDATE password_reset_otps SET used_at = NOW() WHERE user_id = $1 AND purpose = 'password_reset' AND used_at IS NULL",
                [user.id]
            );
            await client.query(
                `INSERT INTO password_reset_otps (user_id, code_hash, purpose, expires_at)
                 VALUES ($1, $2, 'password_reset', NOW() + INTERVAL '10 minutes')`,
                [user.id, codeHash]
            );
            await client.query("COMMIT");
        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }

        try {
            await sendPasswordResetOtp(user, code);
        } catch (error) {
            await pool.query(
                "UPDATE password_reset_otps SET used_at = NOW() WHERE user_id = $1 AND purpose = 'password_reset' AND code_hash = $2 AND used_at IS NULL",
                [user.id, codeHash]
            );
            throw error;
        }
    }

    res.json({
        success: true,
        message: "If an account exists for that email, a verification code has been sent."
    });
});

const verifyPasswordResetOtp = asyncHandler(async (req, res) => {
    const email = String(req.body.email || "").trim().toLowerCase();
    const code = String(req.body.code || "").trim();
    if (!email || !/^\d{6}$/.test(code)) {
        return res.status(400).json({ success: false, message: "Enter the email address and 6-digit verification code" });
    }
    const userResult = await pool.query(
        "SELECT id FROM users WHERE lower(email) = $1",
        [email]
    );
    if (!userResult.rowCount) {
        return res.status(400).json({ success: false, message: "The verification code is invalid or expired. Request a new code." });
    }
    const userId = userResult.rows[0].id;
    const client = await pool.connect();
    let resetToken;
    try {
        await client.query("BEGIN");
        const otpResult = await client.query(
            `SELECT id, code_hash, attempt_count FROM password_reset_otps
             WHERE user_id = $1 AND purpose = 'password_reset'
               AND used_at IS NULL AND expires_at > NOW() AND attempt_count < 5
             ORDER BY created_at DESC LIMIT 1 FOR UPDATE`,
            [userId]
        );
        if (!otpResult.rowCount) {
            await client.query("ROLLBACK");
            return res.status(400).json({ success: false, message: "The verification code is invalid or expired. Request a new code." });
        }
        const otp = otpResult.rows[0];
        const expectedHash = crypto.createHmac("sha256", process.env.JWT_SECRET)
            .update(`${userId}:${code}`).digest("hex");
        const valid = matchesOtpHash(otp.code_hash, expectedHash);
        if (!valid) {
            const attempts = Number(otp.attempt_count) + 1;
            await client.query(
                "UPDATE password_reset_otps SET attempt_count = $1, used_at = CASE WHEN $1 >= 5 THEN NOW() ELSE used_at END WHERE id = $2",
                [attempts, otp.id]
            );
            await client.query("COMMIT");
            return res.status(400).json({
                success: false,
                message: attempts >= 5
                    ? "Too many incorrect codes. Request a new verification code."
                    : "The verification code is incorrect."
            });
        }
        await client.query("UPDATE password_reset_otps SET used_at = NOW() WHERE id = $1", [otp.id]);
        await client.query(
            "UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL",
            [userId]
        );
        resetToken = crypto.randomBytes(32).toString("hex");
        const tokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");
        await client.query(
            `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
             VALUES ($1, $2, NOW() + INTERVAL '10 minutes')`,
            [userId, tokenHash]
        );
        await client.query("COMMIT");
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
    res.json({ success: true, token: resetToken, message: "Email verified. You can now set a new password." });
});

const verifyEmployeeInviteOtp = asyncHandler(async (req, res) => {
    const email = String(req.body.email || "").trim().toLowerCase();
    const code = String(req.body.code || "").trim();
    if (!email || !/^\d{6}$/.test(code)) {
        return res.status(400).json({ success: false, message: "Enter the work email and 6-digit setup code" });
    }
    const userResult = await pool.query(
        `SELECT id FROM users WHERE lower(email) = $1 AND role = 'employee'`,
        [email]
    );
    if (!userResult.rowCount) {
        return res.status(400).json({ success: false, message: "The setup code is invalid or expired. Contact your administrator." });
    }
    const userId = userResult.rows[0].id;
    const client = await pool.connect();
    let resetToken;
    try {
        await client.query("BEGIN");
        const otpResult = await client.query(
            `SELECT id, code_hash, attempt_count FROM password_reset_otps
             WHERE user_id = $1 AND purpose = 'employee_invite'
               AND used_at IS NULL AND expires_at > NOW() AND attempt_count < 5
             ORDER BY created_at DESC LIMIT 1 FOR UPDATE`,
            [userId]
        );
        if (!otpResult.rowCount) {
            await client.query("ROLLBACK");
            return res.status(400).json({ success: false, message: "The setup code is invalid or expired. Contact your administrator." });
        }
        const otp = otpResult.rows[0];
        const expectedHash = crypto.createHmac("sha256", process.env.JWT_SECRET)
            .update(`${userId}:${code}`).digest("hex");
        const valid = matchesOtpHash(otp.code_hash, expectedHash);
        if (!valid) {
            const attempts = Number(otp.attempt_count) + 1;
            await client.query(
                "UPDATE password_reset_otps SET attempt_count = $1, used_at = CASE WHEN $1 >= 5 THEN NOW() ELSE used_at END WHERE id = $2",
                [attempts, otp.id]
            );
            await client.query("COMMIT");
            return res.status(400).json({
                success: false,
                message: attempts >= 5
                    ? "Too many incorrect codes. Contact your administrator for a new setup code."
                    : "The setup code is incorrect."
            });
        }
        await client.query("UPDATE password_reset_otps SET used_at = NOW() WHERE id = $1", [otp.id]);
        await client.query(
            "UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL",
            [userId]
        );
        resetToken = crypto.randomBytes(32).toString("hex");
        const tokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");
        await client.query(
            `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
             VALUES ($1, $2, NOW() + INTERVAL '30 minutes')`,
            [userId, tokenHash]
        );
        await client.query("COMMIT");
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
    res.json({ success: true, token: resetToken, message: "Email verified. You can now set your password." });
});

const resetPassword = asyncHandler(async (req, res) => {
    const { token, password } = req.body;
    if (!token || typeof password !== "string" || password.length < 8) {
        return res.status(400).json({
            success: false,
            message: "A valid password reset token and a password of at least 8 characters are required"
        });
    }
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const passwordHash = await bcrypt.hash(password, 12);
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const reset = await client.query(
            `UPDATE password_reset_tokens
             SET used_at = NOW()
             WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()
             RETURNING user_id`,
            [tokenHash]
        );
        if (!reset.rowCount) {
            await client.query("ROLLBACK");
            return res.status(400).json({
                success: false,
                message: "This password reset link is invalid or has expired. Request a new one."
            });
        }
        await client.query("UPDATE users SET password_hash = $1 WHERE id = $2", [
            passwordHash, reset.rows[0].user_id
        ]);
        await client.query(
            "UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL",
            [reset.rows[0].user_id]
        );
        await client.query("COMMIT");
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
    res.json({ success: true, message: "Password reset successfully. You can now sign in." });
});

module.exports = {
    register,
    login,
    me,
    changePassword,
    requestPasswordReset,
    verifyPasswordResetOtp,
    verifyEmployeeInviteOtp,
    resetPassword
};
