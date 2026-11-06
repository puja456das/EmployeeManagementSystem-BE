import { useCallback, useEffect, useState } from "react";
import { api, getRows } from "../../api.js";
import AttendanceControls from "../../components/AttendanceControls.jsx";
import RecordTable from "../../components/RecordTable.jsx";
import { ErrorBanner, MiniMetric, StatusBadge } from "../../components/ui.jsx";
import { dateLabel, dateTimeLabel } from "../../utils/formatters.js";

export default function Attendance() {
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const loadAttendance = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [attendanceResult, summaryResult] = await Promise.all([api("/attendance"), api("/attendance/summary")]);
      setRecords(getRows(attendanceResult));
      setSummary(summaryResult.data);
    } catch (requestError) { setError(requestError.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { loadAttendance(); }, [loadAttendance]);

  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-[11px] font-bold uppercase tracking-[.16em] text-brand">Your workspace</p><h1 className="mt-2 text-[27px] font-bold tracking-tight text-ink">My attendance</h1><p className="mt-1 text-xs text-slate-400">Record today’s check-in and review your work history.</p></div><AttendanceControls onDone={loadAttendance} attendance={records} /></div>
    {error && <ErrorBanner message={error} retry={loadAttendance} />}
    <div className="grid gap-3 sm:grid-cols-3"><MiniMetric title="Days recorded this month" value={summary?.total_days ?? "—"} color="violet" /><MiniMetric title="Present days" value={summary?.present_days ?? "—"} color="green" /><MiniMetric title="Hours worked" value={summary?.hours_worked ?? "—"} color="blue" /></div>
    <RecordTable title="Attendance history" rows={records} loading={loading} error="" search={search} onSearch={setSearch} columns={[
      { label: "Date", render: (row) => dateLabel(row.work_date) },
      { label: "Check in", render: (row) => dateTimeLabel(row.check_in) },
      { label: "Check out", render: (row) => dateTimeLabel(row.check_out) },
      { label: "Status", render: (row) => <StatusBadge value={row.status} /> }
    ]} />
  </div>;
}
