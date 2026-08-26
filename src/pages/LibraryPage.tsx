import { useMemo, useState } from "react";
import { CATEGORIES } from "../types";
import { useLibrary } from "../hooks/useLibrary";
import { MovementCard } from "../components/MovementCard";
import { cn } from "../lib/cn";
import { Link } from "react-router-dom";

export function LibraryPage() {
  const { movements, loading } = useLibrary();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("All");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return movements.filter((m) => {
      if (category !== "All" && m.category !== category) return false;
      if (!q) return true;
      const hay = `${m.name} ${m.category} ${m.tags.join(" ")} ${m.notes}`.toLowerCase();
      return hay.includes(q);
    });
  }, [movements, query, category]);

  return (
    <div className="space-y-4 pb-6">
      <header>
        <h1 className="font-display text-4xl text-ink">Library</h1>
        <p className="text-sm text-muted">{movements.length} saved on this device</p>
      </header>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search names, tags, notes"
        className="w-full rounded-2xl border border-navy-line bg-navy-card px-4 py-3 text-ink outline-none focus:border-dojang-teal"
      />

      <div className="no-scrollbar flex gap-2 overflow-x-auto">
        {["All", ...CATEGORIES].map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategory(cat)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wide",
              category === cat ? "bg-dojang-red text-white" : "bg-navy-card text-muted",
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-muted">Opening library…</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-navy-line/70 bg-navy-card p-6 text-center">
          <p className="font-semibold">No movements yet</p>
          <p className="mt-1 text-sm text-muted">Upload a clip to start your dojang.</p>
          <Link
            to="/upload"
            className="mt-4 inline-flex rounded-2xl bg-dojang-red px-4 py-2 text-sm font-semibold text-white"
          >
            Upload
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((m) => (
            <MovementCard key={m.id} movement={m} />
          ))}
        </div>
      )}
    </div>
  );
}
