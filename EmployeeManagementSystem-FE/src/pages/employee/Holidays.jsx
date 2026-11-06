import { useCallback, useEffect, useState } from "react";
import { api, getRows } from "../../api.js";
import { dateLabel } from "../../utils/formatters.js";
import HolidayCalendar from "../../components/HolidayCalendar.jsx";
import { ErrorBanner } from "../../components/ui.jsx";
import RecordTable from "../../components/RecordTable.jsx";

export default function Holidays() {
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const loadHolidays = useCallback(async () => {
    setLoading(true); setError("");
    try { setHolidays(getRows(await api("/holidays"), "holidays")); }
    catch (requestError) { setError(requestError.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { loadHolidays(); }, [loadHolidays]);
  return <div className="space-y-6">
    <div><p className="text-[11px] font-bold uppercase tracking-[.16em] text-brand">Your workspace</p><h1 className="mt-2 text-[27px] font-bold tracking-tight text-ink">Holidays</h1><p className="mt-1 text-xs text-slate-400">Upcoming company holidays.</p></div>
    {error && <ErrorBanner message={error} retry={loadHolidays} />}
    {!loading && <HolidayCalendar holidays={holidays} />}
    <RecordTable title="Company holidays" rows={holidays} loading={loading} error="" search={search} onSearch={setSearch} columns={[
      { label: "Holiday", render: (row) => <span className="font-semibold text-ink">{row.name}</span> },
      { label: "Date", render: (row) => dateLabel(row.holiday_date) },
      { label: "Description", render: (row) => row.description || "—" }
    ]} />
  </div>;
}
