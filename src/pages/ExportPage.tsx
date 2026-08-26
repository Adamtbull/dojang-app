import { useState } from "react";
import { useLibrary } from "../hooks/useLibrary";
import { downloadBlob, slugify, zipLibrary, zipMovement } from "../data/exportZip";

export function ExportPage() {
  const { movements } = useLibrary();
  const [status, setStatus] = useState<string | null>(null);

  const exportAll = async () => {
    if (movements.length === 0) return;
    setStatus("Packing library…");
    const blob = await zipLibrary(movements);
    downloadBlob(blob, `dojang-library-${new Date().toISOString().slice(0, 10)}.zip`);
    setStatus(`Saved ${movements.length} movements.`);
  };

  const exportOne = async (id: string, name: string) => {
    const row = movements.find((m) => m.id === id);
    if (!row) return;
    setStatus(`Packing ${name}…`);
    const blob = await zipMovement(row);
    downloadBlob(blob, `${slugify(name)}.zip`);
    setStatus(`Saved ${name}.`);
  };

  return (
    <div className="space-y-4 pb-6">
      <header>
        <h1 className="font-display text-4xl text-ink">Export</h1>
        <p className="text-sm text-muted">
          ZIP files include manifest.json, metadata.json, and per-frame BODY_25 JSON.
        </p>
      </header>

      <button
        type="button"
        disabled={movements.length === 0}
        onClick={() => void exportAll()}
        className="w-full rounded-2xl bg-dojang-red py-3 text-sm font-semibold text-white disabled:opacity-40"
      >
        Download whole library
      </button>

      {status && <p className="text-sm text-dojang-teal">{status}</p>}

      <ul className="space-y-2">
        {movements.map((m) => (
          <li
            key={m.id}
            className="flex items-center justify-between rounded-2xl border border-navy-line/70 bg-navy-card px-4 py-3"
          >
            <div>
              <p className="text-sm font-semibold">{m.name}</p>
              <p className="text-[11px] uppercase tracking-wider text-muted">
                {m.category} · {m.keypoints.length} frames
              </p>
            </div>
            <button
              type="button"
              onClick={() => void exportOne(m.id, m.name)}
              className="rounded-xl bg-navy-lift px-3 py-2 text-xs font-semibold text-dojang-teal"
            >
              ZIP
            </button>
          </li>
        ))}
      </ul>

      {movements.length === 0 && (
        <p className="text-sm text-muted">Save a movement first, then export it here.</p>
      )}
    </div>
  );
}
