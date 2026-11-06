import { useState } from "react";
import { Check } from "lucide-react";
import { api } from "../api.js";
import { dateTimeLabel, localDateKey } from "../utils/formatters.js";

export default function AttendanceControls({ onDone, attendance }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const todayAttendance = attendance.find((row) => String(row.work_date).slice(0, 10) === localDateKey());
  const canCheckIn = !todayAttendance?.check_in;
  const canCheckOut = Boolean(todayAttendance?.check_in) && !todayAttendance?.check_out;
  const mark = async (kind) => {
    setBusy(true); setMessage("");
    try { await api(`/attendance/${kind}`, { method: "POST", body: {} }); setMessage(kind === "check-in" ? "You’re checked in." : "You’re checked out."); onDone(); }
    catch (err) { setMessage(err.message); } finally { setBusy(false); }
  };
  return <div className="flex flex-wrap items-center gap-2">
    {todayAttendance?.check_in && <span className="hidden text-[9px] text-slate-500 xl:inline">In {dateTimeLabel(todayAttendance.check_in)}{todayAttendance.check_out ? ` · Out ${dateTimeLabel(todayAttendance.check_out)}` : ""}</span>}
    <button disabled={busy || !canCheckIn} onClick={() => mark("check-in")} className="rounded-xl bg-emerald-700 px-3 py-2.5 text-[10px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-45">Check in</button>
    <button disabled={busy || !canCheckOut} onClick={() => mark("check-out")} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[10px] font-bold text-slate-600 disabled:cursor-not-allowed disabled:opacity-45">Check out</button>
    {!canCheckIn && !canCheckOut && <span className="text-[9px] font-semibold text-emerald-700">Day completed</span>}
    {message && <span role="status" className="text-[9px] text-slate-500">{message}</span>}
  </div>;
}
