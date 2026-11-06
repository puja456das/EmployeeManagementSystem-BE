import { useCallback, useEffect, useState } from "react";
import { Eye } from "lucide-react";
import { api, getRows } from "../../api.js";
import { currency, dateLabel, payslipMarkup } from "../../utils/formatters.js";
import { ErrorBanner, MiniMetric, StatusBadge } from "../../components/ui.jsx";
import RecordTable from "../../components/RecordTable.jsx";

export default function Payslips() {
  const [payslips, setPayslips] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const loadPayslips = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [payrollResult, summaryResult] = await Promise.all([api("/payroll"), api("/payroll/summary")]);
      setPayslips(getRows(payrollResult));
      setSummary(summaryResult.data);
    } catch (requestError) { setError(requestError.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { loadPayslips(); }, [loadPayslips]);
  const showPayslip = async (record) => {
    const popup = window.open("", "_blank");
    if (!popup) { setError("Allow pop-ups to open the payslip."); return; }
    try {
      const result = await api(`/payroll/${record.id}/payslip`);
      popup.document.write(payslipMarkup(result.payslip));
      popup.document.close();
    } catch (requestError) { popup.close(); setError(requestError.message); }
  };
  return <div className="space-y-6">
    <div><p className="text-[11px] font-bold uppercase tracking-[.16em] text-brand">Your workspace</p><h1 className="mt-2 text-[27px] font-bold tracking-tight text-ink">My payslips</h1><p className="mt-1 text-xs text-slate-400">Review your salary records and open printable payslips.</p></div>
    {error && <ErrorBanner message={error} retry={loadPayslips} />}
    <div className="grid gap-3 sm:grid-cols-3"><MiniMetric title="Pay periods" value={summary?.pay_periods ?? "—"} color="violet" /><MiniMetric title="Paid periods" value={summary?.paid_periods ?? "—"} color="green" /><MiniMetric title="Net pay on record" value={currency(summary?.net_total)} color="blue" /></div>
    <RecordTable title="My payslips" rows={payslips} loading={loading} error="" search={search} onSearch={setSearch} columns={[
      { label: "Pay period", render: (row) => dateLabel(row.pay_period) },
      { label: "Gross", render: (row) => currency(row.gross_salary) },
      { label: "Deductions", render: (row) => currency(row.deductions) },
      { label: "Net pay", render: (row) => <span className="font-semibold text-ink">{currency(row.net_salary)}</span> },
      { label: "Status", render: (row) => <StatusBadge value={row.status} /> },
      { label: "Payslip", render: (row) => <button onClick={() => showPayslip(row)} className="rounded-lg p-2 text-slate-400 hover:bg-violet-50 hover:text-brand" title="Open payslip"><Eye size={14} /></button> }
    ]} />
  </div>;
}
