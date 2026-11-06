import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, PartyPopper } from "lucide-react";
import { dateLabel, localDateKey } from "../utils/formatters.js";

const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function HolidayCalendar({ holidays }) {
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(localDateKey());
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const monthHolidays = useMemo(() => {
    const map = new Map();
    holidays.forEach((holiday) => {
      const key = String(holiday.holiday_date || "").slice(0, 10);
      if (!key.startsWith(`${year}-${String(month + 1).padStart(2, "0")}-`)) return;
      map.set(key, [...(map.get(key) || []), holiday]);
    });
    return map;
  }, [holidays, month, year]);
  const days = new Date(year, month + 1, 0).getDate();
  const leadingDays = new Date(year, month, 1).getDay();
  const selectedHolidays = holidays.filter((holiday) => String(holiday.holiday_date || "").slice(0, 10) === selectedDate);

  return <section className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-card">
    <div className="flex flex-col gap-4 bg-gradient-to-r from-violet-700 via-indigo-600 to-blue-500 px-5 py-5 text-white sm:flex-row sm:items-center sm:justify-between sm:px-7">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[.18em] text-white/70">Company calendar</p>
        <h2 className="mt-1 text-xl font-bold">{visibleMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</h2>
        <p className="mt-1 text-[11px] text-white/75">Select a date to view its holiday details.</p>
      </div>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => setVisibleMonth(new Date(year, month - 1, 1))} aria-label="Previous month" className="grid h-9 w-9 place-items-center rounded-xl bg-white/15 transition hover:bg-white/25"><ChevronLeft size={17} /></button>
        <button type="button" onClick={() => setVisibleMonth(new Date())} className="rounded-xl bg-white/15 px-3 py-2 text-[10px] font-bold transition hover:bg-white/25">Today</button>
        <button type="button" onClick={() => setVisibleMonth(new Date(year, month + 1, 1))} aria-label="Next month" className="grid h-9 w-9 place-items-center rounded-xl bg-white/15 transition hover:bg-white/25"><ChevronRight size={17} /></button>
      </div>
    </div>
    <div className="p-4 sm:p-6">
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {weekDays.map((day) => <div key={day} className="pb-2 text-center text-[9px] font-bold uppercase tracking-wide text-slate-400">{day}</div>)}
        {Array.from({ length: leadingDays }, (_, index) => <div aria-hidden="true" key={`empty-${index}`} className="min-h-16 rounded-xl bg-slate-50/60 sm:min-h-24" />)}
        {Array.from({ length: days }, (_, index) => {
          const day = index + 1;
          const date = localDateKey(new Date(year, month, day));
          const dayHolidays = monthHolidays.get(date) || [];
          const selected = selectedDate === date;
          const today = localDateKey() === date;
          return <button type="button" key={date} onClick={() => setSelectedDate(date)} className={`min-h-16 rounded-xl border p-1.5 text-left transition sm:min-h-24 sm:p-2 ${selected ? "border-violet-400 bg-violet-50 ring-2 ring-violet-100" : dayHolidays.length ? "border-amber-100 bg-amber-50/70 hover:border-amber-300" : "border-slate-100 bg-white hover:bg-slate-50"} ${today ? "ring-1 ring-inset ring-indigo-300" : ""}`}>
            <span className={`grid h-6 w-6 place-items-center rounded-full text-[10px] font-bold ${today ? "bg-indigo-600 text-white" : selected ? "bg-violet-600 text-white" : "text-slate-600"}`}>{day}</span>
            {dayHolidays.slice(0, 2).map((holiday) => <span key={holiday.id} className="mt-1 block truncate rounded-md bg-amber-100 px-1 py-0.5 text-[8px] font-semibold text-amber-800 sm:text-[9px]">{holiday.name}</span>)}
            {dayHolidays.length > 2 && <span className="mt-0.5 block text-[8px] text-amber-700">+{dayHolidays.length - 2} more</span>}
          </button>;
        })}
      </div>
      <div className="mt-5 flex items-start gap-3 rounded-2xl bg-slate-50 p-4">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700"><PartyPopper size={17} /></span>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Selected date</p>
          <p className="mt-1 text-xs font-bold text-ink">{dateLabel(selectedDate)}</p>
          {selectedHolidays.length
            ? selectedHolidays.map((holiday) => <p key={holiday.id} className="mt-1 text-[11px] text-amber-800">{holiday.name}{holiday.description ? ` · ${holiday.description}` : ""}</p>)
            : <p className="mt-1 text-[10px] text-slate-400">No holiday on this date.</p>}
        </div>
      </div>
    </div>
  </section>;
}
