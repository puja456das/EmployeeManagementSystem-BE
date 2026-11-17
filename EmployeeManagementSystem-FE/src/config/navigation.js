import { Bell, BriefcaseBusiness, CalendarDays, Clock3, CreditCard, FileText, LayoutDashboard, LifeBuoy, ShieldCheck, Sparkles, UserRound, Users } from "lucide-react";

export const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "employees", label: "Employees", icon: Users, roles: ["admin", "hr"] },
  { id: "departments", label: "Departments", icon: BriefcaseBusiness, roles: ["admin", "hr"] },
  { id: "attendance", label: "Attendance", icon: Clock3, roles: ["admin", "hr", "employee"] },
  { id: "leaves", label: "Leave requests", icon: CalendarDays, roles: ["admin", "hr", "employee"] },
  { id: "payroll", label: "Payroll", icon: CreditCard, roles: ["admin", "hr", "employee"] },
  { id: "documents", label: "Documents", icon: FileText, roles: ["admin", "hr", "employee"] },
  { id: "serviceRequests", label: "Service desk", icon: LifeBuoy },
  { id: "profile", label: "My profile", icon: UserRound },
  { id: "announcements", label: "Announcements", icon: Bell, roles: ["admin", "hr", "employee"] },
  { id: "holidays", label: "Holidays", icon: Sparkles, roles: ["admin", "hr", "employee"] },
  { id: "users", label: "User access", icon: ShieldCheck, roles: ["admin"] }
];
export const employeePages = new Set(["dashboard", "attendance", "leaves", "payroll", "documents", "serviceRequests", "profile", "announcements", "holidays"]);
export const hrPages = new Set(["dashboard", "employees", "departments", "attendance", "leaves", "payroll", "documents", "serviceRequests", "announcements", "holidays", "profile"]);
export const adminPages = new Set(["dashboard", "employees", "departments", "serviceRequests", "announcements", "profile", "users"]);
export const operationsPages = new Set(["dashboard", "serviceRequests", "profile"]);