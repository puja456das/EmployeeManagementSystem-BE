require("dotenv").config();
const bcrypt = require("bcryptjs");
const pool = require("../config/db");

const createAdmin = async () => {
    const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
    if (!ADMIN_NAME || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
        throw new Error("Set ADMIN_NAME, ADMIN_EMAIL, and ADMIN_PASSWORD in .env before creating the first admin");
    }
    if (ADMIN_PASSWORD.length < 12) {
        throw new Error("ADMIN_PASSWORD must contain at least 12 characters");
    }

    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
    const result = await pool.query(
        `INSERT INTO users (name, email, password_hash, role)
         VALUES ($1, lower($2), $3, 'admin')
         ON CONFLICT (email) DO NOTHING
         RETURNING id, name, email, role`,
        [ADMIN_NAME.trim(), ADMIN_EMAIL.trim(), passwordHash]
    );
    if (!result.rowCount) {
        throw new Error("An account already uses ADMIN_EMAIL; no account was changed");
    }
    console.log(`Admin account created: ${result.rows[0].email}`);
};

createAdmin()
    .catch((error) => {
        console.error("Could not create admin:", error.message);
        process.exitCode = 1;
    })
    .finally(() => pool.end());
