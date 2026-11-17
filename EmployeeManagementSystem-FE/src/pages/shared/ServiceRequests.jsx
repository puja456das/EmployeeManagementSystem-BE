import { useCallback, useEffect, useState } from "react";
import { api, getRows } from "../../api.js";
import { Check, CircleDot, Clock3, Plus, Wrench } from "lucide-react";
import RecordDialog from "../../components/RecordDialog.jsx";
import { ErrorBanner, StatusBadge } from "../../components/ui.jsx";

const categories = ["it", "support", "maintenance"];
const categoryLabel = { it: "IT", support: "Support", maintenance: "Maintenance" };
const statusLabel = { open: "Open", in_progress: "In progress", resolved: "Resolved", closed: "Closed" };
const priorityTone = { low: "bg-slate-100 text-slate-600", normal: "bg-sky-50 text-sky-700", high: "bg-amber-50 text-amber-700", urgent: "bg-rose-50 text-rose-700" };
const emptyRequest = { category: "it", title: "", description: "", priority: "normal" };

export default function ServiceRequests({ user }) {
  const isOperator = categories.includes(user.role);
  const canManage = user.role === "admin" || isOperator;
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyRequest);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setRequests(getRows(await api("/service-requests"))); }
    catch (cause) { setError(cause.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const create = async (event) => {
    event.preventDefault(); setSaving(true); setError("");
    try { await api("/service-requests", { method: "POST", body: form }); setOpen(false); setForm(emptyRequest); await load(); }
    catch (cause) { setError(cause.message); }
    finally { setSaving(false); }
  };
  const update = async (request, status) => {
    setError("");
    try { await api("/service-requests/" + request.id, { method: "PATCH", body: { status } }); await load(); }
    catch (cause) { setError(cause.message); }
  };
  const openCount = requests.filter((request) => request.status === "open").length;
  const activeCount = requests.filter((request) => request.status === "in_progress").length;
  const resolvedCount = requests.filter((request) => ["resolved", "closed"].includes(request.status)).length;

  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-[11px] font-bold uppercase tracking-[.16em] text-brand">Team services</p><h1 className="mt-2 text-[27px] font-bold tracking-tight text-ink">{isOperator ? categoryLabel[user.role] + " queue" : "Service requests"}</h1><p className="mt-1 text-xs text-slate-500">{isOperator ? "Prioritize requests, take ownership, and keep every handoff visible." : "Ask IT, Support, or Maintenance for help and follow each request in one place."}</p></div>{!isOperator && <button onClick={() => setOpen(true)} className="rounded-xl bg-brand px-4 py-2.5 text-[11px] font-bold text-white"><Plus size={15} className="mr-1.5 inline"/>New request</button>}</div>
    {error && <ErrorBanner message={error} retry={load}/>}
    <div className="grid gap-3 sm:grid-cols-3"><div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-card"><span className="text-[10px] font-semibold text-slate-500">Open</span><p className="mt-2 text-2xl font-bold text-ink">{openCount}</p></div><div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-card"><span className="text-[10px] font-semibold text-slate-500">In progress</span><p className="mt-2 text-2xl font-bold text-sky-700">{activeCount}</p></div><div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-card"><span className="text-[10px] font-semibold text-slate-500">Resolved</span><p className="mt-2 text-2xl font-bold text-emerald-700">{resolvedCount}</p></div></div>
    <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h2 className="text-xs font-bold text-ink">{isOperator ? "Assigned service queue" : "Your requests"}</h2><p className="mt-1 text-[10px] text-slate-500">{requests.length} request{requests.length === 1 ? "" : "s"}</p></div><Wrench size={17} className="text-slate-400"/></div>
      {loading ? <div className="p-10 text-center text-xs text-slate-400">Loading requests…</div> : !requests.length ? <div className="p-12 text-center"><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-slate-50 text-slate-400"><CircleDot size={20}/></span><p className="mt-4 text-sm font-bold text-ink">No requests here yet</p><p className="mt-1 text-xs text-slate-500">New requests will appear in this list.</p></div> : <div className="divide-y divide-slate-100">{requests.map((request) => <article key={request.id} className="grid gap-4 px-5 py-4 md:grid-cols-[1fr_auto] md:items-center"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[9px] font-bold uppercase text-indigo-700">{categoryLabel[request.category]}</span><span className={`rounded-full px-2.5 py-1 text-[9px] font-bold capitalize ${priorityTone[request.priority]}`}>{request.priority}</span><StatusBadge value={request.status}/></div><h3 className="mt-2 text-sm font-bold text-ink">{request.title}</h3><p className="mt-1 max-w-3xl whitespace-pre-wrap text-xs leading-5 text-slate-500">{request.description}</p><p className="mt-2 text-[10px] text-slate-400">{request.requester_name || "You"}{request.assignee_name ? " · Owner: " + request.assignee_name : ""} · {new Date(request.created_at).toLocaleDateString()}</p></div>
        {canManage && !["resolved", "closed"].includes(request.status) && <div className="flex flex-wrap gap-2">{request.status === "open" ? <button onClick={() => update(request, "in_progress")} className="rounded-lg bg-sky-50 px-3 py-2 text-[10px] font-bold text-sky-700"><Clock3 size={13} className="mr-1 inline"/>Take request</button> : <button onClick={() => update(request, "resolved")} className="rounded-lg bg-emerald-50 px-3 py-2 text-[10px] font-bold text-emerald-700"><Check size={13} className="mr-1 inline"/>Resolve</button>}</div>}
      </article>)}</div>}
    </section>
    {open && <RecordDialog title="Create a service request" description="Share enough detail for the right team to help quickly." onClose={() => setOpen(false)} onSubmit={create} saving={saving} error={error}><label className="block text-[10px] font-bold text-slate-600">Team<select required value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs">{categories.map((category) => <option key={category} value={category}>{categoryLabel[category]}</option>)}</select></label><label className="block text-[10px] font-bold text-slate-600">Priority<select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs">{["low", "normal", "high", "urgent"].map((priority) => <option key={priority} value={priority}>{priority[0].toUpperCase() + priority.slice(1)}</option>)}</select></label><label className="block text-[10px] font-bold text-slate-600 sm:col-span-2">Request title<input required minLength={4} maxLength={180} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-xs" placeholder="What do you need help with?"/></label><label className="block text-[10px] font-bold text-slate-600 sm:col-span-2">Details<textarea required minLength={10} maxLength={5000} rows={4} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs" placeholder="Add context, location, or steps to reproduce…"/></label></RecordDialog>}
  </div>;
}
