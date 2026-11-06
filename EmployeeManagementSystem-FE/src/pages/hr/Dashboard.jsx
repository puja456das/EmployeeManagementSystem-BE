import { useCallback, useEffect, useState } from "react";
import { Activity, ArrowRight, BriefcaseBusiness, CalendarDays, Clock3, Users } from "lucide-react";
import { api, getRows } from "../../api.js";
import { dateLabel } from "../../utils/formatters.js";
import { EmptyState, ErrorBanner, StatCard, StatusBadge } from "../../components/ui.jsx";

export default function HrDashboard({ user, onNavigate }) {
  const [summary, setSummary] = useState(null);
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [dashboardResult, leaveResult] = await Promise.all([
        api("/dashboard"),
        api("/leaves")
      ]);
      setSummary(dashboardResult.data);
      setPendingLeaves(getRows(leaveResult).filter((leave) => leave.status === "pending"));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const stats = [
    { label: "Active employees", value: summary?.activeEmployees ?? "—", icon: Users, tone: "green", trend: `${summary?.totalEmployees ?? "—"} total`, detail: "employee profiles" },
    { label: "Departments", value: summary?.departments ?? "—", icon: BriefcaseBusiness, tone: "blue", trend: "Teams", detail: "in your organization" },
    { label: "Pending leave", value: summary?.pendingLeaves ?? "—", icon: CalendarDays, tone: "amber", trend: "Needs review", detail: "requests awaiting action" },
    { label: "Present today", value: summary?.presentToday ?? "—", icon: Clock3, tone: "violet", trend: "Today", detail: "attendance records" }
  ];

  return (
    <div className="space-y-7">
      <section className="relative overflow-hidden rounded-[26px] bg-gradient-to-br from-emerald-700 via-teal-700 to-cyan-700 p-6 text-white shadow-xl shadow-emerald-900/10 sm:p-8">
        <div className="pointer-events-none absolute -right-10 -top-24 h-72 w-72 rounded-full border border-white/10" />
        <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[.17em] text-emerald-100">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</p>
            <h1 className="mt-2 text-[27px] font-bold tracking-tight md:text-[32px]">Good to see you, {user.name?.split(" ")[0]}</h1>
            <p className="mt-1 text-xs text-white/75">Your people operations overview for today.</p>
          </div>
          <button onClick={refresh} className="self-start rounded-xl border border-white/20 bg-white/10 px-3.5 py-2.5 text-[11px] font-semibold text-white hover:bg-white/20 sm:self-auto"><Activity size={14} className="mr-2 inline" />Refresh overview</button>
        </div>
        <div className="relative mt-6 flex flex-wrap gap-2">
          <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-semibold">HR platform</span>
          <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-semibold">People, attendance &amp; leave</span>
        </div>
      </section>

      {error && <ErrorBanner message={error} retry={refresh} />}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => <StatCard key={item.label} {...item} loading={loading} />)}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <section className="rounded-2xl border border-slate-100 bg-white shadow-card">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div><h2 className="text-sm font-bold text-ink">Leave requests to review</h2><p className="mt-1 text-[10px] text-slate-400">Pending employee time-off requests</p></div>
            <button onClick={() => onNavigate("leaves")} className="text-[10px] font-bold text-emerald-700 hover:underline">Open requests <ArrowRight size={13} className="ml-1 inline" /></button>
          </div>
          {pendingLeaves.length ? <div className="divide-y divide-slate-50">
            {pendingLeaves.slice(0, 5).map((leave) => (
              <button key={leave.id} onClick={() => onNavigate("leaves")} className="flex w-full items-center gap-3 px-5 py-3.5 text-left hover:bg-emerald-50/40">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-600"><CalendarDays size={16} /></span>
                <span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-ink">{leave.employee_name || "Employee"} · {leave.employee_code || "—"}</span><span className="mt-1 block text-[10px] text-slate-400">{dateLabel(leave.start_date)} – {dateLabel(leave.end_date)}</span></span>
                <StatusBadge value={leave.status} />
              </button>
            ))}
          </div> : <EmptyState title={loading ? "Loading requests…" : "You’re all caught up"} detail="New pending leave requests will appear here." />}
        </section>

        <section className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50/70 p-5 shadow-card sm:p-6">
          <h2 className="text-sm font-bold text-ink">People operations</h2>
          <p className="mt-1 text-[10px] text-slate-400">Open a workspace module to take action.</p>
          <div className="mt-5 space-y-2">
            {[
              { label: "Manage employees", detail: "Profiles, job details and accounts", page: "employees", icon: Users },
              { label: "Review attendance", detail: "Daily records and corrections", page: "attendance", icon: Clock3 },
              { label: "Manage departments", detail: "Teams and employee distribution", page: "departments", icon: BriefcaseBusiness },
              { label: "Open leave requests", detail: "Approvals and leave balances", page: "leaves", icon: CalendarDays }
            ].map(({ label, detail, page, icon: Icon }) => (
              <button key={page} onClick={() => onNavigate(page)} className="flex w-full items-center gap-3 rounded-xl border border-emerald-100/70 bg-white p-3 text-left transition hover:border-emerald-300 hover:shadow-sm">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-50 text-emerald-700"><Icon size={16} /></span>
                <span className="min-w-0 flex-1"><span className="block text-[11px] font-bold text-ink">{label}</span><span className="mt-1 block text-[9px] text-slate-400">{detail}</span></span>
                <ArrowRight size={14} className="text-emerald-600" />
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
