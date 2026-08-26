import { describe, expect, it } from "vitest";
import { smoothFrames } from "./smooth";
import { sampleFrontKick } from "./readyStance";
import { J } from "./landmarks";
import { parseJoints } from "./joints";

describe("smoothFrames", () => {
  it("leaves short clips unchanged", () => {
    const frames = sampleFrontKick(2);
    expect(smoothFrames(frames)).toBe(frames);
  });

  it("does not drop joints and damps a spike", () => {
    const frames = sampleFrontKick(8);
    const spiked = frames.map((f) => f.slice());
    spiked[3]![J.L_WRIST * 3] = (spiked[3]![J.L_WRIST * 3] ?? 0) + 80;
    const smoothed = smoothFrames(spiked);
    const mid = parseJoints(smoothed[3]!);
    const raw = parseJoints(spiked[3]!);
    const prev = parseJoints(spiked[2]!);
    expect(smoothed).toHaveLength(8);
    expect(smoothed[3]).toHaveLength(75);
    expect(Math.abs(mid[J.L_WRIST]!.x - prev[J.L_WRIST]!.x)).toBeLessThan(
      Math.abs(raw[J.L_WRIST]!.x - prev[J.L_WRIST]!.x),
    );
  });
});
