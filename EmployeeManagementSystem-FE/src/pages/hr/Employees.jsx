import { useCallback, useEffect, useState } from "react";
import { Camera, Pencil, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { api, getRows } from "../../api.js";
import { currency } from "../../utils/formatters.js";
import EmployeeAvatar from "../../components/EmployeeAvatar.jsx";
import RecordDialog from "../../components/RecordDialog.jsx";
import RecordTable from "../../components/RecordTable.jsx";
import { ErrorBanner, MiniMetric, StatusBadge } from "../../components/ui.jsx";

const blank = {
  name: "", email: "", department_id: "", designation: "", annual_paid_leave_days: "12",
  phone: "", salary: "", bank_account_number: "", joining_date: "", address: "",
  emergency_contact_name: "", emergency_contact_phone: "", status: "Active"
};

export default function Employees({ user }) {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank);
  const [photo, setPhoto] = useState(null);
  const [saving, setSaving] = useState(false);
  const selectableDepartments = editing
    ? departments
    : departments.filter((department) => department.name.trim().toLowerCase() !== "admin");
  const matchingEmployee = !editing && form.email.trim()
    ? employees.find((employee) => employee.email?.trim().toLowerCase() === form.email.trim().toLowerCase())
    : null;

  const loadEmployees = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [employeeResult, departmentResult] = await Promise.all([api("/employees"), api("/departments")]);
      setEmployees(getRows(employeeResult, "employees"));
      setDepartments(getRows(departmentResult, "departments"));
    }
    catch (requestError) { setError(requestError.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { loadEmployees(); }, [loadEmployees]);

  const openForm = (employee = null) => {
    setEditing(employee);
    setPhoto(null);
    setForm(employee ? {
      name: employee.name || "", email: employee.email || "",
      department_id: String(employee.department_id || departments.find((department) => department.name.toLowerCase() === employee.department?.toLowerCase())?.id || ""),
      designation: employee.designation || "", annual_paid_leave_days: String(employee.annual_paid_leave_days ?? 12),
      phone: employee.phone || "", salary: String(employee.salary ?? ""), bank_account_number: "",
      joining_date: employee.joining_date ? String(employee.joining_date).slice(0, 10) : "",
      address: employee.address || "", emergency_contact_name: employee.emergency_contact_name || "",
      emergency_contact_phone: employee.emergency_contact_phone || "", status: employee.status || "Active"
    } : blank);
    setOpen(true);
  };
  const saveEmployee = async (event) => {
    event.preventDefault(); setError("");
    if (!editing && matchingEmployee) {
      setError(`This work email already belongs to ${matchingEmployee.name} (${matchingEmployee.employee_code}). Edit the existing profile instead.`);
      return;
    }
    setSaving(true);
    let body = { ...form, salary: Number(form.salary), annual_paid_leave_days: Number(form.annual_paid_leave_days) };
    if (photo) {
      const multipart = new FormData();
      Object.entries(body).forEach(([key, value]) => multipart.append(key, value));
      multipart.append("profile_image", photo);
      body = multipart;
    }
    try {
      await api(editing ? `/employees/${editing.id}` : "/employees", {
        method: editing ? "PUT" : "POST", body
      });
      setOpen(false);
      await loadEmployees();
    } catch (requestError) { setError(requestError.message); }
    finally { setSaving(false); }
  };
  const deleteEmployee = async (employee) => {
    if (!window.confirm(`Delete ${employee.name} and the linked employee account?`)) return;
    try { await api(`/employees/${employee.id}`, { method: "DELETE" }); await loadEmployees(); }
    catch (requestError) { setError(requestError.message); }
  };

  const columns = [
    { label: "Employee", render: (row) => <div className="flex items-center gap-2.5"><EmployeeAvatar employeeId={row.id} hasPhoto={row.has_profile_image} name={row.name} className="h-8 w-8 rounded-full text-[9px]" /><span className="font-semibold text-ink">{row.name}</span></div> },
    { label: "Employee ID", render: (row) => row.employee_code || "—" },
    { label: "Department", render: (row) => row.department || "—" },
    { label: "Job title", render: (row) => row.designation || "—" },
    { label: "Login role", render: (row) => <StatusBadge value={row.login_role || "employee"} /> },
    { label: "Email", render: (row) => row.email },
    { label: "Monthly salary", render: (row) => currency(row.salary) },
    { label: "Status", render: (row) => <StatusBadge value={row.status} /> },
    { label: "Actions", render: (row) => <div className="flex justify-end gap-1">{user.role === "hr" && <button onClick={() => openForm(row)} title="Edit employee" className="rounded-lg p-2 text-slate-400 hover:bg-violet-50 hover:text-brand"><Pencil size={14} /></button>}{(user.role === "admin" || user.role === "hr") && <button onClick={() => deleteEmployee(row)} title="Delete employee" className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={14} /></button>}</div> }
  ];

  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-[11px] font-bold uppercase tracking-[.16em] text-brand">{user.role === "admin" ? "Admin platform" : "People operations"}</p><h1 className="mt-2 text-[27px] font-bold tracking-tight text-ink">Employees</h1><p className="mt-1 text-xs text-slate-400">{user.role === "admin" ? "View employee records or add a new employee." : "Manage employee profiles, job information, and accounts."}</p></div><button onClick={() => openForm()} className="rounded-xl bg-brand px-4 py-2.5 text-[11px] font-bold text-white"><Plus size={15} className="mr-1.5 inline" />Add employee</button></div>
    {error && <ErrorBanner message={error} retry={loadEmployees} />}
    <div className="grid gap-3 sm:grid-cols-3"><MiniMetric title="Total employees" value={employees.length} color="violet" /><MiniMetric title="Active employees" value={employees.filter((employee) => employee.status === "Active").length} color="green" /><MiniMetric title="Departments" value={new Set(employees.map((employee) => employee.department).filter(Boolean)).size} color="blue" /></div>
    <RecordTable title="Employees" rows={employees} columns={columns} loading={loading} error="" search={search} onSearch={setSearch} />
    {open && <RecordDialog title={editing ? "Edit employee" : "Add employee"} description={editing ? "Update this employee profile without changing their existing Employee ID." : "One employee profile per work email. Existing profiles keep their original Employee ID."} onClose={() => setOpen(false)} onSubmit={saveEmployee} saving={saving} error={error}>
      <div className="flex items-center gap-3 rounded-xl border border-violet-100 bg-violet-50/60 p-3 sm:col-span-2"><ShieldCheck size={18} className="shrink-0 text-brand" /><p className="text-[10px] leading-5 text-slate-600">New employees receive an email with a one-time code to set their own password. Passwords are never emailed.</p></div>
      <div className="flex items-center gap-4 sm:col-span-2">
        <EmployeeAvatar employeeId={editing?.id} hasPhoto={editing?.has_profile_image} file={photo} name={form.name || editing?.name} className="h-14 w-14 rounded-2xl text-sm" />
        <label className="text-[10px] font-bold text-slate-600"><span className="inline-flex items-center gap-2"><Camera size={14} className="text-brand" />Profile photo (optional)</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const selected = event.target.files?.[0] || null; if (selected && selected.size > 5 * 1024 * 1024) { setError("Profile photo must be 5 MB or smaller."); event.target.value = ""; return; } setPhoto(selected); }} className="mt-2 block w-full text-[10px] font-normal" /><span className="font-normal text-slate-400">JPG, PNG or WebP · up to 5 MB</span></label>
      </div>
      <label className="block text-[10px] font-bold text-slate-600">Full name<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-xs font-normal" /></label>
      <label className="block text-[10px] font-bold text-slate-600">Work email<input required type="email" value={form.email} onChange={(event) => { setError(""); setForm({ ...form, email: event.target.value }); }} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-xs font-normal" />{matchingEmployee && <span className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] font-medium text-amber-800"><span>Profile already exists · Employee ID <strong>{matchingEmployee.employee_code}</strong></span>{user.role === "hr" && <button type="button" onClick={() => { setError(""); openForm(matchingEmployee); }} className="font-bold text-amber-900 underline underline-offset-2">Edit existing profile</button>}</span>}</label>
      <label className="block text-[10px] font-bold text-slate-600">Department<select required value={form.department_id} onChange={(event) => setForm({ ...form, department_id: event.target.value })} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-normal"><option value="">Select department…</option>{selectableDepartments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select>{selectableDepartments.length === 0 ? <span className="mt-1 block font-normal text-amber-700">{departments.length === 0 ? "Create a department first to add an employee." : "Create a non-admin department first to add an employee."}</span> : <span className="mt-1 block font-normal text-slate-400">Selecting HR or Human Resources creates an HR login; other departments create an employee login.</span>}</label>
      <label className="block text-[10px] font-bold text-slate-600">Job title<input value={form.designation} onChange={(event) => setForm({ ...form, designation: event.target.value })} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-xs font-normal" /></label>
      <label className="block text-[10px] font-bold text-slate-600">Monthly salary<input required min="0" type="number" step="any" value={form.salary} onChange={(event) => setForm({ ...form, salary: event.target.value })} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-xs font-normal" /></label>
      <label className="block text-[10px] font-bold text-slate-600">Annual paid leave days<input min="0" max="365" type="number" value={form.annual_paid_leave_days} onChange={(event) => setForm({ ...form, annual_paid_leave_days: event.target.value })} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-xs font-normal" /></label>
      <label className="block text-[10px] font-bold text-slate-600">Phone<input type="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-xs font-normal" /></label>
      <label className="block text-[10px] font-bold text-slate-600">Bank account number<input maxLength={45} value={form.bank_account_number} onChange={(event) => setForm({ ...form, bank_account_number: event.target.value })} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-xs font-normal" /><span className="font-normal text-slate-400">Encrypted before saving. Leave blank when editing to keep the current number.</span></label>
      <label className="block text-[10px] font-bold text-slate-600">Joining date<input type="date" value={form.joining_date} onChange={(event) => setForm({ ...form, joining_date: event.target.value })} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-xs font-normal" /></label>
      <label className="block text-[10px] font-bold text-slate-600">Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-normal"><option>Active</option><option>Inactive</option></select></label>
      <label className="block text-[10px] font-bold text-slate-600 sm:col-span-2">Home address<textarea rows={2} value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-normal" /></label>
      <label className="block text-[10px] font-bold text-slate-600">Emergency contact<input value={form.emergency_contact_name} onChange={(event) => setForm({ ...form, emergency_contact_name: event.target.value })} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-xs font-normal" /></label>
      <label className="block text-[10px] font-bold text-slate-600">Emergency contact phone<input type="tel" value={form.emergency_contact_phone} onChange={(event) => setForm({ ...form, emergency_contact_phone: event.target.value })} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-xs font-normal" /></label>
    </RecordDialog>}
  </div>;
}
