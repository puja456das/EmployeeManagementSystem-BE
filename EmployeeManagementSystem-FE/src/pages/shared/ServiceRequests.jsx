import { useCallback, useEffect, useState } from "react";
import { api, getRows } from "../../api.js";
import { Check, CircleDot, Clock3, Plus, Search, Wrench } from "lucide-react";
import RecordDialog from "../../components/RecordDialog.jsx";
import { ErrorBanner, StatusBadge } from "../../components/ui.jsx";

const categories = ["it", "support", "maintenance"];
const categoryLabel = { it: "IT Support", support: "Internal Support", maintenance: "Facilities" };
const priorityTone = { low: "bg-slate-100 text-slate-600", normal: "bg-sky-50 text-sky-700", high: "bg-amber-50 text-amber-700", urgent: "bg-rose-50 text-rose-700" };
const emptyRequest = { category: "it", title: "", description: "", priority: "normal" };

export default function ServiceRequests({ user }) {
  const isEmployee = user.role === "employee";
  const isMonitor = ["hr", "admin"].includes(user.role);
  const canCreate = ["hr", "employee"].includes(user.role);
  const canManage = isEmployee;
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyRequest);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

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
  const filteredRequests = requests.filter((request) => {
    const text = `${request.title} ${request.description} ${request.requester_name || ""} ${request.assignee_name || ""}`.toLowerCase();
    return (!query || text.includes(query.toLowerCase())) && (statusFilter === "all" || request.status === statusFilter) && (priorityFilter === "all" || request.priority === priorityFilter);
  });
  const urgentCount = requests.filter((request) => request.priority === "urgent" && !["resolved", "closed"].includes(request.status)).length;

  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-[11px] font-bold uppercase tracking-[.16em] text-brand">Employee service queue</p><h1 className="mt-2 text-[27px] font-bold tracking-tight text-ink">{isMonitor ? "Service desk overview" : "Service requests"}</h1><p className="mt-1 text-xs text-slate-500">{isMonitor ? "View all requests raised for IT, Support, and Facilities. Employees process the shared queue." : "Requests go to one shared employee queue. The selected service team is context; no separate team dashboard is needed."}</p></div>{canCreate && <button onClick={() => setOpen(true)} className="rounded-xl bg-brand px-4 py-2.5 text-[11px] font-bold text-white"><Plus size={15} className="mr-1.5 inline"/>New request</button>}</div>
    {error && <ErrorBanner message={error} retry={load}/>}
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-card"><span className="text-[10px] font-semibold text-slate-500">Open</span><p className="mt-2 text-2xl font-bold text-ink">{openCount}</p></div><div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-card"><span className="text-[10px] font-semibold text-slate-500">In progress</span><p className="mt-2 text-2xl font-bold text-sky-700">{activeCount}</p></div><div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-card"><span className="text-[10px] font-semibold text-slate-500">Resolved</span><p className="mt-2 text-2xl font-bold text-emerald-700">{resolvedCount}</p></div><div className="rounded-2xl border border-rose-100 bg-rose-50/60 p-4 shadow-card"><span className="text-[10px] font-semibold text-rose-700">Urgent and active</span><p className="mt-2 text-2xl font-bold text-rose-700">{urgentCount}</p></div></div>
    <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card"><div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between"><div><h2 className="text-xs font-bold text-ink">{isMonitor ? "All service requests · view only" : "Employee service queue"}</h2><p className="mt-1 text-[10px] text-slate-500">Showing {filteredRequests.length} of {requests.length} request{requests.length === 1 ? "" : "s"}</p></div><div className="flex flex-col gap-2 sm:flex-row"><label className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search requests" className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-xs sm:w-48"/></label><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs"><option value="all">All statuses</option>{["open", "in_progress", "resolved", "closed"].map((status) => <option key={status} value={status}>{status.replace("_", " ")}</option>)}</select><select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs"><option value="all">All priorities</option>{["urgent", "high", "normal", "low"].map((priority) => <option key={priority} value={priority}>{priority}</option>)}</select></div></div>
      {loading ? <div className="p-10 text-center text-xs text-slate-400">Loading requests…</div> : !filteredRequests.length ? <div className="p-12 text-center"><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-slate-50 text-slate-400"><CircleDot size={20}/></span><p className="mt-4 text-sm font-bold text-ink">{requests.length ? "No requests match these filters" : "No requests here yet"}</p><p className="mt-1 text-xs text-slate-500">{requests.length ? "Try changing the search or filter." : "New requests will appear in this list."}</p></div> : <div className="divide-y divide-slate-100">{filteredRequests.map((request) => <article key={request.id} className="grid gap-4 px-5 py-4 md:grid-cols-[1fr_auto] md:items-center"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[9px] font-bold uppercase text-indigo-700">{categoryLabel[request.category]}</span><span className={`rounded-full px-2.5 py-1 text-[9px] font-bold capitalize ${priorityTone[request.priority]}`}>{request.priority}</span><StatusBadge value={request.status}/>{isEmployee && request.status === "open" && (Date.now() - new Date(request.created_at).getTime() > 3 * 86400000) && <span className="rounded-full bg-rose-50 px-2.5 py-1 text-[9px] font-bold text-rose-700">Needs attention · 3+ days</span>}</div><h3 className="mt-2 text-sm font-bold text-ink">{request.title}</h3><p className="mt-1 max-w-3xl whitespace-pre-wrap text-xs leading-5 text-slate-500">{request.description}</p><p className="mt-2 text-[10px] text-slate-400">{request.requester_name || "You"}{request.assignee_name ? " · Owner: " + request.assignee_name : ""} · {new Date(request.created_at).toLocaleDateString()}</p></div>
        {canManage && !["resolved", "closed"].includes(request.status) && <div className="flex flex-wrap gap-2">{request.status === "open" ? <button onClick={() => update(request, "in_progress")} className="rounded-lg bg-sky-50 px-3 py-2 text-[10px] font-bold text-sky-700"><Clock3 size={13} className="mr-1 inline"/>Take request</button> : <button onClick={() => update(request, "resolved")} className="rounded-lg bg-emerald-50 px-3 py-2 text-[10px] font-bold text-emerald-700"><Check size={13} className="mr-1 inline"/>Resolve</button>}</div>}
      </article>)}</div>}
    </section>
    {open && <RecordDialog title="Create a service request" description="Share enough detail for the right team to help quickly." onClose={() => setOpen(false)} onSubmit={create} saving={saving} error={error}><label className="block text-[10px] font-bold text-slate-600">Team<select required value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs">{categories.map((category) => <option key={category} value={category}>{categoryLabel[category]}</option>)}</select></label><label className="block text-[10px] font-bold text-slate-600">Priority<select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs">{["low", "normal", "high", "urgent"].map((priority) => <option key={priority} value={priority}>{priority[0].toUpperCase() + priority.slice(1)}</option>)}</select></label><label className="block text-[10px] font-bold text-slate-600 sm:col-span-2">Request title<input required minLength={4} maxLength={180} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-xs" placeholder="What do you need help with?"/></label><label className="block text-[10px] font-bold text-slate-600 sm:col-span-2">Details<textarea required minLength={10} maxLength={5000} rows={4} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs" placeholder="Add context, location, or steps to reproduce…"/></label></RecordDialog>}
  </div>;
}
