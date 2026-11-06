import { useCallback, useEffect, useState } from "react";
import { ArrowRight, Bell, ShieldCheck, Users } from "lucide-react";
import { api, getRows } from "../../api.js";
import { dateLabel } from "../../utils/formatters.js";
import { EmptyState, ErrorBanner, StatCard } from "../../components/ui.jsx";

export default function ControlCenter({ user, onNavigate }) {
  const [summary, setSummary] = useState(null);
  const [hrAccounts, setHrAccounts] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [dashboardResult, userResult, announcementResult] = await Promise.all([
        api("/dashboard"),
        api("/users"),
        api("/announcements")
      ]);
      setSummary(dashboardResult.data);
      setHrAccounts(getRows(userResult, "users").filter((account) => account.role === "hr"));
      setAnnouncements(getRows(announcementResult));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const stats = [
    { label: "HR accounts", value: hrAccounts.length, icon: ShieldCheck, tone: "violet", trend: "People operations", detail: "platform access" },
    { label: "Employee profiles", value: summary?.totalEmployees ?? "—", icon: Users, tone: "blue", trend: "Managed by HR", detail: "in the organization" },
    { label: "Departments", value: summary?.departments ?? "—", icon: Users, tone: "green", trend: "Organization", detail: "teams configured" },
    { label: "HR announcements", value: announcements.filter((item) => item.created_by_user_id != null && String(item.created_by_user_id) === String(user.id)).length, icon: Bell, tone: "amber", trend: "System updates", detail: "sent to HR accounts" }
  ];

  return <div className="space-y-7">
    <section className="relative overflow-hidden rounded-[26px] bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-900 p-6 text-white shadow-xl shadow-indigo-950/10 sm:p-8">
      <div className="pointer-events-none absolute -right-10 -top-24 h-72 w-72 rounded-full border border-white/10" />
      <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[.17em] text-indigo-200">System administration</p>
          <h1 className="mt-2 text-[27px] font-bold tracking-tight md:text-[32px]">Admin control center</h1>
          <p className="mt-1 text-xs text-white/70">Manage HR access and send platform updates. Daily people operations live in the HR platform.</p>
        </div>
        <button onClick={refresh} className="self-start rounded-xl border border-white/20 bg-white/10 px-3.5 py-2.5 text-[11px] font-semibold text-white hover:bg-white/20 sm:self-auto">Refresh overview</button>
      </div>
      <div className="relative mt-6 flex flex-wrap gap-2"><span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-semibold">Admin platform</span><span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-semibold">Signed in as {user.name}</span></div>
    </section>

    {error && <ErrorBanner message={error} retry={refresh} />}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((item) => <StatCard key={item.label} {...item} loading={loading} />)}
    </div>

    <div className="grid gap-5 xl:grid-cols-[1.25fr_1fr]">
      <section className="rounded-2xl border border-slate-100 bg-white shadow-card">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div><h2 className="text-sm font-bold text-ink">HR platform access</h2><p className="mt-1 text-[10px] text-slate-400">HR accounts responsible for day-to-day operations</p></div>
          <button onClick={() => onNavigate("users")} className="text-[10px] font-bold text-indigo-700 hover:underline">Manage <ArrowRight size={13} className="ml-1 inline" /></button>
        </div>
        {hrAccounts.length ? <div className="divide-y divide-slate-50">
          {hrAccounts.slice(0, 6).map((account) => <div key={account.id} className="flex items-center gap-3 px-5 py-3.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-50 text-xs font-bold uppercase text-indigo-700">{account.name?.split(/\s+/).slice(0, 2).map((part) => part[0]).join("")}</span>
            <span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-ink">{account.name}</span><span className="mt-1 block truncate text-[10px] text-slate-400">{account.email}</span></span>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-bold text-emerald-700">HR</span>
          </div>)}
        </div> : <EmptyState title={loading ? "Loading HR accounts…" : "No HR accounts yet"} detail="Create an HR login to delegate people operations." />}
      </section>

      <section className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-white to-indigo-50/60 p-5 shadow-card sm:p-6">
        <h2 className="text-sm font-bold text-ink">Admin controls</h2>
        <p className="mt-1 text-[10px] text-slate-400">System-level tasks reserved for the administrator.</p>
        <div className="mt-5 space-y-2">
          {[
            { label: "Manage user access", detail: "Create or update HR accounts", page: "users", icon: ShieldCheck },
            { label: "Message selected HR", detail: "Send a private platform announcement", page: "announcements", icon: Bell },
            { label: "Admin profile", detail: "Update your own account details", page: "profile", icon: Users }
          ].map(({ label, detail, page, icon: Icon }) => <button key={page} onClick={() => onNavigate(page)} className="flex w-full items-center gap-3 rounded-xl border border-indigo-100 bg-white p-3 text-left transition hover:border-indigo-300 hover:shadow-sm">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-indigo-50 text-indigo-700"><Icon size={16} /></span>
            <span className="min-w-0 flex-1"><span className="block text-[11px] font-bold text-ink">{label}</span><span className="mt-1 block text-[9px] text-slate-400">{detail}</span></span>
            <ArrowRight size={14} className="text-indigo-600" />
          </button>)}
        </div>
      </section>
    </div>
  </div>;
}
