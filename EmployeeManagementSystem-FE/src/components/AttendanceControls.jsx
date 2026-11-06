import { useState } from "react";
import { api } from "../api.js";
import { dateTimeLabel, localDateKey } from "../utils/formatters.js";

export default function AttendanceControls({ onDone, attendance }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const todayAttendance = attendance.find((row) => String(row.work_date).slice(0, 10) === localDateKey());
  const canCheckIn = !todayAttendance?.check_in;
  const canCheckOut = Boolean(todayAttendance?.check_in) && !todayAttendance?.check_out;
  const dayCompleted = Boolean(todayAttendance?.check_in && todayAttendance?.check_out);
  const mark = async (kind) => {
    setBusy(true); setMessage("");
    try { await api(`/attendance/${kind}`, { method: "POST", body: {} }); setMessage(kind === "check-in" ? "You’re checked in." : "You’re checked out."); await onDone(); }
    catch (err) { setMessage(err.message); } finally { setBusy(false); }
  };
  return <div className="flex flex-wrap items-center gap-2">
    {todayAttendance?.check_in && <span className="text-[10px] text-slate-500">In {dateTimeLabel(todayAttendance.check_in)}{todayAttendance.check_out ? ` · Out ${dateTimeLabel(todayAttendance.check_out)}` : ""}</span>}
    {canCheckIn && <button disabled={busy} onClick={() => mark("check-in")} className="rounded-xl bg-emerald-700 px-4 py-2.5 text-[10px] font-bold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-wait disabled:opacity-60">{busy ? "Checking in…" : "Check in"}</button>}
    {canCheckOut && <button disabled={busy} onClick={() => mark("check-out")} className="rounded-xl bg-brand px-4 py-2.5 text-[10px] font-bold text-white shadow-sm transition hover:bg-[#5147d4] disabled:cursor-wait disabled:opacity-60">{busy ? "Checking out…" : "Check out"}</button>}
    {dayCompleted && <span className="rounded-xl bg-emerald-50 px-3 py-2.5 text-[10px] font-bold text-emerald-700">Today completed</span>}
    {message && <span role="status" className="text-[9px] text-slate-500">{message}</span>}
  </div>;
}
