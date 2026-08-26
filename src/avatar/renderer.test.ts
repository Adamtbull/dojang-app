import { describe, expect, it } from "vitest";
import { hingeWrapRadius, jointBend } from "../avatar/renderer";

describe("jointBend", () => {
  it("is ~0 when the limb is straight", () => {
    expect(jointBend({ x: 0, y: 0 }, { x: 0, y: 10 }, { x: 0, y: 20 })).toBeCloseTo(0, 5);
  });

  it("rises toward 1 as the hinge folds", () => {
    const right = jointBend({ x: 0, y: 0 }, { x: 0, y: 10 }, { x: 10, y: 10 });
    const folded = jointBend({ x: 0, y: 0 }, { x: 0, y: 10 }, { x: 0, y: 0.5 });
    expect(right).toBeGreaterThan(0.4);
    expect(folded).toBeGreaterThan(right);
    expect(folded).toBeGreaterThan(0.9);
  });
});

describe("hingeWrapRadius", () => {
  it("covers the thicker bone plus outline inflate", () => {
    const r = hingeWrapRadius(18, 14, 10, 0, 3);
    expect(r).toBeGreaterThanOrEqual(18 + 3);
  });

  it("stretches as a kick-style hinge folds", () => {
    const straight = hingeWrapRadius(18, 14, 10, 0);
    const folded = hingeWrapRadius(18, 14, 10, 0.85);
    expect(folded).toBeGreaterThan(straight * 1.25);
  });
});
