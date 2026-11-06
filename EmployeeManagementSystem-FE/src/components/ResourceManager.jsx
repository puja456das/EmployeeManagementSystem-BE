import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, FileText, Pencil, Plus, Search, X } from "lucide-react";
import { api, getRows } from "../api.js";
import { currency, dateLabel, dateTimeLabel, payslipMarkup, prettify } from "../utils/formatters.js";
import { configs } from "../config/resourceConfigs.js";
import { EmptyState, ErrorBanner, MiniMetric, StatusBadge } from "./ui.jsx";
import EmployeeAvatar from "./EmployeeAvatar.jsx";
import AttendanceControls from "./AttendanceControls.jsx";
import RecordModal from "./RecordModal.jsx";

export default function ResourceManager({ page, user }) {
  const config = page === "payroll" && user.role === "employee"
    ? {
      ...configs.payroll,
      title: "My payslips",
      subtitle: "Your salary records and downloadable payslips.",
      columns: configs.payroll.columns.filter(([key]) => key !== "employee_name")
    }
    : configs[page];
  const [rows, setRows] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [leaveBalances, setLeaveBalances] = useState([]);
  const [myLeaveBalance, setMyLeaveBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");
  const canManage = user.role === "employee" ? page === "leaves" : true;
  const canDelete = user.role === "admin";

  const refresh = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const result = await api(config.endpoint);
      setRows(getRows(result, config.rowKey));
      if (["leaves", "payroll", "attendance"].includes(page) && ["admin", "hr"].includes(user.role)) {
        const employeeResult = await api("/employees");
        setEmployees(getRows(employeeResult, "employees"));
      }
      if (page === "leaves" && ["admin", "hr"].includes(user.role)) {
        const balanceResult = await api("/leaves/balances");
        setLeaveBalances(getRows(balanceResult));
      }
      if (page === "leaves" && user.role === "employee") {
        const balanceResult = await api("/leaves/balance/me");
        setMyLeaveBalance(balanceResult.data);
      }
      if (page === "users" && user.role === "admin") {
        const employeeResult = await api("/employees");
        setEmployees(getRows(employeeResult, "employees"));
      }
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, [config.endpoint, config.rowKey, page, user.role]);
  useEffect(() => { refresh(); }, [refresh]);

  const filtered = useMemo(() => rows.filter((row) => JSON.stringify(row).toLowerCase().includes(search.toLowerCase())), [rows, search]);
  const create = async (body, record) => {
    const payload = page === "attendance"
      ? Object.fromEntries(Object.entries(body).map(([key, value]) => [
        key,
        key === "check_in" || key === "check_out"
          ? value ? new Date(value).toISOString() : null
          : value === "" ? null : value
      ]))
      : body;
    const result = await api(record ? `${config.endpoint}/${record.id}` : config.endpoint, {
      method: record ? page === "attendance" ? "PATCH" : "PUT" : "POST",
      body: payload
    });
    setRows((current) => [result[config.rowKey?.slice(0, -1)] || result.data || result.user || result.employee || result, ...current]);
    setModal(false); setEditing(null); setNotice(result.message || `${config.title.replace(/s$/, "")} saved successfully.`); setTimeout(() => setNotice(""), 6000); refresh();
  };
  const action = async (row, kind) => {
    if (kind === "edit") {
      setEditing(row);
      setModal(true);
      return;
    }
    try {
      if (kind === "approve" || kind === "reject") await api(`/leaves/${row.id}/review`, { method: "PATCH", body: { status: kind === "approve" ? "approved" : "rejected" } });
      if (kind === "paid") await api(`/payroll/${row.id}/mark-paid`, { method: "PATCH", body: {} });
      if (kind === "payslip") {
        const printWindow = window.open("", "_blank");
        if (!printWindow) throw new Error("Allow pop-ups to open the payslip.");
        const { payslip } = await api(`/payroll/${row.id}/payslip`);
        printWindow.document.write(payslipMarkup(payslip));
        printWindow.document.close();
        return;
      }
      if (kind === "delete") {
        if (!window.confirm("Delete this record? This action cannot be undone.")) return;
        await api(`${config.endpoint}/${row.id}`, { method: "DELETE" });
      }
      setNotice(kind === "delete" ? "Record deleted." : "Changes saved successfully.");
      setTimeout(() => setNotice(""), 3000); refresh();
    } catch (err) { setError(err.message); }
  };
  if (!config) return null;

  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-[11px] font-bold uppercase tracking-[.16em] text-brand">{user.role === "employee" ? "Your workspace" : "People operations"}</p><h1 className="mt-2 text-[27px] font-bold tracking-tight text-ink">{config.title}</h1><p className="mt-1 text-xs text-slate-400">{config.subtitle}</p></div>
      <div className="flex gap-2">{page === "attendance" && user.role === "employee" && <AttendanceControls onDone={refresh} attendance={rows} />}{canManage && config.fields && <button onClick={() => { setEditing(null); setModal(true); }} className="rounded-xl bg-brand px-4 py-2.5 text-[11px] font-bold text-white shadow-lg shadow-brand/15 hover:bg-[#80582f]"><Plus size={15} className="mr-1.5 inline" />Add {page === "attendance" ? "attendance" : config.title.replace(/s$/, "")}</button>}</div>
    </div>
    {notice && <div role="status" className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700"><Check size={15} />{notice}<button onClick={() => setNotice("")} className="ml-auto"><X size={15} /></button></div>}
    {error && <ErrorBanner message={error} retry={refresh} />}
    {page === "leaves" && <div className={`grid gap-3 ${user.role === "employee" ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-3"}`}><MiniMetric title="Total requests" value={rows.length} color="violet" /><MiniMetric title="Pending review" value={rows.filter((row) => row.status === "pending").length} color="amber" /><MiniMetric title="Approved" value={rows.filter((row) => row.status === "approved").length} color="green" />{user.role === "employee" && <MiniMetric title={`Paid leave left in ${myLeaveBalance?.year || new Date().getFullYear()}`} value={`${myLeaveBalance?.remaining_days ?? "—"} / ${myLeaveBalance?.allocated_days ?? 12}`} color="blue" />}</div>}
    {page === "leaves" && user.role !== "employee" && <section className="overflow-hidden rounded-2xl border border-[#eadfce] bg-white shadow-card">
      <div className="border-b border-slate-100 px-5 py-4"><h2 className="text-xs font-bold text-ink">Paid leave balances · {new Date().getFullYear()}</h2><p className="mt-1 text-[10px] text-slate-400">12 days are assigned by default; only approved leave days are deducted.</p></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-left"><thead><tr className="bg-slate-50/70">{["Employee", "Employee ID", "Allocated", "Used", "Remaining"].map((label) => <th key={label} className="px-5 py-3 text-[9px] font-bold uppercase tracking-[.1em] text-slate-400">{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-50">{leaveBalances.map((balance) => <tr key={balance.employee_id}><td className="px-5 py-3 text-[11px] font-semibold text-ink">{balance.employee_name}</td><td className="px-5 py-3 text-[11px] text-slate-600">{balance.employee_code || "—"}</td><td className="px-5 py-3 text-[11px] text-slate-600">{balance.allocated_days} days</td><td className="px-5 py-3 text-[11px] text-slate-600">{balance.approved_days_used} days</td><td className="px-5 py-3 text-[11px] font-bold text-emerald-700">{balance.remaining_days} days</td></tr>)}{!leaveBalances.length && !loading && <tr><td colSpan={5} className="px-5 py-6 text-center text-xs text-slate-400">No employee leave balances found.</td></tr>}</tbody></table></div>
    </section>}
    {page === "employees" && <div className="grid gap-3 sm:grid-cols-3"><MiniMetric title="Total employees" value={rows.length} color="violet" /><MiniMetric title="Active" value={rows.filter((row) => row.status === "Active").length} color="green" /><MiniMetric title="Departments" value={new Set(rows.map((row) => row.department).filter(Boolean)).size} color="blue" /></div>}
    <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-xs font-bold text-ink">{page === "attendance" && user.role !== "employee" ? "All employee attendance" : `All ${config.title.toLowerCase()}`}</h2><p className="mt-1 text-[10px] text-slate-400">{filtered.length} records found</p></div><label className="flex h-9 w-full items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 sm:w-[260px]"><Search size={14} className="text-slate-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={page === "attendance" || page === "leaves" ? "Search employee name or ID..." : `Search ${config.title.toLowerCase()}...`} className="w-full bg-transparent text-[10px] outline-none placeholder:text-slate-400" /></label></div>
      <div className="scrollbar-thin overflow-x-auto">
        <table className="w-full min-w-[720px] text-left">
          <thead><tr className="bg-slate-50/70">{config.columns.map(([, title]) => <th key={title} className="px-5 py-3 text-[9px] font-bold uppercase tracking-[.1em] text-slate-400">{title}</th>)}<th className="px-5 py-3 text-right text-[9px] font-bold uppercase tracking-[.1em] text-slate-400">Actions</th></tr></thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? <tr><td colSpan={config.columns.length + 1} className="px-5 py-12 text-center text-xs text-slate-400">Loading {config.title.toLowerCase()}…</td></tr>
              : filtered.length ? filtered.map((row, index) => <tr key={row.id ?? index} className="transition hover:bg-slate-50/60">{config.columns.map(([key, title]) => <td key={key} className="max-w-[240px] px-5 py-3.5 text-[11px] text-slate-600">{key === "name" && page === "employees" ? <div className="flex items-center gap-2.5"><EmployeeAvatar employeeId={row.id} hasPhoto={row.has_profile_image} name={row.name} className="h-8 w-8 rounded-full text-[9px]" /><span className="truncate font-semibold text-ink">{row[key] || "—"}</span></div> : key === "bank_account_masked" ? <span className={row[key] ? "font-mono font-semibold text-slate-600" : "text-slate-400"}>{row[key] || "Not added"}</span> : key === "status" || key === "role" ? <StatusBadge value={row[key]} /> : ["check_in", "check_out"].includes(key) ? dateTimeLabel(row[key]) : ["pay_period", "start_date", "end_date", "work_date", "holiday_date", "created_at", "published_at", "expires_at"].includes(key) ? dateLabel(row[key]) : ["gross_salary", "deductions", "net_salary"].includes(key) ? currency(row[key]) : <span className={`${["title", "employee_name", "employee_code"].includes(key) ? "font-semibold text-ink" : ""} ${key === "body" || key === "description" || key === "reason" ? "line-clamp-1" : ""}`} title={String(row[key] ?? "")}>{prettify(row[key])}</span>}</td>)}
                <td className="px-5 py-3.5"><div className="flex justify-end gap-1">{(page === "employees" || page === "attendance" || (page === "leaves" && row.status === "pending") || (page === "users" && user.role === "admin")) && canManage && <button onClick={() => action(row, "edit")} title={`Edit ${page === "attendance" ? "attendance" : page === "leaves" ? "leave request" : page === "users" ? "login account" : "employee"}`} className="rounded-lg p-2 text-slate-400 hover:bg-[#efe2ce] hover:text-brand"><Pencil size={14} /></button>}{page === "leaves" && row.status === "pending" && user.role !== "employee" && <><button onClick={() => action(row, "approve")} title="Approve" className="rounded-lg bg-emerald-50 p-2 text-emerald-600 hover:bg-emerald-100"><Check size={14} /></button><button onClick={() => action(row, "reject")} title="Reject" className="rounded-lg bg-rose-50 p-2 text-rose-600 hover:bg-rose-100"><X size={14} /></button></>}{page === "payroll" && row.status !== "paid" && user.role !== "employee" && <button onClick={() => action(row, "paid")} className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[9px] font-bold text-emerald-700">Mark paid</button>}{page === "payroll" && <button onClick={() => action(row, "payslip")} title="View payslip" className="rounded-lg p-2 text-slate-400 hover:bg-violet-50 hover:text-brand"><FileText size={14} /></button>}{canDelete && <button onClick={() => action(row, "delete")} title="Delete" className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><X size={14} /></button>}</div></td>
              </tr>)
                : <tr><td colSpan={config.columns.length + 1}><EmptyState title={search ? "No matching records" : `No ${config.title.toLowerCase()} yet`} detail={search ? "Try another search term." : "When records are added, they’ll show up here."} action={canManage && config.fields ? <button onClick={() => setModal(true)} className="mt-3 rounded-lg bg-brand px-3 py-2 text-[10px] font-bold text-white"><Plus size={13} className="mr-1 inline" />Add first record</button> : null} /></td></tr>}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-[10px] text-slate-400"><span>Showing {filtered.length ? 1 : 0}–{filtered.length} of {filtered.length}</span><div className="flex gap-1"><button disabled className="grid h-7 w-7 place-items-center rounded-lg border border-slate-100 disabled:opacity-40"><ChevronLeft size={14} /></button><span className="grid h-7 w-7 place-items-center rounded-lg bg-violet-50 font-bold text-brand">1</span><button disabled className="grid h-7 w-7 place-items-center rounded-lg border border-slate-100 disabled:opacity-40"><ChevronRight size={14} /></button></div></div>
    </section>
    {modal && <RecordModal key={editing?.id || "new"} config={config} employees={employees} page={page} role={user.role} record={editing} onClose={() => { setModal(false); setEditing(null); }} onSubmit={create} />}
  </div>;
}
