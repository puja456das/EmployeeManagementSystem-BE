import { useState } from "react";
import { adminPages, employeePages, hrPages, navItems } from "./config/navigation.js";
import AdminAnnouncements from "./pages/admin/Announcements.jsx";
import AdminDashboard from "./pages/admin/ControlCenter.jsx";
import AdminProfile from "./pages/admin/Profile.jsx";
import UserAccess from "./pages/admin/UserAccess.jsx";
import HrAnnouncements from "./pages/hr/Announcements.jsx";
import HrAttendance from "./pages/hr/Attendance.jsx";
import HrDashboard from "./pages/hr/Dashboard.jsx";
import HrDepartments from "./pages/hr/Departments.jsx";
import HrDocuments from "./pages/hr/Documents.jsx";
import HrEmployees from "./pages/hr/Employees.jsx";
import HrHolidays from "./pages/hr/Holidays.jsx";
import HrLeaves from "./pages/hr/Leaves.jsx";
import HrPayroll from "./pages/hr/Payroll.jsx";
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
  employees: HrEmployees,
  departments: HrDepartments,
  announcements: AdminAnnouncements,
  profile: AdminProfile,
  users: UserAccess
};

const hrRoutes = {
  dashboard: HrDashboard,
  employees: HrEmployees,
  departments: HrDepartments,
  attendance: HrAttendance,
  leaves: HrLeaves,
  payroll: HrPayroll,
  documents: HrDocuments,
  announcements: HrAnnouncements,
  holidays: HrHolidays,
  profile: AdminProfile
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
    const rolePages = user.role === "employee" ? employeePages : user.role === "hr" ? hrPages : adminPages;
    const allowedItems = navItems.filter((item) => rolePages.has(item.id));
    const active = allowedItems.some((item) => item.id === page) ? page : "dashboard";
    const routes = user.role === "employee" ? employeeRoutes : user.role === "hr" ? hrRoutes : adminRoutes;
    const Page = routes[active];
    const navigate = (nextPage) => setPage(rolePages.has(nextPage) ? nextPage : "dashboard");
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
