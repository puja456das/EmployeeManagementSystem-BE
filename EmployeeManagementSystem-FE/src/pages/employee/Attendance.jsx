import { useCallback, useEffect, useMemo, useState } from "react";
import { api, getRows } from "../../api.js";
import AttendancePeriodFilters from "../../components/AttendancePeriodFilters.jsx";
import AttendanceControls from "../../components/AttendanceControls.jsx";
import RecordTable from "../../components/RecordTable.jsx";
import { ErrorBanner, MiniMetric, StatusBadge } from "../../components/ui.jsx";
import { dateLabel, dateTimeLabel, localDateKey } from "../../utils/formatters.js";

export default function Attendance() {
  const [records, setRecords] = useState([]);
  const [todayRecords, setTodayRecords] = useState([]);
  const [period, setPeriod] = useState({ year: String(new Date().getFullYear()), month: "", date: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const loadAttendance = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams({ year: period.year });
      if (period.month) params.set("month", period.month);
      if (period.date) params.set("date", period.date);
      const [attendanceResult, todayResult] = await Promise.all([
        api(`/attendance/mine?${params.toString()}`),
        api(`/attendance/mine?date=${localDateKey()}`)
      ]);
      setRecords(getRows(attendanceResult));
      setTodayRecords(getRows(todayResult));
    } catch (requestError) { setError(requestError.message); }
    finally { setLoading(false); }
  }, [period]);
  useEffect(() => { loadAttendance(); }, [loadAttendance]);
  const summary = useMemo(() => ({
    total_days: records.length,
    present_days: records.filter((row) => row.status !== "absent").length,
    absent_days: records.filter((row) => row.status === "absent").length,
    hours_worked: records.reduce((hours, row) => {
      if (!row.check_in || !row.check_out) return hours;
      return hours + Math.max(0, new Date(row.check_out) - new Date(row.check_in)) / 3600000;
    }, 0).toFixed(2)
  }), [records]);

  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-[11px] font-bold uppercase tracking-[.16em] text-brand">Your workspace</p><h1 className="mt-2 text-[27px] font-bold tracking-tight text-ink">My attendance</h1><p className="mt-1 text-xs text-slate-400">Record today’s check-in and review your work history.</p></div><AttendanceControls onDone={loadAttendance} attendance={todayRecords} /></div>
    <AttendancePeriodFilters value={period} onChange={setPeriod} />
    {error && <ErrorBanner message={error} retry={loadAttendance} />}
    <div className="grid gap-3 sm:grid-cols-4"><MiniMetric title="Days in period" value={summary.total_days} color="violet" /><MiniMetric title="Present days" value={summary.present_days} color="green" /><MiniMetric title="Absent days" value={summary.absent_days} color="amber" /><MiniMetric title="Hours worked" value={summary.hours_worked} color="blue" /></div>
    <RecordTable title="Attendance history" rows={records} loading={loading} error="" search={search} onSearch={setSearch} columns={[
      { label: "Date", render: (row) => dateLabel(row.work_date) },
      { label: "Check in", render: (row) => dateTimeLabel(row.check_in) },
      { label: "Check out", render: (row) => dateTimeLabel(row.check_out) },
      { label: "Status", render: (row) => <StatusBadge value={row.status} /> }
    ]} />
  </div>;
}
