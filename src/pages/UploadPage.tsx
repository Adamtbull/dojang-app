import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { extractPoses } from "../pose/extract";
import { warmupModelFetch } from "../pose/landmarker";
import { MovementPlayer } from "../components/MovementPlayer";
import { SaveForm } from "../components/SaveForm";
import { useLibrary } from "../hooks/useLibrary";
import { avatarFrameToBlob } from "../avatar/renderer";
import { mostDynamicFrame, boundsFromFrames } from "../pose/joints";
import { parseTags } from "../lib/cn";
import type { ExtractProgress, ExtractResult, SaveDraft } from "../types";

const ACCEPT = "video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov";

export function UploadPage() {
  const navigate = useNavigate();
  const { upsert } = useLibrary();
  const [file, setFile] = useState<File | null>(null);
  const [drag, setDrag] = useState(false);
  const [progress, setProgress] = useState<ExtractProgress | null>(null);
  const [result, setResult] = useState<ExtractResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<SaveDraft>({
    name: "",
    category: "Taekwondo",
    tags: "",
    notes: "",
  });
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    warmupModelFetch();
    return () => abortRef.current?.abort();
  }, []);

  const videoUrl = useMemo(
    () => (result ? URL.createObjectURL(result.videoBlob) : null),
    [result],
  );
  useEffect(() => () => { if (videoUrl) URL.revokeObjectURL(videoUrl); }, [videoUrl]);

  const runExtract = useCallback(async (next: File) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setFile(next);
    setResult(null);
    setError(null);
    setDraft((d) => ({ ...d, name: d.name || next.name.replace(/\.[^.]+$/, "") }));
    try {
      const extracted = await extractPoses(next, setProgress, controller.signal);
      setResult(extracted);
      setProgress(null);
    } catch (err) {
      if ((err as DOMException).name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Could not extract poses from this clip.");
      setProgress(null);
    }
  }, []);

  const onFiles = (list: FileList | null) => {
    const next = list?.[0];
    if (!next) return;
    if (!/\.(mp4|webm|mov)$/i.test(next.name) && !next.type.startsWith("video/")) {
      setError("Please choose an mp4, webm, or mov clip.");
      return;
    }
    void runExtract(next);
  };

  const save = async () => {
    if (!result || !draft.name.trim()) return;
    setBusy(true);
    try {
      const thumbIndex = mostDynamicFrame(result.keypoints);
      const thumbnail = await avatarFrameToBlob(
        result.keypoints[thumbIndex],
        480,
        640,
        boundsFromFrames(result.keypoints),
      );
      const now = Date.now();
      const id = crypto.randomUUID();
      await upsert({
        id,
        name: draft.name.trim(),
        category: draft.category,
        tags: parseTags(draft.tags),
        notes: draft.notes.trim(),
        fps: result.fps,
        width: result.width,
        height: result.height,
        keypoints: result.keypoints,
        thumbnail,
        video: result.videoBlob,
        createdAt: now,
        updatedAt: now,
      });
      navigate(`/library/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save this movement.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4 pb-6">
      <header>
        <h1 className="font-display text-4xl text-ink">Upload</h1>
        <p className="text-sm text-muted">Clips stay on your phone. Pose runs in the browser.</p>
      </header>

      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          onFiles(e.dataTransfer.files);
        }}
        className={`block cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center ${
          drag ? "border-dojang-teal bg-dojang-teal/10" : "border-navy-line bg-navy-card"
        }`}
      >
        <input
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => onFiles(e.target.files)}
        />
        <p className="font-semibold">Drop a clip or tap to choose</p>
        <p className="mt-1 text-sm text-muted">mp4 · webm · mov · a few seconds is enough</p>
        {file && <p className="mt-3 text-xs text-dojang-teal">{file.name}</p>}
      </label>

      {progress && (
        <section className="rounded-2xl border border-navy-line/70 bg-navy-card p-4">
          <div className="mb-2 flex justify-between text-xs uppercase tracking-wider text-muted">
            <span>{progress.message}</span>
            <span>{Math.round(progress.ratio * 100)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-navy">
            <div
              className="h-full rounded-full bg-dojang-teal transition-[width]"
              style={{ width: `${Math.round(progress.ratio * 100)}%` }}
            />
          </div>
        </section>
      )}

      {error && (
        <p className="rounded-2xl border border-dojang-red/40 bg-dojang-red/10 p-3 text-sm text-dojang-red">
          {error}
        </p>
      )}

      {result && (
        <>
          <MovementPlayer frames={result.keypoints} fps={result.fps} videoUrl={videoUrl} />
          <SaveForm value={draft} onChange={setDraft} onSubmit={() => void save()} busy={busy} />
        </>
      )}
    </div>
  );
}
