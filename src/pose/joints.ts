import type { Bounds, Joint } from "../types";
import { J, JOINT_COUNT, KEYPOINT_LENGTH } from "./landmarks";

export function emptyKeypoints(): number[] {
  return new Array<number>(KEYPOINT_LENGTH).fill(0);
}

export function parseJoints(flat: number[] | undefined): Joint[] {
  const pts: Joint[] = [];
  for (let i = 0; i < JOINT_COUNT; i++) {
    const x = flat?.[i * 3] ?? 0;
    const y = flat?.[i * 3 + 1] ?? 0;
    const c = flat?.[i * 3 + 2] ?? 0;
    pts.push({ x, y, c });
  }
  return pts;
}

export function jointsToFlat(joints: Joint[]): number[] {
  const out = emptyKeypoints();
  for (let i = 0; i < JOINT_COUNT; i++) {
    const p = joints[i];
    if (!p) continue;
    out[i * 3] = p.x;
    out[i * 3 + 1] = p.y;
    out[i * 3 + 2] = p.c;
  }
  return out;
}

export function jointAt(joints: Joint[], index: number): Joint {
  return joints[index] ?? { x: 0, y: 0, c: 0 };
}

export function isPresent(p: Joint, minConf = 0.12): boolean {
  return p.c >= minConf && !(p.x === 0 && p.y === 0 && p.c === 0);
}

export function confidentCount(joints: Joint[], minConf = 0.25): number {
  return joints.reduce((n, p) => n + (isPresent(p, minConf) ? 1 : 0), 0);
}

export function isEmptyFrame(flat: number[] | undefined, minJoints = 5): boolean {
  return confidentCount(parseJoints(flat), 0.25) < minJoints;
}

export function dist(a: Joint, b: Joint): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function mid(a: Joint, b: Joint, c = Math.min(a.c, b.c)): Joint {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, c };
}

export function lerpJoint(a: Joint, b: Joint, t: number): Joint {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    c: Math.min(a.c, b.c),
  };
}

export function add(a: Joint, b: { x: number; y: number }): Joint {
  return { x: a.x + b.x, y: a.y + b.y, c: a.c };
}

