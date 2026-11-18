import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { api, getRows } from "../../api.js";
import { dateLabel } from "../../utils/formatters.js";
import { ErrorBanner, StatusBadge } from "../../components/ui.jsx";
import RecordDialog from "../../components/RecordDialog.jsx";
import RecordTable from "../../components/RecordTable.jsx";

const blank = { name: "", email: "", password: "", role: "hr", employee_id: "" };
const roleDescriptions = {
  hr: "Full people operations: departments, employee records, attendance, leave approvals, documents, holidays, announcements, and payroll processing. If no profile exists yet, HR can create their own employee profile after signing in; the same Employee ID is linked to both workspaces.",
  employee: "Shared employee workspace: personal attendance, leave, payslips, documents, and service requests. Employees across all departments can take work from the same Service Desk queue.",
};
const roleNames = { admin: "System Admin", hr: "HR", employee: "Employee" };
const roleCatalog = [
  { id: "admin", name: "System Admin", assignedTo: "Designated system owner", access: "System configuration, organization structure, team access, announcements, and service-desk oversight." },
  { id: "hr", name: "HR", assignedTo: "People operations staff", access: roleDescriptions.hr },
  { id: "employee", name: "Employee", assignedTo: "Every staff member", access: roleDescriptions.employee },
];

export default function UserAccess({ user, onNavigate }) {
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
      setUsers(getRows(userResult, "users").filter((account) => account.role !== "admin").map((account) => ({ ...account, role: ["it", "support", "maintenance"].includes(account.role) ? "employee" : account.role === "payroll_admin" ? "hr" : account.role })));
      setEmployees(getRows(employeeResult, "employees"));
    } catch (requestError) { setError(requestError.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { loadUsers(); }, [loadUsers]);

  const openForm = (user = null) => {
    setEditing(user);
    setForm(user ? {
      name: user.name || "", email: user.email || "", password: "",
      role: ["it", "support", "maintenance"].includes(user.role) ? "employee" : user.role === "payroll_admin" ? "hr" : user.role || "hr", employee_id: String(user.linked_employee_id || "")
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
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-[11px] font-bold uppercase tracking-[.16em] text-brand">Security and permissions</p><h1 className="mt-2 text-[27px] font-bold tracking-tight text-ink">Team access</h1><p className="mt-1 text-xs text-slate-500">Grant and manage the workspaces your team needs.</p></div><button onClick={() => openForm()} className="rounded-xl bg-brand px-4 py-2.5 text-[11px] font-bold text-white"><Plus size={15} className="mr-1.5 inline" />Grant team access</button></div>
    <section className="flex flex-col justify-between gap-4 rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-950 to-violet-900 p-5 text-white sm:flex-row sm:items-center"><div className="flex items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/15 bg-white/10"><ShieldCheck size={18}/></span><div><p className="text-[10px] font-bold uppercase tracking-[.14em] text-indigo-200">Protected administrator</p><p className="mt-1 text-sm font-bold">{user?.name || "System Admin"}</p><p className="mt-0.5 text-[10px] text-white/65">{user?.email} · Full system access</p></div></div><div className="flex flex-col gap-2 sm:max-w-[420px] sm:items-end"><p className="text-[10px] leading-4 text-white/70">This is the single System Admin account. It is provisioned by the system owner and does not appear in team access actions.</p><button onClick={() => onNavigate("profile")} className="self-start rounded-lg border border-white/20 px-3 py-2 text-[10px] font-semibold hover:bg-white/10 sm:self-auto">Manage my profile</button></div></section>
    <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card"><div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end"><div><h2 className="text-sm font-bold text-ink">How employee access works</h2><p className="mt-1 text-[10px] text-slate-500">Use these steps to set up the organization and give people the right workspace.</p></div><span className="rounded-full bg-violet-50 px-3 py-1.5 text-[10px] font-bold text-violet-800">Payroll is part of HR</span></div><div className="mt-4 grid gap-3 md:grid-cols-3">{[["1 · Create departments", "HR creates teams such as IT, Support, Maintenance, Finance, or HR. Departments organize employees."], ["2 · Add employees", "HR assigns each profile to one department. Every new login starts with the shared Employee workspace."], ["3 · Create HR login", "System Admin creates the HR login email and password. HR can create their own employee profile, then use its Employee ID in both workspaces."]].map(([title, detail], index) => <article key={title} className="rounded-xl border border-slate-100 bg-slate-50/70 p-4"><span className="grid h-7 w-7 place-items-center rounded-lg bg-white text-[10px] font-extrabold text-brand shadow-sm">0{index + 1}</span><h3 className="mt-3 text-[11px] font-bold text-ink">{title}</h3><p className="mt-1 text-[10px] leading-5 text-slate-500">{detail}</p></article>)}</div></section>
    <section className="space-y-3"><div><h2 className="text-sm font-bold text-ink">Application roles</h2><p className="mt-1 text-[10px] text-slate-500">The system has three roles: System Admin, HR, and Employee.</p></div><div className="rounded-xl border border-violet-100 bg-violet-50/60 px-4 py-3 text-[10px] leading-5 text-violet-950"><b>Example:</b> IT, Support, and Maintenance are departments, not application roles. All service requests appear in one shared Employee queue; HR and Admin can view all requests. HR handles payroll within the HR workspace. The System Admin creates HR access in Team Access.</div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{roleCatalog.map((role) => <article key={role.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-card"><div className="flex items-start justify-between gap-3"><div><h3 className="text-xs font-bold text-ink">{role.name}</h3><p className="mt-1 text-[10px] text-indigo-700">Assign to: {role.assignedTo}</p></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-bold text-slate-600">{role.id === "admin" ? 1 : users.filter((account) => account.role === role.id).length} account{(role.id === "admin" ? 1 : users.filter((account) => account.role === role.id).length) === 1 ? "" : "s"}</span></div><p className="mt-3 text-[10px] leading-5 text-slate-500">{role.access}</p></article>)}</div></section>
    {notice && <p role="status" className={`rounded-xl border px-4 py-3 text-xs font-semibold ${noticeIsWarning ? "border-amber-200 bg-amber-50 text-amber-800" : "border-emerald-100 bg-emerald-50 text-emerald-700"}`}>{notice}</p>}
    {error && <ErrorBanner message={error} retry={loadUsers} />}
    <RecordTable title="Team accounts" rows={users} loading={loading} error="" search={search} onSearch={setSearch} columns={[
      { label: "Account", render: (row) => <span className="font-semibold text-ink">{row.name}</span> },
      { label: "Login email", render: (row) => row.email },
      { label: "Application role", render: (row) => <StatusBadge value={roleNames[row.role] || row.role} /> },
      { label: "Linked employee", render: (row) => row.linked_employee_name ? `${row.linked_employee_name} · ${row.linked_employee_code || ""}` : "—" },
      { label: "Joined", render: (row) => dateLabel(row.created_at) },
      { label: "Actions", render: (row) => <div className="flex justify-end gap-1"><button onClick={() => openForm(row)} title="Edit account details" className="rounded-lg p-2 text-slate-400 hover:bg-violet-50 hover:text-brand"><Pencil size={14} /></button><button onClick={() => deleteUser(row)} title="Revoke this account" className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={14} /></button></div> }
    ]} />
    {open && <RecordDialog title={editing ? "Manage team access" : "Create login for an employee"} description={editing ? "Update the account and its application role. Role changes change permissions; the employee's department and job title stay the same." : "Create an HR login first, then HR can create and link their employee profile. Employee logins must be linked to an existing employee profile."} onClose={() => setOpen(false)} onSubmit={saveUser} saving={saving} error={error}>
      <label className="block text-[10px] font-bold text-slate-600">Account name<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-xs font-normal" /></label>
      <label className="block text-[10px] font-bold text-slate-600">Login email<input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-xs font-normal" /></label>
      <label className="block text-[10px] font-bold text-slate-600">{editing ? "Reset password" : "Initial password"}{editing && <span className="font-normal text-slate-400"> (leave empty to keep current)</span>}<input required={!editing} minLength={8} type="password" autoComplete="new-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-xs font-normal" />{!editing && form.role === "hr" && <span className="mt-1 block font-normal text-slate-400">Use this password for the HR workspace. HR can switch to their linked employee workspace from the sidebar.</span>}</label>
      <label className="block text-[10px] font-bold text-slate-600">Application access role<select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-normal"><option value="hr">HR</option><option value="employee">Employee</option></select><span className="mt-1 block font-normal text-slate-500">{roleDescriptions[form.role]} Payroll is managed inside HR, not a separate role.</span></label>
      <label className="block text-[10px] font-bold text-slate-600 sm:col-span-2">Linked employee profile<select required={form.role !== "hr"} value={form.employee_id} disabled={Boolean(editing)} onChange={(event) => { const employee = employees.find((row) => String(row.id) === event.target.value); setForm({ ...form, employee_id: event.target.value, ...(employee ? { name: employee.name, email: employee.email } : {}) }); }} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-normal disabled:bg-slate-50"><option value="">{form.role === "hr" ? "Create HR login without a profile yet (optional)" : "Select employee whose app access you are assigning…"}</option>{employees.map((employee) => { const hasLogin = users.some((account) => String(account.linked_employee_id) === String(employee.id)); return <option key={employee.id} value={employee.id} disabled={!editing && hasLogin}>{employee.name} · {employee.employee_code} · {employee.department || "No department"}{hasLogin ? " · Login exists—edit that account" : ""}</option>; })}</select><span className="mt-1 block font-normal text-slate-400">For HR, linking can happen later when HR creates their own employee profile. Employee access always requires a linked profile.</span></label>
    </RecordDialog>}
  </div>;
}
