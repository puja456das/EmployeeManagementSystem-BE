import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity, ArrowDownRight, ArrowRight, ArrowUpRight, Bell, BriefcaseBusiness, CalendarCheck,
  CalendarDays, Camera, Check, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Clock3,
  CreditCard, FileText, LayoutDashboard, LogOut, Menu, Pencil, Plus, Search, Settings2,
  ShieldCheck, Sparkles, UserRound, Users, WalletCards, X
} from "lucide-react";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis
} from "recharts";
import { api, getRows } from "./api";

const navItems = [
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

const employeePages = new Set([
  "dashboard", "attendance", "leaves", "payroll", "documents",
  "profile", "announcements", "holidays"
]);

const configs = {
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

const currency = (value) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(value) || 0);
const prettify = (value) => String(value ?? "—").replaceAll("_", " ");
const dateLabel = (value) => value ? new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
const dateTimeLabel = (value) => value ? new Date(value).toLocaleString("en-US", {
  month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit"
}) : "—";
const localDateKey = (value = new Date()) => {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
const dateTimeInputValue = (value) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(Boolean(localStorage.getItem("ems-token")));
  const [page, setPage] = useState("dashboard");
  const [mobileMenu, setMobileMenu] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("ems-token");
    if (!token) return;
    api("/auth/me").then((result) => setUser(result.user)).catch(() => {
      localStorage.removeItem("ems-token");
    }).finally(() => setChecking(false));
    const clearSession = () => setUser(null);
    window.addEventListener("ems:unauthorized", clearSession);
    return () => window.removeEventListener("ems:unauthorized", clearSession);
  }, []);

  const handleLogin = (result) => {
    localStorage.setItem("ems-token", result.token);
    setUser(result.user);
    setPage("dashboard");
  };
  const logout = () => {
    localStorage.removeItem("ems-token");
    setUser(null);
    setPage("dashboard");
  };

  if (checking) return <div className="grid min-h-screen place-items-center bg-canvas text-sm text-muted">Loading your workspace…</div>;
  if (!user) return <Login onLogin={handleLogin} />;

  const isEmployee = user.role === "employee";
  const allowedItems = navItems.filter((item) =>
    (!item.roles || item.roles.includes(user.role)) &&
    (!isEmployee || employeePages.has(item.id))
  );
  const active = allowedItems.some((item) => item.id === page) ? page : "dashboard";
  const navigate = (nextPage) => setPage(isEmployee && !employeePages.has(nextPage) ? "dashboard" : nextPage);

  return (
    <div className={`min-h-screen ${isEmployee ? "bg-[#f3f5ff]" : "bg-[#f7f3eb]"}`}>
      {mobileMenu && <button aria-label="Close navigation" onClick={() => setMobileMenu(false)} className="fixed inset-0 z-30 bg-slate-950/30 md:hidden" />}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[250px] flex-col border-r transition-transform md:translate-x-0 ${isEmployee ? "border-indigo-900/60 bg-[#171d3b] text-white" : "border-[#eadfce] bg-[#fffdf8]"} ${mobileMenu ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-[78px] items-center gap-3 px-6">
          <div className={`grid h-10 w-10 place-items-center rounded-[14px] text-white shadow-lg ${isEmployee ? "bg-gradient-to-br from-cyan-400 to-indigo-500 shadow-indigo-950/40" : "bg-gradient-to-br from-[#b88955] to-[#80582f] shadow-amber-900/20"}`}><Users size={20} /></div>
          <div><p className={`text-[17px] font-extrabold tracking-tight ${isEmployee ? "text-white" : "text-ink"}`}>{isEmployee ? "My workspace" : <>people<span className="text-brand">pilot</span></>}</p><p className={`text-[10px] font-semibold uppercase tracking-[.17em] ${isEmployee ? "text-indigo-200/65" : "text-slate-400"}`}>{isEmployee ? "Employee portal" : `${user.role} workspace`}</p></div>
          <button onClick={() => setMobileMenu(false)} className={`ml-auto md:hidden ${isEmployee ? "text-indigo-100" : "text-slate-400"}`}><X size={19} /></button>
        </div>
        <div className={`mx-4 mt-2 rounded-2xl p-3 ${isEmployee ? "border border-white/10 bg-white/[0.06]" : "border border-[#efe5d6] bg-[#f7f1e7]"}`}>
          <div className="flex items-center gap-3">
            <div className={`grid h-9 w-9 place-items-center rounded-full text-xs font-bold uppercase ${isEmployee ? "bg-gradient-to-br from-amber-300 to-orange-400 text-orange-950" : "bg-[#ead8bd] text-[#80582f]"}`}>{initials(user.name)}</div>
            <div className="min-w-0 flex-1"><p className={`truncate text-xs font-bold ${isEmployee ? "text-white" : "text-ink"}`}>{user.name}</p><p className={`mt-0.5 text-[10px] capitalize ${isEmployee ? "text-indigo-200/65" : "text-slate-400"}`}>{isEmployee ? "Your employee account" : `${user.role} workspace`}</p></div>
            {!isEmployee && <ChevronDown size={15} className="text-slate-400" />}
          </div>
        </div>
        <p className={`mb-2 mt-7 px-6 text-[10px] font-bold uppercase tracking-[.15em] ${isEmployee ? "text-indigo-200/50" : "text-slate-400"}`}>{isEmployee ? "Your workspace" : "Workspace"}</p>
        <nav className="scrollbar-thin flex-1 space-y-1 overflow-y-auto px-3">
          {allowedItems.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => { navigate(id); setMobileMenu(false); }} className={`group flex w-full items-center gap-3 rounded-xl px-3 py-[11px] text-left text-[13px] font-semibold transition ${active === id ? isEmployee ? "bg-gradient-to-r from-cyan-400/20 to-violet-400/20 text-cyan-100 ring-1 ring-white/10" : "bg-[#efe2ce] text-[#80582f]" : isEmployee ? "text-indigo-100/70 hover:bg-white/[0.07] hover:text-white" : "text-slate-500 hover:bg-[#f5ecdf] hover:text-ink"}`}>
              <Icon size={18} strokeWidth={active === id ? 2.4 : 1.8} /><span className="flex-1">{isEmployee && id === "payroll" ? "My payslips" : label}</span>{id === "leaves" && !isEmployee && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">New</span>}
            </button>
          ))}
        </nav>
        <div className={`m-4 rounded-2xl p-4 text-white ${isEmployee ? "border border-white/10 bg-gradient-to-br from-cyan-500/20 via-indigo-500/20 to-fuchsia-500/20" : "bg-gradient-to-br from-[#8d6138] via-[#ab804f] to-[#c3a16f]"}`}>
          <div className="mb-3 grid h-8 w-8 place-items-center rounded-lg bg-white/15"><CircleHelp size={17} /></div>
          <p className="text-xs font-bold">{isEmployee ? "Here for you" : "Need a hand?"}</p><p className="mt-1 text-[10px] leading-4 text-white/75">{isEmployee ? "Your workday essentials, all in one place." : "Your people ops workspace, all in one place."}</p>
          <button className="mt-3 text-[10px] font-bold underline decoration-white/50 underline-offset-4">Explore help center</button>
        </div>
        <div className="border-t border-slate-100 px-3 py-3">
          <button onClick={logout} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold ${isEmployee ? "text-indigo-100/70 hover:bg-rose-400/10 hover:text-rose-200" : "text-slate-500 hover:bg-rose-50 hover:text-rose-600"}`}><LogOut size={17} />Sign out</button>
        </div>
      </aside>

      <main className={`min-h-screen md:ml-[250px] ${isEmployee ? "bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-violet-100/60 via-[#f5f6ff] to-cyan-50/50" : "admin-scene"}`}>
        <header className={`sticky top-0 z-20 flex h-[78px] items-center justify-between border-b px-4 backdrop-blur md:px-8 ${isEmployee ? "border-indigo-100/70 bg-white/75" : "border-[#eadfce] bg-[#fffdf8]/90"}`}>
          <div className="flex items-center gap-3">
            <button aria-label="Open menu" onClick={() => setMobileMenu(true)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 md:hidden"><Menu size={19} /></button>
            <div className="hidden items-center gap-2 text-[11px] text-slate-400 sm:flex"><span>{isEmployee ? "My workspace" : "Workspace"}</span><ChevronRight size={13} /><span className="font-semibold capitalize text-slate-600">{active === "dashboard" ? isEmployee ? "Home" : "Overview" : active}</span></div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            {!isEmployee && <><label className="hidden h-10 w-[210px] items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 lg:flex"><Search size={15} className="text-slate-400" /><input placeholder="Search anything..." className="w-full bg-transparent text-xs outline-none placeholder:text-slate-400" /></label><button aria-label="Notifications" className="relative grid h-9 w-9 place-items-center rounded-xl text-slate-500 hover:bg-slate-50"><Bell size={18} /><i className="absolute right-[8px] top-[7px] h-1.5 w-1.5 rounded-full bg-rose-500 ring-2 ring-white" /></button><div className="hidden h-8 w-px bg-slate-100 sm:block" /></>}
            <button onClick={() => navigate("profile")} className="flex items-center gap-2.5 rounded-xl py-1 pl-1 pr-1 sm:pr-2 hover:bg-slate-50">
              <div className={`grid h-9 w-9 place-items-center rounded-xl text-xs font-bold uppercase ${isEmployee ? "bg-gradient-to-br from-cyan-100 to-violet-200 text-indigo-700" : "bg-[#efe2ce] text-[#80582f]"}`}>{initials(user.name)}</div>
              <span className="hidden max-w-[125px] truncate text-xs font-bold text-ink sm:block">{user.name}</span>
              {!isEmployee && <ChevronDown size={14} className="hidden text-slate-400 sm:block" />}
            </button>
          </div>
        </header>
        <div className="mx-auto max-w-[1500px] px-4 py-6 md:px-8 md:py-8">
          {active === "dashboard"
            ? isEmployee ? <EmployeeDashboard user={user} onNavigate={navigate} /> : <Dashboard user={user} onNavigate={navigate} />
            : active === "profile"
              ? <Profile user={user} />
              : active === "documents"
                ? <Documents user={user} />
                : configs[active] ? <ResourcePage key={active} page={active} user={user} /> : <EmployeeDashboard user={user} onNavigate={navigate} />}
          <footer className="mt-10 flex flex-col gap-2 border-t border-slate-200/70 py-5 text-[10px] text-slate-400 sm:flex-row sm:items-center sm:justify-between"><span>© {new Date().getFullYear()} PeoplePilot. Built for better work.</span><span className="flex items-center gap-4"><a href="#privacy" className="hover:text-brand">Privacy</a><a href="#support" className="hover:text-brand">Support</a><span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />All systems operational</span></span></footer>
        </div>
      </main>
    </div>
  );
}

function Login({ onLogin }) {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [resetToken, setResetToken] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("resetToken") || params.get("inviteToken") || "";
  });
  const setupLink = new URLSearchParams(window.location.search).get("setup") === "employee";
  const [isInvite, setIsInvite] = useState(() => new URLSearchParams(window.location.search).has("inviteToken"));
  const [mode, setMode] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("setup") === "employee") return "inviteOtp";
    return params.has("resetToken") || params.has("inviteToken") ? "reset" : "login";
  });
  const [resetEmail, setResetEmail] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("setup") === "employee" ? params.get("email") || "" : "";
  });
  const [resetCode, setResetCode] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    try { onLogin(await api("/auth/login", { method: "POST", body: form })); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };
  const requestReset = async (event) => {
    event.preventDefault();
    setError(""); setNotice(""); setBusy(true);
    try {
      const result = await api("/auth/forgot-password", { method: "POST", body: { email: resetEmail } });
      setNotice(result.message || "If an account exists for that email, a verification code has been sent.");
      setMode("verifyOtp");
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };
  const verifyResetCode = async (event) => {
    event.preventDefault();
    setError(""); setNotice(""); setBusy(true);
    try {
      const result = await api("/auth/verify-reset-otp", {
        method: "POST",
        body: { email: resetEmail, code: resetCode }
      });
      setResetToken(result.token);
      setNewPassword("");
      setConfirmPassword("");
      setMode("reset");
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };
  const verifyInviteCode = async (event) => {
    event.preventDefault();
    setError(""); setNotice(""); setBusy(true);
    try {
      const result = await api("/auth/verify-employee-invite-otp", {
        method: "POST",
        body: { email: resetEmail, code: inviteCode }
      });
      setResetToken(result.token);
      setIsInvite(true);
      setForm({ email: resetEmail, password: "" });
      setNewPassword("");
      setConfirmPassword("");
      setMode("reset");
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };
  const submitReset = async (event) => {
    event.preventDefault();
    setError(""); setNotice("");
    if (newPassword !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const result = await api("/auth/reset-password", {
        method: "POST",
        body: { token: resetToken, password: newPassword }
      });
      window.history.replaceState({}, "", window.location.pathname);
      setResetToken("");
      setIsInvite(false);
      setForm({ ...form, password: "" });
      setNotice(isInvite ? "Your account is ready. Sign in with your work email and new password." : result.message);
      setMode("login");
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };
  const title = mode === "forgot" ? "Reset your password"
    : mode === "inviteOtp" ? "Set up employee account"
    : mode === "verifyOtp" ? "Verify your email"
    : mode === "reset" ? isInvite ? "Set up your account" : "Choose a new password"
      : "Sign in to your account";
  const description = mode === "forgot" ? "Enter your work email and we’ll send a one-time verification code."
    : mode === "inviteOtp" ? "Enter the work email and one-time setup code from your employee welcome email. The code is valid for 24 hours."
    : mode === "verifyOtp" ? `Enter the 6-digit code sent to ${resetEmail}. The code expires in 10 minutes.`
    : mode === "reset" ? isInvite ? "Welcome to the team. Set a password to activate your employee account." : "Your new password must be at least 8 characters."
        : "Enter your details to access your workspace.";
  return (
    <div className="login-scene flex min-h-screen items-center justify-center px-4 py-10">
      <div className="grid w-full max-w-[960px] overflow-hidden rounded-[28px] bg-white shadow-2xl md:grid-cols-[1fr_1fr]">
        <section className="relative hidden min-h-[660px] flex-col justify-between overflow-hidden bg-gradient-to-br from-[#655be8] to-[#9a85f7] p-12 text-white md:flex">
          <div className="absolute -right-20 top-28 h-64 w-64 rounded-full border border-white/15" /><div className="absolute -right-7 top-40 h-40 w-40 rounded-full border border-white/15" />
          <div className="relative flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-white/15"><Users size={21} /></div><span className="text-lg font-extrabold">peoplepilot</span></div>
          <div className="relative max-w-[340px]"><div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-[10px] font-semibold"><Sparkles size={13} />The people-first workspace</div><h1 className="text-[38px] font-bold leading-[1.13] tracking-tight">Great teams start with <span className="text-[#d6d2ff]">people.</span></h1><p className="mt-4 text-sm leading-6 text-white/75">One thoughtful place to bring your people, processes, and progress together.</p></div>
          <div className="relative flex items-center gap-3"><div className="flex -space-x-2">{["JD", "AM", "SK", "EL"].map((item, index) => <span key={item} className={`grid h-8 w-8 place-items-center rounded-full border-2 border-[#796eea] text-[9px] font-bold ${["bg-amber-200 text-amber-800", "bg-sky-200 text-sky-800", "bg-rose-200 text-rose-800", "bg-lime-200 text-lime-800"][index]}`}>{item}</span>)}</div><span className="text-[10px] text-white/80">Made for teams that care</span></div>
        </section>
        <section className="flex min-h-[660px] flex-col justify-center px-8 py-14 sm:px-14">
          <div className="mb-10 flex items-center gap-3 md:hidden"><div className="grid h-10 w-10 place-items-center rounded-xl bg-brand text-white"><Users size={20} /></div><span className="text-lg font-extrabold text-ink">people<span className="text-brand">pilot</span></span></div>
          <div className="mb-8"><p className="text-[11px] font-bold uppercase tracking-[.16em] text-brand">{mode === "login" ? "Welcome back" : "Account recovery"}</p><h2 className="mt-2 text-[27px] font-bold tracking-tight text-ink">{title}</h2><p className="mt-2 text-xs leading-5 text-slate-400">{description}</p></div>
          {mode === "login" &&           <form onSubmit={submit} className="space-y-6">
            <label className="block text-xs font-semibold text-slate-600">Work email<input required type="email" autoComplete="username" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@company.com" className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 text-sm font-normal outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10" /></label>
            <label className="block text-xs font-semibold text-slate-600">Password<input required type="password" autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Enter your password" className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 text-sm font-normal outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10" /></label>
            <div className="-mt-2 flex items-center justify-between gap-3"><button type="button" onClick={() => { setError(""); setNotice(""); setResetEmail(form.email.trim()); setMode("inviteOtp"); }} className="text-left text-[11px] font-semibold text-brand hover:underline">Set up employee account</button><button type="button" onClick={() => { setError(""); setNotice(""); setResetEmail(form.email.trim()); setMode("forgot"); }} className="text-[11px] font-semibold text-brand hover:underline">Forgot password?</button></div>
            {error && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2.5 text-xs font-medium text-rose-700">{error}</p>}
            <button disabled={busy} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand text-sm font-bold text-white shadow-lg shadow-brand/20 transition hover:bg-[#5147d4] disabled:cursor-wait disabled:opacity-70">{busy ? "Signing you in…" : "Sign in"}{!busy && <ChevronRight size={17} />}</button>
          </form>}
          {(mode === "forgot" || mode === "verifyOtp" || mode === "inviteOtp") && <form onSubmit={mode === "forgot" ? requestReset : mode === "inviteOtp" ? verifyInviteCode : verifyResetCode} className="space-y-6">
            <label className="block text-xs font-semibold text-slate-600">Work email<input required type="email" autoComplete="email" disabled={mode === "verifyOtp" || (mode === "inviteOtp" && setupLink && Boolean(resetEmail))} value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} placeholder="you@company.com" className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 text-sm font-normal outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10 disabled:bg-slate-50 disabled:text-slate-500" /></label>
            {(mode === "verifyOtp" || mode === "inviteOtp") && <label className="block text-xs font-semibold text-slate-600">{mode === "inviteOtp" ? "Employee setup code" : "6-digit verification code"}<input required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" value={mode === "inviteOtp" ? inviteCode : resetCode} onChange={(e) => mode === "inviteOtp" ? setInviteCode(e.target.value.replace(/\D/g, "").slice(0, 6)) : setResetCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="Enter the 6-digit code from your email" className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 text-center text-lg font-bold tracking-[.35em] outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10" /></label>}
            {error && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2.5 text-xs font-medium text-rose-700">{error}</p>}
            <button disabled={busy} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand text-sm font-bold text-white shadow-lg shadow-brand/20 hover:bg-[#5147d4] disabled:opacity-70">{busy ? mode === "forgot" ? "Sending code…" : "Verifying code…" : mode === "forgot" ? "Send verification code" : mode === "inviteOtp" ? "Verify setup code" : "Verify code"}<ChevronRight size={17} /></button>
            <div className="flex justify-between gap-3"><button type="button" onClick={() => { setMode("login"); setError(""); setNotice(""); }} className="text-xs font-semibold text-slate-500 hover:text-brand">Back to sign in</button>{mode === "verifyOtp" && <button type="button" onClick={() => { setMode("forgot"); setError(""); setResetCode(""); }} className="text-xs font-semibold text-brand hover:underline">Change email</button>}</div>
          </form>}
          {mode === "reset" && <form onSubmit={submitReset} className="space-y-6">
            <label className="block text-xs font-semibold text-slate-600">New password<input required minLength={8} type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="At least 8 characters" className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 text-sm font-normal outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10" /></label>
            <label className="block text-xs font-semibold text-slate-600">Confirm new password<input required minLength={8} type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Enter the password again" className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 text-sm font-normal outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10" /></label>
            {error && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2.5 text-xs font-medium text-rose-700">{error}</p>}
            <button disabled={busy} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand text-sm font-bold text-white shadow-lg shadow-brand/20 hover:bg-[#5147d4] disabled:opacity-70">{busy ? "Updating password…" : "Update password"}<ChevronRight size={17} /></button>
          </form>}
          {mode === "login" && notice && <p role="status" className="mt-4 rounded-xl bg-emerald-50 px-3 py-2.5 text-xs font-medium text-emerald-700">{notice}</p>}
          <p className="mt-8 text-center text-[10px] text-slate-400">Secure access for your people operations team.</p>
        </section>
      </div>
    </div>
  );
}

function EmployeeDashboard({ user, onNavigate }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [clockBusy, setClockBusy] = useState(false);
  const [clockMessage, setClockMessage] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [profile, attendanceSummary, attendance, leaves, leaveBalance, payroll, announcements, holidays] = await Promise.all([
        api("/profile"),
        api("/attendance/summary"),
        api("/attendance"),
        api("/leaves"),
        api("/leaves/balance/me"),
        api("/payroll/summary"),
        api("/announcements"),
        api("/holidays")
      ]);
      const attendanceRows = getRows(attendance);
      const leaveRows = getRows(leaves);
      setData({
        profile: profile.profile,
        attendance: attendanceSummary.data,
        todayAttendance: attendanceRows.find((row) => String(row.work_date).slice(0, 10) === localDateKey()) || null,
        recentAttendance: attendanceRows.slice(0, 4),
        leaves: leaveRows.slice(0, 4),
        leaveCount: leaveRows.length,
        leaveBalance: leaveBalance.data,
        payroll: payroll.data,
        announcements: getRows(announcements).slice(0, 2),
        holidays: getRows(holidays)
          .filter((holiday) => new Date(`${holiday.holiday_date}T00:00:00`) >= new Date(new Date().toDateString()))
          .sort((a, b) => new Date(a.holiday_date) - new Date(b.holiday_date))
          .slice(0, 3)
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const clockAction = async () => {
    const action = data?.todayAttendance?.check_in ? "check-out" : "check-in";
    setClockBusy(true);
    setClockMessage("");
    try {
      await api(`/attendance/${action}`, { method: "POST", body: {} });
      setClockMessage(action === "check-in" ? "You’re checked in for today." : "You’re checked out for today.");
      await refresh();
    } catch (err) {
      setClockMessage(err.message);
    } finally {
      setClockBusy(false);
    }
  };

  const profile = data?.profile;
  const nextHoliday = data?.holidays?.[0];
  const todayAttendance = data?.todayAttendance;
  const canCheckIn = !todayAttendance?.check_in;
  const canCheckOut = Boolean(todayAttendance?.check_in) && !todayAttendance?.check_out;
  const stats = [
    { label: "Hours this month", value: data?.attendance?.hours_worked ?? "—", suffix: "hrs", icon: Clock3, tone: "from-cyan-500 to-blue-500" },
    { label: "Leave requests", value: data?.leaveCount ?? "—", suffix: "total", icon: CalendarCheck, tone: "from-fuchsia-500 to-violet-500" },
    { label: "Paid leave remaining", value: data?.leaveBalance?.remaining_days ?? "—", suffix: `of ${data?.leaveBalance?.allocated_days ?? 12} days`, icon: CalendarDays, tone: "from-amber-400 to-orange-500" },
    { label: "Paid periods", value: data?.payroll?.paid_periods ?? "—", suffix: "payslips", icon: WalletCards, tone: "from-emerald-400 to-teal-500" }
  ];

  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[.17em] text-indigo-500">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</p>
        <h1 className="mt-2 text-[27px] font-bold tracking-tight text-[#20264b] md:text-[30px]">Welcome back, {user.name?.split(" ")[0]} <span className="text-amber-400">✦</span></h1>
        <p className="mt-1 text-xs text-slate-500">Your workday, time off and pay — all in one place.</p>
      </div>
      <button onClick={refresh} className="self-start rounded-xl border border-indigo-100 bg-white/80 px-3.5 py-2.5 text-[11px] font-semibold text-slate-600 shadow-sm hover:border-indigo-200 hover:text-indigo-600 sm:self-auto"><Activity size={14} className="mr-2 inline" />Refresh</button>
    </div>
    {error && <ErrorBanner message={error} retry={refresh} />}

    <section className="relative overflow-hidden rounded-[26px] bg-gradient-to-br from-[#252b62] via-[#5145a8] to-[#8971db] p-6 text-white shadow-xl shadow-indigo-900/10 sm:p-8">
      <div className="pointer-events-none absolute -right-10 -top-24 h-72 w-72 rounded-full border border-white/10" />
      <div className="pointer-events-none absolute right-12 top-10 h-40 w-40 rounded-full border border-white/10" />
      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
        <EmployeeAvatar endpoint="/profile/photo" hasPhoto={profile?.has_profile_image} name={profile?.name || user.name} className="h-[76px] w-[76px] rounded-[24px] border-2 border-white/30 bg-white/15 text-xl text-white" />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[.18em] text-cyan-100/80">Your employee space</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight">{profile?.name || user.name}</h2>
          <p className="mt-1 text-xs text-white/75">{[profile?.designation, profile?.department].filter(Boolean).join(" · ") || "Your work profile"}</p>
          <p className="mt-3 text-[10px] text-white/65">{profile?.employee_code ? `Employee ID · ${profile.employee_code}` : profile?.email || user.email}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={clockAction} disabled={clockBusy || loading || (!canCheckIn && !canCheckOut)} className="rounded-xl bg-white px-4 py-3 text-[11px] font-bold text-indigo-700 shadow-lg transition hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-60">
            <Clock3 size={15} className="mr-2 inline" />{clockBusy ? "Updating…" : canCheckIn ? "Check in" : canCheckOut ? "Check out" : "Day completed"}
          </button>
          <button onClick={() => onNavigate("profile")} className="rounded-xl border border-white/25 bg-white/10 px-4 py-3 text-[11px] font-bold text-white transition hover:bg-white/20"><UserRound size={15} className="mr-2 inline" />My profile</button>
        </div>
      </div>
      {todayAttendance?.check_in && <div className="relative mt-5 flex flex-wrap gap-x-6 gap-y-2 border-t border-white/15 pt-4 text-[10px] text-white/85">
        <span>Checked in: <strong className="ml-1 text-white">{dateTimeLabel(todayAttendance.check_in)}</strong></span>
        {todayAttendance.check_out && <span>Checked out: <strong className="ml-1 text-white">{dateTimeLabel(todayAttendance.check_out)}</strong></span>}
      </div>}
      {clockMessage && <p role="status" className="relative mt-4 text-[11px] text-white/90">{clockMessage}</p>}
    </section>

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map(({ label, value, suffix, icon: Icon, tone }) => <section key={label} className="rounded-2xl border border-white/80 bg-white/90 p-4 shadow-[0_8px_24px_rgba(70,74,130,0.06)]">
        <div className="flex items-center justify-between"><p className="text-[10px] font-semibold text-slate-500">{label}</p><span className={`grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br ${tone} text-white shadow-md`}><Icon size={17} /></span></div>
        <p className={`mt-4 text-2xl font-bold tracking-tight text-[#20264b] ${loading ? "animate-pulse" : ""}`}>{loading ? "···" : value} <span className="text-[10px] font-semibold text-slate-400">{suffix}</span></p>
      </section>)}
    </div>

    <div className="grid gap-5 xl:grid-cols-[1.25fr_1fr]">
      <section className="rounded-2xl border border-white/80 bg-white/90 p-5 shadow-[0_8px_24px_rgba(70,74,130,0.06)] sm:p-6">
        <div className="flex items-center justify-between gap-3"><div><h2 className="text-sm font-bold text-[#20264b]">Your recent attendance</h2><p className="mt-1 text-[10px] text-slate-400">A quick look at your latest workdays.</p></div><button onClick={() => onNavigate("attendance")} className="shrink-0 text-[10px] font-bold text-indigo-600 hover:underline">View all <ArrowRight size={13} className="ml-1 inline" /></button></div>
        {data?.recentAttendance?.length ? <div className="mt-4 divide-y divide-slate-100">{data.recentAttendance.map((item) => <div key={item.id} className="flex items-center gap-3 py-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-cyan-50 text-cyan-600"><Clock3 size={16} /></span><div className="min-w-0 flex-1"><p className="text-[11px] font-semibold text-slate-700">{dateLabel(item.work_date)}</p><p className="mt-1 text-[10px] text-slate-400">In: {item.check_in ? dateTimeLabel(item.check_in) : "—"} <span className="mx-1">·</span> Out: {item.check_out ? dateTimeLabel(item.check_out) : "—"}</p></div><StatusBadge value={item.status || (item.check_out ? "present" : "pending")} /></div>)}</div>
          : <EmptyState title={loading ? "Loading attendance…" : "No attendance yet"} detail="Your attendance records will appear here." />}
      </section>

      <section className="rounded-2xl border border-white/80 bg-white/90 p-5 shadow-[0_8px_24px_rgba(70,74,130,0.06)] sm:p-6">
        <div className="flex items-center justify-between"><div><h2 className="text-sm font-bold text-[#20264b]">Time off &amp; pay</h2><p className="mt-1 text-[10px] text-slate-400">Your requests and latest pay summary.</p></div><WalletCards size={18} className="text-violet-500" /></div>
        <div className="mt-4 rounded-xl bg-gradient-to-r from-violet-50 to-indigo-50 p-4"><p className="text-[10px] font-semibold text-slate-500">Net pay on record</p><p className="mt-1 text-xl font-bold text-[#20264b]">{loading ? "···" : currency(data?.payroll?.net_total)}</p><button onClick={() => onNavigate("payroll")} className="mt-2 text-[10px] font-bold text-indigo-600 hover:underline">View my payslips <ArrowRight size={12} className="ml-1 inline" /></button></div>
        <div className="mt-4">
          {data?.leaves?.length ? data.leaves.slice(0, 2).map((leave) => <div key={leave.id} className="flex items-center gap-3 border-b border-slate-100 py-3 last:border-0"><span className="grid h-8 w-8 place-items-center rounded-lg bg-amber-50 text-amber-600"><CalendarDays size={15} /></span><div className="min-w-0 flex-1"><p className="text-[10px] font-semibold text-slate-700">{dateLabel(leave.start_date)} – {dateLabel(leave.end_date)}</p><p className="mt-1 truncate text-[9px] text-slate-400">{leave.reason}</p></div><StatusBadge value={leave.status} /></div>)
            : <p className="py-4 text-[10px] text-slate-400">{loading ? "Loading your leave requests…" : "No leave requests yet."}</p>}
          <button onClick={() => onNavigate("leaves")} className="mt-2 rounded-lg bg-indigo-50 px-3 py-2 text-[10px] font-bold text-indigo-700 hover:bg-indigo-100"><Plus size={13} className="mr-1 inline" />Request time off</button>
        </div>
      </section>
    </div>

    <div className="grid gap-5 lg:grid-cols-2">
      <section className="rounded-2xl border border-white/80 bg-white/90 p-5 shadow-[0_8px_24px_rgba(70,74,130,0.06)]">
        <div className="flex items-center justify-between"><div><h2 className="text-sm font-bold text-[#20264b]">Coming up</h2><p className="mt-1 text-[10px] text-slate-400">Upcoming company holidays</p></div><button onClick={() => onNavigate("holidays")} className="text-[10px] font-bold text-indigo-600 hover:underline">Calendar <ArrowRight size={12} className="ml-1 inline" /></button></div>
        {nextHoliday ? <div className="mt-4 flex items-center gap-3 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 p-4"><span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-orange-500 shadow-sm"><CalendarCheck size={18} /></span><div><p className="text-xs font-bold text-[#20264b]">{nextHoliday.name}</p><p className="mt-1 text-[10px] text-slate-500">{dateLabel(nextHoliday.holiday_date)}</p></div></div> : <p className="mt-4 text-[10px] text-slate-400">{loading ? "Loading holidays…" : "No upcoming holidays listed."}</p>}
        {data?.announcements?.length > 0 && <button onClick={() => onNavigate("announcements")} className="mt-4 w-full rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 text-left hover:bg-indigo-50"><p className="text-[9px] font-bold uppercase tracking-wider text-indigo-500">Latest announcement</p><p className="mt-1 truncate text-[11px] font-semibold text-slate-700">{data.announcements[0].title}</p></button>}
      </section>
      <section className="rounded-2xl border border-white/80 bg-white/90 p-5 shadow-[0_8px_24px_rgba(70,74,130,0.06)]">
        <h2 className="text-sm font-bold text-[#20264b]">Quick links</h2><p className="mt-1 text-[10px] text-slate-400">The things you need most, one tap away.</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {[
            ["attendance", "Attendance", Clock3, "bg-cyan-50 text-cyan-600"],
            ["leaves", "Leave requests", CalendarDays, "bg-amber-50 text-amber-600"],
            ["payroll", "My payslips", WalletCards, "bg-violet-50 text-violet-600"],
            ["documents", "My documents", FileText, "bg-rose-50 text-rose-600"]
          ].map(([destination, label, Icon, style]) => <button key={destination} onClick={() => onNavigate(destination)} className="flex items-center gap-2.5 rounded-xl border border-slate-100 p-3 text-left transition hover:-translate-y-0.5 hover:border-indigo-100 hover:shadow-sm"><span className={`grid h-8 w-8 place-items-center rounded-lg ${style}`}><Icon size={15} /></span><span className="text-[10px] font-semibold text-slate-600">{label}</span><ArrowRight size={13} className="ml-auto text-slate-300" /></button>)}
        </div>
      </section>
    </div>
  </div>;
}

function Dashboard({ user, onNavigate }) {
  const [data, setData] = useState(null);
  const [charts, setCharts] = useState({ payroll: [], departments: [] });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      if (user.role === "employee") {
        const [profile, attendance, leaves, payroll] = await Promise.all([
          api("/profile"), api("/attendance/summary"), api("/leaves"), api("/payroll/summary")
        ]);
        setData({
          activeEmployees: 1,
          departments: profile.profile.department ? 1 : 0,
          pendingLeaves: getRows(leaves).filter((leave) => leave.status === "pending").length,
          presentToday: attendance.data?.present_days || 0,
          monthlyPayroll: payroll.data?.net_total || 0
        });
        setCharts({ payroll: [], departments: [] });
      } else {
        const [summary, payroll, employees] = await Promise.all([
          api("/dashboard"), api("/dashboard/payroll"), api("/dashboard/employees")
        ]);
        setData(summary.data);
        setCharts({ payroll: getRows(payroll), departments: getRows(employees) });
      }
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, [user.role]);
  useEffect(() => { refresh(); }, [refresh]);

  const stats = [
    { label: "Active employees", value: data?.activeEmployees ?? "—", icon: Users, tone: "violet", trend: "+8.2%", detail: "vs. last month" },
    { label: "Departments", value: data?.departments ?? "—", icon: BriefcaseBusiness, tone: "blue", trend: "+2", detail: "new this quarter" },
    { label: "Pending leaves", value: data?.pendingLeaves ?? "—", icon: CalendarDays, tone: "amber", trend: "Needs review", detail: "awaiting approval" },
    { label: "Monthly payroll", value: data ? currency(data.monthlyPayroll) : "—", icon: CreditCard, tone: "green", trend: "On track", detail: "current period" }
  ];

  return (
    <div className="space-y-7">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="text-[11px] font-bold uppercase tracking-[.17em] text-brand">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</p><h1 className="mt-2 text-[27px] font-bold tracking-tight text-ink md:text-[30px]">Good morning, {user.name?.split(" ")[0]} <span className="inline-block origin-bottom-right animate-pulse text-amber-500">✦</span></h1><p className="mt-1 text-xs text-slate-500">Your people operations overview for today.</p></div>
        <button onClick={refresh} className="self-start rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-[11px] font-semibold text-slate-600 shadow-sm hover:border-brand/30 hover:text-brand sm:self-auto"><Activity size={14} className="mr-2 inline" />Refresh overview</button>
      </div>
      {error && <ErrorBanner message={error} retry={refresh} />}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => <StatCard key={item.label} {...item} loading={loading} />)}
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.65fr_1fr]">
        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card sm:p-6">
          <div className="flex items-start justify-between"><div><h2 className="text-sm font-bold text-ink">Payroll overview</h2><p className="mt-1 text-[10px] text-slate-400">Monthly payroll spend over the last year</p></div><button onClick={() => onNavigate("payroll")} className="text-[10px] font-bold text-brand hover:underline">View report <ChevronRight size={13} className="inline" /></button></div>
          <div className="mt-6 h-[230px]">
            {user.role === "employee" ? <div className="grid h-full place-items-center rounded-xl bg-slate-50 text-center"><div><CreditCard size={24} className="mx-auto text-slate-300" /><p className="mt-2 text-xs font-semibold text-slate-500">Your payroll is ready to view</p><button onClick={() => onNavigate("payroll")} className="mt-2 text-[10px] font-bold text-brand">Open payslips</button></div></div>
              : <ResponsiveContainer width="100%" height="100%"><AreaChart data={charts.payroll} margin={{ left: -18, right: 4, top: 8 }}><defs><linearGradient id="payrollFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#a87945" stopOpacity={0.24} /><stop offset="100%" stopColor="#a87945" stopOpacity={0} /></linearGradient></defs><CartesianGrid vertical={false} strokeDasharray="3 4" /><XAxis dataKey="month" tickFormatter={(value) => new Date(value).toLocaleDateString("en-US", { month: "short" })} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#a1a9ba" }} /><YAxis tickFormatter={(value) => `$${Math.round(value / 1000)}k`} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#a1a9ba" }} /><Tooltip formatter={(value) => currency(value)} labelFormatter={(value) => dateLabel(value)} contentStyle={{ border: "1px solid #eee5d8", borderRadius: 12, fontSize: 11, boxShadow: "0 12px 30px #5d452714" }} /><Area type="monotone" dataKey="net_total" stroke="#a87945" strokeWidth={2.5} fill="url(#payrollFill)" /></AreaChart></ResponsiveContainer>}
          </div>
          <div className="mt-4 flex items-center gap-2 text-[10px] text-slate-400"><span className="h-2 w-2 rounded-full bg-brand" /> Net payroll <span className="ml-auto">Last 12 months</span></div>
        </section>
        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card sm:p-6">
          <div className="flex items-start justify-between"><div><h2 className="text-sm font-bold text-ink">Team snapshot</h2><p className="mt-1 text-[10px] text-slate-400">People across your departments</p></div><button onClick={() => onNavigate("employees")} className="grid h-8 w-8 place-items-center rounded-lg bg-violet-50 text-brand"><Users size={16} /></button></div>
          <div className="mt-5 space-y-4">
            {user.role === "employee" ? <div className="rounded-xl bg-violet-50/70 p-4"><p className="text-xs font-bold capitalize text-ink">{user.role} account</p><p className="mt-1 text-[10px] leading-5 text-slate-500">Your attendance, leave balance, profile and payslips are all in your workspace.</p></div>
              : (charts.departments.length ? charts.departments.slice(0, 5).map((department, index) => <div key={department.department} className="flex items-center gap-3"><div className={`grid h-9 w-9 place-items-center rounded-xl text-[10px] font-bold ${["bg-violet-100 text-violet-700", "bg-sky-100 text-sky-700", "bg-amber-100 text-amber-700", "bg-emerald-100 text-emerald-700", "bg-rose-100 text-rose-700"][index % 5]}`}>{initials(department.department)}</div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><p className="truncate text-xs font-semibold capitalize text-ink">{department.department}</p><span className="text-[10px] font-bold text-slate-500">{department.total}</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand" style={{ width: `${Math.min(100, Math.round((Number(department.active) / Math.max(1, Number(department.total))) * 100))}%` }} /></div></div></div>) : <EmptyState title={loading ? "Loading team…" : "No teams to show yet"} detail="Create a department to see your team snapshot here." />)}
          </div>
          {user.role !== "employee" && <button onClick={() => onNavigate("departments")} className="mt-5 w-full rounded-xl border border-slate-100 py-2.5 text-[10px] font-bold text-slate-500 hover:border-brand/30 hover:text-brand">View all departments <ChevronRight size={13} className="ml-1 inline" /></button>}
        </section>
      </div>
      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card sm:p-6">
          <div className="flex items-start justify-between"><div><h2 className="text-sm font-bold text-ink">Quick actions</h2><p className="mt-1 text-[10px] text-slate-400">The things you need, one click away.</p></div><Settings2 size={17} className="text-slate-300" /></div>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">{[
            { title: "Add employee", icon: Users, page: "employees", color: "bg-violet-50 text-brand" },
            { title: "Review leaves", icon: CalendarDays, page: "leaves", color: "bg-amber-50 text-amber-600" },
            { title: "Attendance", icon: Clock3, page: "attendance", color: "bg-sky-50 text-sky-600" },
            { title: "Run payroll", icon: CreditCard, page: "payroll", color: "bg-emerald-50 text-emerald-600" }
          ].map((action) => <button key={action.title} onClick={() => onNavigate(action.page)} className="rounded-xl border border-slate-100 p-3 text-left transition hover:-translate-y-0.5 hover:border-brand/20 hover:shadow-md"><span className={`grid h-9 w-9 place-items-center rounded-xl ${action.color}`}><action.icon size={17} /></span><span className="mt-3 block text-[10px] font-bold text-slate-600">{action.title}</span><span className="mt-1 block text-[9px] text-slate-400">Open module <ArrowUpRight size={12} className="ml-1 inline" /></span></button>)}</div>
        </section>
        <section className="relative overflow-hidden rounded-2xl bg-[#252b43] p-6 text-white shadow-card">
          <div className="absolute -right-8 -top-14 h-44 w-44 rounded-full border border-white/10" /><div className="absolute -right-1 -top-1 h-28 w-28 rounded-full border border-white/10" />
          <div className="relative"><div className="mb-4 grid h-9 w-9 place-items-center rounded-xl bg-white/10 text-[#d3ccff]"><Sparkles size={18} /></div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#aaa1ff]">People first</p><h3 className="mt-2 max-w-[230px] text-lg font-bold leading-6">A little appreciation goes a long way.</h3><p className="mt-2 max-w-[250px] text-[10px] leading-5 text-white/55">Celebrate the people who make great work happen, every day.</p><button onClick={() => onNavigate("announcements")} className="mt-5 rounded-lg bg-white px-3 py-2 text-[10px] font-bold text-[#272e49] hover:bg-violet-100">See announcements <ChevronRight size={13} className="ml-1 inline" /></button></div>
        </section>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, tone, trend, detail, loading }) {
  const tones = { violet: "bg-violet-50 text-violet-600", blue: "bg-blue-50 text-blue-600", amber: "bg-amber-50 text-amber-600", green: "bg-emerald-50 text-emerald-600" };
  return <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card"><div className="flex items-center justify-between"><span className="text-[11px] font-semibold text-slate-500">{label}</span><span className={`grid h-9 w-9 place-items-center rounded-xl ${tones[tone]}`}><Icon size={17} /></span></div><p className={`mt-4 text-[26px] font-bold tracking-tight text-ink ${loading ? "animate-pulse" : ""}`}>{loading ? "···" : value}</p><div className="mt-2 flex items-center gap-1 text-[9px]"><span className={`${tone === "amber" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"} rounded-md px-1.5 py-1 font-bold`}>{tone === "amber" ? <Clock3 size={10} className="mr-1 inline" /> : <ArrowUpRight size={10} className="inline" />}{trend}</span><span className="text-slate-400">{detail}</span></div></section>;
}

function ResourcePage({ page, user }) {
  const config = page === "payroll" && user.role === "employee"
    ? {
      ...configs.payroll,
      title: "My payslips",
      subtitle: "Your salary records and downloadable payslips.",
      columns: configs.payroll.columns.filter(([key]) => key !== "employee_name")
    }
    : configs[page];
  const [rows, setRows] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [leaveBalances, setLeaveBalances] = useState([]);
  const [myLeaveBalance, setMyLeaveBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");
  const canManage = user.role === "employee" ? page === "leaves" : true;
  const canDelete = user.role === "admin";

  const refresh = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const result = await api(config.endpoint);
      setRows(getRows(result, config.rowKey));
      if (["leaves", "payroll", "attendance"].includes(page) && ["admin", "hr"].includes(user.role)) {
        const employeeResult = await api("/employees");
        setEmployees(getRows(employeeResult, "employees"));
      }
      if (page === "leaves" && ["admin", "hr"].includes(user.role)) {
        const balanceResult = await api("/leaves/balances");
        setLeaveBalances(getRows(balanceResult));
      }
      if (page === "leaves" && user.role === "employee") {
        const balanceResult = await api("/leaves/balance/me");
        setMyLeaveBalance(balanceResult.data);
      }
      if (page === "users" && user.role === "admin") {
        const employeeResult = await api("/employees");
        setEmployees(getRows(employeeResult, "employees"));
      }
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, [config.endpoint, config.rowKey, page, user.role]);
  useEffect(() => { refresh(); }, [refresh]);

  const filtered = useMemo(() => rows.filter((row) => JSON.stringify(row).toLowerCase().includes(search.toLowerCase())), [rows, search]);
  const create = async (body, record) => {
    const payload = page === "attendance"
      ? Object.fromEntries(Object.entries(body).map(([key, value]) => [
        key,
        key === "check_in" || key === "check_out"
          ? value ? new Date(value).toISOString() : null
          : value === "" ? null : value
      ]))
      : body;
    const result = await api(record ? `${config.endpoint}/${record.id}` : config.endpoint, {
      method: record ? page === "attendance" ? "PATCH" : "PUT" : "POST",
      body: payload
    });
    setRows((current) => [result[config.rowKey?.slice(0, -1)] || result.data || result.user || result.employee || result, ...current]);
    setModal(false); setEditing(null); setNotice(result.message || `${config.title.replace(/s$/, "")} saved successfully.`); setTimeout(() => setNotice(""), 6000); refresh();
  };
  const action = async (row, kind) => {
    if (kind === "edit") {
      setEditing(row);
      setModal(true);
      return;
    }
    try {
      if (kind === "approve" || kind === "reject") await api(`/leaves/${row.id}/review`, { method: "PATCH", body: { status: kind === "approve" ? "approved" : "rejected" } });
      if (kind === "paid") await api(`/payroll/${row.id}/mark-paid`, { method: "PATCH", body: {} });
      if (kind === "payslip") {
        const printWindow = window.open("", "_blank");
        if (!printWindow) throw new Error("Allow pop-ups to open the payslip.");
        const { payslip } = await api(`/payroll/${row.id}/payslip`);
        printWindow.document.write(payslipMarkup(payslip));
        printWindow.document.close();
        return;
      }
      if (kind === "delete") {
        if (!window.confirm("Delete this record? This action cannot be undone.")) return;
        await api(`${config.endpoint}/${row.id}`, { method: "DELETE" });
      }
      setNotice(kind === "delete" ? "Record deleted." : "Changes saved successfully.");
      setTimeout(() => setNotice(""), 3000); refresh();
    } catch (err) { setError(err.message); }
  };
  if (!config) return null;

  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-[11px] font-bold uppercase tracking-[.16em] text-brand">{user.role === "employee" ? "Your workspace" : "People operations"}</p><h1 className="mt-2 text-[27px] font-bold tracking-tight text-ink">{config.title}</h1><p className="mt-1 text-xs text-slate-400">{config.subtitle}</p></div>
      <div className="flex gap-2">{page === "attendance" && user.role === "employee" && <AttendanceControls onDone={refresh} attendance={rows} />}{canManage && config.fields && <button onClick={() => { setEditing(null); setModal(true); }} className="rounded-xl bg-brand px-4 py-2.5 text-[11px] font-bold text-white shadow-lg shadow-brand/15 hover:bg-[#80582f]"><Plus size={15} className="mr-1.5 inline" />Add {page === "attendance" ? "attendance" : config.title.replace(/s$/, "")}</button>}</div>
    </div>
    {notice && <div role="status" className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700"><Check size={15} />{notice}<button onClick={() => setNotice("")} className="ml-auto"><X size={15} /></button></div>}
    {error && <ErrorBanner message={error} retry={refresh} />}
    {page === "leaves" && <div className={`grid gap-3 ${user.role === "employee" ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-3"}`}><MiniMetric title="Total requests" value={rows.length} color="violet" /><MiniMetric title="Pending review" value={rows.filter((row) => row.status === "pending").length} color="amber" /><MiniMetric title="Approved" value={rows.filter((row) => row.status === "approved").length} color="green" />{user.role === "employee" && <MiniMetric title={`Paid leave left in ${myLeaveBalance?.year || new Date().getFullYear()}`} value={`${myLeaveBalance?.remaining_days ?? "—"} / ${myLeaveBalance?.allocated_days ?? 12}`} color="blue" />}</div>}
    {page === "leaves" && user.role !== "employee" && <section className="overflow-hidden rounded-2xl border border-[#eadfce] bg-white shadow-card">
      <div className="border-b border-slate-100 px-5 py-4"><h2 className="text-xs font-bold text-ink">Paid leave balances · {new Date().getFullYear()}</h2><p className="mt-1 text-[10px] text-slate-400">12 days are assigned by default; only approved leave days are deducted.</p></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-left"><thead><tr className="bg-slate-50/70">{["Employee", "Employee ID", "Allocated", "Used", "Remaining"].map((label) => <th key={label} className="px-5 py-3 text-[9px] font-bold uppercase tracking-[.1em] text-slate-400">{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-50">{leaveBalances.map((balance) => <tr key={balance.employee_id}><td className="px-5 py-3 text-[11px] font-semibold text-ink">{balance.employee_name}</td><td className="px-5 py-3 text-[11px] text-slate-600">{balance.employee_code || "—"}</td><td className="px-5 py-3 text-[11px] text-slate-600">{balance.allocated_days} days</td><td className="px-5 py-3 text-[11px] text-slate-600">{balance.approved_days_used} days</td><td className="px-5 py-3 text-[11px] font-bold text-emerald-700">{balance.remaining_days} days</td></tr>)}{!leaveBalances.length && !loading && <tr><td colSpan={5} className="px-5 py-6 text-center text-xs text-slate-400">No employee leave balances found.</td></tr>}</tbody></table></div>
    </section>}
    {page === "employees" && <div className="grid gap-3 sm:grid-cols-3"><MiniMetric title="Total employees" value={rows.length} color="violet" /><MiniMetric title="Active" value={rows.filter((row) => row.status === "Active").length} color="green" /><MiniMetric title="Departments" value={new Set(rows.map((row) => row.department).filter(Boolean)).size} color="blue" /></div>}
    <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-xs font-bold text-ink">{page === "attendance" && user.role !== "employee" ? "All employee attendance" : `All ${config.title.toLowerCase()}`}</h2><p className="mt-1 text-[10px] text-slate-400">{filtered.length} records found</p></div><label className="flex h-9 w-full items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 sm:w-[260px]"><Search size={14} className="text-slate-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={page === "attendance" || page === "leaves" ? "Search employee name or ID..." : `Search ${config.title.toLowerCase()}...`} className="w-full bg-transparent text-[10px] outline-none placeholder:text-slate-400" /></label></div>
      <div className="scrollbar-thin overflow-x-auto">
        <table className="w-full min-w-[720px] text-left">
          <thead><tr className="bg-slate-50/70">{config.columns.map(([, title]) => <th key={title} className="px-5 py-3 text-[9px] font-bold uppercase tracking-[.1em] text-slate-400">{title}</th>)}<th className="px-5 py-3 text-right text-[9px] font-bold uppercase tracking-[.1em] text-slate-400">Actions</th></tr></thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? <tr><td colSpan={config.columns.length + 1} className="px-5 py-12 text-center text-xs text-slate-400">Loading {config.title.toLowerCase()}…</td></tr>
              : filtered.length ? filtered.map((row, index) => <tr key={row.id ?? index} className="transition hover:bg-slate-50/60">{config.columns.map(([key, title]) => <td key={key} className="max-w-[240px] px-5 py-3.5 text-[11px] text-slate-600">{key === "name" && page === "employees" ? <div className="flex items-center gap-2.5"><EmployeeAvatar employeeId={row.id} hasPhoto={row.has_profile_image} name={row.name} className="h-8 w-8 rounded-full text-[9px]" /><span className="truncate font-semibold text-ink">{row[key] || "—"}</span></div> : key === "bank_account_masked" ? <span className={row[key] ? "font-mono font-semibold text-slate-600" : "text-slate-400"}>{row[key] || "Not added"}</span> : key === "status" || key === "role" ? <StatusBadge value={row[key]} /> : ["check_in", "check_out"].includes(key) ? dateTimeLabel(row[key]) : ["pay_period", "start_date", "end_date", "work_date", "holiday_date", "created_at", "published_at", "expires_at"].includes(key) ? dateLabel(row[key]) : ["gross_salary", "deductions", "net_salary"].includes(key) ? currency(row[key]) : <span className={`${["title", "employee_name", "employee_code"].includes(key) ? "font-semibold text-ink" : ""} ${key === "body" || key === "description" || key === "reason" ? "line-clamp-1" : ""}`} title={String(row[key] ?? "")}>{prettify(row[key])}</span>}</td>)}
                <td className="px-5 py-3.5"><div className="flex justify-end gap-1">{(page === "employees" || page === "attendance" || (page === "leaves" && row.status === "pending") || (page === "users" && user.role === "admin")) && canManage && <button onClick={() => action(row, "edit")} title={`Edit ${page === "attendance" ? "attendance" : page === "leaves" ? "leave request" : page === "users" ? "login account" : "employee"}`} className="rounded-lg p-2 text-slate-400 hover:bg-[#efe2ce] hover:text-brand"><Pencil size={14} /></button>}{page === "leaves" && row.status === "pending" && user.role !== "employee" && <><button onClick={() => action(row, "approve")} title="Approve" className="rounded-lg bg-emerald-50 p-2 text-emerald-600 hover:bg-emerald-100"><Check size={14} /></button><button onClick={() => action(row, "reject")} title="Reject" className="rounded-lg bg-rose-50 p-2 text-rose-600 hover:bg-rose-100"><X size={14} /></button></>}{page === "payroll" && row.status !== "paid" && user.role !== "employee" && <button onClick={() => action(row, "paid")} className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[9px] font-bold text-emerald-700">Mark paid</button>}{page === "payroll" && <button onClick={() => action(row, "payslip")} title="View payslip" className="rounded-lg p-2 text-slate-400 hover:bg-violet-50 hover:text-brand"><FileText size={14} /></button>}{canDelete && <button onClick={() => action(row, "delete")} title="Delete" className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><X size={14} /></button>}</div></td>
              </tr>)
                : <tr><td colSpan={config.columns.length + 1}><EmptyState title={search ? "No matching records" : `No ${config.title.toLowerCase()} yet`} detail={search ? "Try another search term." : "When records are added, they’ll show up here."} action={canManage && config.fields ? <button onClick={() => setModal(true)} className="mt-3 rounded-lg bg-brand px-3 py-2 text-[10px] font-bold text-white"><Plus size={13} className="mr-1 inline" />Add first record</button> : null} /></td></tr>}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-[10px] text-slate-400"><span>Showing {filtered.length ? 1 : 0}–{filtered.length} of {filtered.length}</span><div className="flex gap-1"><button disabled className="grid h-7 w-7 place-items-center rounded-lg border border-slate-100 disabled:opacity-40"><ChevronLeft size={14} /></button><span className="grid h-7 w-7 place-items-center rounded-lg bg-violet-50 font-bold text-brand">1</span><button disabled className="grid h-7 w-7 place-items-center rounded-lg border border-slate-100 disabled:opacity-40"><ChevronRight size={14} /></button></div></div>
    </section>
    {modal && <RecordModal key={editing?.id || "new"} config={config} employees={employees} page={page} role={user.role} record={editing} onClose={() => { setModal(false); setEditing(null); }} onSubmit={create} />}
  </div>;
}

function RecordModal({ config, employees, page, role, record, onClose, onSubmit }) {
  const [form, setForm] = useState(() => {
    if (!record) return page === "employees" ? { status: "Active", annual_paid_leave_days: 12 }
      : page === "users" ? { role: "hr" }
        : page === "attendance" ? { work_date: localDateKey(), status: "present" }
          : {};
    return Object.fromEntries(config.fields.map((field) => [
      field.name,
      field.name === "bank_account_number" ? "" :
        field.type === "datetime-local" ? dateTimeInputValue(record[field.name]) :
          field.type === "date" && record[field.name] ? String(record[field.name]).slice(0, 10) :
            field.name === "employee_id" && page === "users" ? record.linked_employee_id ?? "" :
              record[field.name] ?? ""
    ]));
  });
  const [profileImage, setProfileImage] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const isEmployeeAccount = page === "users" && form.role === "employee";
  const handleSubmit = async (event) => {
    event.preventDefault(); setError(""); setBusy(true);
    let body = { ...form };
    if (page === "payroll" && !body.deductions) body.deductions = 0;
    if (page === "payroll" && !body.status) body.status = "pending";
    if (page === "employees" && profileImage) {
      const multipart = new FormData();
      Object.entries(body).forEach(([key, value]) => multipart.append(key, value));
      multipart.append("profile_image", profileImage);
      body = multipart;
    }
    try { await onSubmit(body, record); } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[2px]" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
    <form onSubmit={handleSubmit} className="max-h-[92vh] w-full max-w-[680px] overflow-y-auto rounded-3xl bg-white shadow-2xl">
      <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-100 bg-white px-6 py-5"><div><h2 className="text-base font-bold text-ink">{record ? `Edit ${page === "attendance" ? "attendance" : page === "leaves" ? "leave request" : page === "employees" ? "employee" : page === "users" ? "login account" : config.title.replace(/s$/, "")}` : `Add ${page === "attendance" ? "attendance" : config.title.replace(/s$/, "")}`}</h2><p className="mt-1 text-[10px] text-slate-400">{record ? "Update this record." : "Fill in the details below to create a record."}</p></div><button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={17} /></button></div>
      {page === "employees" && <div className="mx-6 mt-5 flex items-start gap-3 rounded-2xl border border-violet-100 bg-violet-50/70 p-4"><span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white text-brand"><ShieldCheck size={16} /></span><p className="text-[10px] font-medium leading-5 text-slate-600">{record ? "Update employee details and the annual paid leave allowance here. Leave balance renews each calendar year." : "We’ll email the employee their name, work email, employee ID, and a one-time setup code. They’ll use the code to choose their own password; passwords are never emailed. The default paid leave allowance is 12 days per calendar year."}</p></div>}
      {page === "employees" && <div className="mx-6 mt-5 flex items-center gap-4 rounded-2xl border border-slate-100 p-4">
        <EmployeeAvatar employeeId={record?.id} hasPhoto={record?.has_profile_image} file={profileImage} name={form.name || record?.name} className="h-16 w-16 rounded-2xl text-lg" />
        <label className="min-w-0 flex-1 text-[10px] font-bold text-slate-600"><span className="inline-flex items-center gap-2"><Camera size={14} className="text-brand" />Passport-size photo <span className="font-normal text-slate-400">(optional)</span></span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const selected = event.target.files?.[0] || null; if (selected && selected.size > 5 * 1024 * 1024) { setError("Profile photo must be 5 MB or smaller."); event.target.value = ""; return; } setError(""); setProfileImage(selected); }} className="mt-2 block w-full text-[10px] font-normal text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-violet-50 file:px-3 file:py-2 file:text-[10px] file:font-bold file:text-brand" /><span className="mt-1 block font-normal text-slate-400">JPG, PNG or WebP · up to 5 MB{record?.has_profile_image ? " · leave empty to keep the current photo" : ""}</span></label>
      </div>}
      <div className="grid gap-5 p-6 sm:grid-cols-2">{config.fields.filter((field) => !(role === "employee" && field.name === "employee_id") && !(record && field.name === "employee_id" && page !== "users")).map((field) => <label key={field.name} className={`block text-[10px] font-bold text-slate-600 ${field.type === "textarea" ? "sm:col-span-2" : ""}`}>{field.label}{field.type === "textarea" ? <textarea required={field.required} rows={3} value={form[field.name] || ""} onChange={(e) => setForm({ ...form, [field.name]: e.target.value })} className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-normal outline-none focus:border-brand focus:ring-4 focus:ring-brand/10" /> : field.type === "select" ? <select disabled={page === "users" && field.name === "role" && record?.role === "employee"} required={field.required} value={form[field.name] || ""} onChange={(e) => setForm({ ...form, [field.name]: e.target.value })} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-normal outline-none focus:border-brand disabled:bg-slate-50"><option value="">Select…</option>{page === "users" && field.name === "role" && record?.role === "employee" ? <option value="employee">employee</option> : field.options.map((option) => <option key={option} value={option}>{option}</option>)}</select> : field.type === "employee" ? <><select required={isEmployeeAccount || field.required && !record} value={form.employee_id || ""} onChange={(e) => setForm({ ...form, employee_id: e.target.value })} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-normal outline-none focus:border-brand"><option value="">Select employee profile…</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name} · {employee.employee_code || employee.department || "Employee"}</option>)}</select>{field.helper && <span className="mt-1 block text-[9px] font-normal leading-4 text-slate-400">{field.helper}</span>}</> : <><input required={field.required && (!record || field.name !== "password")} minLength={field.name === "password" && record && !form.password ? undefined : field.minLength} maxLength={field.name === "bank_account_number" ? 45 : undefined} inputMode={field.name === "bank_account_number" ? "numeric" : undefined} autoComplete={field.type === "password" ? "new-password" : "off"} type={field.type || "text"} min={field.type === "number" ? String(field.min ?? 0) : undefined} max={field.type === "number" ? field.max : undefined} step={field.type === "number" ? "any" : undefined} value={form[field.name] || ""} onChange={(e) => setForm({ ...form, [field.name]: e.target.value })} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-xs font-normal outline-none focus:border-brand focus:ring-4 focus:ring-brand/10" />{field.helper && <span className="mt-1 block text-[9px] font-normal leading-4 text-slate-400">{field.helper}</span>}</>}</label>)}</div>
      {error && <p role="alert" className="mx-6 rounded-lg bg-rose-50 px-3 py-2 text-[10px] font-semibold text-rose-700">{error}</p>}
      <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4"><button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-[10px] font-bold text-slate-500 hover:bg-slate-50">Cancel</button><button disabled={busy} className="rounded-xl bg-brand px-4 py-2.5 text-[10px] font-bold text-white hover:bg-[#5147d4] disabled:opacity-60">{busy ? "Saving…" : record ? "Save changes" : "Create record"}</button></div>
    </form>
  </div>;
}

function Documents({ user }) {
  const [rows, setRows] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const result = await api("/documents");
      setRows(getRows(result));
      if (user.role !== "employee") setEmployees(getRows(await api("/employees"), "employees"));
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  }, [user.role]);
  useEffect(() => { refresh(); }, [refresh]);
  const upload = async (event) => {
    event.preventDefault(); setError(""); setNotice("");
    if (!file) return setError("Choose a file to upload.");
    const body = new FormData(); body.append("file", file);
    if (selectedEmployee) body.append("employee_id", selectedEmployee);
    try { await api("/documents", { method: "POST", body }); setFile(null); setNotice("Document uploaded."); event.target.reset(); refresh(); }
    catch (err) { setError(err.message); }
  };
  const download = async (row) => {
    try {
      const blob = await api(`/documents/${row.id}/download`);
      const url = URL.createObjectURL(blob); const anchor = document.createElement("a");
      anchor.href = url; anchor.download = row.original_name; anchor.click(); URL.revokeObjectURL(url);
    } catch (err) { setError(err.message); }
  };
  return <div className="space-y-6"><div><p className="text-[11px] font-bold uppercase tracking-[.16em] text-brand">{user.role === "employee" ? "Your workspace" : "People operations"}</p><h1 className="mt-2 text-[27px] font-bold tracking-tight text-ink">{user.role === "employee" ? "My documents" : "Documents"}</h1><p className="mt-1 text-xs text-slate-400">{user.role === "employee" ? "Your personal files, available whenever you need them." : "Keep employee documents secure and easy to find."}</p></div>
    {notice && <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700">{notice}</p>}{error && <ErrorBanner message={error} retry={refresh} />}
    <form onSubmit={upload} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card sm:p-6"><h2 className="text-sm font-bold text-ink">Upload a document</h2><p className="mt-1 text-[10px] text-slate-400">PDF, JPG, PNG or DOCX · up to 5 MB</p><div className="mt-4 grid gap-3 md:grid-cols-[1fr_220px_auto]">
      <input type="file" accept=".pdf,.jpg,.jpeg,.png,.docx" onChange={(e) => setFile(e.target.files?.[0] || null)} className="block w-full rounded-xl border border-slate-200 bg-white p-2 text-[10px] text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-violet-50 file:px-3 file:py-2 file:text-[10px] file:font-bold file:text-brand" />
      {user.role !== "employee" && <select value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)} required className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-[10px] outline-none focus:border-brand"><option value="">Choose employee…</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select>}
      <button className="h-10 rounded-xl bg-brand px-4 text-[10px] font-bold text-white hover:bg-[#5147d4]"><Plus size={14} className="mr-1 inline" />Upload</button></div></form>
    <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card"><div className="border-b border-slate-100 px-5 py-4"><h2 className="text-xs font-bold text-ink">{user.role === "employee" ? "My files" : "Shared documents"}</h2><p className="mt-1 text-[10px] text-slate-400">{rows.length} files</p></div>{loading ? <p className="p-8 text-center text-xs text-slate-400">Loading documents…</p> : rows.length ? <div className="divide-y divide-slate-50">{rows.map((row) => <div key={row.id} className="flex items-center gap-3 px-5 py-4"><span className="grid h-10 w-10 place-items-center rounded-xl bg-rose-50 text-rose-500"><FileText size={18} /></span><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-ink">{row.original_name}</p><p className="mt-1 text-[10px] text-slate-400">{row.employee_name || "My document"} · {dateLabel(row.created_at)}</p></div><button onClick={() => download(row)} className="rounded-lg bg-violet-50 px-3 py-2 text-[10px] font-bold text-brand hover:bg-violet-100">Download</button></div>)}</div> : <EmptyState title="No documents yet" detail="Upload a file to keep it available in your workspace." />}</section>
  </div>;
}

