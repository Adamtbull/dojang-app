import { KEYPOINT_LENGTH, MP } from "./landmarks";

export interface PoseLandmark {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
  presence?: number;
}

const MISSING: [number, number, number] = [0, 0, 0];
const MIN_CONF = 0.15;

function pack(
  lm: PoseLandmark | undefined,
  width: number,
  height: number,
): [number, number, number] {
  if (!lm) return MISSING;
  const visibility = lm.visibility ?? 1;
  const presence = lm.presence ?? 1;
  const c = visibility * presence;
  if (c < MIN_CONF) return MISSING;
  return [lm.x * width, lm.y * height, c];
}

function midpoint(
  a: [number, number, number],
  b: [number, number, number],
): [number, number, number] {
  if (a[2] === 0 && b[2] === 0) return MISSING;
  if (a[2] === 0) return b;
  if (b[2] === 0) return a;
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, Math.min(a[2], b[2])];
}

function offsetSmallToe(
  big: [number, number, number],
  heel: [number, number, number],
  midX: number,
): [number, number, number] {
  if (big[2] === 0) return MISSING;
  const hx = heel[2] === 0 ? big[0] : heel[0];
  const hy = heel[2] === 0 ? big[1] - 10 : heel[1];
  const dx = big[0] - hx;
  const dy = big[1] - hy;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const s = len * 0.22;
  const a = [big[0] + nx * s, big[1] + ny * s] as const;
  const b = [big[0] - nx * s, big[1] - ny * s] as const;
  const pick =
    Math.abs(a[0] - midX) >= Math.abs(b[0] - midX) ? a : b;
  const c = heel[2] === 0 ? big[2] * 0.9 : Math.min(big[2], heel[2]) * 0.95;
  return [pick[0], pick[1], c];
}

/**
 * Convert MediaPipe's 33 pose landmarks into OpenPose BODY_25.
 * Output is a flat array of 75 numbers [x0,y0,c0,...] in source-video pixels.
 * Missing joints are encoded as 0,0,0.
 */
export function mediapipeToBody25(
  landmarks: PoseLandmark[] | undefined,
  width: number,
  height: number,
): number[] {
  const out = new Array<number>(KEYPOINT_LENGTH).fill(0);
  if (!landmarks || landmarks.length === 0) return out;

  const nose = pack(landmarks[MP.NOSE], width, height);
  const lShoulder = pack(landmarks[MP.LEFT_SHOULDER], width, height);
  const rShoulder = pack(landmarks[MP.RIGHT_SHOULDER], width, height);
  const lElbow = pack(landmarks[MP.LEFT_ELBOW], width, height);
  const rElbow = pack(landmarks[MP.RIGHT_ELBOW], width, height);
  const lWrist = pack(landmarks[MP.LEFT_WRIST], width, height);
  const rWrist = pack(landmarks[MP.RIGHT_WRIST], width, height);
  const lHip = pack(landmarks[MP.LEFT_HIP], width, height);
  const rHip = pack(landmarks[MP.RIGHT_HIP], width, height);
  const lKnee = pack(landmarks[MP.LEFT_KNEE], width, height);
  const rKnee = pack(landmarks[MP.RIGHT_KNEE], width, height);
  const lAnkle = pack(landmarks[MP.LEFT_ANKLE], width, height);
  const rAnkle = pack(landmarks[MP.RIGHT_ANKLE], width, height);
  const lEye = pack(landmarks[MP.LEFT_EYE], width, height);
  const rEye = pack(landmarks[MP.RIGHT_EYE], width, height);
  const lEar = pack(landmarks[MP.LEFT_EAR], width, height);
  const rEar = pack(landmarks[MP.RIGHT_EAR], width, height);
  const lHeel = pack(landmarks[MP.LEFT_HEEL], width, height);
  const rHeel = pack(landmarks[MP.RIGHT_HEEL], width, height);
  const lBig = pack(landmarks[MP.LEFT_FOOT_INDEX], width, height);
  const rBig = pack(landmarks[MP.RIGHT_FOOT_INDEX], width, height);

  const neck = midpoint(lShoulder, rShoulder);
  const midHip = midpoint(lHip, rHip);
  const midX = midHip[2] > 0 ? midHip[0] : (width / 2);
  const lSmall = offsetSmallToe(lBig, lHeel, midX);
  const rSmall = offsetSmallToe(rBig, rHeel, midX);

  const joints: [number, number, number][] = [
    nose,
    neck,
    rShoulder,
    rElbow,
    rWrist,
    lShoulder,
    lElbow,
    lWrist,
    midHip,
    rHip,
    rKnee,
    rAnkle,
    lHip,
    lKnee,
    lAnkle,
    rEye,
    lEye,
    rEar,
    lEar,
    lBig,
    lSmall,
    lHeel,
    rBig,
    rSmall,
    rHeel,
  ];

  for (let i = 0; i < joints.length; i++) {
    const j = joints[i] ?? MISSING;
    out[i * 3] = j[0];
    out[i * 3 + 1] = j[1];
    out[i * 3 + 2] = j[2];
  }
  return out;
}
