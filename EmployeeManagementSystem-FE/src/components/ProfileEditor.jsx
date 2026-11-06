import { useEffect, useState } from "react";
import { Check, ShieldCheck, UserRound } from "lucide-react";
import { api } from "../api.js";
import { dateLabel } from "../utils/formatters.js";
import { ErrorBanner, ProfileFact, ProfileInput } from "./ui.jsx";
import EmployeeAvatar from "./EmployeeAvatar.jsx";

export default function ProfileEditor({ user }) {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({
    name: user.name,
    phone: "",
    address: "",
    emergency_contact_name: "",
    emergency_contact_phone: ""
  });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => { api("/profile").then((result) => { setProfile(result.profile); setForm({ name: result.profile.name || "", phone: result.profile.phone || "", address: result.profile.address || "", emergency_contact_name: result.profile.emergency_contact_name || "", emergency_contact_phone: result.profile.emergency_contact_phone || "" }); }).catch((err) => setError(err.message)).finally(() => setLoading(false)); }, []);
  const save = async (event) => {
    event.preventDefault(); setError(""); setNotice("");
    try { await api("/profile", { method: "PATCH", body: form }); setNotice("Profile updated successfully."); }
    catch (err) { setError(err.message); }
  };
  const roleLabel = {
    admin: "Workspace administrator",
    hr: "HR team member",
    employee: "Employee"
  }[profile?.role || user.role] || "Team member";
  const employeeFacts = [
    profile?.employee_code && { label: "Employee ID", value: profile.employee_code },
    profile?.department && { label: "Department", value: profile.department },
    profile?.designation && { label: "Job title", value: profile.designation },
    profile?.joining_date && { label: "Joined", value: dateLabel(profile.joining_date) },
    profile?.annual_paid_leave_days !== undefined && { label: "Paid leave / year", value: `${profile.annual_paid_leave_days} days` },
    profile?.bank_account_masked && { label: "Bank account", value: profile.bank_account_masked },
    profile?.status && { label: "Employment status", value: profile.status }
  ].filter(Boolean);
  return <div className="space-y-6"><div><p className="text-[11px] font-bold uppercase tracking-[.16em] text-brand">Your account</p><h1 className="mt-2 text-[27px] font-bold tracking-tight text-ink">My profile</h1><p className="mt-1 text-xs text-slate-400">Your personal details and account information.</p></div>
    {error && <ErrorBanner message={error} />}{notice && <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700">{notice}</p>}
    {loading ? <p className="p-8 text-center text-xs text-slate-400">Loading profile…</p> : <div className="grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
      <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card">
        <div className="h-24 bg-gradient-to-r from-violet-500 via-brand to-indigo-400" />
        <div className="px-6 pb-6">
          <EmployeeAvatar endpoint="/profile/photo" hasPhoto={profile?.has_profile_image} name={profile?.name} className="-mt-10 h-[76px] w-[76px] rounded-[24px] border-4 border-white text-2xl text-brand shadow-sm" />
          <h2 className="mt-4 text-lg font-bold tracking-tight text-ink">{profile?.name || "Your profile"}</h2>
          <p className="mt-1 break-all text-xs text-slate-400">{profile?.email || "Email not available"}</p>
          {profile?.employee_email && profile.employee_email.toLowerCase() !== profile.email?.toLowerCase() && <p className="mt-1 break-all text-[10px] text-slate-400">Employee work email · {profile.employee_email}</p>}
          <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1.5 text-[10px] font-bold text-brand"><ShieldCheck size={13} />{roleLabel}</span>
          {employeeFacts.length > 0 && <div className="mt-6 border-t border-slate-100 pt-4"><p className="mb-3 text-[10px] font-bold uppercase tracking-[.12em] text-slate-400">Employment details</p><div className="grid grid-cols-2 gap-2">{employeeFacts.map((fact) => <ProfileFact key={fact.label} label={fact.label} value={fact.value} />)}</div></div>}
          {employeeFacts.length === 0 && <div className="mt-6 rounded-xl bg-slate-50 p-3.5"><p className="text-[10px] font-semibold text-slate-600">Account access</p><p className="mt-1 text-[10px] leading-5 text-slate-400">Your role controls which workspace tools and information you can access.</p></div>}
        </div>
      </section>
      <form onSubmit={save} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card sm:p-7">
        <div className="flex items-start gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-50 text-brand"><UserRound size={17} /></span><div><h2 className="text-sm font-bold text-ink">Personal information</h2><p className="mt-1 text-[10px] text-slate-400">Keep your account details up to date.</p></div></div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2"><ProfileInput label="Full name" value={form.name} onChange={(name) => setForm({ ...form, name })} placeholder="Enter your name" /><ProfileInput label="Login email" value={profile?.email || ""} disabled /><ProfileInput label="Employee work email" value={profile?.employee_email || "No linked employee profile"} disabled /><ProfileInput label="Phone number" value={form.phone} onChange={(phone) => setForm({ ...form, phone })} placeholder="Add a phone number (optional)" /><ProfileInput label="Workspace role" value={roleLabel} disabled /><ProfileInput label="Emergency contact" value={form.emergency_contact_name} onChange={(emergency_contact_name) => setForm({ ...form, emergency_contact_name })} placeholder="Contact name (optional)" /><ProfileInput label="Emergency contact phone" value={form.emergency_contact_phone} onChange={(emergency_contact_phone) => setForm({ ...form, emergency_contact_phone })} placeholder="Phone number (optional)" /><label className="block text-[10px] font-bold text-slate-600 sm:col-span-2">Home address<textarea rows={3} value={form.address || ""} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Add your home address (optional)" className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-normal outline-none transition placeholder:text-slate-300 focus:border-brand focus:ring-4 focus:ring-brand/10" /></label></div>
        <div className="mt-6 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between"><p className="text-[10px] leading-4 text-slate-400">Your work email and role are managed by your administrator.</p><button className="shrink-0 rounded-xl bg-brand px-4 py-2.5 text-[10px] font-bold text-white shadow-sm shadow-brand/20 transition hover:bg-[#5147d4]"><Check size={13} className="mr-1.5 inline" />Save changes</button></div>
      </form>
    </div>}
  </div>;
}
