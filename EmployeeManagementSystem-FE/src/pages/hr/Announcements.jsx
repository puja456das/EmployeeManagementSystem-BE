import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { api, getRows } from "../../api.js";
import { dateLabel } from "../../utils/formatters.js";
import { ErrorBanner } from "../../components/ui.jsx";
import RecordDialog from "../../components/RecordDialog.jsx";
import RecordTable from "../../components/RecordTable.jsx";

const blank = { title: "", body: "", published_at: "", expires_at: "" };

export default function Announcements({ user }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  const loadAnnouncements = useCallback(async () => {
    setLoading(true); setError("");
    try { setRows(getRows(await api("/announcements"), "announcements")); }
    catch (requestError) { setError(requestError.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { loadAnnouncements(); }, [loadAnnouncements]);

  const openForm = (row = null) => {
    setEditing(row);
    setForm(row ? {
      title: row.title || "", body: row.body || "",
      published_at: row.published_at ? String(row.published_at).slice(0, 10) : "",
      expires_at: row.expires_at ? String(row.expires_at).slice(0, 10) : ""
    } : blank);
    setOpen(true);
  };
  const save = async (event) => {
    event.preventDefault(); setSaving(true); setError("");
    try {
      await api(editing ? `/announcements/${editing.id}` : "/announcements", {
        method: editing ? "PATCH" : "POST", body: { ...form, published_at: form.published_at || null, expires_at: form.expires_at || null }
      });
      setOpen(false); setNotice(editing ? "Announcement updated." : "Announcement published.");
      await loadAnnouncements();
    } catch (requestError) { setError(requestError.message); }
    finally { setSaving(false); }
  };
  const remove = async (row) => {
    if (!window.confirm(`Delete "${row.title}"?`)) return;
    try { await api(`/announcements/${row.id}`, { method: "DELETE" }); setNotice("Announcement deleted."); await loadAnnouncements(); }
    catch (requestError) { setError(requestError.message); }
  };

  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div><p className="text-[11px] font-bold uppercase tracking-[.16em] text-brand">People operations</p><h1 className="mt-2 text-[27px] font-bold tracking-tight text-ink">Announcements</h1><p className="mt-1 text-xs text-slate-400">Share important updates with your entire team.</p></div>
      <button onClick={() => openForm()} className="rounded-xl bg-brand px-4 py-2.5 text-[11px] font-bold text-white"><Plus size={15} className="mr-1.5 inline" />New announcement</button>
    </div>
    {notice && <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700">{notice}</p>}
    {error && <ErrorBanner message={error} retry={loadAnnouncements} />}
    <RecordTable title="Announcements" rows={rows} loading={loading} error="" search={search} onSearch={setSearch} columns={[
      { label: "Title", render: (row) => <span className="font-semibold text-ink">{row.title}</span> },
      { label: "Message", render: (row) => <span className="line-clamp-2" title={row.body}>{row.body}</span> },
      { label: "Published", render: (row) => dateLabel(row.published_at) },
      { label: "Expires", render: (row) => dateLabel(row.expires_at) },
      { label: "Audience", render: (row) => row.recipient_names?.length ? row.recipient_names.join(", ") : "Everyone" },
      { label: "Actions", render: (row) => String(row.created_by_user_id) === String(user.id) ? <div className="flex justify-end gap-1"><button onClick={() => openForm(row)} title="Edit announcement" className="rounded-lg p-2 text-slate-400 hover:bg-violet-50 hover:text-brand"><Pencil size={14} /></button><button onClick={() => remove(row)} title="Delete announcement" className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={14} /></button></div> : null }
    ]} />
    {open && <RecordDialog title={editing ? "Edit announcement" : "Create announcement"} onClose={() => setOpen(false)} onSubmit={save} saving={saving} error={error}>
      <label className="block text-[10px] font-bold text-slate-600 sm:col-span-2">Title<input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-xs font-normal" /></label>
      <label className="block text-[10px] font-bold text-slate-600 sm:col-span-2">Announcement<textarea required rows={5} value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-normal" /></label>
      <label className="block text-[10px] font-bold text-slate-600">Publish date<input type="date" value={form.published_at} onChange={(event) => setForm({ ...form, published_at: event.target.value })} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-xs font-normal" /></label>
      <label className="block text-[10px] font-bold text-slate-600">Expiry date<input type="date" value={form.expires_at} onChange={(event) => setForm({ ...form, expires_at: event.target.value })} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-xs font-normal" /></label>
    </RecordDialog>}
  </div>;
}
