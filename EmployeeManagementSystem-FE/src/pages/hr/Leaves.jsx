import { useCallback, useEffect, useState } from "react";
import { Check, FileDown, Trash2, X } from "lucide-react";
import { api, getRows } from "../../api.js";
import { dateLabel } from "../../utils/formatters.js";
import { ErrorBanner, MiniMetric, StatusBadge } from "../../components/ui.jsx";
import RecordTable from "../../components/RecordTable.jsx";

export default function Leaves({ user }) {
  const [leaves, setLeaves] = useState([]);
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const loadLeaves = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [leaveResult, balanceResult] = await Promise.all([
        api("/leaves"), api("/leaves/balances")
      ]);
      setLeaves(getRows(leaveResult));
      setBalances(getRows(balanceResult));
    } catch (requestError) { setError(requestError.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { loadLeaves(); }, [loadLeaves]);

  const downloadDocument = async (leave) => {
    try {
      const file = await api(`/leaves/${leave.id}/document`);
      const url = URL.createObjectURL(file);
      const link = document.createElement("a");
      link.href = url; link.download = leave.medical_document_name || "medical-document"; link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (requestError) { setError(requestError.message); }
  };
  const review = async (leave, status) => {
    try { await api(`/leaves/${leave.id}/review`, { method: "PATCH", body: { status } }); await loadLeaves(); }
    catch (requestError) { setError(requestError.message); }
  };
  const remove = async (leave) => {
    if (!window.confirm("Delete this leave request?")) return;
    try { await api(`/leaves/${leave.id}`, { method: "DELETE" }); await loadLeaves(); }
    catch (requestError) { setError(requestError.message); }
  };

  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-[11px] font-bold uppercase tracking-[.16em] text-brand">People operations</p><h1 className="mt-2 text-[27px] font-bold tracking-tight text-ink">Leave requests</h1><p className="mt-1 text-xs text-slate-400">Review requests and attached Sick Leave documents. Casual leave is limited by each employee’s annual balance; Unpaid Leave does not deduct it.</p></div></div>
    {error && <ErrorBanner message={error} retry={loadLeaves} />}
    <div className="grid gap-3 sm:grid-cols-3"><MiniMetric title="Total requests" value={leaves.length} color="violet" /><MiniMetric title="Pending review" value={leaves.filter((leave) => leave.status === "pending").length} color="amber" /><MiniMetric title="Approved" value={leaves.filter((leave) => leave.status === "approved").length} color="green" /></div>
    <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card"><div className="border-b border-slate-100 px-5 py-4"><h2 className="text-xs font-bold text-ink">Casual leave balance · {new Date().getFullYear()}</h2><p className="mt-1 text-[10px] text-slate-400">Only approved Casual Leave days count against the annual allocation. Sick Leave is tracked separately; Unpaid Leave never reduces this balance.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[560px] text-left"><thead><tr className="bg-slate-50/70">{["Employee", "Employee ID", "Allocated", "Used", "Remaining"].map((label) => <th key={label} className="px-5 py-3 text-[9px] font-bold uppercase tracking-[.1em] text-slate-400">{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-50">{balances.map((balance) => <tr key={balance.employee_id}><td className="px-5 py-3 text-[11px] font-semibold text-ink">{balance.employee_name}</td><td className="px-5 py-3 text-[11px]">{balance.employee_code || "—"}</td><td className="px-5 py-3 text-[11px]">{balance.allocated_days} days</td><td className="px-5 py-3 text-[11px]">{balance.approved_days_used} days</td><td className="px-5 py-3 text-[11px] font-bold text-emerald-700">{balance.remaining_days} days</td></tr>)}</tbody></table></div></section>
    <RecordTable title="Requests" rows={leaves} loading={loading} error="" search={search} onSearch={setSearch} columns={[
      { label: "Employee", render: (row) => <span className="font-semibold text-ink">{row.employee_name} · {row.employee_code || ""}</span> },
      { label: "Type", render: (row) => (row.leave_type || "annual").replace("_", " ") },
      { label: "From", render: (row) => dateLabel(row.start_date) },
      { label: "To", render: (row) => dateLabel(row.end_date) },
      { label: "Days", render: (row) => row.requested_days ?? "—" },
      { label: "Reason", render: (row) => <span className="line-clamp-2" title={row.reason}>{row.reason}</span> },
      { label: "Medical document", render: (row) => row.medical_document_name ? <button type="button" onClick={() => downloadDocument(row)} className="inline-flex items-center gap-1.5 font-semibold text-brand hover:underline"><FileDown size={13} />Download</button> : "—" },
      { label: "Status", render: (row) => <StatusBadge value={row.status} /> },
      { label: "Actions", render: (row) => <div className="flex justify-end gap-1">{row.status === "pending" && <><button onClick={() => review(row, "approved")} title="Approve" className="rounded-lg bg-emerald-50 p-2 text-emerald-600"><Check size={14} /></button><button onClick={() => review(row, "rejected")} title="Reject" className="rounded-lg bg-rose-50 p-2 text-rose-600"><X size={14} /></button></>}{user.role === "hr" && <button onClick={() => remove(row)} title="Delete request" className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={14} /></button>}</div> }
    ]} />
  </div>;
}
