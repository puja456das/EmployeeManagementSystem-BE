# Employee Management System — Frontend

React, Vite and Tailwind CSS frontend for `EmployeeManagementSystem-BE`.

## Run locally

1. Start PostgreSQL and the backend API from `EmployeeManagementSystem-BE`.
2. Install frontend packages with `npm install`.
3. If the API is not at `http://localhost:5000/api`, create a local `.env` file and set `VITE_API_URL`.
4. Run `npm run dev` and open the URL printed by Vite (default `http://localhost:5173`).

Use the backend's provisioned admin credentials to sign in. The frontend stores the
JWT in browser local storage and sends it as a bearer token to protected API routes.

Admins and HR users create an employee login along with the employee record. The
employee receives a one-time email link to choose their own password; no password
is sent by email. The sign-in page's **Forgot password?** link sends a one-hour,
single-use reset link. Configure SMTP in the backend for these emails.

## Background assets

Add your own images under `public/assets/`. The sign-in background is
`/assets/login-background.jpg`; replace it with your image using that filename.
The directory README includes optional asset suggestions.

## Workspace scripts

From the repository root, use `npm run dev:backend`, `npm run dev:frontend`,
`npm run start:backend`, and `npm run build:frontend`.
