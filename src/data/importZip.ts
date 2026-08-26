import JSZip from "jszip";
import type { Category, MovementRecord } from "../types";
import { CATEGORIES } from "../types";
import {
  framesFromUnknown,
  isOpenPoseSourceTree,
  looksLikeOpenPoseFrame,
  normalizeArchivePath,
  OPENPOSE_SOURCE_MESSAGE,
  rescaleOpenPoseSequence,
} from "../pose/openpose";
import { KEYPOINT_LENGTH } from "../pose/landmarks";
import { isEmptyFrame } from "../pose/joints";
import { slugify } from "./exportZip";

export type ImportKind = "dojang" | "openpose" | "openpose-source" | "empty";

export interface ImportedDraft {
  name: string;
  category: Category;
  tags: string[];
  notes: string;
  fps: number;
  width: number;
  height: number;
  keypoints: number[][];
  video?: Blob;
  source: "mediapipe" | "openpose" | "dojang";
}

export type ArchiveImportResult =
  | { kind: "movements"; source: "dojang" | "openpose"; drafts: ImportedDraft[] }
  | { kind: "openpose-source"; message: string }
  | { kind: "empty"; message: string };

interface ZipEntry {
  path: string;
  text?: string;
  blob?: Blob;
}

const VIDEO_EXT = /\.(mp4|webm|mov)$/i;

function isJsonPath(path: string): boolean {
  return normalizeArchivePath(path).endsWith(".json") && !path.endsWith("/");
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function asCategory(value: unknown): Category {
  if (typeof value === "string" && (CATEGORIES as readonly string[]).includes(value)) {
    return value as Category;
  }
  return "Custom";
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string").slice(0, 12);
}

function asFps(value: unknown, fallback = 30): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0 || n > 120) return fallback;
  return n;
}

function validFrames(frames: number[][]): number[][] {
  return frames.filter((f) => f.length === KEYPOINT_LENGTH && !isEmptyFrame(f, 3));
}

async function readZip(file: Blob): Promise<ZipEntry[]> {
  const zip = await JSZip.loadAsync(file);
  const entries: ZipEntry[] = [];
  const jobs: Promise<void>[] = [];
  zip.forEach((relativePath, entry) => {
    if (entry.dir) return;
    const path = relativePath.replace(/\\/g, "/");
    if (path.split("/").some((part) => part.startsWith("__macosx") || part === ".ds_store")) return;
    jobs.push(
      (async () => {
        const lower = path.toLowerCase();
        if (isJsonPath(path) || lower.endsWith(".txt") || lower.endsWith(".hpp") || lower.endsWith("cmakelists.txt")) {
          entries.push({ path, text: await entry.async("string") });
          return;
        }
        if (VIDEO_EXT.test(path)) {
          const buf = await entry.async("blob");
          const type = lower.endsWith(".webm")
            ? "video/webm"
            : lower.endsWith(".mov")
              ? "video/quicktime"
              : "video/mp4";
          entries.push({ path, blob: buf.type ? buf : new Blob([buf], { type }) });
          return;
        }
        entries.push({ path });
      })(),
    );
  });
  await Promise.all(jobs);
  return entries.sort((a, b) => a.path.localeCompare(b.path, undefined, { numeric: true }));
}

function findManifest(entries: ZipEntry[]): Record<string, unknown> | null {
  const hit = entries.find((e) => normalizeArchivePath(e.path).endsWith("manifest.json") && e.text);
  if (!hit?.text) return null;
  const data = parseJson(hit.text);
  if (!data || typeof data !== "object") return null;
  return data as Record<string, unknown>;
}

function frameKeypointsFromText(text: string): number[] | null {
  const data = parseJson(text);
  const frames = framesFromUnknown(data);
  return frames && frames.length === 1 ? frames[0]! : frames?.[0] ?? null;
}

function collectDojangFrames(entries: ZipEntry[], folder: string): number[][] {
  const prefix = folder ? `${folder.replace(/\/?$/, "")}/` : "";
  const files = entries.filter((e) => {
    const p = e.path.replace(/\\/g, "/");
    return p.startsWith(prefix) && /(?:^|\/)frames\/\d+\.json$/i.test(p) && e.text;
  });
  files.sort((a, b) => a.path.localeCompare(b.path, undefined, { numeric: true }));
  const frames: number[][] = [];
  for (const file of files) {
    const kp = frameKeypointsFromText(file.text ?? "");
    if (kp) frames.push(kp);
  }
  return frames;
}

