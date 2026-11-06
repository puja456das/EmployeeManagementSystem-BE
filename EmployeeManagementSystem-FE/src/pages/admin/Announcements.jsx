import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Send, Trash2 } from "lucide-react";
import { api, getRows } from "../../api.js";
import { dateLabel } from "../../utils/formatters.js";
import { ErrorBanner } from "../../components/ui.jsx";
import RecordDialog from "../../components/RecordDialog.jsx";
import RecordTable from "../../components/RecordTable.jsx";

const blank = { title: "", body: "", published_at: "", expires_at: "", recipient_ids: [] };

export default function Announcements({ user }) {
  const [rows, setRows] = useState([]);
  const [hrAccounts, setHrAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [announcementResult, userResult] = await Promise.all([api("/announcements"), api("/users")]);
      setRows(getRows(announcementResult));
      setHrAccounts(getRows(userResult, "users").filter((account) => account.role === "hr"));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { loadData(); }, [loadData]);

  const openForm = (row = null) => {
    setEditing(row);
    setForm(row ? {
      title: row.title || "",
      body: row.body || "",
      published_at: row.published_at ? String(row.published_at).slice(0, 10) : "",
      expires_at: row.expires_at ? String(row.expires_at).slice(0, 10) : "",
      recipient_ids: (row.recipient_ids || []).map(String)
    } : blank);
    setOpen(true);
  };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api(editing ? `/announcements/${editing.id}` : "/announcements", {
        method: editing ? "PATCH" : "POST",
        body: {
          ...form,
          published_at: form.published_at || null,
          expires_at: form.expires_at || null,
          recipient_ids: form.recipient_ids.map(Number)
        }
      });
      setOpen(false);
      setNotice(editing ? "Announcement updated." : "Announcement sent to the selected HR accounts.");
      await loadData();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row) => {
    if (!window.confirm(`Delete "${row.title}"?`)) return;
    try {
      await api(`/announcements/${row.id}`, { method: "DELETE" });
      setNotice("Announcement deleted.");
      await loadData();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const toggleRecipient = (id) => {
    const recipientId = String(id);
    setForm((current) => ({
      ...current,
      recipient_ids: current.recipient_ids.includes(recipientId)
        ? current.recipient_ids.filter((selectedId) => selectedId !== recipientId)
        : [...current.recipient_ids, recipientId]
    }));
  };

  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div><p className="text-[11px] font-bold uppercase tracking-[.16em] text-indigo-600">Admin platform</p><h1 className="mt-2 text-[27px] font-bold tracking-tight text-ink">HR announcements</h1><p className="mt-1 text-xs text-slate-400">Send system updates to selected HR accounts.</p></div>
      <button onClick={() => openForm()} disabled={!hrAccounts.length} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-[11px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"><Plus size={15} className="mr-1.5 inline" />New HR announcement</button>
    </div>
    {notice && <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700">{notice}</p>}
    {error && <ErrorBanner message={error} retry={loadData} />}
    {!loading && !hrAccounts.length && <p className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs text-amber-800">Create an HR account in User access before sending an HR announcement.</p>}
    <RecordTable title="HR announcements" rows={rows} loading={loading} error="" search={search} onSearch={setSearch} columns={[
      { label: "Title", render: (row) => <span className="font-semibold text-ink">{row.title}</span> },
      { label: "Recipients", render: (row) => row.recipient_names?.length ? row.recipient_names.join(", ") : "All users" },
      { label: "Published", render: (row) => dateLabel(row.published_at) },
      { label: "Expires", render: (row) => dateLabel(row.expires_at) },
      { label: "Actions", render: (row) => String(row.created_by_user_id) === String(user.id) ? <div className="flex justify-end gap-1"><button onClick={() => openForm(row)} title="Edit announcement" className="rounded-lg p-2 text-slate-400 hover:bg-indigo-50 hover:text-indigo-700"><Pencil size={14} /></button><button onClick={() => remove(row)} title="Delete announcement" className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={14} /></button></div> : null }
    ]} />
    {open && <RecordDialog title={editing ? "Edit HR announcement" : "Create HR announcement"} description="Only the HR accounts you select will see this announcement." onClose={() => setOpen(false)} onSubmit={save} saving={saving} error={error}>
      <label className="block text-[10px] font-bold text-slate-600 sm:col-span-2">Title<input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-xs font-normal" /></label>
      <label className="block text-[10px] font-bold text-slate-600 sm:col-span-2">Announcement<textarea required rows={4} value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-normal" /></label>
      <fieldset className="sm:col-span-2">
        <legend className="text-[10px] font-bold text-slate-600">Send to HR accounts</legend>
        <div className="mt-2 grid max-h-48 gap-2 overflow-y-auto rounded-xl border border-slate-200 p-3 sm:grid-cols-2">
          {hrAccounts.map((account) => <label key={account.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-xs hover:bg-indigo-50"><input type="checkbox" checked={form.recipient_ids.includes(String(account.id))} onChange={() => toggleRecipient(account.id)} className="accent-indigo-600" /><span className="min-w-0"><span className="block truncate font-semibold text-slate-700">{account.name}</span><span className="block truncate text-[10px] font-normal text-slate-400">{account.email}</span></span></label>)}
          {!hrAccounts.length && <p className="text-xs text-slate-400">No HR accounts available.</p>}
        </div>
        <span className="mt-1 block text-[10px] font-normal text-slate-400">Select one or more recipients. Employees and other HR accounts will not see this notice.</span>
      </fieldset>
      <label className="block text-[10px] font-bold text-slate-600">Publish date<input type="date" value={form.published_at} onChange={(event) => setForm({ ...form, published_at: event.target.value })} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-xs font-normal" /></label>
      <label className="block text-[10px] font-bold text-slate-600">Expiry date<input type="date" value={form.expires_at} onChange={(event) => setForm({ ...form, expires_at: event.target.value })} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-xs font-normal" /></label>
      <p className="flex items-center gap-2 text-[10px] text-indigo-700 sm:col-span-2"><Send size={13} /> The announcement appears in the selected HR accounts’ announcement page.</p>
    </RecordDialog>}
  </div>;
}