export function sub(a: Joint, b: Joint): { x: number; y: number } {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function mul(v: { x: number; y: number }, s: number): { x: number; y: number } {
  return { x: v.x * s, y: v.y * s };
}

export function norm(v: { x: number; y: number }): { x: number; y: number } {
  const len = Math.hypot(v.x, v.y) || 1;
  return { x: v.x / len, y: v.y / len };
}

export function perp(v: { x: number; y: number }): { x: number; y: number } {
  return { x: -v.y, y: v.x };
}

export function padBounds(b: Bounds, pad: number): Bounds {
  return {
    minX: b.minX - pad,
    minY: b.minY - pad,
    maxX: b.maxX + pad,
    maxY: b.maxY + pad,
  };
}

export function unionBounds(a: Bounds | null, b: Bounds): Bounds {
  if (!a) return b;
  return {
    minX: Math.min(a.minX, b.minX),
    minY: Math.min(a.minY, b.minY),
    maxX: Math.max(a.maxX, b.maxX),
    maxY: Math.max(a.maxY, b.maxY),
  };
}

export function boundsFromJoints(joints: Joint[]): Bounds | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let any = false;
  for (const p of joints) {
    if (!isPresent(p)) continue;
    any = true;
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  if (!any) return null;

  const neck = jointAt(joints, J.NECK);
  const lSh = jointAt(joints, J.L_SHOULDER);
  const rSh = jointAt(joints, J.R_SHOULDER);
  const shoulderW =
    isPresent(lSh) && isPresent(rSh) ? dist(lSh, rSh) : (maxX - minX) * 0.4;
  const headH = Math.max(28, (shoulderW / 3) * 1.25);
  if (isPresent(neck)) {
    minY = Math.min(minY, neck.y - headH * 1.05);
  } else {
    minY -= headH * 0.9;
  }
  maxY += shoulderW * 0.16;
  minX -= shoulderW * 0.12;
  maxX += shoulderW * 0.12;

  return { minX, minY, maxX, maxY };
}

export function boundsFromFrames(frames: number[][]): Bounds | null {
  let acc: Bounds | null = null;
  for (const frame of frames) {
    const b = boundsFromJoints(parseJoints(frame));
    if (b) acc = unionBounds(acc, b);
  }
  return acc;
}

export function fitJoints(
  joints: Joint[],
  canvasW: number,
  canvasH: number,
  bounds: Bounds | null,
  mirror: boolean,
  heightRatio = 0.78,
): Joint[] {
  const b = bounds ?? boundsFromJoints(joints);
  if (!b) return joints;

  const poseW = Math.max(1, b.maxX - b.minX);
  const poseH = Math.max(1, b.maxY - b.minY);
  const scale = Math.min((canvasH * heightRatio) / poseH, (canvasW * 0.92) / poseW);
  const cx = (b.minX + b.maxX) / 2;
  const cy = (b.minY + b.maxY) / 2;
  const dx = canvasW / 2;
  const dy = canvasH / 2 + canvasH * 0.02;

  return joints.map((p) => {
    if (!isPresent(p, 0.05)) return { x: 0, y: 0, c: 0 };
    let x = dx + (p.x - cx) * scale;
    const y = dy + (p.y - cy) * scale;
    if (mirror) x = canvasW - x;
    return { x, y, c: p.c };
  });
}

export function limbAlpha(joints: Joint[], indices: readonly number[]): number {
  const cs = indices.map((i) => jointAt(joints, i).c).filter((c) => c > 0);
  if (cs.length === 0) return 0;
  const min = Math.min(...cs);
  return Math.max(0, Math.min(1, (min - 0.08) / 0.45));
}

export function facingCamera(joints: Joint[]): boolean {
  const l = jointAt(joints, J.L_SHOULDER);
  const r = jointAt(joints, J.R_SHOULDER);
  if (isPresent(l) && isPresent(r)) return l.x >= r.x;
  const lh = jointAt(joints, J.L_HIP);
  const rh = jointAt(joints, J.R_HIP);
  if (isPresent(lh) && isPresent(rh)) return lh.x >= rh.x;
  return true;
}

export function isLegRaised(hip: Joint, ankle: Joint, knee: Joint): boolean {
  if (!isPresent(hip) || !isPresent(ankle)) return false;
  const ref = isPresent(knee) ? dist(hip, knee) + dist(knee, ankle) : dist(hip, ankle);
  return hip.y - ankle.y > ref * 0.18;
}

export function fastestExtremity(
  prev: number[] | undefined,
  curr: number[],
): number | null {
  if (!prev) return null;
  const ids = [J.R_WRIST, J.L_WRIST, J.R_ANKLE, J.L_ANKLE];
  let best: number | null = null;
  let bestD = 0;
  const a = parseJoints(prev);
  const b = parseJoints(curr);
  for (const id of ids) {
    const p = jointAt(a, id);
    const q = jointAt(b, id);
    if (!isPresent(p) || !isPresent(q)) continue;
    const d = dist(p, q);
    if (d > bestD) {
      bestD = d;
      best = id;
    }
  }
  return bestD > 0.5 ? best : null;
}

export function mostDynamicFrame(frames: number[][]): number {
  if (frames.length === 0) return 0;
  let best = Math.floor(frames.length / 2);
  let bestEnergy = -1;
  const ids = [J.R_WRIST, J.L_WRIST, J.R_ANKLE, J.L_ANKLE, J.R_KNEE, J.L_KNEE];
  for (let i = 1; i < frames.length; i++) {
    const a = parseJoints(frames[i - 1]);
    const b = parseJoints(frames[i]);
    let e = 0;
    for (const id of ids) {
      const p = jointAt(a, id);
      const q = jointAt(b, id);
      if (isPresent(p) && isPresent(q)) e += dist(p, q);
    }
    if (e > bestEnergy) {
      bestEnergy = e;
      best = i;
    }
  }
  return best;
}
