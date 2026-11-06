import { Bell, BriefcaseBusiness, CalendarDays, Clock3, CreditCard, FileText, ShieldCheck, Sparkles, UserRound, Users } from "lucide-react";

export const configs = {
  employees: {
    title: "Employees", subtitle: "Manage your people, roles and employee information.", endpoint: "/employees", rowKey: "employees",
    fields: [
      { name: "name", label: "Full name", required: true }, { name: "email", label: "Work email", type: "email", required: true },
      { name: "department", label: "Department", required: true }, { name: "designation", label: "Job title" },
      { name: "annual_paid_leave_days", label: "Annual paid leave allowance", type: "number", min: 0, max: 365, helper: "Paid leave is allocated each calendar year; approved calendar days are deducted." },
      { name: "phone", label: "Phone number", type: "tel" }, { name: "salary", label: "Monthly salary", type: "number", required: true },
      { name: "bank_account_number", label: "Bank account number", helper: "Encrypted before saving. Leave blank when editing to keep the current value; add it later whenever it is available." },
      { name: "joining_date", label: "Joining date", type: "date" },
      { name: "address", label: "Home address", type: "textarea" },
      { name: "emergency_contact_name", label: "Emergency contact name" },
      { name: "emergency_contact_phone", label: "Emergency contact phone", type: "tel" },
      { name: "status", label: "Status", type: "select", options: ["Active", "Inactive"] }
    ],
    columns: [["employee_code", "ID"], ["name", "Employee"], ["department", "Department"], ["designation", "Job title"], ["annual_paid_leave_days", "Paid leave / year"], ["email", "Email"], ["bank_account_masked", "Bank account"], ["status", "Status"]]
  },
  departments: {
    title: "Departments", subtitle: "Keep teams organized and see how your company is structured.", endpoint: "/departments",
    fields: [{ name: "name", label: "Department name", required: true }, { name: "manager", label: "Department lead" }, { name: "description", label: "Description", type: "textarea" }],
    columns: [["name", "Department"], ["manager", "Department lead"], ["description", "Description"]]
  },
  attendance: {
    title: "Attendance", subtitle: "A clear view of daily attendance and working hours.", endpoint: "/attendance",
    fields: [
      { name: "employee_id", label: "Employee", type: "employee", required: true },
      { name: "work_date", label: "Work date", type: "date", required: true },
      { name: "check_in", label: "Check-in time", type: "datetime-local" },
      { name: "check_out", label: "Check-out time", type: "datetime-local" },
      { name: "status", label: "Status", type: "select", options: ["present", "late", "half-day", "absent"] }
    ],
    columns: [["employee_code", "Employee ID"], ["employee_name", "Employee"], ["work_date", "Date"], ["check_in", "Check in"], ["check_out", "Check out"], ["status", "Status"]]
  },
  leaves: {
    title: "Leave requests", subtitle: "Review requests and keep time off running smoothly.", endpoint: "/leaves",
    fields: [{ name: "employee_id", label: "Employee", type: "employee", required: true }, { name: "start_date", label: "Start date", type: "date", required: true }, { name: "end_date", label: "End date", type: "date", required: true }, { name: "reason", label: "Reason", type: "textarea", required: true }],
    columns: [["employee_code", "Employee ID"], ["employee_name", "Employee"], ["start_date", "From"], ["end_date", "To"], ["requested_days", "Days"], ["reason", "Reason"], ["status", "Status"]]
  },
  payroll: {
    title: "Payroll", subtitle: "Salary records, payment status and employee payslips.", endpoint: "/payroll",
    fields: [{ name: "employee_id", label: "Employee", type: "employee", required: true }, { name: "pay_period", label: "Pay period", type: "date", required: true }, { name: "gross_salary", label: "Gross salary", type: "number", required: true }, { name: "deductions", label: "Deductions", type: "number" }, { name: "net_salary", label: "Net salary", type: "number", required: true }],
    columns: [["employee_name", "Employee"], ["pay_period", "Pay period"], ["gross_salary", "Gross"], ["deductions", "Deductions"], ["net_salary", "Net pay"], ["status", "Status"]]
  },
  announcements: {
    title: "Announcements", subtitle: "Share important updates with your entire team.", endpoint: "/announcements",
    fields: [{ name: "title", label: "Title", required: true }, { name: "body", label: "Announcement", type: "textarea", required: true }, { name: "published_at", label: "Publish date", type: "date" }, { name: "expires_at", label: "Expiry date", type: "date" }],
    columns: [["title", "Title"], ["body", "Message"], ["published_at", "Published"], ["expires_at", "Expires"]]
  },
  holidays: {
    title: "Holidays", subtitle: "Plan ahead with your company holiday calendar.", endpoint: "/holidays",
    fields: [{ name: "name", label: "Holiday name", required: true }, { name: "holiday_date", label: "Date", type: "date", required: true }, { name: "description", label: "Description", type: "textarea" }],
    columns: [["name", "Holiday"], ["holiday_date", "Date"], ["description", "Description"]]
  },
  users: {
    title: "User access", subtitle: "Manage separate login accounts and link HR/admin users to one employee profile.", endpoint: "/users", rowKey: "users",
    fields: [
      { name: "name", label: "Account name", required: true },
      { name: "email", label: "Login email", type: "email", required: true },
      { name: "password", label: "Password", type: "password", required: true, helper: "Use a separate alias such as name+1@company.com for another login to this employee profile." },
      { name: "role", label: "Workspace role", type: "select", options: ["hr", "admin", "employee"] },
      { name: "employee_id", label: "Link employee profile", type: "employee", helper: "For an employee login, select the existing employee ID. Use an email alias (for example name+1@company.com) for a separate login to the same employee record." }
    ],
    columns: [["name", "Account"], ["email", "Login email"], ["role", "Role"], ["linked_employee_code", "Linked employee ID"], ["linked_employee_name", "Employee profile"], ["created_at", "Joined"]]
  }
};
