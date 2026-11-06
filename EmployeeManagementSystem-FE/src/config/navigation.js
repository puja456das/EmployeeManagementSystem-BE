import { Bell, BriefcaseBusiness, CalendarDays, Clock3, CreditCard, FileText, LayoutDashboard, ShieldCheck, Sparkles, UserRound, Users } from "lucide-react";

export const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "employees", label: "Employees", icon: Users, roles: ["admin", "hr"] },
  { id: "departments", label: "Departments", icon: BriefcaseBusiness, roles: ["admin", "hr"] },
  { id: "attendance", label: "Attendance", icon: Clock3 },
  { id: "leaves", label: "Leave requests", icon: CalendarDays },
  { id: "payroll", label: "Payroll", icon: CreditCard },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "profile", label: "My profile", icon: UserRound },
  { id: "announcements", label: "Announcements", icon: Bell },
  { id: "holidays", label: "Holidays", icon: Sparkles },
  { id: "users", label: "User access", icon: ShieldCheck, roles: ["admin"] }
];

export const employeePages = new Set([
  "dashboard", "attendance", "leaves", "payroll", "documents",
  "profile", "announcements", "holidays"
]);

export const hrPages = new Set([
  "dashboard", "employees", "departments", "attendance", "leaves",
  "payroll", "documents", "announcements", "holidays", "profile"
]);

export const adminPages = new Set([
  "dashboard", "employees", "departments", "announcements", "profile", "users"
]);
