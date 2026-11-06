import { ArrowUpRight, Clock3, FileText } from "lucide-react";
import { prettify } from "../utils/formatters.js";

export function StatCard({ label, value, icon: Icon, tone, trend, detail, loading }) {
  const tones = { violet: "bg-violet-50 text-violet-600", blue: "bg-blue-50 text-blue-600", amber: "bg-amber-50 text-amber-600", green: "bg-emerald-50 text-emerald-600" };
  return <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card"><div className="flex items-center justify-between"><span className="text-[11px] font-semibold text-slate-500">{label}</span><span className={`grid h-9 w-9 place-items-center rounded-xl ${tones[tone]}`}><Icon size={17} /></span></div><p className={`mt-4 text-[26px] font-bold tracking-tight text-ink ${loading ? "animate-pulse" : ""}`}>{loading ? "···" : value}</p><div className="mt-2 flex items-center gap-1 text-[9px]"><span className={`${tone === "amber" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"} rounded-md px-1.5 py-1 font-bold`}>{tone === "amber" ? <Clock3 size={10} className="mr-1 inline" /> : <ArrowUpRight size={10} className="inline" />}{trend}</span><span className="text-slate-400">{detail}</span></div></section>;
}

export function ProfileInput({ label, value, onChange, disabled, placeholder }) {
  return <label className="block text-[10px] font-bold text-slate-600">{label}<input disabled={disabled} value={value || ""} placeholder={placeholder} onChange={(e) => onChange?.(e.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-xs font-normal outline-none transition placeholder:text-slate-300 focus:border-brand focus:ring-4 focus:ring-brand/10 disabled:bg-slate-50 disabled:text-slate-400" /></label>;
}

export function ProfileFact({ label, value }) { return <div className="rounded-xl bg-slate-50 p-3"><p className="text-[9px] text-slate-400">{label}</p><p className="mt-1 truncate text-[10px] font-bold capitalize text-slate-700">{value}</p></div>; }

export function MiniMetric({ title, value, color }) {
  const colors = { violet: "text-brand bg-violet-50", amber: "text-amber-700 bg-amber-50", green: "text-emerald-700 bg-emerald-50", blue: "text-blue-700 bg-blue-50" };
  return <div className="rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-card"><p className="text-[10px] text-slate-400">{title}</p><p className={`mt-2 inline-flex rounded-lg px-2.5 py-1 text-sm font-bold ${colors[color]}`}>{value}</p></div>;
}

export function StatusBadge({ value }) {
  const key = String(value || "").toLowerCase();
  const colors = key === "active" || key === "approved" || key === "paid" || key === "admin" ? "bg-emerald-50 text-emerald-700" : key === "pending" || key === "hr" ? "bg-amber-50 text-amber-700" : key === "rejected" || key === "inactive" || key === "cancelled" ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-600";
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-bold capitalize ${colors}`}><span className="h-1.5 w-1.5 rounded-full bg-current opacity-65" />{prettify(value)}</span>;
}

export function EmptyState({ title, detail, action }) {
  return <div className="px-5 py-12 text-center"><div className="mx-auto grid h-11 w-11 place-items-center rounded-2xl bg-slate-50 text-slate-300"><FileText size={19} /></div><p className="mt-3 text-xs font-bold text-slate-600">{title}</p><p className="mt-1 text-[10px] text-slate-400">{detail}</p>{action}</div>;
}

export function ErrorBanner({ message, retry }) {
  return <div role="alert" className="flex items-center gap-3 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-[11px] text-rose-700"><span className="flex-1">{message}</span>{retry && <button onClick={retry} className="font-bold underline underline-offset-2">Retry</button>}</div>;
}