function metadataFrom(entries: ZipEntry[], folder: string): Record<string, unknown> {
  const path = folder ? `${folder.replace(/\/?$/, "")}/metadata.json` : "metadata.json";
  const hit = entries.find((e) => e.path.replace(/\\/g, "/") === path && e.text);
  if (!hit?.text) return {};
  const data = parseJson(hit.text);
  return data && typeof data === "object" ? (data as Record<string, unknown>) : {};
}

function draftFromMeta(
  meta: Record<string, unknown>,
  keypoints: number[][],
  fallbackName: string,
  source: ImportedDraft["source"],
  video?: Blob,
): ImportedDraft | null {
  const sized = rescaleOpenPoseSequence(keypoints, {
    width: typeof meta.width === "number" ? meta.width : undefined,
    height: typeof meta.height === "number" ? meta.height : undefined,
  });
  const frames = validFrames(sized.frames);
  if (frames.length === 0) return null;
  return {
    name: (typeof meta.name === "string" && meta.name.trim()) || fallbackName,
    category: asCategory(meta.category),
    tags: asStringArray(meta.tags),
    notes: typeof meta.notes === "string" ? meta.notes : "",
    fps: asFps(meta.fps),
    width: sized.width,
    height: sized.height,
    keypoints: frames,
    video,
    source,
  };
}

function importDojang(entries: ZipEntry[], manifest: Record<string, unknown>): ArchiveImportResult {
  const type = manifest.type;
  const drafts: ImportedDraft[] = [];

  if (type === "library" && Array.isArray(manifest.movements)) {
    for (const row of manifest.movements) {
      if (!row || typeof row !== "object") continue;
      const rec = row as Record<string, unknown>;
      const folder = typeof rec.path === "string" ? rec.path.replace(/\/?$/, "") : "";
      if (!folder) continue;
      const frames = collectDojangFrames(entries, folder);
      const meta = { ...rec, ...metadataFrom(entries, folder) };
      const draft = draftFromMeta(
        meta,
        frames,
        typeof rec.name === "string" ? rec.name : "Imported movement",
        "dojang",
      );
      if (draft) drafts.push(draft);
    }
  } else {
    const frames = collectDojangFrames(entries, "");
    const meta =
      entries.find((e) => normalizeArchivePath(e.path) === "metadata.json" && e.text)
        ? (parseJson(entries.find((e) => normalizeArchivePath(e.path) === "metadata.json")!.text!) as Record<
            string,
            unknown
          >)
        : ((manifest.movement as Record<string, unknown> | undefined) ?? {});
    const draft = draftFromMeta(meta && typeof meta === "object" ? meta : {}, frames, "Imported movement", "dojang");
    if (draft) drafts.push(draft);
  }

  if (drafts.length === 0) {
    return { kind: "empty", message: "That Dojang zip did not contain any pose frames." };
  }
  return { kind: "movements", source: "dojang", drafts };
}

function firstVideo(entries: ZipEntry[]): Blob | undefined {
  return entries.find((e) => e.blob)?.blob;
}

function importOpenPoseJsonEntries(entries: ZipEntry[], nameHint: string): ArchiveImportResult {
  const jsonFiles = entries.filter((e) => e.text && isJsonPath(e.path));
  const official = jsonFiles.filter((e) => /_keypoints\.json$/i.test(e.path));
  const candidates = (official.length > 0 ? official : jsonFiles).filter((e) => {
    const data = parseJson(e.text ?? "");
    return looksLikeOpenPoseFrame(data) || (official.length > 0 && /_keypoints\.json$/i.test(e.path));
  });
  const frameFiles = candidates.sort((a, b) => a.path.localeCompare(b.path, undefined, { numeric: true }));

  const frames: number[][] = [];
  let hintedW: number | undefined;
  let hintedH: number | undefined;
  for (const file of frameFiles) {
    const data = parseJson(file.text ?? "");
    const parsed = framesFromUnknown(data);
    if (!parsed) continue;
    if (data && typeof data === "object") {
      const rec = data as Record<string, unknown>;
      if (typeof rec.canvas_width === "number") hintedW = rec.canvas_width;
      if (typeof rec.canvas_height === "number") hintedH = rec.canvas_height;
      if (typeof rec.width === "number") hintedW = rec.width;
      if (typeof rec.height === "number") hintedH = rec.height;
    }
    frames.push(...parsed);
  }

  const sized = rescaleOpenPoseSequence(frames, { width: hintedW, height: hintedH });
  const keep = validFrames(sized.frames);
  if (keep.length === 0) {
    return { kind: "empty", message: "No OpenPose people were found in that file." };
  }

  const base = nameHint.replace(/\.(zip|json)$/i, "") || "OpenPose movement";
  return {
    kind: "movements",
    source: "openpose",
    drafts: [
      {
        name: base.replace(/[-_]+/g, " ").trim() || "OpenPose movement",
        category: "Taekwondo",
        tags: ["openpose", "body25"],
        notes: "Imported from OpenPose BODY_25 JSON.",
        fps: 30,
        width: sized.width,
        height: sized.height,
        keypoints: keep,
        video: firstVideo(entries),
        source: "openpose",
      },
    ],
  };
}

