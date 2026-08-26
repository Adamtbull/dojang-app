import { emptyKeypoints } from "./joints";
import { JOINT_COUNT, KEYPOINT_LENGTH } from "./landmarks";

/** Official OpenPose --write_json payload (BODY_25, COCO, or MPI). */
export interface OpenPosePerson {
  person_id?: number[];
  pose_keypoints_2d?: number[];
  face_keypoints_2d?: number[];
  hand_left_keypoints_2d?: number[];
  hand_right_keypoints_2d?: number[];
  pose_keypoints_3d?: number[];
}

export interface OpenPoseFrameJson {
  version?: number | string;
  people?: OpenPosePerson[];
  canvas_width?: number;
  canvas_height?: number;
  width?: number;
  height?: number;
}

export type PoseModelKind = "BODY_25" | "COCO_18" | "MPI_15";

const SOURCE_HINTS = [
  "include/openpose/header.hpp",
  "include/openpose/pose/poseparameters.hpp",
  "include/openpose/pose/poseparametersrender.hpp",
  "src/openpose/pose/poseparameters.cpp",
];

export function normalizeArchivePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.?\//, "").toLowerCase();
}

/** True when a zip is the OpenPose C++ source tree (GitHub master.zip), not pose output. */
export function isOpenPoseSourceTree(paths: string[]): boolean {
  const names = paths.map(normalizeArchivePath);
  const hasHeader = SOURCE_HINTS.some((hint) => names.some((p) => p.endsWith(hint)));
  const hasCmake = names.some((p) => p.endsWith("cmakelists.txt"));
  const hasSrc = names.some((p) => p.includes("src/openpose/"));
  return hasHeader && (hasCmake || hasSrc);
}

export const OPENPOSE_SOURCE_MESSAGE =
  "That zip is the OpenPose C++ source (master), not pose data. The library needs CUDA/Caffe and cannot run in a phone browser. Dojang already speaks OpenPose BODY_25 — import a --write_json folder, or film a clip here.";

export function isKeypointsJsonName(path: string): boolean {
  const name = normalizeArchivePath(path).split("/").pop() ?? "";
  if (name.startsWith(".")) return false;
  return (
    name.endsWith("_keypoints.json") ||
    /(?:^|\/)frames\/\d+\.json$/.test(normalizeArchivePath(path)) ||
    (name.endsWith(".json") && /keypoint/.test(name))
  );
}

export function detectPoseModel(length: number): PoseModelKind | null {
  if (length >= KEYPOINT_LENGTH) return "BODY_25";
  if (length >= 54) return "COCO_18";
  if (length >= 45) return "MPI_15";
  return null;
}

function triplet(src: number[], index: number): [number, number, number] {
  const x = src[index * 3] ?? 0;
  const y = src[index * 3 + 1] ?? 0;
  const c = src[index * 3 + 2] ?? 0;
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(c)) return [0, 0, 0];
  if (c <= 0) return [0, 0, 0];
  return [x, y, c];
}

function writeJoint(out: number[], index: number, xyz: [number, number, number]): void {
  out[index * 3] = xyz[0];
  out[index * 3 + 1] = xyz[1];
  out[index * 3 + 2] = xyz[2];
}

function midpoint(a: [number, number, number], b: [number, number, number]): [number, number, number] {
  if (a[2] <= 0 && b[2] <= 0) return [0, 0, 0];
  if (a[2] <= 0) return b;
  if (b[2] <= 0) return a;
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, Math.min(a[2], b[2])];
}

/** Lift COCO-18 (54 numbers) into BODY_25. Feet are missing. */
export function coco18ToBody25(src: number[]): number[] {
  const out = emptyKeypoints();
  for (let i = 0; i <= 7; i++) writeJoint(out, i, triplet(src, i));
  const rHip = triplet(src, 8);
  const rKnee = triplet(src, 9);
  const rAnkle = triplet(src, 10);
  const lHip = triplet(src, 11);
  const lKnee = triplet(src, 12);
  const lAnkle = triplet(src, 13);
  writeJoint(out, 8, midpoint(rHip, lHip));
  writeJoint(out, 9, rHip);
  writeJoint(out, 10, rKnee);
  writeJoint(out, 11, rAnkle);
  writeJoint(out, 12, lHip);
  writeJoint(out, 13, lKnee);
  writeJoint(out, 14, lAnkle);
  writeJoint(out, 15, triplet(src, 14));
  writeJoint(out, 16, triplet(src, 15));
  writeJoint(out, 17, triplet(src, 16));
  writeJoint(out, 18, triplet(src, 17));
  return out;
}

/** Lift MPI-15 (45 numbers) into BODY_25. Head maps to Nose. */
export function mpi15ToBody25(src: number[]): number[] {
  const out = emptyKeypoints();
  writeJoint(out, 0, triplet(src, 0));
  writeJoint(out, 1, triplet(src, 1));
  for (let i = 2; i <= 7; i++) writeJoint(out, i, triplet(src, i));
  const rHip = triplet(src, 8);
  const lHip = triplet(src, 11);
  writeJoint(out, 8, midpoint(rHip, lHip));
  writeJoint(out, 9, rHip);
  writeJoint(out, 10, triplet(src, 9));
  writeJoint(out, 11, triplet(src, 10));
  writeJoint(out, 12, lHip);
  writeJoint(out, 13, triplet(src, 12));
  writeJoint(out, 14, triplet(src, 13));
  return out;
}

export function toBody25(pose: number[]): number[] {
  const model = detectPoseModel(pose.length);
  if (model === "BODY_25") {
    const out = emptyKeypoints();
    for (let i = 0; i < JOINT_COUNT; i++) writeJoint(out, i, triplet(pose, i));
    return out;
  }
  if (model === "COCO_18") return coco18ToBody25(pose);
  if (model === "MPI_15") return mpi15ToBody25(pose);
  return emptyKeypoints();
}

