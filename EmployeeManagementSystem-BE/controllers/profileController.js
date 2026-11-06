const bcrypt = require("bcryptjs");
const pool = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");
const { maskBankAccount } = require("../utils/bankDetails");
const { getEmployeeIdForUser } = require("../utils/employeeAccount");

const getProfile = asyncHandler(async (req, res) => {
    const result = await pool.query(
        `SELECT u.id, u.name, u.email, u.role, e.email AS employee_email, e.employee_code, e.department, e.designation,
                e.annual_paid_leave_days,
                e.phone, e.joining_date, e.status, e.address,
                e.emergency_contact_name, e.emergency_contact_phone, e.bank_account_encrypted,
                e.profile_image IS NOT NULL AS has_profile_image
         FROM users u
         LEFT JOIN employees e ON e.id = COALESCE(
             u.linked_employee_id,
             (SELECT primary_employee.id FROM employees primary_employee WHERE primary_employee.user_id = u.id)
         )
         WHERE u.id = $1`,
        [req.user.id]
    );
    if (!result.rowCount) return res.status(404).json({ success: false, message: "Profile not found" });
    const { bank_account_encrypted: encrypted, ...profile } = result.rows[0];
    res.json({ success: true, profile: { ...profile, bank_account_masked: maskBankAccount(encrypted) } });
});

const getProfilePhoto = asyncHandler(async (req, res) => {
    const employeeId = await getEmployeeIdForUser(req.user.id);
    if (!employeeId) {
        return res.status(404).json({ success: false, message: "No employee profile is linked to this account" });
    }
    const result = await pool.query(
        "SELECT profile_image, profile_image_mime FROM employees WHERE id = $1",
        [employeeId]
    );
    if (!result.rowCount || !result.rows[0].profile_image) {
        return res.status(404).json({ success: false, message: "Profile photo not found" });
    }
    res.set("Cache-Control", "private, no-store");
    res.type(result.rows[0].profile_image_mime).send(result.rows[0].profile_image);
});

const updateProfile = asyncHandler(async (req, res) => {
    const {
        name, phone, address, emergency_contact_name, emergency_contact_phone, password
    } = req.body;
    if (name !== undefined && !name.trim()) {
        return res.status(400).json({ success: false, message: "Name cannot be empty" });
    }
    const employeeId = await getEmployeeIdForUser(req.user.id);
    if (name !== undefined) {
        const client = await pool.connect();
        try {
            await client.query("BEGIN");
            await client.query("UPDATE users SET name = $1 WHERE id = $2", [name.trim(), req.user.id]);
            if (employeeId) {
                await client.query("UPDATE employees SET name = $1 WHERE id = $2", [name.trim(), employeeId]);
            }
            await client.query("COMMIT");
        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }
    }
    if (phone !== undefined && employeeId) {
        await pool.query("UPDATE employees SET phone = $1 WHERE id = $2", [phone, employeeId]);
    }
    if (address !== undefined && employeeId) {
        await pool.query("UPDATE employees SET address = $1 WHERE id = $2", [address || null, employeeId]);
    }
    if (emergency_contact_name !== undefined && employeeId) {
        await pool.query(
            "UPDATE employees SET emergency_contact_name = $1 WHERE id = $2",
            [emergency_contact_name || null, employeeId]
        );
    }
    if (emergency_contact_phone !== undefined && employeeId) {
        await pool.query(
            "UPDATE employees SET emergency_contact_phone = $1 WHERE id = $2",
            [emergency_contact_phone || null, employeeId]
        );
    }
    if (password) {
        if (password.length < 8) {
            return res.status(400).json({ success: false, message: "Password must contain at least 8 characters" });
        }
        const hash = await bcrypt.hash(password, 12);
        await pool.query("UPDATE users SET password_hash = $1 WHERE id = $2", [hash, req.user.id]);
    }
    res.json({ success: true, message: "Profile updated successfully" });
});

const replaceProfile = (req, res, next) => {
    if (!req.body.name?.trim()) {
        return res.status(400).json({ success: false, message: "Name is required" });
    }
    updateProfile(req, res, next);
};

const getActivity = asyncHandler(async (req, res) => {
    const employeeId = await getEmployeeIdForUser(req.user.id);
    if (!employeeId) {
        return res.json({ success: true, data: { attendance: [], leaves: [] } });
    }
    const [attendance, leaves] = await Promise.all([
        pool.query(
            "SELECT * FROM attendance WHERE employee_id = $1 ORDER BY work_date DESC LIMIT 10",
            [employeeId]
        ),
        pool.query(
            "SELECT * FROM leaves WHERE employee_id = $1 ORDER BY created_at DESC LIMIT 10",
            [employeeId]
        )
    ]);
    res.json({ success: true, data: { attendance: attendance.rows, leaves: leaves.rows } });
});

module.exports = { getProfile, getProfilePhoto, updateProfile, replaceProfile, getActivity };