export async function importJsonText(text: string, nameHint = "OpenPose movement"): Promise<ArchiveImportResult> {
  const data = parseJson(text);
  if (data == null) return { kind: "empty", message: "That file is not valid JSON." };
  const frames = framesFromUnknown(data);
  if (!frames || frames.length === 0) {
    return { kind: "empty", message: "No pose_keypoints_2d arrays were found in that JSON." };
  }
  const rec = data && typeof data === "object" && !Array.isArray(data) ? (data as Record<string, unknown>) : {};
  const sized = rescaleOpenPoseSequence(frames, {
    width: typeof rec.canvas_width === "number" ? rec.canvas_width : typeof rec.width === "number" ? rec.width : undefined,
    height:
      typeof rec.canvas_height === "number" ? rec.canvas_height : typeof rec.height === "number" ? rec.height : undefined,
  });
  const keep = validFrames(sized.frames);
  if (keep.length === 0) return { kind: "empty", message: "Those keypoints were empty." };
  return {
    kind: "movements",
    source: "openpose",
    drafts: [
      {
        name: nameHint.replace(/\.(zip|json)$/i, "") || "OpenPose movement",
        category: "Taekwondo",
        tags: ["openpose", "body25"],
        notes: "Imported from OpenPose JSON.",
        fps: asFps(rec.fps),
        width: sized.width,
        height: sized.height,
        keypoints: keep,
        source: "openpose",
      },
    ],
  };
}

export async function importArchive(file: Blob, nameHint = "Imported movement"): Promise<ArchiveImportResult> {
  const entries = await readZip(file);
  const paths = entries.map((e) => e.path);
  const manifest = findManifest(entries);
  const isDojang =
    manifest &&
    (manifest.app === "Dojang" || manifest.type === "movement" || manifest.type === "library" || manifest.format === "BODY_25");

  if (isDojang && manifest) return importDojang(entries, manifest);

  const openposeJson = entries.some((e) => {
    if (!e.text) return false;
    const data = parseJson(e.text);
    return looksLikeOpenPoseFrame(data);
  });
  if (openposeJson) return importOpenPoseJsonEntries(entries, nameHint);

  if (isOpenPoseSourceTree(paths)) {
    return { kind: "openpose-source", message: OPENPOSE_SOURCE_MESSAGE };
  }

  return {
    kind: "empty",
    message:
      "Could not read that zip. Use a Dojang export, an OpenPose --write_json folder, or a pose_keypoints_2d JSON file.",
  };
}

export async function importFile(file: File): Promise<ArchiveImportResult> {
  const name = file.name || "Imported movement";
  if (/\.json$/i.test(name) || file.type === "application/json") {
    return importJsonText(await file.text(), name);
  }
  return importArchive(file, slugify(name.replace(/\.(zip|json)$/i, "")) || name);
}

export function draftToRecord(
  draft: ImportedDraft,
  thumbnail: Blob,
  id = crypto.randomUUID(),
): MovementRecord {
  const now = Date.now();
  return {
    id,
    name: draft.name,
    category: draft.category,
    tags: draft.tags,
    notes: draft.notes,
    fps: draft.fps,
    width: draft.width,
    height: draft.height,
    keypoints: draft.keypoints,
    thumbnail,
    video: draft.video,
    createdAt: now,
    updatedAt: now,
    source: draft.source,
  };
}
