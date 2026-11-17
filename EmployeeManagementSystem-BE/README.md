# Employee Management System API

REST API built with Express and PostgreSQL. The API has three role-based access levels (`admin`, `hr`, `employee`): one system admin, multiple HR accounts, and employee accounts. HR handles daily employee, department, attendance, leave, payroll, document, announcement, and holiday operations. An employee created in the `HR` or `Human Resources` department receives an HR login and setup invitation. Admin manages user access, can view/add/delete employees and departments, and can send announcements to selected HR accounts.

Employee profiles reference departments through `department_id`; the migration
backfills this link from existing department names. Payroll, attendance, leave,
and document records also reference their related employee or user records.

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

Run `npm run migrate` after updating to add announcement authors and private HR
announcement recipients. Existing announcements without recipients remain visible
to all workspaces.

For local development, email can use SMTP configured in the backend `.env`:

```env
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-outlook-email
SMTP_PASS=your-email-provider-password
SMTP_FROM=your-outlook-email
# Optional: absolute path to the SMTP server's trusted CA bundle
SMTP_TLS_CA_FILE=
COMPANY_NAME=Employee Management System
```

The platform provides separate Admin, HR, Employee, IT, Support, and Maintenance roles. Admin can provision service-team accounts from User access. IT, Support, and Maintenance roles only see requests for their own service category; employees and HR can create requests and track their own.

Leave requests support annual, sick, casual, unpaid, parental, bereavement, and compensatory categories. Paid categories use the employee's shared paid-leave allowance; unpaid leave does not reduce that balance. Run `npm run migrate` after updating to add the service request queue and leave category fields.

For Render Free, use Resend's HTTPS API because Render blocks outbound SMTP ports on free web services. Set these backend environment variables in Render (do not commit the API key):

```env
RESEND_API_KEY=re_your_sending_key
RESEND_FROM=Employee Management System <you@your-verified-domain.com>
```

Verify the sending domain in Resend before using your own sender address. The API key takes precedence over SMTP when configured; local development can continue using SMTP by leaving `RESEND_API_KEY` unset. On an existing Render Blueprint, add these variables manually in the service's Environment settings.

Set `FRONTEND_URL` to the browser-accessible frontend address (the Vite development
server defaults to port `5174`). Employee and HR accounts are saved even if the
invitation email cannot be delivered; after fixing the backend email provider, resend the setup email from
the Employees page. Password reset uses
a six-digit email code and does not require opening an email link. Do not commit `.env` or share
SMTP credentials. After adding password recovery, run `npm run migrate` again to
create the password-reset token and OTP tables.

For Outlook/Microsoft 365, use `smtp.office365.com`, port `587`, and
`SMTP_SECURE=false` (STARTTLS). Set `SMTP_USER` and `SMTP_FROM` to the same
mailbox. `SMTP_PASS` must be accepted by your organization's SMTP AUTH policy;
some Microsoft 365 tenants disable SMTP AUTH or app passwords, in which case an
administrator must enable an approved mail-sending method. Never paste mail
credentials into chat or frontend `.env` files. For a custom SMTP server with a
private certificate authority, set `SMTP_TLS_CA_FILE` to the absolute path of the
trusted CA certificate/bundle supplied by the mail-server administrator. Do not
disable TLS certificate verification to work around an untrusted certificate.

Generate and preserve a 32-byte random key in `BANK_DETAILS_ENCRYPTION_KEY`.
Employee bank account numbers are encrypted at rest with AES-256-GCM and only
masked values are returned to the frontend. Losing this key makes stored bank
numbers unreadable. Do not send financial details by email.

The React frontend lives in the sibling `EmployeeManagementSystem-FE` folder. By default,
it connects to the API on the same host as the page at port `5000`; set `VITE_API_URL`
in the frontend `.env` if the API is on another host. Run `npm install` and `npm run dev`
from the frontend folder. Set `FRONTEND_URL` in the backend `.env` to the frontend origin;
multiple allowed origins can be comma-separated. When `FRONTEND_URL` is set, local/private
network origins on the Vite development port `5174` are also allowed.

The API listens on port `5000` by default.

## Authentication

- `POST /api/auth/login` accepts `{ "email": "...", "password": "..." }`.
- Login checks the credentials and opens the matching role workspace automatically. If the same email is used for multiple roles, each account needs a different password.
- Employee logins are created from an invitation; public self-registration is disabled.
- `POST /api/auth/forgot-password` emails a six-digit verification code if the account exists (requires SMTP or Resend configuration).
- `POST /api/auth/verify-reset-otp` accepts `{ "email": "...", "code": "123456" }`; codes expire after 10 minutes and allow at most five attempts.
- `POST /api/auth/verify-employee-invite-otp` accepts `{ "email": "...", "code": "123456" }` to verify an employee's one-time account setup code.
- `POST /api/auth/reset-password` accepts `{ "token": "...", "password": "..." }` to set a new password.
- Send the returned token as `Authorization: Bearer <token>` for protected routes.
- Admin users are provisioned with `npm run create-admin`; the command will not overwrite an existing account.

## API routes

All routes are prefixed with `/api`.

