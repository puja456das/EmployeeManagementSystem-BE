import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, X } from "lucide-react";
import { api, getRows } from "../../api.js";
import { dateLabel } from "../../utils/formatters.js";
import { ErrorBanner, MiniMetric, StatusBadge } from "../../components/ui.jsx";
import RecordDialog from "../../components/RecordDialog.jsx";
import RecordTable from "../../components/RecordTable.jsx";

const blank = { start_date: "", end_date: "", reason: "" };

export default function Leaves() {
  const [leaves, setLeaves] = useState([]);
  const [balance, setBalance] = useState(null);
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
      const [leaveResult, balanceResult] = await Promise.all([api("/leaves"), api("/leaves/balance/me")]);
      setLeaves(getRows(leaveResult));
      setBalance(balanceResult.data);
    } catch (requestError) { setError(requestError.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { loadLeaves(); }, [loadLeaves]);

  const openForm = (leave = null) => {
    setEditing(leave);
    setForm(leave ? {
      start_date: String(leave.start_date || "").slice(0, 10),
      end_date: String(leave.end_date || "").slice(0, 10), reason: leave.reason || ""
    } : blank);
    setOpen(true);
  };
  const save = async (event) => {
    event.preventDefault(); setSaving(true); setError("");
    try {
      await api(editing ? `/leaves/${editing.id}` : "/leaves", {
        method: editing ? "PUT" : "POST", body: form
      });
      setOpen(false); await loadLeaves();
    } catch (requestError) { setError(requestError.message); }
    finally { setSaving(false); }
  };
  const cancel = async (leave) => {
    if (!window.confirm("Cancel this pending leave request?")) return;
    try { await api(`/leaves/${leave.id}/cancel`, { method: "POST", body: {} }); await loadLeaves(); }
    catch (requestError) { setError(requestError.message); }
  };

  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-[11px] font-bold uppercase tracking-[.16em] text-brand">Your workspace</p><h1 className="mt-2 text-[27px] font-bold tracking-tight text-ink">My leave requests</h1><p className="mt-1 text-xs text-slate-400">Request time off and track your paid leave.</p></div><button onClick={() => openForm()} className="rounded-xl bg-brand px-4 py-2.5 text-[11px] font-bold text-white"><Plus size={15} className="mr-1.5 inline" />Request leave</button></div>
    {error && <ErrorBanner message={error} retry={loadLeaves} />}
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><MiniMetric title="Total requests" value={leaves.length} color="violet" /><MiniMetric title="Pending review" value={leaves.filter((leave) => leave.status === "pending").length} color="amber" /><MiniMetric title="Approved" value={leaves.filter((leave) => leave.status === "approved").length} color="green" /><MiniMetric title={`Paid leave left · ${balance?.year || new Date().getFullYear()}`} value={`${balance?.remaining_days ?? "—"} / ${balance?.allocated_days ?? "—"} days`} color="blue" /></div>
    <RecordTable title="My requests" rows={leaves} loading={loading} error="" search={search} onSearch={setSearch} columns={[
      { label: "From", render: (row) => dateLabel(row.start_date) },
      { label: "To", render: (row) => dateLabel(row.end_date) },
      { label: "Days", render: (row) => row.requested_days ?? "—" },
      { label: "Reason", render: (row) => <span className="line-clamp-2" title={row.reason}>{row.reason}</span> },
      { label: "Status", render: (row) => <StatusBadge value={row.status} /> },
      { label: "Actions", render: (row) => row.status === "pending" ? <div className="flex justify-end gap-1"><button onClick={() => openForm(row)} title="Edit request" className="rounded-lg p-2 text-slate-400 hover:bg-violet-50 hover:text-brand"><Pencil size={14} /></button><button onClick={() => cancel(row)} title="Cancel request" className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><X size={14} /></button></div> : "—" }
    ]} />
    {open && <RecordDialog title={editing ? "Edit leave request" : "Request leave"} onClose={() => setOpen(false)} onSubmit={save} saving={saving} error={error}>
      <label className="block text-[10px] font-bold text-slate-600">Start date<input required type="date" value={form.start_date} onChange={(event) => setForm({ ...form, start_date: event.target.value })} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-xs font-normal" /></label>
      <label className="block text-[10px] font-bold text-slate-600">End date<input required type="date" min={form.start_date} value={form.end_date} onChange={(event) => setForm({ ...form, end_date: event.target.value })} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-xs font-normal" /></label>
      <label className="block text-[10px] font-bold text-slate-600 sm:col-span-2">Reason<textarea required rows={3} value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-normal" /></label>
    </RecordDialog>}
  </div>;
}
