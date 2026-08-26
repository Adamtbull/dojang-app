import { describe, expect, it } from "vitest";
import { mediapipeToBody25, type PoseLandmark } from "./convert";
import { KEYPOINT_LENGTH, J, MP } from "./landmarks";
import { isEmptyFrame, parseJoints } from "./joints";

function lm(x: number, y: number, c = 1): PoseLandmark {
  return { x, y, z: 0, visibility: c, presence: 1 };
}

describe("mediapipeToBody25", () => {
  it("returns 75 zeros when no landmarks are present", () => {
    const out = mediapipeToBody25(undefined, 100, 100);
    expect(out).toHaveLength(KEYPOINT_LENGTH);
    expect(out.every((n) => n === 0)).toBe(true);
    expect(isEmptyFrame(out)).toBe(true);
  });

  it("maps 33 landmarks into BODY_25 pixel coordinates with confidence", () => {
    const pose: PoseLandmark[] = Array.from({ length: 33 }, () => lm(0, 0, 0));
    pose[MP.NOSE] = lm(0.5, 0.1);
    pose[MP.LEFT_SHOULDER] = lm(0.6, 0.2);
    pose[MP.RIGHT_SHOULDER] = lm(0.4, 0.2);
    pose[MP.LEFT_ELBOW] = lm(0.7, 0.35);
    pose[MP.RIGHT_ELBOW] = lm(0.3, 0.35);
    pose[MP.LEFT_WRIST] = lm(0.72, 0.5);
    pose[MP.RIGHT_WRIST] = lm(0.28, 0.5);
    pose[MP.LEFT_HIP] = lm(0.58, 0.55);
    pose[MP.RIGHT_HIP] = lm(0.42, 0.55);
    pose[MP.LEFT_KNEE] = lm(0.6, 0.75);
    pose[MP.RIGHT_KNEE] = lm(0.4, 0.75);
    pose[MP.LEFT_ANKLE] = lm(0.62, 0.95);
    pose[MP.RIGHT_ANKLE] = lm(0.38, 0.95);
    pose[MP.LEFT_EYE] = lm(0.53, 0.08);
    pose[MP.RIGHT_EYE] = lm(0.47, 0.08);
    pose[MP.LEFT_EAR] = lm(0.58, 0.09);
    pose[MP.RIGHT_EAR] = lm(0.42, 0.09);
    pose[MP.LEFT_HEEL] = lm(0.61, 0.98);
    pose[MP.RIGHT_HEEL] = lm(0.39, 0.98);
    pose[MP.LEFT_FOOT_INDEX] = lm(0.66, 0.99);
    pose[MP.RIGHT_FOOT_INDEX] = lm(0.34, 0.99);

    const width = 200;
    const height = 400;
    const out = mediapipeToBody25(pose, width, height);
    expect(out).toHaveLength(75);

    const joints = parseJoints(out);
    const nose = joints[J.NOSE];
    const neck = joints[J.NECK];
    const lSh = joints[J.L_SHOULDER];
    const rSh = joints[J.R_SHOULDER];
    const midHip = joints[J.MID_HIP];
    expect(nose?.x).toBeCloseTo(100);
    expect(nose?.y).toBeCloseTo(40);
    expect(lSh?.x).toBeCloseTo(120);
    expect(rSh?.x).toBeCloseTo(80);
    expect(neck?.x).toBeCloseTo(100);
    expect(neck?.y).toBeCloseTo(80);
    expect(midHip?.x).toBeCloseTo(100);
    expect(joints[J.L_SMALL_TOE]?.c).toBeGreaterThan(0);
    expect(joints[J.R_SMALL_TOE]?.c).toBeGreaterThan(0);
    expect(isEmptyFrame(out)).toBe(false);
  });

  it("encodes low-confidence joints as 0,0,0", () => {
    const pose: PoseLandmark[] = Array.from({ length: 33 }, () => lm(0.4, 0.4, 0.02));
    pose[MP.NOSE] = lm(0.5, 0.2, 0.9);
    const out = mediapipeToBody25(pose, 100, 100);
    expect(out[J.NOSE * 3]).toBeCloseTo(50);
    expect(out[J.L_WRIST * 3]).toBe(0);
    expect(out[J.L_WRIST * 3 + 1]).toBe(0);
    expect(out[J.L_WRIST * 3 + 2]).toBe(0);
  });
});
