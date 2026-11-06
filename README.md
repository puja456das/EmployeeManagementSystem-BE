# Employee Management System

A full-stack employee management application with a React/Vite frontend and an
Express/PostgreSQL API.

## Features

- Three role-based workspaces: one system admin, multiple HR users, and employees
- Employee profiles, departments, and account management
- Existing employee profiles are matched by work email and retain their Employee ID when edited
- Department membership linked with database foreign keys
- Attendance records, employee check-in/check-out, and summaries
- Leave requests, approvals, and paid-leave balances
- Payroll records and employee payslips
- Indian Rupee (₹) salary and payroll display
- Documents, announcements, and company holidays
- Profile photos, password recovery, and encrypted bank-account storage

## Requirements

- Node.js 20 or newer
- A PostgreSQL database

## Environment configuration

Keep the existing `EmployeeManagementSystem-BE/.env` and
`EmployeeManagementSystem-FE/.env` files. Do not paste or commit their contents.
The backend `.env` is the configuration used by this project. Preserve its
database credentials, admin settings, JWT secret, and encryption key.

The backend environment supplies the API port, PostgreSQL connection, admin
account, JWT signing secret, and bank-details encryption key. Keep the existing
`BANK_DETAILS_ENCRYPTION_KEY` unchanged: changing or losing it makes previously
encrypted bank account numbers unreadable.

Employees can sign in with either their work email or Employee ID and the
password they set up. HR accounts use their own login and HR workspace and can
be linked to an existing employee profile from **User access**. The system
admin uses the configured `ADMIN_EMAIL` and has a separate admin workspace.
Linking the system admin to an employee profile can create an employee-role
login using that same work email and a separate employee password; the login
uses the password to select the correct workspace. SMTP must be configured for
this setup invitation.
The system admin is created from `ADMIN_NAME`, `ADMIN_EMAIL`, and
`ADMIN_PASSWORD`; the database allows only one admin. HR accounts can be
created in **User access** and linked to existing employee profiles, preserving
their Employee IDs. Multiple HR accounts are supported.

SMTP settings are optional for ordinary use, but required for password recovery
and employee invitation emails. The frontend's `VITE_API_URL` should point to
the backend API, normally `http://localhost:5000/api`.

The PostgreSQL database named in `DATABASE_URL` must already exist and be
reachable. For a first-time setup only, run the migration and provision the
admin account as described below. Do not rerun admin provisioning if the
account already exists.

## Install and initialize

Run each command from the workspace root:

```powershell
npm install
npm --prefix EmployeeManagementSystem-BE install
npm --prefix EmployeeManagementSystem-FE install
npm --prefix EmployeeManagementSystem-BE run migrate
npm --prefix EmployeeManagementSystem-BE run create-admin
```

Database migrations create or update the application's tables. Back up
important database data before changing application versions or rerunning a
migration.

After updating an existing database, run the migration once to add any
previously used employee department names to the department list and link
employee profiles to departments. The migration preserves existing department
assignments while adding the foreign-key relationship.

The interface includes the admin/HR dashboard, employee and department
management, attendance, leave requests, payroll, documents, announcements,
holidays, user access, and profile pages. Employee accounts have their own
dashboard, profile, attendance check-in/out, leave, payslip, document, holiday,
and announcement views. The backend API provides authentication and the
corresponding protected modules.

## Start the application

Start the backend API and frontend together from the workspace root:

```powershell
npm run dev
```

The terminal shows both processes. Open the Vite URL it prints (normally
`http://localhost:5173`) and sign in with the admin account configured in the
backend `.env`. Press `Ctrl+C` to stop both processes. The API listens on the
port set by the backend `.env` (default `5000`); `http://localhost:5000/` lists
the API modules and `http://localhost:5000/api/test-db` checks the database
connection.

## Production checks

Build the frontend with:

```powershell
npm run build:frontend
```

For detailed API routes, database requirements, and email configuration, see
[`EmployeeManagementSystem-BE/README.md`](./EmployeeManagementSystem-BE/README.md)
and [`EmployeeManagementSystem-FE/README.md`](./EmployeeManagementSystem-FE/README.md).
