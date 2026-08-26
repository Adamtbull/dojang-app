import { describe, expect, it } from "vitest";
import { readyStanceKeypoints, sampleFrontKick, idleStanceKeypoints } from "./readyStance";
import { KEYPOINT_LENGTH, J } from "./landmarks";
import { boundsFromFrames, isEmptyFrame, parseJoints } from "./joints";

describe("ready stance", () => {
  it("is a complete BODY_25 frame", () => {
    const pose = readyStanceKeypoints();
    expect(pose).toHaveLength(KEYPOINT_LENGTH);
    expect(isEmptyFrame(pose)).toBe(false);
    const joints = parseJoints(pose);
    expect(joints[J.L_ANKLE]?.x).toBeGreaterThan(joints[J.R_ANKLE]?.x ?? 0);
    expect(joints[J.L_SHOULDER]?.x).toBeGreaterThan(joints[J.R_SHOULDER]?.x ?? 0);
  });

  it("idles without dropping joints", () => {
    const idle = idleStanceKeypoints(1200);
    expect(idle).toHaveLength(75);
    expect(isEmptyFrame(idle)).toBe(false);
  });
});

describe("sample front kick", () => {
  it("animates the left leg upward then down", () => {
    const frames = sampleFrontKick(48);
    expect(frames).toHaveLength(48);
    expect(frames.every((f) => f.length === 75)).toBe(true);
    const start = parseJoints(frames[0]);
    const peak = parseJoints(frames[22]);
    const end = parseJoints(frames[47]);
    expect(peak[J.L_ANKLE]!.y).toBeLessThan(start[J.L_ANKLE]!.y - 100);
    expect(end[J.L_ANKLE]!.y).toBeCloseTo(start[J.L_ANKLE]!.y, 0);
    expect(boundsFromFrames(frames)).not.toBeNull();
  });
});
