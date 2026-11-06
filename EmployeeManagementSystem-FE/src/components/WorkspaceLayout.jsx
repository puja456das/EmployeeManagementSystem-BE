import { useState } from "react";
import { Bell, ChevronDown, ChevronRight, CircleHelp, LogOut, Menu, Search, Users, X } from "lucide-react";
import { initials } from "../utils/formatters.js";

export default function WorkspaceLayout({ user, active, allowedItems, onNavigate, onLogout, children }) {
  const [mobileMenu, setMobileMenu] = useState(false);
  const isEmployee = user.role === "employee";
  const isHr = user.role === "hr";
  const navigate = onNavigate;

  return (
    <div className={`min-h-screen ${isEmployee ? "bg-[#f3f5ff]" : isHr ? "bg-[#f2faf8]" : "bg-canvas"}`}>
      {mobileMenu && <button aria-label="Close navigation" onClick={() => setMobileMenu(false)} className="fixed inset-0 z-30 bg-slate-950/30 md:hidden" />}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[250px] flex-col border-r transition-transform md:translate-x-0 ${isEmployee ? "border-indigo-900/60 bg-[#171d3b] text-white" : isHr ? "border-emerald-100 bg-white" : "border-indigo-100 bg-white"} ${mobileMenu ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-[78px] items-center gap-3 px-6">
          <div className={`grid h-10 w-10 place-items-center rounded-[14px] text-white shadow-lg ${isEmployee ? "bg-gradient-to-br from-cyan-400 to-indigo-500 shadow-indigo-950/40" : isHr ? "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/25" : "bg-gradient-to-br from-indigo-500 to-violet-600 shadow-indigo-500/25"}`}><Users size={20} /></div>
          <div><p className={`text-[17px] font-extrabold tracking-tight ${isEmployee ? "text-white" : "text-ink"}`}>{isEmployee ? "My workspace" : isHr ? "People Ops" : "TeamNest Admin"}</p><p className={`text-[10px] font-semibold uppercase tracking-[.17em] ${isEmployee ? "text-indigo-200/65" : "text-slate-400"}`}>{isEmployee ? "Employee portal" : isHr ? "HR platform" : "Admin platform"}</p></div>
          <button onClick={() => setMobileMenu(false)} className={`ml-auto md:hidden ${isEmployee ? "text-indigo-100" : "text-slate-400"}`}><X size={19} /></button>
        </div>
        <div className={`mx-4 mt-2 rounded-2xl p-3 ${isEmployee ? "border border-white/10 bg-white/[0.06]" : isHr ? "border border-emerald-100 bg-emerald-50/70" : "border border-indigo-100 bg-indigo-50/70"}`}>
          <div className="flex items-center gap-3">
            <div className={`grid h-9 w-9 place-items-center rounded-full text-xs font-bold uppercase ${isEmployee ? "bg-gradient-to-br from-amber-300 to-orange-400 text-orange-950" : isHr ? "bg-gradient-to-br from-emerald-100 to-teal-200 text-emerald-800" : "bg-gradient-to-br from-indigo-100 to-violet-200 text-indigo-700"}`}>{initials(user.name)}</div>
            <div className="min-w-0 flex-1"><p className={`truncate text-xs font-bold ${isEmployee ? "text-white" : "text-ink"}`}>{user.name}</p><p className={`mt-0.5 text-[10px] capitalize ${isEmployee ? "text-indigo-200/65" : "text-slate-400"}`}>{isEmployee ? "Your employee account" : isHr ? "Human resources" : "System administrator"}</p></div>
            {!isEmployee && <ChevronDown size={15} className="text-slate-400" />}
          </div>
        </div>
        <p className={`mb-2 mt-7 px-6 text-[10px] font-bold uppercase tracking-[.15em] ${isEmployee ? "text-indigo-200/50" : "text-slate-400"}`}>{isEmployee ? "Your workspace" : isHr ? "People operations" : "System workspace"}</p>
        <nav className="scrollbar-thin flex-1 space-y-1 overflow-y-auto px-3">
          {allowedItems.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => { navigate(id); setMobileMenu(false); }} className={`group flex w-full items-center gap-3 rounded-xl px-3 py-[11px] text-left text-[13px] font-semibold transition ${active === id ? isEmployee ? "bg-gradient-to-r from-cyan-400/20 to-violet-400/20 text-cyan-100 ring-1 ring-white/10" : isHr ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100" : "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100" : isEmployee ? "text-indigo-100/70 hover:bg-white/[0.07] hover:text-white" : isHr ? "text-slate-500 hover:bg-emerald-50 hover:text-emerald-800" : "text-slate-500 hover:bg-indigo-50/70 hover:text-indigo-700"}`}>
              <Icon size={18} strokeWidth={active === id ? 2.4 : 1.8} /><span className="flex-1">{isEmployee && id === "payroll" ? "My payslips" : label}</span>{id === "leaves" && !isEmployee && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">New</span>}
            </button>
          ))}
        </nav>
        <div className={`m-4 rounded-2xl p-4 text-white ${isEmployee ? "border border-white/10 bg-gradient-to-br from-cyan-500/20 via-indigo-500/20 to-fuchsia-500/20" : isHr ? "bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700" : "bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600"}`}>
          <div className="mb-3 grid h-8 w-8 place-items-center rounded-lg bg-white/15"><CircleHelp size={17} /></div>
          <p className="text-xs font-bold">{isEmployee ? "Here for you" : "Need a hand?"}</p><p className="mt-1 text-[10px] leading-4 text-white/75">{isEmployee ? "Your workday essentials, all in one place." : "Your people ops workspace, all in one place."}</p>
          <button className="mt-3 text-[10px] font-bold underline decoration-white/50 underline-offset-4">Explore help center</button>
        </div>
        <div className="border-t border-slate-100 px-3 py-3">
          <button onClick={onLogout} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold ${isEmployee ? "text-indigo-100/70 hover:bg-rose-400/10 hover:text-rose-200" : "text-slate-500 hover:bg-rose-50 hover:text-rose-600"}`}><LogOut size={17} />Sign out</button>
        </div>
      </aside>

      <main className={`min-h-screen md:ml-[250px] ${isEmployee ? "bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-violet-100/60 via-[#f5f6ff] to-cyan-50/50" : isHr ? "bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-100/50 via-[#f6fbf9] to-cyan-50/50" : "admin-scene"}`}>
        <header className={`sticky top-0 z-20 flex h-[78px] items-center justify-between border-b px-4 backdrop-blur md:px-8 ${isEmployee ? "border-indigo-100/70 bg-white/75" : isHr ? "border-emerald-100/70 bg-white/80" : "border-indigo-100/80 bg-white/85"}`}>
          <div className="flex items-center gap-3">
            <button aria-label="Open menu" onClick={() => setMobileMenu(true)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 md:hidden"><Menu size={19} /></button>
            <div className="hidden items-center gap-2 text-[11px] text-slate-400 sm:flex"><span>{isEmployee ? "My workspace" : "Workspace"}</span><ChevronRight size={13} /><span className="font-semibold capitalize text-slate-600">{active === "dashboard" ? isEmployee ? "Home" : "Overview" : active}</span></div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            {!isEmployee && <><label className="hidden h-10 w-[210px] items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 lg:flex"><Search size={15} className="text-slate-400" /><input placeholder="Search anything..." className="w-full bg-transparent text-xs outline-none placeholder:text-slate-400" /></label><button aria-label="Notifications" className="relative grid h-9 w-9 place-items-center rounded-xl text-slate-500 hover:bg-slate-50"><Bell size={18} /><i className="absolute right-[8px] top-[7px] h-1.5 w-1.5 rounded-full bg-rose-500 ring-2 ring-white" /></button><div className="hidden h-8 w-px bg-slate-100 sm:block" /></>}
            <button onClick={() => navigate("profile")} className="flex items-center gap-2.5 rounded-xl py-1 pl-1 pr-1 sm:pr-2 hover:bg-slate-50">
              <div className={`grid h-9 w-9 place-items-center rounded-xl text-xs font-bold uppercase ${isEmployee ? "bg-gradient-to-br from-cyan-100 to-violet-200 text-indigo-700" : isHr ? "bg-gradient-to-br from-emerald-100 to-teal-200 text-emerald-800" : "bg-gradient-to-br from-indigo-100 to-violet-200 text-indigo-700"}`}>{initials(user.name)}</div>
              <span className="hidden max-w-[125px] truncate text-xs font-bold text-ink sm:block">{user.name}</span>
              {!isEmployee && <ChevronDown size={14} className="hidden text-slate-400 sm:block" />}
            </button>
          </div>
        </header>
        <div className="mx-auto max-w-[1500px] px-4 py-6 md:px-8 md:py-8">
          {children}
          <footer className="mt-10 flex flex-col gap-2 border-t border-slate-200/70 py-5 text-[10px] text-slate-400 sm:flex-row sm:items-center sm:justify-between"><span>© {new Date().getFullYear()} TeamNest. Built for better work.</span><span className="flex items-center gap-4"><a href="#privacy" className="hover:text-brand">Privacy</a><a href="#support" className="hover:text-brand">Support</a><span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />All systems operational</span></span></footer>
        </div>
      </main>
    </div>
  );
}
