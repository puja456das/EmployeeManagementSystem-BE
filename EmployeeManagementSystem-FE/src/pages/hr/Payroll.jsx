import { useCallback, useEffect, useState } from "react";
import { Check, Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { api, getRows } from "../../api.js";
import { currency, dateLabel, payslipMarkup } from "../../utils/formatters.js";
import { ErrorBanner, StatusBadge } from "../../components/ui.jsx";
import RecordDialog from "../../components/RecordDialog.jsx";
import RecordTable from "../../components/RecordTable.jsx";

const blank = { employee_id: "", pay_period: "", gross_salary: "", deductions: "0", net_salary: "" };

export default function Payroll({ user }) {
  const [records, setRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);

  const loadPayroll = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [payrollResult, employeeResult] = await Promise.all([api("/payroll"), api("/employees")]);
      setRecords(getRows(payrollResult));
      setEmployees(getRows(employeeResult, "employees"));
    } catch (requestError) { setError(requestError.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { loadPayroll(); }, [loadPayroll]);

  const openForm = (record = null) => {
    setEditing(record);
    setForm(record ? {
      employee_id: String(record.employee_id || ""), pay_period: String(record.pay_period || "").slice(0, 10),
      gross_salary: String(record.gross_salary ?? ""), deductions: String(record.deductions ?? 0),
      net_salary: String(record.net_salary ?? "")
    } : blank);
    setOpen(true);
  };
  const save = async (event) => {
    event.preventDefault(); setSaving(true); setError("");
    const body = {
      pay_period: form.pay_period, gross_salary: Number(form.gross_salary),
      deductions: Number(form.deductions || 0), net_salary: Number(form.net_salary)
    };
    if (!editing) body.employee_id = Number(form.employee_id);
    try {
      await api(editing ? `/payroll/${editing.id}` : "/payroll", { method: editing ? "PATCH" : "POST", body });
      setOpen(false); await loadPayroll();
    } catch (requestError) { setError(requestError.message); }
    finally { setSaving(false); }
  };
  const markPaid = async (record) => {
    try { await api(`/payroll/${record.id}/mark-paid`, { method: "PATCH", body: {} }); await loadPayroll(); }
    catch (requestError) { setError(requestError.message); }
  };
  const showPayslip = async (record) => {
    const popup = window.open("", "_blank");
    if (!popup) { setError("Allow pop-ups to open the payslip."); return; }
    try {
      const result = await api(`/payroll/${record.id}/payslip`);
      popup.document.write(payslipMarkup(result.payslip));
      popup.document.close();
    } catch (requestError) { popup.close(); setError(requestError.message); }
  };
  const remove = async (record) => {
    if (!window.confirm("Delete this payroll record?")) return;
    try { await api(`/payroll/${record.id}`, { method: "DELETE" }); await loadPayroll(); }
    catch (requestError) { setError(requestError.message); }
  };

  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-[11px] font-bold uppercase tracking-[.16em] text-brand">People operations</p><h1 className="mt-2 text-[27px] font-bold tracking-tight text-ink">Payroll</h1><p className="mt-1 text-xs text-slate-400">Create salary records, mark payments, and open payslips.</p></div><button onClick={() => openForm()} className="rounded-xl bg-brand px-4 py-2.5 text-[11px] font-bold text-white"><Plus size={15} className="mr-1.5 inline" />Add payroll record</button></div>
    {error && <ErrorBanner message={error} retry={loadPayroll} />}
    <RecordTable title="Payroll records" rows={records} loading={loading} error="" search={search} onSearch={setSearch} columns={[
      { label: "Employee", render: (row) => <span className="font-semibold text-ink">{row.employee_name || employees.find((employee) => String(employee.id) === String(row.employee_id))?.name || "—"}</span> },
      { label: "Pay period", render: (row) => dateLabel(row.pay_period) },
      { label: "Gross", render: (row) => currency(row.gross_salary) },
      { label: "Deductions", render: (row) => currency(row.deductions) },
      { label: "Net pay", render: (row) => <span className="font-semibold text-ink">{currency(row.net_salary)}</span> },
      { label: "Status", render: (row) => <StatusBadge value={row.status} /> },
      { label: "Actions", render: (row) => <div className="flex justify-end gap-1">{row.status !== "paid" && <button onClick={() => markPaid(row)} title="Mark paid" className="rounded-lg bg-emerald-50 p-2 text-emerald-600"><Check size={14} /></button>}<button onClick={() => showPayslip(row)} title="View payslip" className="rounded-lg p-2 text-slate-400 hover:bg-violet-50 hover:text-brand"><Eye size={14} /></button><button onClick={() => openForm(row)} title="Edit payroll record" className="rounded-lg p-2 text-slate-400 hover:bg-violet-50 hover:text-brand"><Pencil size={14} /></button>{user.role === "hr" && <button onClick={() => remove(row)} title="Delete payroll record" className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={14} /></button>}</div> }
    ]} />
    {open && <RecordDialog title={editing ? "Edit payroll record" : "Create payroll record"} onClose={() => setOpen(false)} onSubmit={save} saving={saving} error={error}>
      {!editing && <label className="block text-[10px] font-bold text-slate-600">Employee<select required value={form.employee_id} onChange={(event) => setForm({ ...form, employee_id: event.target.value })} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-normal"><option value="">Select employee…</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name} · {employee.employee_code}</option>)}</select></label>}
      <label className="block text-[10px] font-bold text-slate-600">Pay period<input required type="date" value={form.pay_period} onChange={(event) => setForm({ ...form, pay_period: event.target.value })} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-xs font-normal" /></label>
      <label className="block text-[10px] font-bold text-slate-600">Gross salary<input required min="0" type="number" step="any" value={form.gross_salary} onChange={(event) => setForm({ ...form, gross_salary: event.target.value })} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-xs font-normal" /></label>
      <label className="block text-[10px] font-bold text-slate-600">Deductions<input min="0" type="number" step="any" value={form.deductions} onChange={(event) => setForm({ ...form, deductions: event.target.value })} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-xs font-normal" /></label>
      <label className="block text-[10px] font-bold text-slate-600">Net salary<input required min="0" type="number" step="any" value={form.net_salary} onChange={(event) => setForm({ ...form, net_salary: event.target.value })} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-xs font-normal" /></label>
    </RecordDialog>}
  </div>;
}
