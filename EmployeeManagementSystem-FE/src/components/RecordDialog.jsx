import { X } from "lucide-react";

export default function RecordDialog({ title, description, onClose, onSubmit, saving, error, children }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[2px]"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <form onSubmit={onSubmit} className="max-h-[92vh] w-full max-w-[680px] overflow-y-auto rounded-3xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-100 bg-white px-6 py-5">
          <div>
            <h2 className="text-base font-bold text-ink">{title}</h2>
            {description && <p className="mt-1 text-[10px] text-slate-400">{description}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close dialog" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
            <X size={17} />
          </button>
        </div>
        <div className="grid gap-5 p-6 sm:grid-cols-2">{children}</div>
        {error && <p role="alert" className="mx-6 rounded-lg bg-rose-50 px-3 py-2 text-[10px] font-semibold text-rose-700">{error}</p>}
        <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-[10px] font-bold text-slate-500 hover:bg-slate-50">Cancel</button>
          <button disabled={saving} className="rounded-xl bg-brand px-4 py-2.5 text-[10px] font-bold text-white hover:bg-[#5147d4] disabled:opacity-60">
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}
