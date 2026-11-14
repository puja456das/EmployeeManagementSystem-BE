import { useCallback, useEffect, useState } from "react";
import { FileText, Plus } from "lucide-react";
import { api, getRows } from "../api.js";
import { dateLabel } from "../utils/formatters.js";
import { EmptyState, ErrorBanner } from "./ui.jsx";

export default function DocumentCenter({ user }) {
  const [rows, setRows] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [description, setDescription] = useState("");
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
  const visibleEmployees = employees.filter((employee) =>
    `${employee.name} ${employee.employee_code || ""} ${employee.email || ""}`
      .toLowerCase().includes(employeeSearch.toLowerCase())
  );
  const toggleEmployee = (employeeId) => {
    setSelectedEmployeeIds((current) => current.includes(String(employeeId))
      ? current.filter((id) => id !== String(employeeId))
      : [...current, String(employeeId)]);
  };
  const upload = async (event) => {
    event.preventDefault(); setError(""); setNotice("");
    if (!file) return setError("Choose a file to upload.");
    if (user.role !== "employee" && !selectedEmployeeIds.length) {
      return setError("Choose at least one employee for this document.");
    }
    if (user.role !== "employee" && !description.trim()) {
      return setError("Describe the document before uploading.");
    }
    const body = new FormData();
    body.append("file", file);
    body.append("description", description.trim());
    if (user.role !== "employee") body.append("employee_ids", JSON.stringify(selectedEmployeeIds));
    try {
      const result = await api("/documents", { method: "POST", body });
      setFile(null);
      setDescription("");
      setSelectedEmployeeIds([]);
      setNotice(user.role === "employee"
        ? "Document uploaded."
        : `Document shared with ${result.count} employee${result.count === 1 ? "" : "s"}.`);
      event.target.reset();
      await refresh();
    }
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
    <form onSubmit={upload} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card sm:p-6">
      <h2 className="text-sm font-bold text-ink">Upload a document</h2>
      <p className="mt-1 text-[10px] text-slate-400">PDF, JPG, PNG or DOCX · up to 5 MB</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block text-[10px] font-bold text-slate-600 sm:col-span-2">
          Document title / description
          <input value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500}
            required={user.role !== "employee"} placeholder="e.g. Offer letter, Company policy, Health insurance"
            className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 px-3 text-xs font-normal outline-none focus:border-brand" />
          {user.role === "employee" && <span className="mt-1 block font-normal text-slate-400">Optional: describe what this file contains.</span>}
        </label>
        {user.role !== "employee" && <fieldset className="rounded-xl border border-slate-200 p-3 sm:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[10px] font-bold text-slate-600">Share with employees ({selectedEmployeeIds.length} selected)</p>
            <div className="flex gap-3 text-[10px] font-semibold text-brand">
              <button type="button" onClick={() => setSelectedEmployeeIds((current) => [...new Set([...current, ...visibleEmployees.map((employee) => String(employee.id))])])}>Select visible</button>
              <button type="button" onClick={() => setSelectedEmployeeIds([])}>Clear</button>
            </div>
          </div>
          <input value={employeeSearch} onChange={(event) => setEmployeeSearch(event.target.value)}
            placeholder="Search name, Employee ID or email"
            className="mt-2 h-9 w-full rounded-lg border border-slate-200 px-3 text-[10px] outline-none focus:border-brand" />
          <div className="mt-2 max-h-44 space-y-1 overflow-y-auto">
            {visibleEmployees.length ? visibleEmployees.map((employee) => {
              const id = String(employee.id);
              return <label key={employee.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-[10px] text-slate-600 hover:bg-violet-50">
                <input type="checkbox" checked={selectedEmployeeIds.includes(id)} onChange={() => toggleEmployee(id)} />
                <span>{employee.name} · {employee.employee_code || "No ID"}</span>
              </label>;
            }) : <p className="px-2 py-3 text-[10px] text-slate-400">No matching employees.</p>}
          </div>
        </fieldset>}
        <label className="block text-[10px] font-bold text-slate-600 sm:col-span-2">
          Choose file
          <input type="file" accept=".pdf,.jpg,.jpeg,.png,.docx" onChange={(event) => setFile(event.target.files?.[0] || null)}
            className="mt-1.5 block w-full rounded-xl border border-slate-200 bg-white p-2 text-[10px] font-normal text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-violet-50 file:px-3 file:py-2 file:text-[10px] file:font-bold file:text-brand" />
        </label>
        <div className="flex items-end sm:col-span-2 sm:justify-end">
          <button className="h-10 rounded-xl bg-brand px-4 text-[10px] font-bold text-white hover:bg-[#5147d4]"><Plus size={14} className="mr-1 inline" />Upload and share</button>
        </div>
      </div>
    </form>
    <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card"><div className="border-b border-slate-100 px-5 py-4"><h2 className="text-xs font-bold text-ink">{user.role === "employee" ? "My files" : "Shared documents"}</h2><p className="mt-1 text-[10px] text-slate-400">{rows.length} files</p></div>{loading ? <p className="p-8 text-center text-xs text-slate-400">Loading documents…</p> : rows.length ? <div className="divide-y divide-slate-50">{rows.map((row) => <div key={row.id} className="flex items-center gap-3 px-5 py-4"><span className="grid h-10 w-10 place-items-center rounded-xl bg-rose-50 text-rose-500"><FileText size={18} /></span><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-ink">{row.description || row.original_name}</p><p className="truncate text-[10px] text-slate-500">{row.original_name}</p><p className="mt-1 text-[10px] text-slate-400">{row.employee_name || "My document"} · {dateLabel(row.created_at)}</p></div><button onClick={() => download(row)} className="rounded-lg bg-violet-50 px-3 py-2 text-[10px] font-bold text-brand hover:bg-violet-100">Download</button></div>)}</div> : <EmptyState title="No documents yet" detail="Upload a file to keep it available in your workspace." />}</section>
  </div>;
}
