const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function AttendancePeriodFilters({ value, onChange }) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: Math.max(currentYear - 2015 + 1, 1) }, (_, index) => currentYear - index);

  return <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-100 bg-white p-4">
    <label className="text-[10px] font-bold text-slate-600">Year
      <select value={value.year} onChange={(event) => onChange({ ...value, year: event.target.value, date: "" })} className="mt-1.5 block h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-normal">
        {years.map((year) => <option key={year} value={year}>{year}</option>)}
      </select>
    </label>
    <label className="text-[10px] font-bold text-slate-600">Month
      <select value={value.month} onChange={(event) => onChange({ ...value, month: event.target.value, date: "" })} className="mt-1.5 block h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-normal">
        <option value="">All months</option>
        {monthNames.map((month, index) => <option key={month} value={index + 1}>{month}</option>)}
      </select>
    </label>
    <label className="text-[10px] font-bold text-slate-600">Specific date (optional)
      <input type="date" value={value.date} onChange={(event) => onChange({ ...value, date: event.target.value })} className="mt-1.5 block h-10 rounded-xl border border-slate-200 px-3 text-xs font-normal" />
    </label>
    <p className="pb-2 text-[10px] text-slate-400">Days without check-in and check-out show as absent.</p>
  </div>;
}