function meanConfidence(pose: number[]): number {
  let sum = 0;
  let n = 0;
  for (let i = 0; i < pose.length; i += 3) {
    const c = pose[i + 2] ?? 0;
    if (c > 0) {
      sum += c;
      n += 1;
    }
  }
  return n === 0 ? 0 : sum / n;
}

export function pickBestPerson(people: OpenPosePerson[] | undefined): number[] | null {
  if (!people || people.length === 0) return null;
  let best: number[] | null = null;
  let bestScore = -1;
  for (const person of people) {
    const raw = person.pose_keypoints_2d;
    if (!raw || raw.length < 45) continue;
    const body = toBody25(raw);
    const score = meanConfidence(body);
    if (score > bestScore) {
      bestScore = score;
      best = body;
    }
  }
  return best;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asNumberArray(value: unknown): number[] | null {
  if (!Array.isArray(value) || value.length < 45) return null;
  if (!value.every((n) => typeof n === "number" && Number.isFinite(n))) return null;
  return value;
}

/** Pull one BODY_25 frame from an OpenPose or Dojang JSON object. */
export function keypointsFromUnknown(data: unknown): number[] | null {
  if (Array.isArray(data)) {
    const nums = asNumberArray(data);
    return nums ? toBody25(nums) : null;
  }
  if (!isRecord(data)) return null;

  if (Array.isArray(data.people)) {
    return pickBestPerson(data.people as OpenPosePerson[]);
  }
  const direct =
    asNumberArray(data.pose_keypoints_2d) ??
    asNumberArray(data.keypoints) ??
    asNumberArray(data.pose);
  return direct ? toBody25(direct) : null;
}

export function framesFromUnknown(data: unknown): number[][] | null {
  if (Array.isArray(data)) {
    if (data.length === 0) return [];
    if (typeof data[0] === "number") {
      const one = asNumberArray(data);
      return one ? [toBody25(one)] : null;
    }
    const frames: number[][] = [];
    for (const item of data) {
      const kp = keypointsFromUnknown(item);
      if (kp) frames.push(kp);
    }
    return frames.length > 0 ? frames : null;
  }
  if (!isRecord(data)) return null;

  const nested = data.frames ?? data.poses ?? data.sequence;
  if (Array.isArray(nested)) return framesFromUnknown(nested);

  const one = keypointsFromUnknown(data);
  return one ? [one] : null;
}

export function looksLikeOpenPoseFrame(data: unknown): boolean {
  if (!isRecord(data)) return false;
  if (Array.isArray(data.people)) return true;
  return Array.isArray(data.pose_keypoints_2d) && data.pose_keypoints_2d.length >= 45;
}

export function openPoseFrameDocument(
  keypoints: number[],
  canvas?: { width?: number; height?: number },
): OpenPoseFrameJson {
  const doc: OpenPoseFrameJson = {
    version: 1.3,
    people: [
      {
        person_id: [-1],
        pose_keypoints_2d: toBody25(keypoints),
        face_keypoints_2d: [],
        hand_left_keypoints_2d: [],
        hand_right_keypoints_2d: [],
        pose_keypoints_3d: [],
      },
    ],
  };
  if (canvas?.width) doc.canvas_width = canvas.width;
  if (canvas?.height) doc.canvas_height = canvas.height;
  return doc;
}

export function openPoseFrameFileName(index: number): string {
  return `${String(index).padStart(12, "0")}_keypoints.json`;
}

export interface SequenceSize {
  frames: number[][];
  width: number;
  height: number;
  normalized: boolean;
}

/**
 * OpenPose may write pixels, [0,1], or [-1,1] depending on --keypoint_scale.
 * Store pixels so the avatar and re-export stay in source-video space.
 */
export function rescaleOpenPoseSequence(
  frames: number[][],
  hinted?: { width?: number; height?: number },
): SequenceSize {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const frame of frames) {
    for (let i = 0; i < JOINT_COUNT; i++) {
      const c = frame[i * 3 + 2] ?? 0;
      if (c <= 0.02) continue;
      const x = frame[i * 3] ?? 0;
      const y = frame[i * 3 + 1] ?? 0;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (!Number.isFinite(maxX)) {
    return {
      frames,
      width: hinted?.width || 1920,
      height: hinted?.height || 1080,
      normalized: false,
    };
  }

  const hintedW = hinted?.width && hinted.width > 1 ? hinted.width : 0;
  const hintedH = hinted?.height && hinted.height > 1 ? hinted.height : 0;
  const looksUnit = maxX <= 1.5 && maxY <= 1.5 && minX >= -1.5 && minY >= -1.5;
  const looksSigned = looksUnit && (minX < -0.01 || minY < -0.01);

  if (!looksUnit) {
    return {
      frames,
      width: hintedW || Math.max(1, Math.ceil(maxX + 8)),
      height: hintedH || Math.max(1, Math.ceil(maxY + 8)),
      normalized: false,
    };
  }

  const width = hintedW || 1920;
  const height = hintedH || 1080;
  const mapped = frames.map((frame) => {
    const next = frame.slice();
    for (let i = 0; i < JOINT_COUNT; i++) {
      const c = next[i * 3 + 2] ?? 0;
      if (c <= 0) continue;
      let x = next[i * 3] ?? 0;
      let y = next[i * 3 + 1] ?? 0;
      if (looksSigned) {
        x = (x + 1) / 2;
        y = (y + 1) / 2;
      }
      next[i * 3] = x * width;
      next[i * 3 + 1] = y * height;
    }
    return next;
  });
  return { frames: mapped, width, height, normalized: true };
}
