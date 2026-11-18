import { BriefcaseBusiness, CalendarDays, Clock3, CreditCard, FileText, LayoutDashboard, LifeBuoy, Megaphone, ShieldCheck, Sparkles, UserRound, Users } from "lucide-react";

export const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "employees", label: "Employees", icon: Users, roles: ["admin", "hr"] },
  { id: "departments", label: "Departments", icon: BriefcaseBusiness, roles: ["admin", "hr"] },
  { id: "users", label: "Team access", icon: ShieldCheck, roles: ["admin"] },
  { id: "announcements", label: "Announcements", icon: Megaphone, roles: ["admin", "hr", "employee"] },
  { id: "serviceRequests", label: "Service desk", icon: LifeBuoy },
  { id: "attendance", label: "Attendance", icon: Clock3, roles: ["hr", "employee"] },
  { id: "leaves", label: "Leave requests", icon: CalendarDays, roles: ["hr", "employee"] },
  { id: "payroll", label: "Payroll", icon: CreditCard, roles: ["hr", "employee"] },
  { id: "documents", label: "Documents", icon: FileText, roles: ["hr", "employee"] },
  { id: "holidays", label: "Holidays", icon: Sparkles, roles: ["hr", "employee"] },
  { id: "profile", label: "My profile", icon: UserRound }
];
export const employeePages = new Set(["dashboard", "attendance", "leaves", "payroll", "documents", "serviceRequests", "profile", "announcements", "holidays"]);
export const hrPages = new Set(["dashboard", "employees", "departments", "attendance", "leaves", "payroll", "documents", "serviceRequests", "announcements", "holidays", "profile"]);
export const adminPages = new Set(["dashboard", "employees", "departments", "serviceRequests", "announcements", "profile", "users"]);
