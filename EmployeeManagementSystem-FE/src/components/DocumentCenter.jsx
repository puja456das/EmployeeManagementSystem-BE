import { useCallback, useEffect, useState } from "react";
import { FileText, Plus } from "lucide-react";
import { api, getRows } from "../api.js";
import { dateLabel } from "../utils/formatters.js";
import { EmptyState, ErrorBanner } from "./ui.jsx";

export default function DocumentCenter({ user }) {
  const [rows, setRows] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const result = await api("/documents");
      setRows(getRows(result));
      if (user.role !== "employee") setEmployees(getRows(await api("/employees"), "employees"));
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  }, [user.role]);
  useEffect(() => { refresh(); }, [refresh]);
  const upload = async (event) => {
    event.preventDefault(); setError(""); setNotice("");
    if (!file) return setError("Choose a file to upload.");
    const body = new FormData(); body.append("file", file);
    if (selectedEmployee) body.append("employee_id", selectedEmployee);
    try { await api("/documents", { method: "POST", body }); setFile(null); setNotice("Document uploaded."); event.target.reset(); refresh(); }
    catch (err) { setError(err.message); }
  };
  const download = async (row) => {
    try {
      const blob = await api(`/documents/${row.id}/download`);
      const url = URL.createObjectURL(blob); const anchor = document.createElement("a");
      anchor.href = url; anchor.download = row.original_name; anchor.click(); URL.revokeObjectURL(url);
    } catch (err) { setError(err.message); }
  };
  return <div className="space-y-6"><div><p className="text-[11px] font-bold uppercase tracking-[.16em] text-brand">{user.role === "employee" ? "Your workspace" : "People operations"}</p><h1 className="mt-2 text-[27px] font-bold tracking-tight text-ink">{user.role === "employee" ? "My documents" : "Documents"}</h1><p className="mt-1 text-xs text-slate-400">{user.role === "employee" ? "Your personal files, available whenever you need them." : "Keep employee documents secure and easy to find."}</p></div>
    {notice && <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700">{notice}</p>}{error && <ErrorBanner message={error} retry={refresh} />}
    <form onSubmit={upload} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card sm:p-6"><h2 className="text-sm font-bold text-ink">Upload a document</h2><p className="mt-1 text-[10px] text-slate-400">PDF, JPG, PNG or DOCX · up to 5 MB</p><div className="mt-4 grid gap-3 md:grid-cols-[1fr_220px_auto]">
      <input type="file" accept=".pdf,.jpg,.jpeg,.png,.docx" onChange={(e) => setFile(e.target.files?.[0] || null)} className="block w-full rounded-xl border border-slate-200 bg-white p-2 text-[10px] text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-violet-50 file:px-3 file:py-2 file:text-[10px] file:font-bold file:text-brand" />
      {user.role !== "employee" && <select value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)} required className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-[10px] outline-none focus:border-brand"><option value="">Choose employee…</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select>}
      <button className="h-10 rounded-xl bg-brand px-4 text-[10px] font-bold text-white hover:bg-[#5147d4]"><Plus size={14} className="mr-1 inline" />Upload</button></div></form>
    <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card"><div className="border-b border-slate-100 px-5 py-4"><h2 className="text-xs font-bold text-ink">{user.role === "employee" ? "My files" : "Shared documents"}</h2><p className="mt-1 text-[10px] text-slate-400">{rows.length} files</p></div>{loading ? <p className="p-8 text-center text-xs text-slate-400">Loading documents…</p> : rows.length ? <div className="divide-y divide-slate-50">{rows.map((row) => <div key={row.id} className="flex items-center gap-3 px-5 py-4"><span className="grid h-10 w-10 place-items-center rounded-xl bg-rose-50 text-rose-500"><FileText size={18} /></span><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-ink">{row.original_name}</p><p className="mt-1 text-[10px] text-slate-400">{row.employee_name || "My document"} · {dateLabel(row.created_at)}</p></div><button onClick={() => download(row)} className="rounded-lg bg-violet-50 px-3 py-2 text-[10px] font-bold text-brand hover:bg-violet-100">Download</button></div>)}</div> : <EmptyState title="No documents yet" detail="Upload a file to keep it available in your workspace." />}</section>
  </div>;
}
