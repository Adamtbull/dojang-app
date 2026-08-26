import { useState } from "react";
import { useLibrary } from "../hooks/useLibrary";
import { downloadBlob, slugify, zipLibrary, zipMovement, zipOpenPoseJson } from "../data/exportZip";
import { ImportArchiveControl } from "../components/ImportArchive";

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

  const exportOpenPose = async (id: string, name: string) => {
    const row = movements.find((m) => m.id === id);
    if (!row) return;
    setStatus(`Packing OpenPose JSON for ${name}…`);
    const blob = await zipOpenPoseJson(row);
    downloadBlob(blob, `${slugify(name)}-openpose.zip`);
    setStatus(`Saved OpenPose JSON for ${name}.`);
  };

  return (
    <div className="space-y-4 pb-6">
      <header>
        <h1 className="font-display text-4xl text-ink">Export</h1>
        <p className="text-sm text-muted">
          Dojang ZIPs include per-frame BODY_25 JSON plus an <code className="text-ink">openpose/</code> folder
          that matches OpenPose <code className="text-ink">--write_json</code>.
        </p>
      </header>

      <ImportArchiveControl />

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
            className="flex items-center justify-between gap-2 rounded-2xl border border-navy-line/70 bg-navy-card px-4 py-3"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{m.name}</p>
              <p className="text-[11px] uppercase tracking-wider text-muted">
                {m.category} · {m.keypoints.length} frames
              </p>
            </div>
            <div className="flex shrink-0 gap-1">
              <button
                type="button"
                onClick={() => void exportOne(m.id, m.name)}
                className="rounded-xl bg-navy-lift px-3 py-2 text-xs font-semibold text-dojang-teal"
              >
                ZIP
              </button>
              <button
                type="button"
                onClick={() => void exportOpenPose(m.id, m.name)}
                className="rounded-xl bg-navy-lift px-3 py-2 text-xs font-semibold text-ink"
              >
                OpenPose
              </button>
            </div>
          </li>
        ))}
      </ul>

      {movements.length === 0 && (
        <p className="text-sm text-muted">Save a movement first, then export it here.</p>
      )}
    </div>
  );
}
