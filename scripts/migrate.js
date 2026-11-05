require("dotenv").config();
const pool = require("../config/db");

const migrate = async () => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id BIGSERIAL PRIMARY KEY,
                name VARCHAR(150) NOT NULL,
                email VARCHAR(255) NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                role VARCHAR(20) NOT NULL DEFAULT 'employee'
                    CHECK (role IN ('admin', 'hr', 'employee')),
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS departments (
                id BIGSERIAL PRIMARY KEY,
                name VARCHAR(150) NOT NULL UNIQUE,
                description TEXT,
                manager VARCHAR(150),
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS employees (
                id BIGSERIAL PRIMARY KEY,
                employee_code VARCHAR(40) UNIQUE,
                user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
                name VARCHAR(150) NOT NULL,
                email VARCHAR(255) NOT NULL UNIQUE,
                department VARCHAR(150),
                salary NUMERIC(12, 2) CHECK (salary IS NULL OR salary >= 0),
                phone VARCHAR(40),
                designation VARCHAR(150),
                joining_date DATE,
                status VARCHAR(20) NOT NULL DEFAULT 'Active',
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );

            ALTER TABLE employees ADD COLUMN IF NOT EXISTS employee_code VARCHAR(40);
            ALTER TABLE employees ADD COLUMN IF NOT EXISTS user_id BIGINT REFERENCES users(id) ON DELETE SET NULL;
            ALTER TABLE employees ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
            ALTER TABLE employees ADD COLUMN IF NOT EXISTS address TEXT;
            ALTER TABLE employees ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(150);
            ALTER TABLE employees ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(40);
            ALTER TABLE employees ADD COLUMN IF NOT EXISTS bank_account_encrypted TEXT;
            ALTER TABLE employees ADD COLUMN IF NOT EXISTS profile_image BYTEA;
            ALTER TABLE employees ADD COLUMN IF NOT EXISTS profile_image_mime VARCHAR(50);
            ALTER TABLE employees ADD COLUMN IF NOT EXISTS annual_paid_leave_days INTEGER NOT NULL DEFAULT 12;
            ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_annual_paid_leave_days_check;
            ALTER TABLE employees ADD CONSTRAINT employees_annual_paid_leave_days_check
                CHECK (annual_paid_leave_days BETWEEN 0 AND 365);
            ALTER TABLE users ADD COLUMN IF NOT EXISTS linked_employee_id BIGINT REFERENCES employees(id) ON DELETE SET NULL;
            UPDATE employees SET employee_code = 'EMP-' || id WHERE employee_code IS NULL;
            CREATE UNIQUE INDEX IF NOT EXISTS employees_employee_code_key ON employees(employee_code);
            CREATE UNIQUE INDEX IF NOT EXISTS employees_user_id_key ON employees(user_id) WHERE user_id IS NOT NULL;
            DROP INDEX IF EXISTS users_linked_employee_id_key;
            UPDATE employees e
            SET user_id = u.id
            FROM users u
            WHERE u.role = 'employee'
              AND e.user_id IS NULL
              AND lower(e.email) = lower(u.email)
              AND NOT EXISTS (
                  SELECT 1 FROM employees linked WHERE linked.user_id = u.id
              );
            CREATE INDEX IF NOT EXISTS employees_department_idx ON employees(department);

            CREATE TABLE IF NOT EXISTS attendance (
                id BIGSERIAL PRIMARY KEY,
                employee_id BIGINT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
                work_date DATE NOT NULL DEFAULT CURRENT_DATE,
                check_in TIMESTAMPTZ,
                check_out TIMESTAMPTZ,
                status VARCHAR(20) NOT NULL DEFAULT 'present',
                UNIQUE (employee_id, work_date)
            );

            CREATE TABLE IF NOT EXISTS leaves (
                id BIGSERIAL PRIMARY KEY,
                employee_id BIGINT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
                start_date DATE NOT NULL,
                end_date DATE NOT NULL CHECK (end_date >= start_date),
                reason TEXT NOT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'approved', 'rejected')),
                reviewed_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
                reviewed_at TIMESTAMPTZ,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
            ALTER TABLE leaves DROP CONSTRAINT IF EXISTS leaves_status_check;
            ALTER TABLE leaves ADD CONSTRAINT leaves_status_check
                CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled'));

            CREATE TABLE IF NOT EXISTS payroll (
                id BIGSERIAL PRIMARY KEY,
                employee_id BIGINT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
                pay_period DATE NOT NULL,
                gross_salary NUMERIC(12, 2) NOT NULL CHECK (gross_salary >= 0),
                deductions NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (deductions >= 0),
                net_salary NUMERIC(12, 2) NOT NULL CHECK (net_salary >= 0),
                payment_date DATE,
                status VARCHAR(20) NOT NULL DEFAULT 'pending',
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                UNIQUE (employee_id, pay_period)
            );

            CREATE TABLE IF NOT EXISTS announcements (
                id BIGSERIAL PRIMARY KEY,
                title VARCHAR(200) NOT NULL,
                body TEXT NOT NULL,
                published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                expires_at TIMESTAMPTZ,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS holidays (
                id BIGSERIAL PRIMARY KEY,
                name VARCHAR(150) NOT NULL,
                holiday_date DATE NOT NULL UNIQUE,
                description TEXT,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS documents (
                id BIGSERIAL PRIMARY KEY,
                employee_id BIGINT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
                original_name VARCHAR(255) NOT NULL,
                mime_type VARCHAR(120) NOT NULL,
                file_data BYTEA NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS password_reset_tokens (
                id BIGSERIAL PRIMARY KEY,
                user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                token_hash CHAR(64) NOT NULL UNIQUE,
                expires_at TIMESTAMPTZ NOT NULL,
                used_at TIMESTAMPTZ,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS password_reset_tokens_user_id_idx
                ON password_reset_tokens(user_id);

            CREATE TABLE IF NOT EXISTS password_reset_otps (
                id BIGSERIAL PRIMARY KEY,
                user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                code_hash CHAR(64) NOT NULL,
                purpose VARCHAR(30) NOT NULL DEFAULT 'password_reset',
                expires_at TIMESTAMPTZ NOT NULL,
                attempt_count SMALLINT NOT NULL DEFAULT 0,
                used_at TIMESTAMPTZ,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
            ALTER TABLE password_reset_otps
                ADD COLUMN IF NOT EXISTS purpose VARCHAR(30) NOT NULL DEFAULT 'password_reset';
            ALTER TABLE password_reset_otps
                ADD COLUMN IF NOT EXISTS attempt_count SMALLINT NOT NULL DEFAULT 0;
            CREATE INDEX IF NOT EXISTS password_reset_otps_user_id_idx
                ON password_reset_otps(user_id, created_at DESC);
        `);
        await client.query("COMMIT");
        console.log("Database migration completed successfully");
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
};

migrate().catch((error) => {
    console.error("Database migration failed:", error.message);
    process.exitCode = 1;
});
