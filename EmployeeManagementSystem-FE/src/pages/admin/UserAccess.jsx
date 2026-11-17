import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { api, getRows } from "../../api.js";
import { dateLabel } from "../../utils/formatters.js";
import { ErrorBanner, StatusBadge } from "../../components/ui.jsx";
import RecordDialog from "../../components/RecordDialog.jsx";
import RecordTable from "../../components/RecordTable.jsx";

const blank = { name: "", email: "", password: "", role: "hr", employee_id: "" };

export default function UserAccess() {
  const [users, setUsers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [noticeIsWarning, setNoticeIsWarning] = useState(false);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [userResult, employeeResult] = await Promise.all([api("/users"), api("/employees")]);
      setUsers(getRows(userResult, "users"));
      setEmployees(getRows(employeeResult, "employees"));
    } catch (requestError) { setError(requestError.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { loadUsers(); }, [loadUsers]);

  const openForm = (user = null) => {
    setEditing(user);
    setForm(user ? {
      name: user.name || "", email: user.email || "", password: "",
      role: user.role || "hr", employee_id: String(user.linked_employee_id || "")
    } : blank);
    setOpen(true);
  };
  const saveUser = async (event) => {
    event.preventDefault(); setSaving(true); setError(""); setNotice("");
    const body = { ...form, employee_id: form.employee_id || null };
    if (!body.password) delete body.password;
    try {
      const result = await api(editing ? `/users/${editing.id}` : "/users", {
        method: editing ? "PUT" : "POST", body
      });
      setOpen(false);
      setNotice(result.message || "Login account updated.");
      setNoticeIsWarning(result.invitationSent === false);
      await loadUsers();
    } catch (requestError) { setError(requestError.message); }
    finally { setSaving(false); }
  };
  const deleteUser = async (user) => {
    if (!window.confirm(`Delete the login account for ${user.name}?`)) return;
    try { await api(`/users/${user.id}`, { method: "DELETE" }); await loadUsers(); }
    catch (requestError) { setError(requestError.message); }
  };

  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-[11px] font-bold uppercase tracking-[.16em] text-brand">People operations</p><h1 className="mt-2 text-[27px] font-bold tracking-tight text-ink">User access</h1><p className="mt-1 text-xs text-slate-400">Create role-specific workspaces for HR, employees, IT, support, and maintenance.</p></div><button onClick={() => openForm()} className="rounded-xl bg-brand px-4 py-2.5 text-[11px] font-bold text-white"><Plus size={15} className="mr-1.5 inline" />Add team account</button></div>
    {notice && <p role="status" className={`rounded-xl border px-4 py-3 text-xs font-semibold ${noticeIsWarning ? "border-amber-200 bg-amber-50 text-amber-800" : "border-emerald-100 bg-emerald-50 text-emerald-700"}`}>{notice}</p>}
    {error && <ErrorBanner message={error} retry={loadUsers} />}
    <RecordTable title="Login accounts" rows={users} loading={loading} error="" search={search} onSearch={setSearch} columns={[
      { label: "Account", render: (row) => <span className="font-semibold text-ink">{row.name}</span> },
      { label: "Login email", render: (row) => row.email },
      { label: "Role", render: (row) => <StatusBadge value={row.role} /> },
      { label: "Linked employee", render: (row) => row.linked_employee_name ? `${row.linked_employee_name} · ${row.linked_employee_code || ""}` : "—" },
      { label: "Joined", render: (row) => dateLabel(row.created_at) },
      { label: "Actions", render: (row) => <div className="flex justify-end gap-1"><button onClick={() => openForm(row)} title="Edit login account" className="rounded-lg p-2 text-slate-400 hover:bg-violet-50 hover:text-brand"><Pencil size={14} /></button>{row.role !== "admin" && <button onClick={() => deleteUser(row)} title="Delete login account" className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={14} /></button>}</div> }
    ]} />
    {open && <RecordDialog title={editing?.role === "admin" ? "Edit system admin account" : editing ? "Edit login account" : "Create login account"} description={editing?.role === "admin" ? "This does not create another admin. The account stays System Admin; only its display name, optional password, and linked employee profile can be changed here." : ""} onClose={() => setOpen(false)} onSubmit={saveUser} saving={saving} error={error}>
      {editing?.role === "admin" && <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-[10px] leading-5 text-amber-800 sm:col-span-2">Admin email and role are managed during initial setup. Linking an employee profile creates a separate Employee workspace login; it does not change this admin access. Employee invitations use the backend email provider.</div>}
      <label className="block text-[10px] font-bold text-slate-600">Account name<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-xs font-normal" /></label>
      <label className="block text-[10px] font-bold text-slate-600">Login email<input required type="email" readOnly={editing?.role === "admin"} value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-xs font-normal read-only:bg-slate-50 read-only:text-slate-500" />{form.role === "admin" && <span className="mt-1 block font-normal text-slate-400">System admin email is configured in backend environment. A linked employee profile can use the same email with its separate employee password.</span>}</label>
      <label className="block text-[10px] font-bold text-slate-600">{editing?.role === "admin" ? "New admin password" : "Password"}{editing && <span className="font-normal text-slate-400"> (leave empty to keep current)</span>}<input required={!editing} minLength={8} type="password" autoComplete="new-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-xs font-normal" />{!editing && form.role === "hr" && <span className="mt-1 block font-normal text-slate-400">This is the HR platform password; it is separate from the linked employee account password.</span>}</label>
      <label className="block text-[10px] font-bold text-slate-600">Workspace role<select disabled={Boolean(editing)} value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-normal"><option value="hr">HR</option><option value="employee">Employee</option><option value="it">IT</option><option value="support">Support</option><option value="maintenance">Maintenance</option>{editing?.role === "admin" && <option value="admin">System admin</option>}</select>{!editing && <span className="mt-1 block font-normal text-slate-400">The one system admin is configured separately in the backend environment.</span>}</label>
      {form.role === "hr" && <label className="block text-[10px] font-bold text-slate-600 sm:col-span-2">HR employee profile<select required value={form.employee_id} onChange={(event) => setForm({ ...form, employee_id: event.target.value })} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-normal"><option value="">Select existing employee profile…</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name} · {employee.employee_code}</option>)}</select><span className="mt-1 block font-normal text-slate-400">This HR account uses the selected profile and its existing Employee ID. No duplicate employee profile or ID is created; the HR login remains separate.</span></label>}
      {form.role === "admin" && <label className="block text-[10px] font-bold text-slate-600 sm:col-span-2">Linked employee profile <span className="font-normal text-slate-400">(optional)</span><select value={form.employee_id} onChange={(event) => setForm({ ...form, employee_id: event.target.value })} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-normal"><option value="">No employee profile linked</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name} · {employee.employee_code}</option>)}</select><span className="mt-1 block font-normal text-slate-400">Optional: links an existing employee record without changing admin access. If that profile has no employee login, a separate Employee workspace login is created using its work email and Employee ID; an invitation email is sent.</span></label>}
      {form.role === "employee" && <label className="block text-[10px] font-bold text-slate-600 sm:col-span-2">Link employee profile<select required value={form.employee_id} onChange={(event) => setForm({ ...form, employee_id: event.target.value })} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-normal"><option value="">Select employee…</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name} · {employee.employee_code}</option>)}</select><span className="mt-1 block font-normal text-slate-400">Employee-role logins use the employee ID or work email plus their password.</span></label>}
    </RecordDialog>}
  </div>;
}
