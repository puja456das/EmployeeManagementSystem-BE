import { useCallback, useEffect, useState } from "react";
import { Activity, ArrowUpRight, BriefcaseBusiness, CalendarDays, ChevronRight, Clock3, CreditCard, Settings2, Sparkles, Users } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api, getRows } from "../../api.js";
import { currency, dateLabel, initials } from "../../utils/formatters.js";
import { EmptyState, ErrorBanner, StatCard } from "../../components/ui.jsx";

export default function Dashboard({ user, onNavigate }) {
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
