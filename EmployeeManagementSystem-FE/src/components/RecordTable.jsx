import { Search } from "lucide-react";
import { EmptyState } from "./ui.jsx";

export default function RecordTable({ title, rows, columns, loading, error, search, onSearch, emptyTitle }) {
  const filtered = rows.filter((row) =>
    JSON.stringify(row).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xs font-bold text-ink">{title}</h2>
          <p className="mt-1 text-[10px] text-slate-400">{filtered.length} records found</p>
        </div>
        <label className="flex h-9 w-full items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 sm:w-[260px]">
          <Search size={14} className="text-slate-400" />
          <input
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder={`Search ${title.toLowerCase()}...`}
            className="w-full bg-transparent text-[10px] outline-none placeholder:text-slate-400"
          />
        </label>
      </div>
      <div className="scrollbar-thin overflow-x-auto">
        <table className="w-full min-w-[640px] text-left">
          <thead>
            <tr className="bg-slate-50/70">
              {columns.map((column) => (
                <th key={column.label} className="px-5 py-3 text-[9px] font-bold uppercase tracking-[.1em] text-slate-400">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              <tr><td colSpan={columns.length} className="px-5 py-12 text-center text-xs text-slate-400">Loading {title.toLowerCase()}…</td></tr>
            ) : error ? (
              <tr><td colSpan={columns.length} className="px-5 py-12 text-center text-xs text-rose-600">{error}</td></tr>
            ) : filtered.length ? filtered.map((row, index) => (
              <tr key={row.id ?? index} className="transition hover:bg-slate-50/60">
                {columns.map((column) => (
                  <td key={column.label} className="max-w-[280px] px-5 py-3.5 text-[11px] text-slate-600">
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            )) : (
              <tr><td colSpan={columns.length}><EmptyState title={emptyTitle || "No records found"} detail="Try changing your search or add a new record." /></td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
