import type { Joint } from "../types";
import { J } from "./landmarks";
import { add, dist, isPresent, jointAt, mul, norm, perp, sub } from "./joints";

function fillIfMissing(joints: Joint[], index: number, next: Joint): void {
  const cur = jointAt(joints, index);
  if (!isPresent(cur) && isPresent(next)) {
    joints[index] = next;
  }
}

function smallToe(big: Joint, heel: Joint, midX: number): Joint {
  const along = sub(big, heel);
  const n = perp(norm(along));
  const len = Math.hypot(along.x, along.y) || 1;
  const a = add(big, mul(n, len * 0.22));
  const b = add(big, mul(n, -len * 0.22));
  const pick = Math.abs(a.x - midX) >= Math.abs(b.x - midX) ? a : b;
  return { x: pick.x, y: pick.y, c: Math.min(big.c, heel.c) * 0.95 };
}

/** Fill neck/mid-hip and invent missing feet so the avatar stays complete. */
export function inferMissing(joints: Joint[]): Joint[] {
  const out = joints.map((p) => ({ ...p }));
  const lSh = jointAt(out, J.L_SHOULDER);
  const rSh = jointAt(out, J.R_SHOULDER);
  const lHip = jointAt(out, J.L_HIP);
  const rHip = jointAt(out, J.R_HIP);

  if (!isPresent(jointAt(out, J.NECK)) && isPresent(lSh) && isPresent(rSh)) {
    out[J.NECK] = {
      x: (lSh.x + rSh.x) / 2,
      y: (lSh.y + rSh.y) / 2,
      c: Math.min(lSh.c, rSh.c),
    };
  }
  if (!isPresent(jointAt(out, J.MID_HIP)) && isPresent(lHip) && isPresent(rHip)) {
    out[J.MID_HIP] = {
      x: (lHip.x + rHip.x) / 2,
      y: (lHip.y + rHip.y) / 2,
      c: Math.min(lHip.c, rHip.c),
    };
  }

  const midHip = jointAt(out, J.MID_HIP);
  const midX = isPresent(midHip)
    ? midHip.x
    : isPresent(lHip) && isPresent(rHip)
      ? (lHip.x + rHip.x) / 2
      : 0;

  inferFoot(out, J.L_HIP, J.L_KNEE, J.L_ANKLE, J.L_HEEL, J.L_BIG_TOE, J.L_SMALL_TOE, midX);
  inferFoot(out, J.R_HIP, J.R_KNEE, J.R_ANKLE, J.R_HEEL, J.R_BIG_TOE, J.R_SMALL_TOE, midX);

  const neck = jointAt(out, J.NECK);
  const nose = jointAt(out, J.NOSE);
  if (isPresent(neck) && isPresent(nose)) {
    const up = norm(sub(nose, neck));
    const side = perp(up);
    fillIfMissing(out, J.L_EYE, {
      x: nose.x + side.x * 12 + up.x * 4,
      y: nose.y + side.y * 12 + up.y * 4,
      c: nose.c * 0.8,
    });
    fillIfMissing(out, J.R_EYE, {
      x: nose.x - side.x * 12 + up.x * 4,
      y: nose.y - side.y * 12 + up.y * 4,
      c: nose.c * 0.8,
    });
  }

  return out;
}

function inferFoot(
  joints: Joint[],
  hipI: number,
  kneeI: number,
  ankleI: number,
  heelI: number,
  bigI: number,
  smallI: number,
  midX: number,
): void {
  const knee = jointAt(joints, kneeI);
  const ankle = jointAt(joints, ankleI);
  const hip = jointAt(joints, hipI);
  if (!isPresent(ankle)) return;

  const down =
    isPresent(knee)
      ? norm(sub(ankle, knee))
      : isPresent(hip)
        ? norm(sub(ankle, hip))
        : { x: 0, y: 1 };
  const footLen = isPresent(knee) ? dist(knee, ankle) * 0.32 : 28;

  if (!isPresent(jointAt(joints, heelI))) {
    const back = add(ankle, mul(down, footLen * 0.18));
    joints[heelI] = { x: back.x, y: back.y, c: ankle.c * 0.85 };
  }
  if (!isPresent(jointAt(joints, bigI))) {
    const fwd = add(ankle, mul(down, footLen * 0.72));
    const outward = Math.sign(ankle.x - midX || 1);
    joints[bigI] = {
      x: fwd.x + outward * footLen * 0.12,
      y: fwd.y,
      c: ankle.c * 0.85,
    };
  }
  const heel = jointAt(joints, heelI);
  const big = jointAt(joints, bigI);
  if (!isPresent(jointAt(joints, smallI)) && isPresent(heel) && isPresent(big)) {
    joints[smallI] = smallToe(big, heel, midX);
  }
}