function AttendanceControls({ onDone, attendance }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const todayAttendance = attendance.find((row) => String(row.work_date).slice(0, 10) === localDateKey());
  const canCheckIn = !todayAttendance?.check_in;
  const canCheckOut = Boolean(todayAttendance?.check_in) && !todayAttendance?.check_out;
  const mark = async (kind) => {
    setBusy(true); setMessage("");
    try { await api(`/attendance/${kind}`, { method: "POST", body: {} }); setMessage(kind === "check-in" ? "You’re checked in." : "You’re checked out."); onDone(); }
    catch (err) { setMessage(err.message); } finally { setBusy(false); }
  };
  return <div className="flex flex-wrap items-center gap-2">
    {todayAttendance?.check_in && <span className="hidden text-[9px] text-slate-500 xl:inline">In {dateTimeLabel(todayAttendance.check_in)}{todayAttendance.check_out ? ` · Out ${dateTimeLabel(todayAttendance.check_out)}` : ""}</span>}
    <button disabled={busy || !canCheckIn} onClick={() => mark("check-in")} className="rounded-xl bg-emerald-700 px-3 py-2.5 text-[10px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-45">Check in</button>
    <button disabled={busy || !canCheckOut} onClick={() => mark("check-out")} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[10px] font-bold text-slate-600 disabled:cursor-not-allowed disabled:opacity-45">Check out</button>
    {!canCheckIn && !canCheckOut && <span className="text-[9px] font-semibold text-emerald-700">Day completed</span>}
    {message && <span role="status" className="text-[9px] text-slate-500">{message}</span>}
  </div>;
}