| Module | Endpoints |
|---|---|
| Auth (7) | `POST /auth/login`, `GET /auth/me`, `POST /auth/change-password`, `POST /auth/forgot-password`, `POST /auth/verify-reset-otp`, `POST /auth/verify-employee-invite-otp`, `POST /auth/reset-password` |
| Users (9) | `GET/POST /users`, `GET/PUT/PATCH/DELETE /users/:id`, `GET /users/roles`, `PATCH /users/:id/role`, `POST /users/:id/reset-password` |
| Employees (8) | `GET/POST /employees`, `GET/PUT/PATCH/DELETE /employees/:id`, `GET /employees/:id/photo`, `POST /employees/:id/invite` |
| Departments (6) | `GET/POST /departments`, `GET/PATCH/DELETE /departments/:id`, `GET /departments/:id/employees` |
| Attendance (8) | `GET/POST /attendance`, `GET /attendance/summary`, `GET/PATCH/DELETE /attendance/:id`, `POST /attendance/check-in`, `POST /attendance/check-out` |
| Leaves (8) | `GET/POST /leaves`, `GET/PUT/DELETE /leaves/:id`, `PATCH /leaves/:id/review`, `POST /leaves/:id/cancel`, `GET /leaves/balance/me` |
| Payroll (9) | `GET/POST /payroll`, `GET/PATCH/DELETE /payroll/:id`, `GET /payroll/summary`, `GET /payroll/employee/:employeeId`, `GET /payroll/:id/payslip`, `PATCH /payroll/:id/mark-paid` |
| Dashboard (5) | `GET /dashboard`, `GET /dashboard/attendance`, `GET /dashboard/leaves`, `GET /dashboard/payroll`, `GET /dashboard/employees` |
| Profile (5) | `GET/PUT/PATCH /profile`, `GET /profile/photo`, `GET /profile/activity` |
| Documents (5) | `GET/POST /documents`, `GET /documents/:id`, `GET /documents/:id/download`, `DELETE /documents/:id` |
| Announcements (5) | `GET/POST /announcements`, `GET/PATCH/DELETE /announcements/:id` |
| Holidays (5) | `GET/POST /holidays`, `GET/PATCH/DELETE /holidays/:id` |
| Service requests (4) | `GET /service-requests`, `GET /service-requests/summary`, `POST /service-requests`, `PATCH /service-requests/:id` |

Service request routes are scoped by role and category. `GET /` and `GET /api/test-db` are two additional health endpoints.

Employees can access their own attendance, leave, payroll, profile, and documents. Employee check-in and check-out can each be recorded once per workday; the API rejects duplicate punches. Admin and HR can view and manage organization-wide attendance and leave records; only admins can manage users and delete selected records.
HR users with a linked employee profile can also check in/out directly from the HR Attendance page. Those self-service punches are restricted to the HR user's own linked profile. Employees and HR users can view their attendance by year, month, or specific date; days without either punch are displayed as absent, including weekends and holidays, starting from the employee's joining date.

Creating an employee from the admin/HR employee form also creates a linked employee
login and emails a branded, one-time six-digit account setup code (valid for 24 hours).
Configure the backend email provider and `COMPANY_NAME` first. The employee chooses their own
password; plaintext passwords are never emailed. Employee home address and emergency
contact details are optional and available to authorized admin/HR users and the
employee's own profile. Admin/HR can edit employee details later, add a bank account
number after onboarding, and optionally upload or replace a profile photo. Employees
can view their photo through `GET /api/profile/photo`. Profile photos must be JPG,
PNG, or WebP images no larger than 5 MB and are stored in PostgreSQL. Aadhaar and PAN
are intentionally not collected by this application.

Admins can create role-based HR, IT, Support, and Maintenance logins from **User Access**. HR logins can be linked to an existing employee ID. This reuses the employee
record without creating a duplicate ID or changing the employee's work email.
Create employee logins from **Employees** so each login is linked to its employee
record; standalone employee accounts are rejected.
Admins can also create a separate employee-portal login from **User Access** by
choosing the employee role and linking an existing employee ID. For an HR profile, the employee login may use the same work email as the HR login, but it must use a different password so automatic sign-in can identify the intended workspace.

Each employee receives 12 paid-leave days per calendar year by default. Admin/HR
can change the annual allowance in the employee form. Approved paid leave days use the employee's shared paid-leave allowance; unpaid leave does not reduce it. Unused days do not carry over. Approval is rejected if it would exceed the allowance.

To activate an employee account, open the setup link in the invitation email, enter the one-time code, then create a password. Public self-registration is disabled. Setup codes are one-use and expire after 24 hours; five incorrect attempts
invalidate a code.

Document uploads use multipart form data with a `file` field. PDF, JPG, PNG, and DOCX are accepted, up to 5 MB per file. HR/admin can add a document description and share one upload with multiple employees; each recipient gets a separately permission-scoped document record. Employee uploads remain private to the employee. Files are stored in PostgreSQL.

## Health checks

- `GET /` reports API status and enabled modules.
- `GET /api/test-db` checks the PostgreSQL connection.

Run the database migration again safely after schema updates with `npm run migrate`.
