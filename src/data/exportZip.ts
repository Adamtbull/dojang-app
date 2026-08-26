import JSZip from "jszip";
import { JOINT_NAMES, KEYPOINT_LENGTH } from "../pose/landmarks";
import { openPoseFrameDocument, openPoseFrameFileName } from "../pose/openpose";
import type { MovementRecord } from "../types";

export function slugify(name: string): string {
  const s = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return s || "movement";
}

function pad(n: number, width = 4): string {
  return String(n).padStart(width, "0");
}

function framePayload(keypoints: number[], index: number) {
  const joints = JOINT_NAMES.map((name, i) => ({
    index: i,
    name,
    x: keypoints[i * 3] ?? 0,
    y: keypoints[i * 3 + 1] ?? 0,
    c: keypoints[i * 3 + 2] ?? 0,
  }));
  return {
    frame: index,
    format: "BODY_25",
    length: KEYPOINT_LENGTH,
    keypoints,
    joints,
  };
}

function movementMeta(m: MovementRecord) {
  return {
    id: m.id,
    name: m.name,
    category: m.category,
    tags: m.tags,
    notes: m.notes,
    fps: m.fps,
    width: m.width,
    height: m.height,
    frameCount: m.keypoints.length,
    durationSec: m.keypoints.length / m.fps,
    createdAt: new Date(m.createdAt).toISOString(),
    updatedAt: new Date(m.updatedAt).toISOString(),
  };
}

function writeOpenPoseFrames(zip: JSZip, m: MovementRecord, folder = "openpose"): void {
  m.keypoints.forEach((kp, i) => {
    const name = openPoseFrameFileName(i);
    const path = folder ? `${folder.replace(/\/$/, "")}/${name}` : name;
    zip.file(
      path,
      JSON.stringify(openPoseFrameDocument(kp, { width: m.width, height: m.height }), null, 2),
    );
  });
}

function writeMovementFiles(zip: JSZip, m: MovementRecord): void {
  zip.file("metadata.json", JSON.stringify(movementMeta(m), null, 2));
  m.keypoints.forEach((kp, i) => {
    zip.file(`frames/${pad(i)}.json`, JSON.stringify(framePayload(kp, i), null, 2));
  });
  writeOpenPoseFrames(zip, m);
}

export async function zipMovement(m: MovementRecord): Promise<Blob> {
  const zip = new JSZip();
  const manifest = {
    app: "Dojang",
    version: 1,
    exportedAt: new Date().toISOString(),
    type: "movement",
    format: "BODY_25",
    movement: movementMeta(m),
    files: [
      "metadata.json",
      ...m.keypoints.map((_, i) => `frames/${pad(i)}.json`),
      ...m.keypoints.map((_, i) => `openpose/${openPoseFrameFileName(i)}`),
    ],
  };
  zip.file("manifest.json", JSON.stringify(manifest, null, 2));
  writeMovementFiles(zip, m);
  return zip.generateAsync({ type: "blob" });
}

export async function zipOpenPoseJson(m: MovementRecord): Promise<Blob> {
  const zip = new JSZip();
  writeOpenPoseFrames(zip, m, "");
  return zip.generateAsync({ type: "blob" });
}

export async function zipLibrary(movements: MovementRecord[]): Promise<Blob> {
  const zip = new JSZip();
  const manifest = {
    app: "Dojang",
    version: 1,
    exportedAt: new Date().toISOString(),
    type: "library",
    format: "BODY_25",
    count: movements.length,
    movements: movements.map((m) => ({
      id: m.id,
      name: m.name,
      category: m.category,
      path: `movements/${slugify(m.name)}-${m.id.slice(0, 8)}/`,
      frameCount: m.keypoints.length,
    })),
  };
  zip.file("manifest.json", JSON.stringify(manifest, null, 2));
  for (const m of movements) {
    const folder = zip.folder(`movements/${slugify(m.name)}-${m.id.slice(0, 8)}`);
    if (!folder) continue;
    folder.file("metadata.json", JSON.stringify(movementMeta(m), null, 2));
    m.keypoints.forEach((kp, i) => {
      folder.file(`frames/${pad(i)}.json`, JSON.stringify(framePayload(kp, i), null, 2));
      folder.file(
        `openpose/${openPoseFrameFileName(i)}`,
        JSON.stringify(openPoseFrameDocument(kp, { width: m.width, height: m.height }), null, 2),
      );
    });
  }
  return zip.generateAsync({ type: "blob" });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