function EmployeeAvatar({ employeeId, endpoint, hasPhoto, file, name, className = "" }) {
  const [imageUrl, setImageUrl] = useState("");
  useEffect(() => {
    let active = true;
    let objectUrl = "";
    if (file) {
      objectUrl = URL.createObjectURL(file);
      setImageUrl(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    }
    if (!hasPhoto) {
      setImageUrl("");
      return undefined;
    }
    api(endpoint || `/employees/${employeeId}/photo`)
      .then((blob) => {
        if (active) {
          objectUrl = URL.createObjectURL(blob);
          setImageUrl(objectUrl);
        }
      })
      .catch(() => {
        if (active) setImageUrl("");
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [employeeId, endpoint, hasPhoto, file]);
  return <span className={`grid shrink-0 place-items-center overflow-hidden bg-violet-100 font-bold uppercase text-violet-700 ${className}`}>
    {imageUrl ? <img src={imageUrl} alt={`${name || "Employee"} profile`} className="h-full w-full object-cover" /> : initials(name)}
  </span>;
}

function Profile({ user }) {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({
    name: user.name,
    phone: "",
    address: "",
    emergency_contact_name: "",
    emergency_contact_phone: ""
  });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => { api("/profile").then((result) => { setProfile(result.profile); setForm({ name: result.profile.name || "", phone: result.profile.phone || "", address: result.profile.address || "", emergency_contact_name: result.profile.emergency_contact_name || "", emergency_contact_phone: result.profile.emergency_contact_phone || "" }); }).catch((err) => setError(err.message)).finally(() => setLoading(false)); }, []);
  const save = async (event) => {
    event.preventDefault(); setError(""); setNotice("");
    try { await api("/profile", { method: "PATCH", body: form }); setNotice("Profile updated successfully."); }
    catch (err) { setError(err.message); }
  };
  const roleLabel = {
    admin: "Workspace administrator",
    hr: "HR team member",
    employee: "Employee"
  }[profile?.role || user.role] || "Team member";
  const employeeFacts = [
    profile?.employee_code && { label: "Employee ID", value: profile.employee_code },
    profile?.department && { label: "Department", value: profile.department },
    profile?.designation && { label: "Job title", value: profile.designation },
    profile?.joining_date && { label: "Joined", value: dateLabel(profile.joining_date) },
    profile?.annual_paid_leave_days !== undefined && { label: "Paid leave / year", value: `${profile.annual_paid_leave_days} days` },
    profile?.bank_account_masked && { label: "Bank account", value: profile.bank_account_masked },
    profile?.status && { label: "Employment status", value: profile.status }
  ].filter(Boolean);
  return <div className="space-y-6"><div><p className="text-[11px] font-bold uppercase tracking-[.16em] text-brand">Your account</p><h1 className="mt-2 text-[27px] font-bold tracking-tight text-ink">My profile</h1><p className="mt-1 text-xs text-slate-400">Your personal details and account information.</p></div>
    {error && <ErrorBanner message={error} />}{notice && <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700">{notice}</p>}
    {loading ? <p className="p-8 text-center text-xs text-slate-400">Loading profile…</p> : <div className="grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
      <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card">
        <div className="h-24 bg-gradient-to-r from-violet-500 via-brand to-indigo-400" />
        <div className="px-6 pb-6">
          <EmployeeAvatar endpoint="/profile/photo" hasPhoto={profile?.has_profile_image} name={profile?.name} className="-mt-10 h-[76px] w-[76px] rounded-[24px] border-4 border-white text-2xl text-brand shadow-sm" />
          <h2 className="mt-4 text-lg font-bold tracking-tight text-ink">{profile?.name || "Your profile"}</h2>
          <p className="mt-1 break-all text-xs text-slate-400">{profile?.email || "Email not available"}</p>
          {profile?.employee_email && profile.employee_email.toLowerCase() !== profile.email?.toLowerCase() && <p className="mt-1 break-all text-[10px] text-slate-400">Employee work email · {profile.employee_email}</p>}
          <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1.5 text-[10px] font-bold text-brand"><ShieldCheck size={13} />{roleLabel}</span>
          {employeeFacts.length > 0 && <div className="mt-6 border-t border-slate-100 pt-4"><p className="mb-3 text-[10px] font-bold uppercase tracking-[.12em] text-slate-400">Employment details</p><div className="grid grid-cols-2 gap-2">{employeeFacts.map((fact) => <ProfileFact key={fact.label} label={fact.label} value={fact.value} />)}</div></div>}
          {employeeFacts.length === 0 && <div className="mt-6 rounded-xl bg-slate-50 p-3.5"><p className="text-[10px] font-semibold text-slate-600">Account access</p><p className="mt-1 text-[10px] leading-5 text-slate-400">Your role controls which workspace tools and information you can access.</p></div>}
        </div>
      </section>
      <form onSubmit={save} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card sm:p-7">
        <div className="flex items-start gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-50 text-brand"><UserRound size={17} /></span><div><h2 className="text-sm font-bold text-ink">Personal information</h2><p className="mt-1 text-[10px] text-slate-400">Keep your account details up to date.</p></div></div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2"><ProfileInput label="Full name" value={form.name} onChange={(name) => setForm({ ...form, name })} placeholder="Enter your name" /><ProfileInput label="Login email" value={profile?.email || ""} disabled /><ProfileInput label="Employee work email" value={profile?.employee_email || "No linked employee profile"} disabled /><ProfileInput label="Phone number" value={form.phone} onChange={(phone) => setForm({ ...form, phone })} placeholder="Add a phone number (optional)" /><ProfileInput label="Workspace role" value={roleLabel} disabled /><ProfileInput label="Emergency contact" value={form.emergency_contact_name} onChange={(emergency_contact_name) => setForm({ ...form, emergency_contact_name })} placeholder="Contact name (optional)" /><ProfileInput label="Emergency contact phone" value={form.emergency_contact_phone} onChange={(emergency_contact_phone) => setForm({ ...form, emergency_contact_phone })} placeholder="Phone number (optional)" /><label className="block text-[10px] font-bold text-slate-600 sm:col-span-2">Home address<textarea rows={3} value={form.address || ""} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Add your home address (optional)" className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-normal outline-none transition placeholder:text-slate-300 focus:border-brand focus:ring-4 focus:ring-brand/10" /></label></div>
        <div className="mt-6 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between"><p className="text-[10px] leading-4 text-slate-400">Your work email and role are managed by your administrator.</p><button className="shrink-0 rounded-xl bg-brand px-4 py-2.5 text-[10px] font-bold text-white shadow-sm shadow-brand/20 transition hover:bg-[#5147d4]"><Check size={13} className="mr-1.5 inline" />Save changes</button></div>
      </form>
    </div>}
  </div>;
}

function ProfileInput({ label, value, onChange, disabled, placeholder }) {
  return <label className="block text-[10px] font-bold text-slate-600">{label}<input disabled={disabled} value={value || ""} placeholder={placeholder} onChange={(e) => onChange?.(e.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-xs font-normal outline-none transition placeholder:text-slate-300 focus:border-brand focus:ring-4 focus:ring-brand/10 disabled:bg-slate-50 disabled:text-slate-400" /></label>;
}
function ProfileFact({ label, value }) { return <div className="rounded-xl bg-slate-50 p-3"><p className="text-[9px] text-slate-400">{label}</p><p className="mt-1 truncate text-[10px] font-bold capitalize text-slate-700">{value}</p></div>; }
function MiniMetric({ title, value, color }) {
  const colors = { violet: "text-brand bg-violet-50", amber: "text-amber-700 bg-amber-50", green: "text-emerald-700 bg-emerald-50", blue: "text-blue-700 bg-blue-50" };
  return <div className="rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-card"><p className="text-[10px] text-slate-400">{title}</p><p className={`mt-2 inline-flex rounded-lg px-2.5 py-1 text-sm font-bold ${colors[color]}`}>{value}</p></div>;
}
function StatusBadge({ value }) {
  const key = String(value || "").toLowerCase();
  const colors = key === "active" || key === "approved" || key === "paid" || key === "admin" ? "bg-emerald-50 text-emerald-700" : key === "pending" || key === "hr" ? "bg-amber-50 text-amber-700" : key === "rejected" || key === "inactive" || key === "cancelled" ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-600";
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-bold capitalize ${colors}`}><span className="h-1.5 w-1.5 rounded-full bg-current opacity-65" />{prettify(value)}</span>;
}
function EmptyState({ title, detail, action }) {
  return <div className="px-5 py-12 text-center"><div className="mx-auto grid h-11 w-11 place-items-center rounded-2xl bg-slate-50 text-slate-300"><FileText size={19} /></div><p className="mt-3 text-xs font-bold text-slate-600">{title}</p><p className="mt-1 text-[10px] text-slate-400">{detail}</p>{action}</div>;
}
function ErrorBanner({ message, retry }) {
  return <div role="alert" className="flex items-center gap-3 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-[11px] text-rose-700"><span className="flex-1">{message}</span>{retry && <button onClick={retry} className="font-bold underline underline-offset-2">Retry</button>}</div>;
}
function initials(name = "") { return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("") || "PP"; }
function payslipMarkup(payslip) {
  const safe = (value) => String(value ?? "—").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
  return `<!doctype html><html><head><meta charset="utf-8"><title>Payslip · ${safe(payslip.employee_name)}</title><style>
    body{font-family:Arial,sans-serif;color:#172033;max-width:680px;margin:48px auto;padding:24px}
    h1{font-size:24px;margin:0}p{color:#697386;font-size:13px}.top{display:flex;justify-content:space-between;border-bottom:1px solid #e7eaf0;padding-bottom:22px}
    table{width:100%;border-collapse:collapse;margin-top:30px;font-size:14px}td{padding:14px 8px;border-bottom:1px solid #edf0f5}td:last-child{text-align:right;font-weight:bold}
    .total td{font-size:17px;font-weight:bold;color:#6258e8}.print{margin-top:24px;padding:10px 16px;border:0;border-radius:8px;background:#6258e8;color:white;font-weight:bold;cursor:pointer}
    @media print{body{margin:0}.print{display:none}}
  </style></head><body><div class="top"><div><h1>PAYSLIP</h1><p>${safe(payslip.employee_name)} · ${safe(payslip.employee_code)}</p><p>${safe(payslip.department)}${payslip.designation ? ` · ${safe(payslip.designation)}` : ""}</p></div><div><p>Pay period</p><strong>${safe(dateLabel(payslip.pay_period))}</strong><p>Status: ${safe(payslip.status)}</p></div></div><table>
    <tr><td>Gross salary</td><td>${safe(currency(payslip.gross_salary))}</td></tr><tr><td>Deductions</td><td>− ${safe(currency(payslip.deductions))}</td></tr><tr class="total"><td>Net pay</td><td>${safe(currency(payslip.net_salary))}</td></tr><tr><td>Payment date</td><td>${safe(dateLabel(payslip.payment_date))}</td></tr>
  </table><button class="print" onclick="window.print()">Print payslip</button></body></html>`;
}

export default App;
