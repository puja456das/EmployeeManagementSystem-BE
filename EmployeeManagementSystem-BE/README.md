# Employee Management System API

REST API built with Express and PostgreSQL. The API has authentication and role-based access (`admin`, `hr`, `employee`) for employee, department, attendance, leave, payroll, profile, document, announcement, holiday, and dashboard modules.

## Requirements

- Node.js 20 or newer
- PostgreSQL (local or hosted)

## Source layout

- `routes/` defines the HTTP endpoints for each feature.
- `controllers/` contains the matching request handlers and business logic.
- `middleware/` contains authentication, authorization, validation, and upload handling.
- `config/` contains database configuration.
- `utils/` contains shared helpers used across backend modules.

## Setup

1. Install dependencies with `npm install`.
2. Keep your existing `.env` and confirm it contains `PORT` and `DATABASE_URL`. Add a long, random `JWT_SECRET` for authentication. Hosted Neon and Render database URLs automatically use SSL.
3. Create the database, then run `npm run migrate`.
4. Set `ADMIN_NAME`, `ADMIN_EMAIL`, and a unique `ADMIN_PASSWORD` of at least 12 characters in `.env`, then run `npm run create-admin`.
5. Start with `npm run dev` or `npm start`.

To send forgot-password verification codes, configure SMTP in the backend `.env`:

```env
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-outlook-email
SMTP_PASS=your-email-provider-password
SMTP_FROM=your-outlook-email
COMPANY_NAME=Employee Management System
```

Set `FRONTEND_URL` to the browser-accessible frontend address. Password reset uses
a six-digit email code and does not require opening an email link. Do not commit `.env` or share
SMTP credentials. After adding password recovery, run `npm run migrate` again to
create the password-reset token and OTP tables.

For Outlook/Microsoft 365, use `smtp.office365.com`, port `587`, and
`SMTP_SECURE=false` (STARTTLS). Set `SMTP_USER` and `SMTP_FROM` to the same
mailbox. `SMTP_PASS` must be accepted by your organization's SMTP AUTH policy;
some Microsoft 365 tenants disable SMTP AUTH or app passwords, in which case an
administrator must enable an approved mail-sending method. Never paste mail
credentials into chat or frontend `.env` files.

Generate and preserve a 32-byte random key in `BANK_DETAILS_ENCRYPTION_KEY`.
Employee bank account numbers are encrypted at rest with AES-256-GCM and only
masked values are returned to the frontend. Losing this key makes stored bank
numbers unreadable. Do not send financial details by email.

The React frontend lives in the sibling `EmployeeManagementSystem-FE` folder. Configure
`VITE_API_URL` there if the API is not available at `http://localhost:5000/api`, then
run `npm install` and `npm run dev` from the frontend folder. Set `FRONTEND_URL` in the
backend `.env` to the frontend origin (usually `http://localhost:5173`).

The API listens on port `5000` by default. Set `FRONTEND_URL` to the frontend origin; multiple allowed origins can be comma-separated.

## Authentication

- `POST /api/auth/login` accepts `{ "email": "...", "password": "..." }`.
- `POST /api/auth/register` creates a basic employee account and profile. It never allows public admin or HR registration.
- `POST /api/auth/forgot-password` emails a six-digit verification code if the account exists (requires SMTP configuration).
- `POST /api/auth/verify-reset-otp` accepts `{ "email": "...", "code": "123456" }`; codes expire after 10 minutes and allow at most five attempts.
- `POST /api/auth/verify-employee-invite-otp` accepts `{ "email": "...", "code": "123456" }` to verify an employee's one-time account setup code.
- `POST /api/auth/reset-password` accepts `{ "token": "...", "password": "..." }` to set a new password.
- Send the returned token as `Authorization: Bearer <token>` for protected routes.
- Admin users are provisioned with `npm run create-admin`; the command will not overwrite an existing account.

## API routes

All routes are prefixed with `/api`.

