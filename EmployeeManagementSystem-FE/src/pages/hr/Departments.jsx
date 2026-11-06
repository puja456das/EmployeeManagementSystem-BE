import { useCallback, useEffect, useState } from "react";
import { BriefcaseBusiness, Mail, Pencil, Plus, Search, Trash2, UserRound, Users, X } from "lucide-react";
import { api, getRows } from "../../api.js";
import { EmptyState, ErrorBanner, MiniMetric } from "../../components/ui.jsx";
import RecordDialog from "../../components/RecordDialog.jsx";
import RecordTable from "../../components/RecordTable.jsx";

const emptyForm = { name: "", manager: "", description: "" };

export default function Departments({ user }) {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [departmentEmployees, setDepartmentEmployees] = useState([]);
  const [employeeLoading, setEmployeeLoading] = useState(false);
  const [employeeError, setEmployeeError] = useState("");
  const [employeeSearch, setEmployeeSearch] = useState("");

  const loadDepartments = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await api("/departments");
      setDepartments(getRows(result, "departments"));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadDepartments(); }, [loadDepartments]);

  useEffect(() => {
    if (!selectedDepartment) return undefined;
    let active = true;
    setEmployeeLoading(true);
    setEmployeeError("");
    setDepartmentEmployees([]);
    api(`/departments/${selectedDepartment.id}/employees`)
      .then((result) => {
        if (active) setDepartmentEmployees(getRows(result, "employees"));
      })
      .catch((requestError) => {
        if (active) setEmployeeError(requestError.message);
      })
      .finally(() => {
        if (active) setEmployeeLoading(false);
      });
    return () => { active = false; };
  }, [selectedDepartment]);

  const openForm = (department = null) => {
    setDialogOpen(true);
    setEditing(department);
    setForm(department
      ? { name: department.name || "", manager: department.manager || "", description: department.description || "" }
      : emptyForm);
  };

  const saveDepartment = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api(editing ? `/departments/${editing.id}` : "/departments", {
        method: editing ? "PATCH" : "POST",
        body: form
      });
      setEditing(null);
      setDialogOpen(false);
      setForm(emptyForm);
      if (editing && selectedDepartment?.id === editing.id) {
        setSelectedDepartment({ ...selectedDepartment, ...form });
      }
      setNotice(editing ? "Department updated." : "Department created.");
      await loadDepartments();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteDepartment = async (department) => {
    if (!window.confirm(`Delete the ${department.name} department?`)) return;
    setError("");
    try {
      await api(`/departments/${department.id}`, { method: "DELETE" });
      if (selectedDepartment?.id === department.id) setSelectedDepartment(null);
      setNotice("Department deleted.");
      await loadDepartments();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const columns = [
    { label: "Department", render: (row) => <span className="font-semibold text-ink">{row.name}</span> },
    { label: "Department lead", render: (row) => row.manager || "—" },
    { label: "Description", render: (row) => <span title={row.description}>{row.description || "—"}</span> },
    { label: "Team", render: (row) => (
      <button
        type="button"
        onClick={() => { setSelectedDepartment(row); setEmployeeSearch(""); }}
        className="inline-flex items-center gap-2 rounded-xl bg-indigo-50 px-3 py-2 text-[10px] font-bold text-indigo-700 transition hover:bg-indigo-100"
        aria-label={`View ${row.employee_count ?? 0} employees in ${row.name}`}
      >
        <Users size={14} />
        {row.employee_count ?? 0}
        <span className="text-indigo-500">View team</span>
      </button>
    ) },
    { label: "Actions", render: (row) => user.role === "hr" || user.role === "admin" ? (
      <div className="flex justify-end gap-1">
        {user.role === "hr" && <button onClick={() => openForm(row)} title="Edit department" className="rounded-lg p-2 text-slate-400 hover:bg-violet-50 hover:text-brand"><Pencil size={14} /></button>}
        <button onClick={() => deleteDepartment(row)} title="Delete department" className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={14} /></button>
      </div>
    ) : null }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="text-[11px] font-bold uppercase tracking-[.16em] text-brand">{user.role === "admin" ? "Admin platform" : "People operations"}</p><h1 className="mt-2 text-[27px] font-bold tracking-tight text-ink">Departments</h1><p className="mt-1 text-xs text-slate-400">Keep teams organized and see how your company is structured.</p></div>
        <button onClick={() => openForm()} className="rounded-xl bg-brand px-4 py-2.5 text-[11px] font-bold text-white"><Plus size={15} className="mr-1.5 inline" />Add department</button>
      </div>
      {notice && <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700">{notice}</p>}
      {error && <ErrorBanner message={error} retry={loadDepartments} />}
      <MiniMetric title="Total departments" value={departments.length} color="violet" />
      {departments.length === 0 && !loading && !error ? <section className="rounded-2xl bg-white"><EmptyState title="No departments yet" detail="Add a department to organize your employees." /></section> : (
          <RecordTable title="Departments" rows={departments} columns={columns} loading={loading} error="" search={search} onSearch={setSearch} />
      )}
      {selectedDepartment && <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
        onMouseDown={(event) => event.target === event.currentTarget && setSelectedDepartment(null)}
      >
        <section role="dialog" aria-modal="true" aria-labelledby="department-team-title" className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
          <header className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-600 px-6 py-6 text-white sm:px-8">
            <div className="absolute -right-8 -top-16 h-48 w-48 rounded-full border border-white/10" />
            <div className="absolute -right-2 -top-7 h-32 w-32 rounded-full border border-white/10" />
            <button type="button" onClick={() => setSelectedDepartment(null)} aria-label="Close team details" className="absolute right-4 top-4 rounded-xl p-2 text-white/75 transition hover:bg-white/15 hover:text-white">
              <X size={18} />
            </button>
            <div className="relative flex items-start gap-4 pr-8">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/15"><Users size={23} /></div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[.16em] text-indigo-100">Department team</p>
                <h2 id="department-team-title" className="mt-1 truncate text-2xl font-bold">{selectedDepartment.name}</h2>
                <p className="mt-1 text-xs text-white/75">{selectedDepartment.description || "Employee directory for this department."}</p>
              </div>
            </div>
            <div className="relative mt-5 flex flex-wrap gap-2">
              <span className="rounded-full bg-white/15 px-3 py-1.5 text-[10px] font-semibold">{selectedDepartment.employee_count ?? 0} employees</span>
              {selectedDepartment.manager && <span className="rounded-full bg-white/15 px-3 py-1.5 text-[10px] font-semibold">Lead: {selectedDepartment.manager}</span>}
            </div>
          </header>
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-6 py-4 sm:px-8">
            <div><h3 className="text-sm font-bold text-ink">Team members</h3><p className="mt-1 text-[10px] text-slate-400">People assigned to {selectedDepartment.name}</p></div>
            <label className="flex h-10 w-full max-w-[220px] items-center gap-2 rounded-xl border border-slate-200 px-3 text-slate-400">
              <Search size={15} />
              <input value={employeeSearch} onChange={(event) => setEmployeeSearch(event.target.value)} placeholder="Search members" aria-label="Search team members" className="min-w-0 flex-1 bg-transparent text-xs text-ink outline-none placeholder:text-slate-400" />
            </label>
          </div>
          <div className="min-h-40 flex-1 overflow-y-auto bg-slate-50/60 p-5 sm:p-7">
            {employeeLoading ? <div className="grid min-h-40 place-items-center text-xs font-medium text-slate-400">Loading team members…</div>
              : employeeError ? <div className="grid min-h-40 place-items-center"><ErrorBanner message={employeeError} retry={() => setSelectedDepartment({ ...selectedDepartment })} /></div>
                : (() => {
                  const filteredEmployees = departmentEmployees.filter((employee) =>
                    [employee.name, employee.employee_code, employee.email, employee.designation]
                      .some((value) => String(value || "").toLowerCase().includes(employeeSearch.trim().toLowerCase()))
                  );
                  if (filteredEmployees.length === 0) {
                    return <div className="grid min-h-40 place-items-center text-center">
                      <div><div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-indigo-50 text-indigo-500"><UserRound size={22} /></div><p className="mt-3 text-xs font-semibold text-slate-600">{departmentEmployees.length ? "No team members match your search" : "No employees in this department yet"}</p><p className="mt-1 text-[10px] text-slate-400">{departmentEmployees.length ? "Try another name, email, or employee ID." : "Employees assigned to this department will appear here."}</p></div>
                    </div>;
                  }
                  return <div className="grid gap-3 sm:grid-cols-2">{filteredEmployees.map((employee) => (
                    <article key={employee.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:border-indigo-100 hover:shadow-md">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 text-sm font-bold text-indigo-700">{employee.name?.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "?"}</div>
                        <div className="min-w-0 flex-1">
                          <h4 className="truncate text-xs font-bold text-ink">{employee.name}</h4>
                          <p className="mt-1 truncate text-[10px] font-semibold text-indigo-600">{employee.employee_code || "No employee ID"}</p>
                        </div>
                        <span className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-bold ${employee.status?.toLowerCase() === "active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{employee.status || "Unknown"}</span>
                      </div>
                      <div className="mt-4 space-y-2 border-t border-slate-100 pt-3">
                        <p className="flex min-w-0 items-center gap-2 text-[10px] text-slate-500"><BriefcaseBusiness size={13} className="shrink-0 text-slate-400" /><span className="truncate">{employee.designation || "No job title"}</span></p>
                        <p className="flex min-w-0 items-center gap-2 text-[10px] text-slate-500"><Mail size={13} className="shrink-0 text-slate-400" /><span className="truncate">{employee.email}</span></p>
                      </div>
                    </article>
                  ))}</div>;
                })()}
          </div>
          <footer className="flex justify-end border-t border-slate-100 px-6 py-4 sm:px-8">
            <button type="button" onClick={() => setSelectedDepartment(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-[10px] font-bold text-slate-600 transition hover:bg-slate-50">Close</button>
          </footer>
        </section>
      </div>}
      {dialogOpen && <RecordDialog title={editing ? "Edit department" : "Add department"} onClose={() => setDialogOpen(false)} onSubmit={saveDepartment} saving={saving} error={error}>
        <label className="block text-[10px] font-bold text-slate-600">Department name<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-xs font-normal" /></label>
        <label className="block text-[10px] font-bold text-slate-600">Department lead<input value={form.manager} onChange={(event) => setForm({ ...form, manager: event.target.value })} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-xs font-normal" /></label>
        <label className="block text-[10px] font-bold text-slate-600 sm:col-span-2">Description<textarea rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-normal" /></label>
      </RecordDialog>}
    </div>
  );
}
