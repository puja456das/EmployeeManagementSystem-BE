import { useCallback, useEffect, useState } from "react";
import { api, getRows } from "../../api.js";
import { dateLabel } from "../../utils/formatters.js";
import { ErrorBanner } from "../../components/ui.jsx";
import RecordTable from "../../components/RecordTable.jsx";

export default function Announcements() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const loadAnnouncements = useCallback(async () => {
    setLoading(true); setError("");
    try { setAnnouncements(getRows(await api("/announcements"), "announcements")); }
    catch (requestError) { setError(requestError.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { loadAnnouncements(); }, [loadAnnouncements]);

  return <div className="space-y-6">
    <div><p className="text-[11px] font-bold uppercase tracking-[.16em] text-brand">Your workspace</p><h1 className="mt-2 text-[27px] font-bold tracking-tight text-ink">Announcements</h1><p className="mt-1 text-xs text-slate-400">Updates from your company.</p></div>
    {error && <ErrorBanner message={error} retry={loadAnnouncements} />}
    <RecordTable title="Company announcements" rows={announcements} loading={loading} error="" search={search} onSearch={setSearch} columns={[
      { label: "Title", render: (row) => <span className="font-semibold text-ink">{row.title}</span> },
      { label: "Message", render: (row) => <span className="line-clamp-3" title={row.body}>{row.body}</span> },
      { label: "Published", render: (row) => dateLabel(row.published_at) },
      { label: "Expires", render: (row) => dateLabel(row.expires_at) }
    ]} />
  </div>;
}