| Module | Endpoints |
|---|---|
| Auth (8) | `POST /auth/register`, `POST /auth/login`, `GET /auth/me`, `POST /auth/change-password`, `POST /auth/forgot-password`, `POST /auth/verify-reset-otp`, `POST /auth/verify-employee-invite-otp`, `POST /auth/reset-password` |
| Users (9) | `GET/POST /users`, `GET/PUT/PATCH/DELETE /users/:id`, `GET /users/roles`, `PATCH /users/:id/role`, `POST /users/:id/reset-password` |
| Employees (7) | `GET/POST /employees`, `GET/PUT/PATCH/DELETE /employees/:id`, `GET /employees/:id/photo` |
| Departments (6) | `GET/POST /departments`, `GET/PATCH/DELETE /departments/:id`, `GET /departments/:id/employees` |
| Attendance (8) | `GET/POST /attendance`, `GET /attendance/summary`, `GET/PATCH/DELETE /attendance/:id`, `POST /attendance/check-in`, `POST /attendance/check-out` |
| Leaves (8) | `GET/POST /leaves`, `GET/PUT/DELETE /leaves/:id`, `PATCH /leaves/:id/review`, `POST /leaves/:id/cancel`, `GET /leaves/balance/me` |
| Payroll (9) | `GET/POST /payroll`, `GET/PATCH/DELETE /payroll/:id`, `GET /payroll/summary`, `GET /payroll/employee/:employeeId`, `GET /payroll/:id/payslip`, `PATCH /payroll/:id/mark-paid` |
| Dashboard (5) | `GET /dashboard`, `GET /dashboard/attendance`, `GET /dashboard/leaves`, `GET /dashboard/payroll`, `GET /dashboard/employees` |
| Profile (5) | `GET/PUT/PATCH /profile`, `GET /profile/photo`, `GET /profile/activity` |
| Documents (5) | `GET/POST /documents`, `GET /documents/:id`, `GET /documents/:id/download`, `DELETE /documents/:id` |
| Announcements (5) | `GET/POST /announcements`, `GET/PATCH/DELETE /announcements/:id` |
| Holidays (5) | `GET/POST /holidays`, `GET/PATCH/DELETE /holidays/:id` |

These are 77 module endpoints. `GET /` and `GET /api/test-db` are two additional health endpoints.

Employees can access their own attendance, leave, payroll, profile, and documents. Employee check-in and check-out can each be recorded once per workday; the API rejects duplicate punches. Admin and HR can view and manage organization-wide attendance and leave records; only admins can manage users and delete selected records.

Creating an employee from the admin/HR employee form also creates a linked employee
login and emails a branded, one-time six-digit account setup code (valid for 24 hours).
Configure SMTP and `COMPANY_NAME` in `.env` first. The employee chooses their own
password; plaintext passwords are never emailed. Employee home address and emergency
contact details are optional and available to authorized admin/HR users and the
employee's own profile. Admin/HR can edit employee details later, add a bank account
number after onboarding, and optionally upload or replace a profile photo. Employees
can view their photo through `GET /api/profile/photo`. Profile photos must be JPG,
PNG, or WebP images no larger than 5 MB and are stored in PostgreSQL. Aadhaar and PAN
are intentionally not collected by this application.

Admins can create separate admin/HR login credentials from **User Access** and
optionally link the account to an existing employee ID. This reuses the employee
record without creating a duplicate ID or changing the employee's work email.
Create employee logins from **Employees** so each login is linked to its employee
record; standalone employee accounts are rejected.
Admins can also create a separate employee-portal login from **User Access** by
choosing the employee role and linking an existing employee ID. Email aliases such
as `name+1@example.com` can be used as separate login names when the mail provider
routes plus-addresses to the same inbox.

Each employee receives 12 paid-leave days per calendar year by default. Admin/HR
can change the annual allowance in the employee form. Approved calendar days are
deducted from that year's balance; unused days do not carry over. Approval is
rejected if it would exceed the employee's annual allowance.

To activate an account, employees open the frontend, select **Set up employee account**,
enter the work email and setup code from the welcome email, then create their own
password. Setup codes are one-use and expire after 24 hours; five incorrect attempts
invalidate a code.

Document uploads use multipart form data with a `file` field. PDF, JPG, PNG, and DOCX are accepted, up to 5 MB per file. Files are stored in PostgreSQL.

## Health checks

- `GET /` reports API status and enabled modules.
- `GET /api/test-db` checks the PostgreSQL connection.

Run the database migration again safely after schema updates with `npm run migrate`.
