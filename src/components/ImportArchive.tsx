import { useRef, useState } from "react";
import JSZip from "jszip";
import { useLibrary } from "../hooks/useLibrary";
import { avatarFrameToBlob } from "../avatar/renderer";
import { boundsFromFrames, mostDynamicFrame } from "../pose/joints";
import { draftToRecord, importFile } from "../data/importZip";
import { openPoseFrameDocument, openPoseFrameFileName } from "../pose/openpose";
import { sampleFrontKick } from "../pose/readyStance";
import { cn } from "../lib/cn";

const ACCEPT = ".zip,.json,application/zip,application/json";

export function ImportArchiveControl({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const { upsertMany } = useLibrary();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ingest = async (file: File) => {
    setBusy(true);
    setError(null);
    setStatus("Reading archive…");
    try {
      const result = await importFile(file);
      if (result.kind === "openpose-source" || result.kind === "empty") {
        setError(result.message);
        setStatus(null);
        return;
      }
      const records = [];
      for (const draft of result.drafts) {
        const thumbIndex = mostDynamicFrame(draft.keypoints);
        const thumbnail = await avatarFrameToBlob(
          draft.keypoints[thumbIndex],
          480,
          640,
          boundsFromFrames(draft.keypoints),
        );
        records.push(draftToRecord(draft, thumbnail));
      }
      await upsertMany(records);
      const label = result.source === "openpose" ? "OpenPose BODY_25" : "Dojang";
      setStatus(`Imported ${records.length} ${records.length === 1 ? "movement" : "movements"} from ${label}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not import that file.");
      setStatus(null);
    } finally {
      setBusy(false);
    }
  };

  const loadSample = async () => {
    setBusy(true);
    setError(null);
    setStatus("Building a BODY_25 sample zip…");
    try {
      const frames = sampleFrontKick(48);
      const zip = new JSZip();
      frames.forEach((kp, i) => {
        zip.file(
          openPoseFrameFileName(i),
          JSON.stringify(openPoseFrameDocument(kp, { width: 600, height: 1000 })),
        );
      });
      const blob = await zip.generateAsync({ type: "blob" });
      const file = new File([blob], "openpose-ap-chagi.zip", { type: "application/zip" });
      await ingest(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not build the sample.");
      setStatus(null);
      setBusy(false);
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void ingest(file);
        }}
      />
      <div className={cn("grid gap-2", compact ? "grid-cols-1" : "grid-cols-2")}>
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="rounded-2xl bg-dojang-teal/20 py-3 text-sm font-semibold text-dojang-teal disabled:opacity-40"
        >
          {busy ? "Importing…" : "Import ZIP or JSON"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void loadSample()}
          className="rounded-2xl border border-navy-line bg-navy-card py-3 text-sm font-semibold text-ink disabled:opacity-40"
        >
          Try OpenPose sample
        </button>
      </div>
      <p className="text-xs leading-relaxed text-muted">
        Drop OpenPose <code className="text-ink">--write_json</code> output, a Dojang export, or
        BODY_25 <code className="text-ink">pose_keypoints_2d</code> JSON. The OpenPose C++ master zip
        is source code — it cannot run in the browser.
      </p>
      {status && <p className="text-sm text-dojang-teal">{status}</p>}
      {error && (
        <p className="rounded-2xl border border-dojang-red/40 bg-dojang-red/10 p-3 text-sm text-dojang-red">{error}</p>
      )}
    </div>
  );
}
