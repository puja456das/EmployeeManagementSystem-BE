import { useCallback, useEffect, useState } from "react";
import { Activity, ArrowRight, CalendarCheck, CalendarDays, Check, Clock3, FileText, Plus, UserRound, WalletCards } from "lucide-react";
import { api, getRows } from "../../api.js";
import { currency, dateLabel, dateTimeLabel, localDateKey } from "../../utils/formatters.js";
import { EmptyState, ErrorBanner, StatusBadge } from "../../components/ui.jsx";
import EmployeeAvatar from "../../components/EmployeeAvatar.jsx";

export default function EmployeeDashboard({ user, onNavigate }) {
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
