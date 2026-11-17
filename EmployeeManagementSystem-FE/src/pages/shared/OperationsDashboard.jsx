import { useEffect, useState } from "react";
import { ArrowRight, Check, CircleDot, Clock3, LifeBuoy, Sparkles, Wrench } from "lucide-react";
import { api } from "../../api.js";
import { ErrorBanner } from "../../components/ui.jsx";

const roleInfo = {
  it: { title: "IT operations", subtitle: "Devices, access, and technical help for your team.", accent: "from-cyan-600 to-blue-700" },
  support: { title: "Support center", subtitle: "Help requests, clear ownership, and better service follow-through.", accent: "from-violet-600 to-indigo-700" },
  maintenance: { title: "Facilities & maintenance", subtitle: "Keep workplace needs visible, prioritized, and moving.", accent: "from-amber-500 to-orange-700" }
};
export default function OperationsDashboard({ user, onNavigate }) {
  const info = roleInfo[user.role] || roleInfo.support;
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => { api("/service-requests/summary").then((result) => setSummary(result.data)).catch((cause) => setError(cause.message)); }, []);
  const metrics = [{ label: "Open requests", value: summary?.counts.open ?? "—", icon: CircleDot, tone: "text-amber-700 bg-amber-50" }, { label: "In progress", value: summary?.counts.in_progress ?? "—", icon: Clock3, tone: "text-sky-700 bg-sky-50" }, { label: "Resolved", value: summary?.counts.resolved ?? "—", icon: Check, tone: "text-emerald-700 bg-emerald-50" }];
  return <div className="space-y-6"><section className={`relative overflow-hidden rounded-[26px] bg-gradient-to-br ${info.accent} p-6 text-white shadow-card sm:p-8`}><div className="absolute -right-10 -top-16 h-64 w-64 rounded-full border border-white/10"/><div className="absolute -right-1 -top-6 h-44 w-44 rounded-full border border-white/10"/><p className="relative text-[10px] font-bold uppercase tracking-[.18em] text-white/65">{info.title}</p><h1 className="relative mt-3 text-3xl font-bold tracking-tight">Good work, {user.name.split(" ")[0]}.</h1><p className="relative mt-2 max-w-xl text-sm text-white/75">{info.subtitle}</p><button onClick={() => onNavigate("serviceRequests")} className="relative mt-6 rounded-xl bg-white px-4 py-3 text-xs font-bold text-slate-800 transition hover:-translate-y-0.5">Open your queue <ArrowRight size={15} className="ml-2 inline"/></button><Sparkles size={26} className="absolute bottom-7 right-8 text-white/30"/></section>
    {error && <ErrorBanner message={error} retry={() => api("/service-requests/summary").then((result) => setSummary(result.data)).catch((cause) => setError(cause.message))}/>}
    <div className="grid gap-3 sm:grid-cols-3">{metrics.map(({label,value,icon:Icon,tone})=><div key={label} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card"><span className={`grid h-10 w-10 place-items-center rounded-xl ${tone}`}><Icon size={18}/></span><p className="mt-4 text-[11px] font-semibold text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold text-ink">{value}</p></div>)}</div>
    <div className="grid gap-4 md:grid-cols-2"><button onClick={() => onNavigate("serviceRequests")} className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-5 text-left shadow-card transition hover:-translate-y-0.5"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-indigo-50 text-indigo-700"><LifeBuoy size={19}/></span><span className="flex-1"><b className="block text-sm text-ink">Service queue</b><span className="mt-1 block text-[11px] text-slate-500">Review requests and update their progress.</span></span><ArrowRight size={16} className="text-slate-400"/></button><div className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-card"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-700"><Wrench size={19}/></span><span><b className="block text-sm text-ink">Focused access</b><span className="mt-1 block text-[11px] text-slate-500">This workspace only shows its own service category.</span></span></div></div>
  </div>;
}