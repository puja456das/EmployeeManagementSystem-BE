import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { api, getRows } from "../../api.js";
import AttendancePeriodFilters from "../../components/AttendancePeriodFilters.jsx";
import AttendanceControls from "../../components/AttendanceControls.jsx";
import { dateLabel, dateTimeInputValue, dateTimeLabel, localDateKey } from "../../utils/formatters.js";
import { ErrorBanner, MiniMetric, StatusBadge } from "../../components/ui.jsx";
import RecordDialog from "../../components/RecordDialog.jsx";
import RecordTable from "../../components/RecordTable.jsx";

const blank = { employee_id: "", work_date: localDateKey(), check_in: "", check_out: "", status: "present" };

export default function Attendance({ user }) {
  const [records, setRecords] = useState([]);
  const [myRecords, setMyRecords] = useState([]);
  const [todayRecords, setTodayRecords] = useState([]);
  const [period, setPeriod] = useState({ year: String(new Date().getFullYear()), month: "", date: "" });
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);

  const loadAttendance = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams({ year: period.year });
      if (period.month) params.set("month", period.month);
      if (period.date) params.set("date", period.date);
      const [attendanceResult, employeeResult, myAttendanceResult, todayAttendanceResult] = await Promise.all([
        api("/attendance"), api("/employees"), api(`/attendance/mine?${params.toString()}`),
        api(`/attendance/mine?date=${localDateKey()}`)
      ]);
      setRecords(getRows(attendanceResult));
      setEmployees(getRows(employeeResult, "employees"));
      setMyRecords(getRows(myAttendanceResult));
      setTodayRecords(getRows(todayAttendanceResult));
    } catch (requestError) { setError(requestError.message); }
    finally { setLoading(false); }
  }, [period]);
  useEffect(() => { loadAttendance(); }, [loadAttendance]);
  const mySummary = useMemo(() => ({
    total_days: myRecords.length,
    present_days: myRecords.filter((row) => row.status !== "absent").length,
    absent_days: myRecords.filter((row) => row.status === "absent").length,
    hours_worked: myRecords.reduce((hours, row) => {
      if (!row.check_in || !row.check_out) return hours;
      return hours + Math.max(0, new Date(row.check_out) - new Date(row.check_in)) / 3600000;
    }, 0).toFixed(2)
  }), [myRecords]);
  const filteredRecords = useMemo(() => records.filter((row) => {
    const workDate = String(row.work_date || "").slice(0, 10);
    if (period.date) return workDate === period.date;
    if (!workDate.startsWith(`${period.year}-`)) return false;
    return !period.month || workDate.slice(5, 7) === String(period.month).padStart(2, "0");
  }), [records, period]);

  const openForm = (record = null) => {
    setEditing(record);
    setForm(record ? {
      employee_id: String(record.employee_id || ""), work_date: String(record.work_date || "").slice(0, 10),
      check_in: dateTimeInputValue(record.check_in), check_out: dateTimeInputValue(record.check_out),
      status: record.status || "present"
    } : { ...blank, work_date: localDateKey() });
    setOpen(true);
  };
  const save = async (event) => {
    event.preventDefault(); setSaving(true); setError("");
    const body = {
      work_date: form.work_date,
      check_in: form.check_in ? new Date(form.check_in).toISOString() : null,
      check_out: form.check_out ? new Date(form.check_out).toISOString() : null,
      status: form.status
    };
    if (!editing) body.employee_id = Number(form.employee_id);
    try {
      await api(editing ? `/attendance/${editing.id}` : "/attendance", { method: editing ? "PATCH" : "POST", body });
      setOpen(false); await loadAttendance();
    } catch (requestError) { setError(requestError.message); }
    finally { setSaving(false); }
  };
  const remove = async (record) => {
    if (!window.confirm("Delete this attendance record?")) return;
    try { await api(`/attendance/${record.id}`, { method: "DELETE" }); await loadAttendance(); }
    catch (requestError) { setError(requestError.message); }
  };

  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-[11px] font-bold uppercase tracking-[.16em] text-brand">People operations</p><h1 className="mt-2 text-[27px] font-bold tracking-tight text-ink">Attendance</h1><p className="mt-1 text-xs text-slate-400">Review and correct daily employee attendance.</p></div><button onClick={() => openForm()} className="rounded-xl bg-brand px-4 py-2.5 text-[11px] font-bold text-white"><Plus size={15} className="mr-1.5 inline" />Add attendance</button></div>
    {error && <ErrorBanner message={error} retry={loadAttendance} />}
    <section className="flex flex-col gap-3 rounded-2xl border border-violet-100 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
      <div><h2 className="text-sm font-bold text-ink">My attendance</h2><p className="mt-1 text-[11px] text-slate-400">Check in and out using your HR account.</p></div>
      <AttendanceControls onDone={loadAttendance} attendance={todayRecords} />
    </section>
    <AttendancePeriodFilters value={period} onChange={setPeriod} />
    <div className="grid gap-3 sm:grid-cols-4"><MiniMetric title="My days in period" value={mySummary.total_days} color="violet" /><MiniMetric title="Present days" value={mySummary.present_days} color="green" /><MiniMetric title="Absent days" value={mySummary.absent_days} color="amber" /><MiniMetric title="Hours worked" value={mySummary.hours_worked} color="blue" /></div>
    <RecordTable title="My attendance history" rows={myRecords} loading={loading} error="" search={search} onSearch={setSearch} columns={[
      { label: "Date", render: (row) => dateLabel(row.work_date) },
      { label: "Check in", render: (row) => dateTimeLabel(row.check_in) },
      { label: "Check out", render: (row) => dateTimeLabel(row.check_out) },
      { label: "Status", render: (row) => <StatusBadge value={row.status} /> }
    ]} />
    <RecordTable title="Employee attendance" rows={filteredRecords} loading={loading} error="" search={search} onSearch={setSearch} emptyTitle="No attendance found for this period" columns={[
      { label: "Employee ID", render: (row) => row.employee_code || "—" },
      { label: "Employee", render: (row) => <span className="font-semibold text-ink">{row.employee_name || "—"}</span> },
      { label: "Date", render: (row) => dateLabel(row.work_date) },
      { label: "Check in", render: (row) => dateTimeLabel(row.check_in) },
      { label: "Check out", render: (row) => dateTimeLabel(row.check_out) },
      { label: "Status", render: (row) => <StatusBadge value={row.status} /> },
      { label: "Actions", render: (row) => <div className="flex justify-end gap-1"><button onClick={() => openForm(row)} title="Edit attendance" className="rounded-lg p-2 text-slate-400 hover:bg-violet-50 hover:text-brand"><Pencil size={14} /></button>{user.role === "hr" && <button onClick={() => remove(row)} title="Delete attendance" className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={14} /></button>}</div> }
    ]} />
    {open && <RecordDialog title={editing ? "Edit attendance" : "Add attendance"} onClose={() => setOpen(false)} onSubmit={save} saving={saving} error={error}>
      {!editing && <label className="block text-[10px] font-bold text-slate-600">Employee<select required value={form.employee_id} onChange={(event) => setForm({ ...form, employee_id: event.target.value })} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-normal"><option value="">Select employee…</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name} · {employee.employee_code}</option>)}</select></label>}
      <label className="block text-[10px] font-bold text-slate-600">Work date<input required type="date" value={form.work_date} onChange={(event) => setForm({ ...form, work_date: event.target.value })} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-xs font-normal" /></label>
      <label className="block text-[10px] font-bold text-slate-600">Check-in time<input type="datetime-local" value={form.check_in} onChange={(event) => setForm({ ...form, check_in: event.target.value })} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-xs font-normal" /></label>
      <label className="block text-[10px] font-bold text-slate-600">Check-out time<input type="datetime-local" value={form.check_out} onChange={(event) => setForm({ ...form, check_out: event.target.value })} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-xs font-normal" /></label>
      <label className="block text-[10px] font-bold text-slate-600">Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-normal">{["present", "late", "half-day", "absent"].map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
    </RecordDialog>}
  </div>;
}
