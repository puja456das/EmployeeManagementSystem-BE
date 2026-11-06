import { useState } from "react";
import { Camera, ShieldCheck, X } from "lucide-react";
import { dateTimeInputValue, localDateKey } from "../utils/formatters.js";
import EmployeeAvatar from "./EmployeeAvatar.jsx";

export default function RecordModal({ config, employees, page, role, record, onClose, onSubmit }) {
  const [form, setForm] = useState(() => {
    if (!record) return page === "employees" ? { status: "Active", annual_paid_leave_days: 12 }
      : page === "users" ? { role: "hr" }
        : page === "attendance" ? { work_date: localDateKey(), status: "present" }
          : {};
    return Object.fromEntries(config.fields.map((field) => [
      field.name,
      field.name === "bank_account_number" ? "" :
        field.type === "datetime-local" ? dateTimeInputValue(record[field.name]) :
          field.type === "date" && record[field.name] ? String(record[field.name]).slice(0, 10) :
            field.name === "employee_id" && page === "users" ? record.linked_employee_id ?? "" :
              record[field.name] ?? ""
    ]));
  });
  const [profileImage, setProfileImage] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const isEmployeeAccount = page === "users" && form.role === "employee";
  const handleSubmit = async (event) => {
    event.preventDefault(); setError(""); setBusy(true);
    let body = { ...form };
    if (page === "payroll" && !body.deductions) body.deductions = 0;
    if (page === "payroll" && !body.status) body.status = "pending";
    if (page === "employees" && profileImage) {
      const multipart = new FormData();
      Object.entries(body).forEach(([key, value]) => multipart.append(key, value));
      multipart.append("profile_image", profileImage);
      body = multipart;
    }
    try { await onSubmit(body, record); } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[2px]" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
    <form onSubmit={handleSubmit} className="max-h-[92vh] w-full max-w-[680px] overflow-y-auto rounded-3xl bg-white shadow-2xl">
      <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-100 bg-white px-6 py-5"><div><h2 className="text-base font-bold text-ink">{record ? `Edit ${page === "attendance" ? "attendance" : page === "leaves" ? "leave request" : page === "employees" ? "employee" : page === "users" ? "login account" : config.title.replace(/s$/, "")}` : `Add ${page === "attendance" ? "attendance" : config.title.replace(/s$/, "")}`}</h2><p className="mt-1 text-[10px] text-slate-400">{record ? "Update this record." : "Fill in the details below to create a record."}</p></div><button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={17} /></button></div>
      {page === "employees" && <div className="mx-6 mt-5 flex items-start gap-3 rounded-2xl border border-violet-100 bg-violet-50/70 p-4"><span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white text-brand"><ShieldCheck size={16} /></span><p className="text-[10px] font-medium leading-5 text-slate-600">{record ? "Update employee details and the annual paid leave allowance here. Leave balance renews each calendar year." : "We’ll email the employee their name, work email, employee ID, and a one-time setup code. They’ll use the code to choose their own password; passwords are never emailed. The default paid leave allowance is 12 days per calendar year."}</p></div>}
      {page === "employees" && <div className="mx-6 mt-5 flex items-center gap-4 rounded-2xl border border-slate-100 p-4">
        <EmployeeAvatar employeeId={record?.id} hasPhoto={record?.has_profile_image} file={profileImage} name={form.name || record?.name} className="h-16 w-16 rounded-2xl text-lg" />
        <label className="min-w-0 flex-1 text-[10px] font-bold text-slate-600"><span className="inline-flex items-center gap-2"><Camera size={14} className="text-brand" />Passport-size photo <span className="font-normal text-slate-400">(optional)</span></span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const selected = event.target.files?.[0] || null; if (selected && selected.size > 5 * 1024 * 1024) { setError("Profile photo must be 5 MB or smaller."); event.target.value = ""; return; } setError(""); setProfileImage(selected); }} className="mt-2 block w-full text-[10px] font-normal text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-violet-50 file:px-3 file:py-2 file:text-[10px] file:font-bold file:text-brand" /><span className="mt-1 block font-normal text-slate-400">JPG, PNG or WebP · up to 5 MB{record?.has_profile_image ? " · leave empty to keep the current photo" : ""}</span></label>
      </div>}
      <div className="grid gap-5 p-6 sm:grid-cols-2">{config.fields.filter((field) => !(role === "employee" && field.name === "employee_id") && !(record && field.name === "employee_id" && page !== "users")).map((field) => <label key={field.name} className={`block text-[10px] font-bold text-slate-600 ${field.type === "textarea" ? "sm:col-span-2" : ""}`}>{field.label}{field.type === "textarea" ? <textarea required={field.required} rows={3} value={form[field.name] || ""} onChange={(e) => setForm({ ...form, [field.name]: e.target.value })} className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-normal outline-none focus:border-brand focus:ring-4 focus:ring-brand/10" /> : field.type === "select" ? <select disabled={page === "users" && field.name === "role" && record?.role === "employee"} required={field.required} value={form[field.name] || ""} onChange={(e) => setForm({ ...form, [field.name]: e.target.value })} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-normal outline-none focus:border-brand disabled:bg-slate-50"><option value="">Select…</option>{page === "users" && field.name === "role" && record?.role === "employee" ? <option value="employee">employee</option> : field.options.map((option) => <option key={option} value={option}>{option}</option>)}</select> : field.type === "employee" ? <><select required={isEmployeeAccount || field.required && !record} value={form.employee_id || ""} onChange={(e) => setForm({ ...form, employee_id: e.target.value })} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-normal outline-none focus:border-brand"><option value="">Select employee profile…</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name} · {employee.employee_code || employee.department || "Employee"}</option>)}</select>{field.helper && <span className="mt-1 block text-[9px] font-normal leading-4 text-slate-400">{field.helper}</span>}</> : <><input required={field.required && (!record || field.name !== "password")} minLength={field.name === "password" && record && !form.password ? undefined : field.minLength} maxLength={field.name === "bank_account_number" ? 45 : undefined} inputMode={field.name === "bank_account_number" ? "numeric" : undefined} autoComplete={field.type === "password" ? "new-password" : "off"} type={field.type || "text"} min={field.type === "number" ? String(field.min ?? 0) : undefined} max={field.type === "number" ? field.max : undefined} step={field.type === "number" ? "any" : undefined} value={form[field.name] || ""} onChange={(e) => setForm({ ...form, [field.name]: e.target.value })} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-xs font-normal outline-none focus:border-brand focus:ring-4 focus:ring-brand/10" />{field.helper && <span className="mt-1 block text-[9px] font-normal leading-4 text-slate-400">{field.helper}</span>}</>}</label>)}</div>
      {error && <p role="alert" className="mx-6 rounded-lg bg-rose-50 px-3 py-2 text-[10px] font-semibold text-rose-700">{error}</p>}
      <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4"><button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-[10px] font-bold text-slate-500 hover:bg-slate-50">Cancel</button><button disabled={busy} className="rounded-xl bg-brand px-4 py-2.5 text-[10px] font-bold text-white hover:bg-[#5147d4] disabled:opacity-60">{busy ? "Saving…" : record ? "Save changes" : "Create record"}</button></div>
    </form>
  </div>;
}
