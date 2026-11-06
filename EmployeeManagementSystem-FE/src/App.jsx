import { useState } from "react";
import { employeePages, navItems } from "./config/navigation.js";
import AdminAnnouncements from "./pages/admin/Announcements.jsx";
import AdminAttendance from "./pages/admin/Attendance.jsx";
import AdminDashboard from "./pages/admin/Dashboard.jsx";
import AdminDepartments from "./pages/admin/Departments.jsx";
import AdminDocuments from "./pages/admin/Documents.jsx";
import AdminEmployees from "./pages/admin/Employees.jsx";
import AdminHolidays from "./pages/admin/Holidays.jsx";
import AdminLeaves from "./pages/admin/Leaves.jsx";
import AdminPayroll from "./pages/admin/Payroll.jsx";
import AdminProfile from "./pages/admin/Profile.jsx";
import UserAccess from "./pages/admin/UserAccess.jsx";
import EmployeeAnnouncements from "./pages/employee/Announcements.jsx";
import EmployeeAttendance from "./pages/employee/Attendance.jsx";
import EmployeeDashboard from "./pages/employee/Dashboard.jsx";
import EmployeeDocuments from "./pages/employee/Documents.jsx";
import EmployeeHolidays from "./pages/employee/Holidays.jsx";
import EmployeeLeaves from "./pages/employee/Leaves.jsx";
import EmployeePayslips from "./pages/employee/Payslips.jsx";
import EmployeeProfile from "./pages/employee/Profile.jsx";
import AuthGate from "./components/AuthGate.jsx";
import WorkspaceLayout from "./components/WorkspaceLayout.jsx";

const adminRoutes = {
  dashboard: AdminDashboard,
  employees: AdminEmployees,
  departments: AdminDepartments,
  attendance: AdminAttendance,
  leaves: AdminLeaves,
  payroll: AdminPayroll,
  documents: AdminDocuments,
  announcements: AdminAnnouncements,
  holidays: AdminHolidays,
  profile: AdminProfile,
  users: UserAccess
};

const employeeRoutes = {
  dashboard: EmployeeDashboard,
  attendance: EmployeeAttendance,
  leaves: EmployeeLeaves,
  payroll: EmployeePayslips,
  documents: EmployeeDocuments,
  announcements: EmployeeAnnouncements,
  holidays: EmployeeHolidays,
  profile: EmployeeProfile
};

export default function App() {
  const [page, setPage] = useState("dashboard");

  return <AuthGate>{({ user, logout }) => {
    const isEmployee = user.role === "employee";
    const allowedItems = navItems.filter((item) =>
      (!item.roles || item.roles.includes(user.role)) &&
      (!isEmployee || employeePages.has(item.id))
    );
    const active = allowedItems.some((item) => item.id === page) ? page : "dashboard";
    const routes = isEmployee ? employeeRoutes : adminRoutes;
    const Page = routes[active];
    const navigate = (nextPage) => setPage(isEmployee && !employeePages.has(nextPage) ? "dashboard" : nextPage);
    const handleLogout = () => {
      setPage("dashboard");
      logout();
    };

    return (
      <WorkspaceLayout
        user={user}
        active={active}
        allowedItems={allowedItems}
        onNavigate={navigate}
        onLogout={handleLogout}
      >
        {Page && <Page key={active} user={user} onNavigate={navigate} />}
      </WorkspaceLayout>
    );
  }}</AuthGate>;
}
