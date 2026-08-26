import type { FormEvent } from "react";
import { CATEGORIES, type Category, type SaveDraft } from "../types";
import { cn } from "../lib/cn";

interface SaveFormProps {
  value: SaveDraft;
  onChange: (next: SaveDraft) => void;
  onSubmit: () => void;
  submitLabel?: string;
  busy?: boolean;
}

export function SaveForm({
  value,
  onChange,
  onSubmit,
  submitLabel = "Save to library",
  busy,
}: SaveFormProps) {
  const handle = (e: FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <form onSubmit={handle} className="space-y-3 rounded-2xl border border-navy-line/70 bg-navy-card p-4">
      <h2 className="font-display text-2xl text-ink">Name & save</h2>
      <label className="block">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">
          Movement name
        </span>
        <input
          required
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
          placeholder="Dollyo chagi"
          className="w-full rounded-xl border border-navy-line bg-navy px-3 py-3 text-ink outline-none focus:border-dojang-red"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">
          Category
        </span>
        <div className="grid grid-cols-2 gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => onChange({ ...value, category: cat as Category })}
              className={cn(
                "rounded-xl px-3 py-2 text-sm font-medium",
                value.category === cat
                  ? "bg-dojang-red text-white"
                  : "bg-navy-lift text-muted",
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">
          Tags
        </span>
        <input
          value={value.tags}
          onChange={(e) => onChange({ ...value, tags: e.target.value })}
          placeholder="kick, right, yellow-belt"
          className="w-full rounded-xl border border-navy-line bg-navy px-3 py-3 text-ink outline-none focus:border-dojang-teal"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">
          Notes
        </span>
        <textarea
          value={value.notes}
          onChange={(e) => onChange({ ...value, notes: e.target.value })}
          rows={3}
          placeholder="Chamber higher. Keep the standing foot planted."
          className="w-full resize-none rounded-xl border border-navy-line bg-navy px-3 py-3 text-ink outline-none focus:border-dojang-teal"
        />
      </label>
      <button
        type="submit"
        disabled={busy || !value.name.trim()}
        className="w-full rounded-2xl bg-dojang-red py-3 text-sm font-semibold text-white disabled:opacity-50"
      >
        {busy ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
