import { useCallback, useEffect, useState } from "react";
import { Check, Download, Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { api, getRows } from "../../api.js";
import { currency, dateLabel, payslipMarkup } from "../../utils/formatters.js";
import { ErrorBanner, StatusBadge } from "../../components/ui.jsx";
import RecordDialog from "../../components/RecordDialog.jsx";
import RecordTable from "../../components/RecordTable.jsx";

const blank = { employee_id: "", pay_period: "", basic_salary: "", allowances: "0", bonus: "0", other_earnings: "0", tax_deduction: "0", pf_deduction: "0", unpaid_leave_deduction: "0", other_deductions: "0" };

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
  const [statusFilter, setStatusFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("all");

  const loadPayroll = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [payrollResult, employeeResult] = await Promise.all([api("/payroll"), api("/payroll/employees")]);
      setRecords(getRows(payrollResult));
      setEmployees(getRows(employeeResult, "employees"));
    } catch (requestError) { setError(requestError.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { loadPayroll(); }, [loadPayroll]);

  const updateAmount = (field, rawValue) => {
    const next = { ...form, [field]: rawValue };
    setForm(next);
  };

  const openForm = (record = null) => {
    setEditing(record);
    setForm(record ? {
      employee_id: String(record.employee_id || ""), pay_period: String(record.pay_period || "").slice(0, 7),
      basic_salary: String(record.basic_salary ?? record.gross_salary ?? ""), allowances: String(record.allowances ?? 0),
      bonus: String(record.bonus ?? 0), other_earnings: String(record.other_earnings ?? 0),
      tax_deduction: String(record.tax_deduction ?? 0), pf_deduction: String(record.pf_deduction ?? 0),
      unpaid_leave_deduction: String(record.unpaid_leave_deduction ?? 0), other_deductions: String(record.other_deductions ?? record.deductions ?? 0),
    } : blank);
    setOpen(true);
  };
  const save = async (event) => {
    event.preventDefault(); setSaving(true); setError("");
    const earningFields = ["basic_salary", "allowances", "bonus", "other_earnings"];
    const deductionFields = ["tax_deduction", "pf_deduction", "unpaid_leave_deduction", "other_deductions"];
    const cents = (field) => Math.round(Number(form[field] || 0) * 100);
    const grossCents = earningFields.reduce((sum, field) => sum + cents(field), 0);
    const deductionCents = deductionFields.reduce((sum, field) => sum + cents(field), 0);
    if (deductionCents > grossCents) { setError("Total deductions cannot exceed total earnings."); setSaving(false); return; }
    const body = {
      pay_period: `${form.pay_period}-01`,
      ...Object.fromEntries(["basic_salary", "allowances", "bonus", "other_earnings", "tax_deduction", "pf_deduction", "unpaid_leave_deduction", "other_deductions"].map((field) => [field, Number(form[field] || 0)]))
    };
    if (!editing) body.employee_id = Number(form.employee_id);
    try {
      await api(editing ? `/payroll/${editing.id}` : "/payroll", { method: editing ? "PATCH" : "POST", body });
      setOpen(false); await loadPayroll();
    } catch (requestError) { setError(requestError.message); }
    finally { setSaving(false); }
  };
  const markPaid = async (record) => {
    if (!window.confirm(`Confirm that ${currency(record.net_salary)} for ${record.employee_name || "this employee"} has been transferred for ${dateLabel(record.pay_period)}? Only mark paid after the actual payment is complete.`)) return;
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
  const periods = [...new Set(records.map((record) => String(record.pay_period || "").slice(0, 7)).filter(Boolean))].sort((a, b) => b.localeCompare(a));
  const earningFields = ["basic_salary", "allowances", "bonus", "other_earnings"];
  const deductionFields = ["tax_deduction", "pf_deduction", "unpaid_leave_deduction", "other_deductions"];
  const formGross = earningFields.reduce((sum, field) => sum + Math.round(Number(form[field] || 0) * 100), 0) / 100;
  const formDeductions = deductionFields.reduce((sum, field) => sum + Math.round(Number(form[field] || 0) * 100), 0) / 100;
  const formNet = formGross - formDeductions;
  const filteredRecords = records.filter((record) => (statusFilter === "all" || record.status === statusFilter) && (periodFilter === "all" || String(record.pay_period || "").startsWith(periodFilter)));
  const totalNet = filteredRecords.reduce((sum, record) => sum + Number(record.net_salary || 0), 0);
  const pendingNet = filteredRecords.filter((record) => record.status !== "paid").reduce((sum, record) => sum + Number(record.net_salary || 0), 0);
  const exportCsv = () => {
    const escape = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
    const rows = [["Employee", "Employee code", "Pay period", "Basic salary", "Allowances", "Bonus", "Other earnings", "Gross salary", "Tax", "PF", "Unpaid leave", "Other deductions", "Total deductions", "Net salary", "Status"], ...filteredRecords.map((row) => [row.employee_name || employees.find((employee) => String(employee.id) === String(row.employee_id))?.name || "", row.employee_code || "", row.pay_period, row.basic_salary, row.allowances, row.bonus, row.other_earnings, row.gross_salary, row.tax_deduction, row.pf_deduction, row.unpaid_leave_deduction, row.other_deductions, row.deductions, row.net_salary, row.status])];
    const blob = new Blob([`\uFEFF${rows.map((row) => row.map(escape).join(",")).join("\r\n")}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `payroll-${periodFilter === "all" ? "all-periods" : periodFilter}.csv`; anchor.click(); URL.revokeObjectURL(url);
  };

  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-[11px] font-bold uppercase tracking-[.16em] text-brand">Payroll operations</p><h1 className="mt-2 text-[27px] font-bold tracking-tight text-ink">Payroll</h1><p className="mt-1 text-xs text-slate-500">Prepare monthly payroll, confirm completed payments, and provide payslips.</p></div><button onClick={() => openForm()} className="rounded-xl bg-brand px-4 py-2.5 text-[11px] font-bold text-white"><Plus size={15} className="mr-1.5 inline" />Add payroll record</button></div>
    <section className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5"><h2 className="text-xs font-bold text-indigo-950">HR payroll workflow</h2><div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[["1 · Choose employee", "Active employee profile salary pre-fills Basic salary; confirm or adjust it for this period."], ["2 · Select pay month", "Choose the month being paid. Keep one payroll record per employee per month."], ["3 · Enter components", "Enter approved earnings and deductions in their own fields. Gross, deductions, and net update live."], ["4 · Review and pay", "Verify the breakdown, complete the actual payment, then mark it paid and issue the payslip."]].map(([title, detail]) => <div key={title} className="rounded-xl border border-indigo-100 bg-white p-3"><p className="text-[10px] font-bold text-indigo-900">{title}</p><p className="mt-1 text-[10px] leading-4 text-slate-500">{detail}</p></div>)}</div><p className="mt-3 text-[10px] leading-4 text-slate-500">Formula: <b className="text-slate-700">Gross = Basic + Allowances + Bonus + Other earnings.</b> <b className="text-slate-700">Net = Gross − Tax − PF − Unpaid leave − Other deductions.</b> Tax/PF values follow company policy; they are not guessed by the app.</p></section>
    {error && <ErrorBanner message={error} retry={loadPayroll} />}
    <div className="grid gap-3 sm:grid-cols-3"><div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-card"><p className="text-[10px] font-semibold text-slate-500">Records in view</p><p className="mt-2 text-xl font-bold text-ink">{filteredRecords.length}</p></div><div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-card"><p className="text-[10px] font-semibold text-slate-500">Net payroll in view</p><p className="mt-2 text-xl font-bold text-ink">{currency(totalNet)}</p></div><div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4 shadow-card"><p className="text-[10px] font-semibold text-amber-800">Awaiting payment</p><p className="mt-2 text-xl font-bold text-amber-800">{currency(pendingNet)}</p></div></div>
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end"><select value={periodFilter} onChange={(event) => setPeriodFilter(event.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs"><option value="all">All pay periods</option>{periods.map((period) => <option key={period} value={period}>{new Date(`${period}-01T00:00:00`).toLocaleDateString(undefined, { month: "long", year: "numeric" })}</option>)}</select><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs"><option value="all">All payment statuses</option><option value="pending">Pending</option><option value="paid">Paid</option></select><button onClick={exportCsv} disabled={!filteredRecords.length} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 disabled:opacity-50"><Download size={14} className="mr-1.5 inline"/>Export CSV</button></div>
    <RecordTable title="Payroll records" rows={filteredRecords} loading={loading} error="" search={search} onSearch={setSearch} columns={[
      { label: "Employee", render: (row) => <span className="font-semibold text-ink">{row.employee_name || employees.find((employee) => String(employee.id) === String(row.employee_id))?.name || "—"}</span> },
      { label: "Pay period", render: (row) => dateLabel(row.pay_period) },
      { label: "Gross", render: (row) => <span title={`Basic ${currency(row.basic_salary)} · Allowances ${currency(row.allowances)} · Bonus ${currency(row.bonus)} · Other ${currency(row.other_earnings)}`}>{currency(row.gross_salary)}</span> },
      { label: "Deductions", render: (row) => <span title={`Tax ${currency(row.tax_deduction)} · PF ${currency(row.pf_deduction)} · Unpaid leave ${currency(row.unpaid_leave_deduction)} · Other ${currency(row.other_deductions)}`}>{currency(row.deductions)}</span> },
      { label: "Net pay", render: (row) => <span className="font-semibold text-ink">{currency(row.net_salary)}</span> },
      { label: "Status", render: (row) => <StatusBadge value={row.status} /> },
      { label: "Actions", render: (row) => <div className="flex justify-end gap-1">{row.status !== "paid" && <button onClick={() => markPaid(row)} title="Mark paid" className="rounded-lg bg-emerald-50 p-2 text-emerald-600"><Check size={14} /></button>}<button onClick={() => showPayslip(row)} title="View payslip" className="rounded-lg p-2 text-slate-400 hover:bg-violet-50 hover:text-brand"><Eye size={14} /></button><button onClick={() => openForm(row)} title="Edit payroll record" className="rounded-lg p-2 text-slate-400 hover:bg-violet-50 hover:text-brand"><Pencil size={14} /></button><button onClick={() => remove(row)} title="Delete payroll record" className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={14} /></button></div> }
    ]} />
    {open && <RecordDialog title={editing ? "Edit payroll record" : "Create payroll record"} onClose={() => setOpen(false)} onSubmit={save} saving={saving} error={error}>
      {!editing && <label className="block text-[10px] font-bold text-slate-600">Employee<select required value={form.employee_id} onChange={(event) => { const employee = employees.find((row) => String(row.id) === event.target.value); setForm({ ...form, employee_id: event.target.value, basic_salary: String(employee?.salary ?? "0") }); }} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-normal"><option value="">Select employee…</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name} · {employee.employee_code} · {currency(employee.salary)}</option>)}</select></label>}
      <label className="block text-[10px] font-bold text-slate-600">Pay month<input required type="month" value={form.pay_period} onChange={(event) => setForm({ ...form, pay_period: event.target.value })} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-xs font-normal" /><span className="mt-1 block font-normal text-slate-400">Select the month being paid, not today's date.</span></label>
      {[ ["basic_salary", "Basic salary", "Monthly basic pay; prefilled from the employee profile where available."], ["allowances", "Allowances", "Housing, transport, or other approved allowances."], ["bonus", "Bonus / incentive", "Approved bonus or variable pay for this month."], ["other_earnings", "Other earnings", "Overtime or other approved earnings."], ["tax_deduction", "Tax deduction", "Enter the payroll-approved tax amount."], ["pf_deduction", "PF deduction", "Enter the employee contribution amount per company policy."], ["unpaid_leave_deduction", "Unpaid leave deduction", "Approved deduction for unpaid leave in this pay period."], ["other_deductions", "Other deductions", "Loans, advances, or other approved deductions."] ].map(([field, label, hint]) => <label key={field} className="block text-[10px] font-bold text-slate-600">{label}<input min="0" required={field === "basic_salary"} type="number" step="0.01" value={form[field]} onChange={(event) => updateAmount(field, event.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-xs font-normal" /><span className="mt-1 block font-normal text-slate-400">{hint}</span></label>)}
      <div className={`rounded-xl border p-4 sm:col-span-2 ${formNet < 0 ? "border-rose-200 bg-rose-50" : "border-emerald-100 bg-emerald-50"}`}><p className="text-[10px] font-bold text-slate-700">Live payroll calculation</p><div className="mt-3 grid grid-cols-3 gap-2 text-center"><div><p className="text-[9px] text-slate-500">Gross earnings</p><p className="mt-1 text-sm font-bold text-slate-800">{currency(formGross)}</p></div><div><p className="text-[9px] text-slate-500">Deductions</p><p className="mt-1 text-sm font-bold text-rose-700">− {currency(formDeductions)}</p></div><div><p className="text-[9px] text-slate-500">Net pay</p><p className="mt-1 text-sm font-bold text-emerald-800">{currency(formNet)}</p></div></div><p className="mt-3 border-t border-black/5 pt-2 text-[10px] text-slate-500">Gross = basic + allowances + bonus + other earnings. Net = gross − tax − PF − unpaid leave − other deductions.</p>{formNet < 0 && <p className="mt-2 text-[10px] font-semibold text-rose-700">Total deductions cannot exceed total earnings.</p>}</div>
    </RecordDialog>}
  </div>;
}
