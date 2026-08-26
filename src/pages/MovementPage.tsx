import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useLibrary } from "../hooks/useLibrary";
import { MovementPlayer } from "../components/MovementPlayer";
import { KeyframeInspector } from "../components/KeyframeInspector";
import { SaveForm } from "../components/SaveForm";
import { emptyKeypoints } from "../pose/joints";
import { parseTags } from "../lib/cn";
import { downloadBlob, slugify, zipMovement } from "../data/exportZip";
import type { MovementRecord, SaveDraft } from "../types";

export function MovementPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { byId, upsert, remove } = useLibrary();
  const [record, setRecord] = useState<MovementRecord | null>(null);
  const [missing, setMissing] = useState(false);
  const [draft, setDraft] = useState<SaveDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (!id) return;
    void byId(id).then((row) => {
      if (!row) {
        setMissing(true);
        return;
      }
      setRecord(row);
      setDraft({
        name: row.name,
        category: row.category,
        tags: row.tags.join(", "),
        notes: row.notes,
      });
    });
  }, [id, byId]);

  const videoUrl = useMemo(
    () => (record?.video ? URL.createObjectURL(record.video) : null),
    [record],
  );
  useEffect(() => () => { if (videoUrl) URL.revokeObjectURL(videoUrl); }, [videoUrl]);

  if (missing) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted">That movement is not on this device.</p>
        <Link to="/library" className="text-dojang-teal">
          Back to library
        </Link>
      </div>
    );
  }

  if (!record || !draft) {
    return <p className="text-sm text-muted">Loading movement…</p>;
  }

  const keypoints = record.keypoints[frame] ?? emptyKeypoints();

  const saveEdits = async () => {
    setBusy(true);
    const next: MovementRecord = {
      ...record,
      name: draft.name.trim() || record.name,
      category: draft.category,
      tags: parseTags(draft.tags),
      notes: draft.notes.trim(),
      updatedAt: Date.now(),
    };
    await upsert(next);
    setRecord(next);
    setBusy(false);
  };

  const onDelete = async () => {
    if (!confirm(`Delete “${record.name}”? This cannot be undone.`)) return;
    await remove(record.id);
    navigate("/library");
  };

  const onExport = async () => {
    const blob = await zipMovement(record);
    downloadBlob(blob, `${slugify(record.name)}.zip`);
  };

  return (
    <div className="space-y-4 pb-8">
      <header>
        <p className="text-xs uppercase tracking-[0.18em] text-dojang-teal">{record.category}</p>
        <h1 className="font-display text-4xl text-ink">{record.name}</h1>
        {record.tags.length > 0 && (
          <p className="mt-1 text-xs text-muted">{record.tags.map((t) => `#${t}`).join(" ")}</p>
        )}
      </header>

      <MovementPlayer
        frames={record.keypoints}
        fps={record.fps}
        videoUrl={videoUrl}
        onFrameChange={setFrame}
      />

      <KeyframeInspector keypoints={keypoints} frame={frame} />

      {record.notes && (
        <p className="rounded-2xl border border-navy-line/70 bg-navy-card p-4 text-sm text-muted">
          {record.notes}
        </p>
      )}

      <SaveForm
        value={draft}
        onChange={setDraft}
        onSubmit={() => void saveEdits()}
        submitLabel="Save edits"
        busy={busy}
      />

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => void onExport()}
          className="rounded-2xl bg-dojang-teal/20 py-3 text-sm font-semibold text-dojang-teal"
        >
          Export ZIP
        </button>
        <button
          type="button"
          onClick={() => void onDelete()}
          className="rounded-2xl bg-dojang-red/15 py-3 text-sm font-semibold text-dojang-red"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
