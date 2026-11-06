# Employee Management System

A full-stack employee management application with a React/Vite frontend and an
Express/PostgreSQL API.

## Features

- Role-based workspaces for admins, HR users, and employees
- Employee profiles, departments, and account management
- Attendance records, employee check-in/check-out, and summaries
- Leave requests, approvals, and paid-leave balances
- Payroll records and employee payslips
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
npm --prefix EmployeeManagementSystem-BE install
npm --prefix EmployeeManagementSystem-FE install
npm --prefix EmployeeManagementSystem-BE run migrate
npm --prefix EmployeeManagementSystem-BE run create-admin
```

Database migrations create or update the application's tables. Back up
important database data before changing application versions or rerunning a
migration.

The interface includes the admin/HR dashboard, employee and department
management, attendance, leave requests, payroll, documents, announcements,
holidays, user access, and profile pages. Employee accounts have their own
dashboard, profile, attendance check-in/out, leave, payslip, document, holiday,
and announcement views. The backend API provides authentication and the
corresponding protected modules.

## Start the application

Open two terminals in the workspace root and leave both running.

**Terminal 1 — backend API**

```powershell
npm run dev:backend
```

The API listens on the port set by the backend `.env` (default `5000`).
`http://localhost:5000/` lists the API modules and
`http://localhost:5000/api/test-db` checks the database connection.

**Terminal 2 — frontend**

```powershell
npm run dev:frontend
```

Open the Vite URL printed in the terminal (normally `http://localhost:5173`)
and sign in with the admin account configured in the backend `.env`.

## Production checks

Build the frontend with:

```powershell
npm run build:frontend
```

For detailed API routes, database requirements, and email configuration, see
[`EmployeeManagementSystem-BE/README.md`](./EmployeeManagementSystem-BE/README.md)
and [`EmployeeManagementSystem-FE/README.md`](./EmployeeManagementSystem-FE/README.md).
