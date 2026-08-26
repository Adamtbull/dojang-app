import { J, KEYPOINT_LENGTH } from "./landmarks";
import { jointsToFlat, parseJoints } from "./joints";

/**
 * Canonical ready stance (chumbi) in a 600×1000 source space.
 * Feet wider than shoulders, knees soft, fists parked on the belt.
 */
export function readyStanceKeypoints(width = 600, height = 1000): number[] {
  const sx = width / 600;
  const sy = height / 1000;
  const map: Record<number, [number, number]> = {
    [J.NOSE]: [300, 168],
    [J.NECK]: [300, 222],
    [J.R_SHOULDER]: [226, 236],
    [J.R_ELBOW]: [196, 308],
    [J.R_WRIST]: [252, 358],
    [J.L_SHOULDER]: [374, 236],
    [J.L_ELBOW]: [404, 308],
    [J.L_WRIST]: [348, 358],
    [J.MID_HIP]: [300, 368],
    [J.R_HIP]: [256, 376],
    [J.R_KNEE]: [228, 528],
    [J.R_ANKLE]: [214, 688],
    [J.L_HIP]: [344, 376],
    [J.L_KNEE]: [372, 528],
    [J.L_ANKLE]: [386, 688],
    [J.R_EYE]: [280, 156],
    [J.L_EYE]: [320, 156],
    [J.R_EAR]: [246, 174],
    [J.L_EAR]: [354, 174],
    [J.L_BIG_TOE]: [358, 722],
    [J.L_SMALL_TOE]: [408, 716],
    [J.L_HEEL]: [392, 704],
    [J.R_BIG_TOE]: [242, 722],
    [J.R_SMALL_TOE]: [192, 716],
    [J.R_HEEL]: [208, 704],
  };

  const out = new Array<number>(KEYPOINT_LENGTH).fill(0);
  for (const [key, xy] of Object.entries(map)) {
    const i = Number(key);
    const pair = xy;
    if (!pair) continue;
    out[i * 3] = pair[0] * sx;
    out[i * 3 + 1] = pair[1] * sy;
    out[i * 3 + 2] = 1;
  }
  return out;
}

/** Subtle breathing / weight-shift so the home hero feels alive. */
export function idleStanceKeypoints(timeMs: number, width = 600, height = 1000): number[] {
  const base = parseJoints(readyStanceKeypoints(width, height));
  const t = timeMs / 1000;
  const breath = Math.sin(t * 1.4) * 2.4;
  const sway = Math.sin(t * 0.7) * 1.6;
  const knee = Math.sin(t * 1.4) * 2.2;

  const shift = (i: number, dx: number, dy: number) => {
    const p = base[i];
    if (!p) return;
    p.x += dx;
    p.y += dy;
  };

  shift(J.NOSE, sway * 0.3, breath);
  shift(J.NECK, sway * 0.35, breath);
  shift(J.L_EYE, sway * 0.3, breath);
  shift(J.R_EYE, sway * 0.3, breath);
  shift(J.L_EAR, sway * 0.3, breath);
  shift(J.R_EAR, sway * 0.3, breath);
  shift(J.L_SHOULDER, sway * 0.5, breath * 0.8);
  shift(J.R_SHOULDER, sway * 0.5, breath * 0.8);
  shift(J.L_ELBOW, sway * 0.4, breath * 0.4);
  shift(J.R_ELBOW, sway * 0.4, breath * 0.4);
  shift(J.L_WRIST, sway * 0.3, breath * 0.2);
  shift(J.R_WRIST, sway * 0.3, breath * 0.2);
  shift(J.MID_HIP, sway, 0);
  shift(J.L_HIP, sway, 0);
  shift(J.R_HIP, sway, 0);
  shift(J.L_KNEE, sway * 0.6, knee);
  shift(J.R_KNEE, sway * 0.6, knee);

  return jointsToFlat(base);
}

/**
 * Procedural ap-chagi (front kick) used as a labeled sample on the home page
 * and as a deterministic renderer test. Not a substitute for video extraction.
 */
export function sampleFrontKick(frameCount = 48, width = 600, height = 1000): number[][] {
  const frames: number[][] = [];
  for (let i = 0; i < frameCount; i++) {
    const u = i / (frameCount - 1);
    const kick = kickEnvelope(u);
    const joints = parseJoints(readyStanceKeypoints(width, height));

    const chamber = kick * 0.45;
    const extend = Math.max(0, (kick - 0.45) / 0.55);

    const lHip = joints[J.L_HIP];
    const lKnee = joints[J.L_KNEE];
    const lAnkle = joints[J.L_ANKLE];
    const lBig = joints[J.L_BIG_TOE];
    const lSmall = joints[J.L_SMALL_TOE];
    const lHeel = joints[J.L_HEEL];
    if (lHip && lKnee && lAnkle && lBig && lSmall && lHeel) {
      const baseKneeY = lKnee.y;
      const baseAnkleY = lAnkle.y;
      lKnee.y = baseKneeY - chamber * 210 - extend * 40;
      lKnee.x = lHip.x + 8 + extend * 18;
      lAnkle.y = baseAnkleY - chamber * 250 - extend * 230;
      lAnkle.x = lHip.x + 20 + extend * 90;
      const lift = baseAnkleY - lAnkle.y;
      lBig.y -= lift;
      lSmall.y -= lift;
      lHeel.y -= lift;
      lBig.x += extend * 90;
      lSmall.x += extend * 86;
      lHeel.x += extend * 70;
    }

    const lSh = joints[J.L_SHOULDER];
    const rSh = joints[J.R_SHOULDER];
    const lEl = joints[J.L_ELBOW];
    const rEl = joints[J.R_ELBOW];
    const lWr = joints[J.L_WRIST];
    const rWr = joints[J.R_WRIST];
    if (lSh && rSh && lEl && rEl && lWr && rWr) {
      rEl.y -= kick * 24;
      rWr.x -= kick * 16;
      rWr.y -= kick * 30;
      lEl.y += kick * 10;
      lWr.y += kick * 8;
    }

    const rAnkle = joints[J.R_ANKLE];
    const rKnee = joints[J.R_KNEE];
    if (rAnkle && rKnee) {
      rKnee.y += kick * 8;
      rAnkle.x -= kick * 6;
    }

    frames.push(jointsToFlat(joints));
  }
  return frames;
}

function kickEnvelope(u: number): number {
  if (u < 0.12) return 0;
  if (u < 0.38) return (u - 0.12) / 0.26;
  if (u < 0.52) return 1;
  if (u < 0.82) return 1 - (u - 0.52) / 0.3;
  return 0;
}
