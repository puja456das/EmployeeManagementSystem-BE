import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { api, getRows } from "../../api.js";
import { dateLabel } from "../../utils/formatters.js";
import { ErrorBanner } from "../../components/ui.jsx";
import RecordDialog from "../../components/RecordDialog.jsx";
import RecordTable from "../../components/RecordTable.jsx";

const blank = { name: "", holiday_date: "", description: "" };

export default function Holidays({ user }) {
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);

  const loadHolidays = useCallback(async () => {
    setLoading(true); setError("");
    try { setHolidays(getRows(await api("/holidays"), "holidays")); }
    catch (requestError) { setError(requestError.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { loadHolidays(); }, [loadHolidays]);

  const openForm = (holiday = null) => {
    setEditing(holiday);
    setForm(holiday ? { name: holiday.name || "", holiday_date: String(holiday.holiday_date || "").slice(0, 10), description: holiday.description || "" } : blank);
    setOpen(true);
  };
  const save = async (event) => {
    event.preventDefault(); setSaving(true); setError("");
    try {
      await api(editing ? `/holidays/${editing.id}` : "/holidays", { method: editing ? "PATCH" : "POST", body: form });
      setOpen(false); await loadHolidays();
    } catch (requestError) { setError(requestError.message); }
    finally { setSaving(false); }
  };
  const remove = async (holiday) => {
    if (!window.confirm(`Delete "${holiday.name}"?`)) return;
    try { await api(`/holidays/${holiday.id}`, { method: "DELETE" }); await loadHolidays(); }
    catch (requestError) { setError(requestError.message); }
  };

  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-[11px] font-bold uppercase tracking-[.16em] text-brand">People operations</p><h1 className="mt-2 text-[27px] font-bold tracking-tight text-ink">Holidays</h1><p className="mt-1 text-xs text-slate-400">Plan ahead with your company holiday calendar.</p></div><button onClick={() => openForm()} className="rounded-xl bg-brand px-4 py-2.5 text-[11px] font-bold text-white"><Plus size={15} className="mr-1.5 inline" />Add holiday</button></div>
    {error && <ErrorBanner message={error} retry={loadHolidays} />}
    <RecordTable title="Company holidays" rows={holidays} loading={loading} error="" search={search} onSearch={setSearch} columns={[
      { label: "Holiday", render: (row) => <span className="font-semibold text-ink">{row.name}</span> },
      { label: "Date", render: (row) => dateLabel(row.holiday_date) },
      { label: "Description", render: (row) => row.description || "—" },
      { label: "Actions", render: (row) => <div className="flex justify-end gap-1"><button onClick={() => openForm(row)} title="Edit holiday" className="rounded-lg p-2 text-slate-400 hover:bg-violet-50 hover:text-brand"><Pencil size={14} /></button>{user.role === "hr" && <button onClick={() => remove(row)} title="Delete holiday" className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={14} /></button>}</div> }
    ]} />
    {open && <RecordDialog title={editing ? "Edit holiday" : "Add holiday"} onClose={() => setOpen(false)} onSubmit={save} saving={saving} error={error}>
      <label className="block text-[10px] font-bold text-slate-600">Holiday name<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-xs font-normal" /></label>
      <label className="block text-[10px] font-bold text-slate-600">Date<input required type="date" value={form.holiday_date} onChange={(event) => setForm({ ...form, holiday_date: event.target.value })} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-xs font-normal" /></label>
      <label className="block text-[10px] font-bold text-slate-600 sm:col-span-2">Description<textarea rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-normal" /></label>
    </RecordDialog>}
  </div>;
}
