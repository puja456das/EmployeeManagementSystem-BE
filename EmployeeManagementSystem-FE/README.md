# Employee Management System — Frontend

React, Vite and Tailwind CSS frontend for `EmployeeManagementSystem-BE`.

## Run locally

1. Start PostgreSQL and the backend API from `EmployeeManagementSystem-BE`.
2. Install frontend packages with `npm install`.
3. By default, the API is reached on the same host as the frontend at port `5000`. If it runs on another host, create a local `.env` file and set `VITE_API_URL` (for example, `http://192.168.1.20:5000/api`).
4. Run `npm run dev` and open the URL printed by Vite (default `http://localhost:5174`).

Use the backend's provisioned admin credentials to sign in. The frontend stores the
JWT in browser local storage and sends it as a bearer token to protected API routes.

## Source layout

All frontend source files are under `src/`:

- `App.jsx` maps authenticated admin, HR, and employee routes.
- `pages/admin/` contains the system control center, employee and department
  view/create pages, HR-targeted announcements, profile, and user-access pages.
- `pages/hr/` contains the HR dashboard and daily operations pages for employees,
  departments, attendance, leaves, payroll, documents, announcements, and holidays.
- `pages/employee/` contains separate dashboard, attendance, leaves, payslips,
  documents, announcements, holidays, and profile pages for employee accounts.
- `pages/shared/` contains the shared login page.
- `components/` contains reusable interface pieces such as the employee avatar,
  attendance controls, record dialogs, tables, and status/metric components.
- `config/` contains navigation and resource field definitions.
- `utils/formatters.js` contains shared date, currency, and display helpers.
- `api.js` contains the frontend API client.

Admins and HR users create an employee login along with the employee record. The
employee receives a one-time six-digit email setup code to choose their own
password; no password is sent by email. The sign-in page's **Forgot password?**
link sends a six-digit verification code that expires after 10 minutes. Configure
SMTP in the backend for these emails.
Employees assigned to the `HR` or `Human Resources` department receive an HR
workspace login instead of an employee workspace login.
Both HR and employee attendance pages provide check-in/check-out controls and
attendance history filters for a year, month, or specific date. Calendar days
without check-in or check-out are shown as absent from the employee's joining date.
The HR and employee Holidays pages also display company holidays in a navigable
monthly calendar.

HR accounts sign in using the HR workspace and the password assigned when the
account was created. Admins can send private announcements to selected HR users;
those notices are not shown to other HR accounts or employees.

## Background assets

The sign-in page uses `src/assets/EMS.webp` as its responsive background image.
Replace that file to customize the artwork.

## Workspace scripts

From the repository root, use `npm run dev:backend`, `npm run dev:frontend`,
`npm run start:backend`, and `npm run build:frontend`.
