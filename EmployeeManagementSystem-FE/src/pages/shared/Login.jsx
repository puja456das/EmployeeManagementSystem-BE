import { useState } from "react";
import { ChevronRight, Sparkles, Users } from "lucide-react";
import { api } from "../../api.js";

export default function Login({ onLogin }) {
  const searchParams = new URLSearchParams(window.location.search);
  const setupRole = searchParams.get("workspace") === "hr" ? "hr" : "employee";
  const setupLink = searchParams.get("setup") === "employee";
  const [form, setForm] = useState({ email: "", password: "", role: setupLink ? setupRole : "" });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [resetToken, setResetToken] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("resetToken") || params.get("inviteToken") || "";
  });
  const [isInvite, setIsInvite] = useState(() => setupLink || searchParams.has("inviteToken"));
  const [mode, setMode] = useState(() => {
    if (setupLink) return "inviteOtp";
    return searchParams.has("resetToken") || searchParams.has("inviteToken") ? "reset" : "login";
  });
  const [resetEmail, setResetEmail] = useState(() => {
    return setupLink ? searchParams.get("email") || "" : "";
  });
  const [resetRole, setResetRole] = useState(setupRole);
  const [resetCode, setResetCode] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    try { onLogin(await api("/auth/login", { method: "POST", body: form })); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };
  const requestReset = async (event) => {
    event.preventDefault();
    setError(""); setNotice(""); setBusy(true);
    try {
      const result = await api("/auth/forgot-password", { method: "POST", body: { email: resetEmail, role: resetRole } });
      setNotice(result.message || "If an account exists for that email, a verification code has been sent.");
      setMode("verifyOtp");
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };
  const verifyResetCode = async (event) => {
    event.preventDefault();
    setError(""); setNotice(""); setBusy(true);
    try {
      const result = await api("/auth/verify-reset-otp", {
        method: "POST",
        body: { email: resetEmail, code: resetCode, role: resetRole }
      });
      setResetToken(result.token);
      setNewPassword("");
      setConfirmPassword("");
      setMode("reset");
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };
  const verifyInviteCode = async (event) => {
    event.preventDefault();
    setError(""); setNotice(""); setBusy(true);
    try {
      const result = await api("/auth/verify-employee-invite-otp", {
        method: "POST",
        body: { email: resetEmail, code: inviteCode, role: setupRole }
      });
      setResetToken(result.token);
      setIsInvite(true);
      setForm({ email: resetEmail, password: "", role: result.role || setupRole });
      setNewPassword("");
      setConfirmPassword("");
      setMode("reset");
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };
  const submitReset = async (event) => {
    event.preventDefault();
    setError(""); setNotice("");
    if (newPassword !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const result = await api("/auth/reset-password", {
        method: "POST",
        body: { token: resetToken, password: newPassword }
      });
      window.history.replaceState({}, "", window.location.pathname);
      setResetToken("");
      setIsInvite(false);
      setForm({ ...form, password: "" });
      setNotice(isInvite
        ? `Your ${setupRole === "hr" ? "HR" : "employee"} account is ready. Sign in to the ${setupRole === "hr" ? "HR" : "Employee"} workspace with your work email and new password.`
        : result.message);
      setMode("login");
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };
  const title = mode === "forgot" ? "Reset your password"
    : mode === "inviteOtp" ? `Set up ${setupRole === "hr" ? "HR" : "employee"} account`
    : mode === "verifyOtp" ? "Verify your email"
    : mode === "reset" ? isInvite ? "Set up your account" : "Choose a new password"
      : "Sign in to your account";
  const description = mode === "forgot" ? "Enter your work email and we’ll send a one-time verification code."
    : mode === "inviteOtp" ? `Enter the work email and one-time setup code from your ${setupRole === "hr" ? "HR" : "employee"} welcome email. The code is valid for 24 hours.`
    : mode === "verifyOtp" ? `Enter the 6-digit code sent to ${resetEmail} for your ${resetRole} account. The code expires in 10 minutes.`
    : mode === "reset" ? isInvite ? `Welcome to the team. Set a password to activate your ${setupRole === "hr" ? "HR" : "employee"} account.` : "Your new password must be at least 8 characters."
        : "Enter your details to access your workspace.";
  return (
    <div className="login-scene flex min-h-screen items-center justify-center px-4 py-10">
      <div className="grid w-full max-w-[960px] overflow-hidden rounded-[28px] bg-white shadow-2xl md:grid-cols-[1fr_1fr]">
        <section className="relative hidden min-h-[660px] flex-col justify-between overflow-hidden bg-gradient-to-br from-[#655be8] to-[#9a85f7] p-12 text-white md:flex">
          <div className="absolute -right-20 top-28 h-64 w-64 rounded-full border border-white/15" /><div className="absolute -right-7 top-40 h-40 w-40 rounded-full border border-white/15" />
          <div className="relative flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-white/15"><Users size={21} /></div><span className="text-lg font-extrabold">TeamNest</span></div>
          <div className="relative max-w-[340px]"><div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-[10px] font-semibold"><Sparkles size={13} />The people-first workspace</div><h1 className="text-[38px] font-bold leading-[1.13] tracking-tight">Great teams start with <span className="text-[#d6d2ff]">people.</span></h1><p className="mt-4 text-sm leading-6 text-white/75">One thoughtful place to bring your people, processes, and progress together.</p></div>
          <div className="relative flex items-center gap-3"><div className="flex -space-x-2">{["JD", "AM", "SK", "EL"].map((item, index) => <span key={item} className={`grid h-8 w-8 place-items-center rounded-full border-2 border-[#796eea] text-[9px] font-bold ${["bg-amber-200 text-amber-800", "bg-sky-200 text-sky-800", "bg-rose-200 text-rose-800", "bg-lime-200 text-lime-800"][index]}`}>{item}</span>)}</div><span className="text-[10px] text-white/80">Made for teams that care</span></div>
        </section>
        <section className="flex min-h-[660px] flex-col justify-center px-8 py-14 sm:px-14">
          <div className="mb-10 flex items-center gap-3 md:hidden"><div className="grid h-10 w-10 place-items-center rounded-xl bg-brand text-white"><Users size={20} /></div><span className="text-lg font-extrabold text-ink">TeamNest</span></div>
          <div className="mb-8"><p className="text-[11px] font-bold uppercase tracking-[.16em] text-brand">{mode === "login" ? "Welcome back" : "Account recovery"}</p><h2 className="mt-2 text-[27px] font-bold tracking-tight text-ink">{title}</h2><p className="mt-2 text-xs leading-5 text-slate-400">{description}</p></div>
          {mode === "login" &&           <form onSubmit={submit} className="space-y-6">
            <label className="block text-xs font-semibold text-slate-600">Workspace<select required value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-normal outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10"><option value="">Choose your workspace</option><option value="employee">Employee</option><option value="hr">HR</option><option value="admin">System admin</option></select></label>
            <label className="block text-xs font-semibold text-slate-600">{form.role === "hr" ? "HR login email" : form.role === "admin" ? "Admin login email" : "Work email or employee ID"}<input required type="text" autoComplete="username" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder={form.role === "employee" ? "you@company.com or EMP-123" : "you@company.com"} className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 text-sm font-normal outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10" />{form.role === "hr" && <span className="mt-1 block text-[10px] font-normal text-slate-400">Use the HR account email and password assigned by your administrator. They are separate from your employee portal login.</span>}</label>
            <label className="block text-xs font-semibold text-slate-600">Password<input required type="password" autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Enter your password" className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 text-sm font-normal outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10" /></label>
            <div className="-mt-2 flex items-center justify-between gap-3"><button type="button" onClick={() => { setError(""); setNotice(""); setResetRole("employee"); setResetEmail(form.email.trim()); setMode("inviteOtp"); }} className="text-left text-[11px] font-semibold text-brand hover:underline">Set up employee account</button><button type="button" onClick={() => { setError(""); setNotice(""); setResetRole(form.role || "employee"); setResetEmail(form.email.trim()); setMode("forgot"); }} className="text-[11px] font-semibold text-brand hover:underline">Forgot password?</button></div>
            {error && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2.5 text-xs font-medium text-rose-700">{error}</p>}
            <button disabled={busy} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand text-sm font-bold text-white shadow-lg shadow-brand/20 transition hover:bg-[#5147d4] disabled:cursor-wait disabled:opacity-70">{busy ? "Signing you in…" : "Sign in"}{!busy && <ChevronRight size={17} />}</button>
          </form>}
          {(mode === "forgot" || mode === "verifyOtp" || mode === "inviteOtp") && <form onSubmit={mode === "forgot" ? requestReset : mode === "inviteOtp" ? verifyInviteCode : verifyResetCode} className="space-y-6">
            <label className="block text-xs font-semibold text-slate-600">Work email<input required type="email" autoComplete="email" disabled={mode === "verifyOtp" || (mode === "inviteOtp" && setupLink && Boolean(resetEmail))} value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} placeholder="you@company.com" className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 text-sm font-normal outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10 disabled:bg-slate-50 disabled:text-slate-500" /></label>
            {mode === "forgot" && <label className="block text-xs font-semibold text-slate-600">Account type<select value={resetRole} onChange={(event) => setResetRole(event.target.value)} className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-normal outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10"><option value="employee">Employee</option><option value="hr">HR</option><option value="admin">System admin</option></select><span className="mt-1 block text-[10px] font-normal text-slate-400">Choose which workspace password you want to reset.</span></label>}
            {(mode === "verifyOtp" || mode === "inviteOtp") && <label className="block text-xs font-semibold text-slate-600">{mode === "inviteOtp" ? `${setupRole === "hr" ? "HR" : "Employee"} setup code` : "6-digit verification code"}<input required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" value={mode === "inviteOtp" ? inviteCode : resetCode} onChange={(e) => mode === "inviteOtp" ? setInviteCode(e.target.value.replace(/\D/g, "").slice(0, 6)) : setResetCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="Enter the 6-digit code from your email" className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 text-center text-lg font-bold tracking-[.35em] outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10" /></label>}
            {error && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2.5 text-xs font-medium text-rose-700">{error}</p>}
            <button disabled={busy} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand text-sm font-bold text-white shadow-lg shadow-brand/20 hover:bg-[#5147d4] disabled:opacity-70">{busy ? mode === "forgot" ? "Sending code…" : "Verifying code…" : mode === "forgot" ? "Send verification code" : mode === "inviteOtp" ? "Verify setup code" : "Verify code"}<ChevronRight size={17} /></button>
            <div className="flex justify-between gap-3"><button type="button" onClick={() => { setMode("login"); setError(""); setNotice(""); }} className="text-xs font-semibold text-slate-500 hover:text-brand">Back to sign in</button>{mode === "verifyOtp" && <button type="button" onClick={() => { setMode("forgot"); setError(""); setResetCode(""); }} className="text-xs font-semibold text-brand hover:underline">Change email</button>}</div>
          </form>}
          {mode === "reset" && <form onSubmit={submitReset} className="space-y-6">
            <label className="block text-xs font-semibold text-slate-600">New password<input required minLength={8} type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="At least 8 characters" className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 text-sm font-normal outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10" /></label>
            <label className="block text-xs font-semibold text-slate-600">Confirm new password<input required minLength={8} type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Enter the password again" className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 text-sm font-normal outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10" /></label>
            {error && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2.5 text-xs font-medium text-rose-700">{error}</p>}
            <button disabled={busy} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand text-sm font-bold text-white shadow-lg shadow-brand/20 hover:bg-[#5147d4] disabled:opacity-70">{busy ? "Updating password…" : "Update password"}<ChevronRight size={17} /></button>
          </form>}
          {mode === "login" && notice && <p role="status" className="mt-4 rounded-xl bg-emerald-50 px-3 py-2.5 text-xs font-medium text-emerald-700">{notice}</p>}
          <p className="mt-8 text-center text-[10px] text-slate-400">Secure access for your people operations team.</p>
        </section>
      </div>
    </div>
  );
}
