import { useCallback, useEffect, useState } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { api, getRows } from "../../api.js";
import { dateLabel } from "../../utils/formatters.js";
import { ErrorBanner, MiniMetric, StatusBadge } from "../../components/ui.jsx";
import RecordDialog from "../../components/RecordDialog.jsx";
import RecordTable from "../../components/RecordTable.jsx";

const blank = { employee_id: "", start_date: "", end_date: "", reason: "" };

export default function Leaves({ user }) {
  const [leaves, setLeaves] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);

  const loadLeaves = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [leaveResult, employeeResult, balanceResult] = await Promise.all([
        api("/leaves"), api("/employees"), api("/leaves/balances")
      ]);
      setLeaves(getRows(leaveResult));
      setEmployees(getRows(employeeResult, "employees"));
      setBalances(getRows(balanceResult));
    } catch (requestError) { setError(requestError.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { loadLeaves(); }, [loadLeaves]);

  const openForm = (leave = null) => {
    setEditing(leave);
    setForm(leave ? {
      employee_id: String(leave.employee_id || ""), start_date: String(leave.start_date || "").slice(0, 10),
      end_date: String(leave.end_date || "").slice(0, 10), reason: leave.reason || ""
    } : blank);
    setOpen(true);
  };
  const save = async (event) => {
    event.preventDefault(); setSaving(true); setError("");
    const body = { start_date: form.start_date, end_date: form.end_date, reason: form.reason };
    if (!editing) body.employee_id = Number(form.employee_id);
    try {
      await api(editing ? `/leaves/${editing.id}` : "/leaves", { method: editing ? "PUT" : "POST", body });
      setOpen(false); await loadLeaves();
    } catch (requestError) { setError(requestError.message); }
    finally { setSaving(false); }
  };
  const review = async (leave, status) => {
    try { await api(`/leaves/${leave.id}/review`, { method: "PATCH", body: { status } }); await loadLeaves(); }
    catch (requestError) { setError(requestError.message); }
  };
  const remove = async (leave) => {
    if (!window.confirm("Delete this leave request?")) return;
    try { await api(`/leaves/${leave.id}`, { method: "DELETE" }); await loadLeaves(); }
    catch (requestError) { setError(requestError.message); }
  };

  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-[11px] font-bold uppercase tracking-[.16em] text-brand">People operations</p><h1 className="mt-2 text-[27px] font-bold tracking-tight text-ink">Leave requests</h1><p className="mt-1 text-xs text-slate-400">Review time-off requests and track annual leave balances.</p></div><button onClick={() => openForm()} className="rounded-xl bg-brand px-4 py-2.5 text-[11px] font-bold text-white"><Plus size={15} className="mr-1.5 inline" />Add leave request</button></div>
    {error && <ErrorBanner message={error} retry={loadLeaves} />}
    <div className="grid gap-3 sm:grid-cols-3"><MiniMetric title="Total requests" value={leaves.length} color="violet" /><MiniMetric title="Pending review" value={leaves.filter((leave) => leave.status === "pending").length} color="amber" /><MiniMetric title="Approved" value={leaves.filter((leave) => leave.status === "approved").length} color="green" /></div>
    <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card"><div className="border-b border-slate-100 px-5 py-4"><h2 className="text-xs font-bold text-ink">Paid leave balances · {new Date().getFullYear()}</h2><p className="mt-1 text-[10px] text-slate-400">Only approved leave days are deducted from each employee’s annual allowance.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[560px] text-left"><thead><tr className="bg-slate-50/70">{["Employee", "Employee ID", "Allocated", "Used", "Remaining"].map((label) => <th key={label} className="px-5 py-3 text-[9px] font-bold uppercase tracking-[.1em] text-slate-400">{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-50">{balances.map((balance) => <tr key={balance.employee_id}><td className="px-5 py-3 text-[11px] font-semibold text-ink">{balance.employee_name}</td><td className="px-5 py-3 text-[11px]">{balance.employee_code || "—"}</td><td className="px-5 py-3 text-[11px]">{balance.allocated_days} days</td><td className="px-5 py-3 text-[11px]">{balance.approved_days_used} days</td><td className="px-5 py-3 text-[11px] font-bold text-emerald-700">{balance.remaining_days} days</td></tr>)}</tbody></table></div></section>
    <RecordTable title="Requests" rows={leaves} loading={loading} error="" search={search} onSearch={setSearch} columns={[
      { label: "Employee", render: (row) => <span className="font-semibold text-ink">{row.employee_name} · {row.employee_code || ""}</span> },
      { label: "From", render: (row) => dateLabel(row.start_date) },
      { label: "To", render: (row) => dateLabel(row.end_date) },
      { label: "Days", render: (row) => row.requested_days ?? "—" },
      { label: "Reason", render: (row) => <span className="line-clamp-2" title={row.reason}>{row.reason}</span> },
      { label: "Status", render: (row) => <StatusBadge value={row.status} /> },
      { label: "Actions", render: (row) => <div className="flex justify-end gap-1">{row.status === "pending" && <><button onClick={() => openForm(row)} title="Edit request" className="rounded-lg p-2 text-slate-400 hover:bg-violet-50 hover:text-brand"><Pencil size={14} /></button><button onClick={() => review(row, "approved")} title="Approve" className="rounded-lg bg-emerald-50 p-2 text-emerald-600"><Check size={14} /></button><button onClick={() => review(row, "rejected")} title="Reject" className="rounded-lg bg-rose-50 p-2 text-rose-600"><X size={14} /></button></>}{user.role === "hr" && <button onClick={() => remove(row)} title="Delete request" className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={14} /></button>}</div> }
    ]} />
    {open && <RecordDialog title={editing ? "Edit leave request" : "Create leave request"} onClose={() => setOpen(false)} onSubmit={save} saving={saving} error={error}>
      {!editing && <label className="block text-[10px] font-bold text-slate-600">Employee<select required value={form.employee_id} onChange={(event) => setForm({ ...form, employee_id: event.target.value })} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-normal"><option value="">Select employee…</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name} · {employee.employee_code}</option>)}</select></label>}
      <label className="block text-[10px] font-bold text-slate-600">Start date<input required type="date" value={form.start_date} onChange={(event) => setForm({ ...form, start_date: event.target.value })} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-xs font-normal" /></label>
      <label className="block text-[10px] font-bold text-slate-600">End date<input required type="date" min={form.start_date} value={form.end_date} onChange={(event) => setForm({ ...form, end_date: event.target.value })} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-xs font-normal" /></label>
      <label className="block text-[10px] font-bold text-slate-600 sm:col-span-2">Reason<textarea required rows={3} value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-normal" /></label>
    </RecordDialog>}
  </div>;
}
