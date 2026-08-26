import { JOINT_COUNT } from "./landmarks";

/**
 * Confidence-gated temporal smoothing. Raw JSON stays untouched;
 * playback can pass this so kicks do not shimmer joint-to-joint.
 */
export function smoothFrames(frames: number[][], passes = 1): number[][] {
  if (frames.length < 3 || passes <= 0) return frames;
  let cur = frames;
  for (let i = 0; i < passes; i++) cur = smoothPass(cur);
  return cur;
}

function smoothPass(frames: number[][]): number[][] {
  const out = frames.map((f) => f.slice());
  for (let t = 1; t < frames.length - 1; t++) {
    const prev = frames[t - 1];
    const curr = frames[t];
    const next = frames[t + 1];
    if (!prev || !curr || !next) continue;
    for (let j = 0; j < JOINT_COUNT; j++) {
      const i = j * 3;
      const c0 = prev[i + 2] ?? 0;
      const c1 = curr[i + 2] ?? 0;
      const c2 = next[i + 2] ?? 0;
      if (c1 < 0.12) continue;
      const x1 = curr[i] ?? 0;
      const y1 = curr[i + 1] ?? 0;
      let x = x1 * 2;
      let y = y1 * 2;
      let w = 2;
      if (c0 >= 0.12) {
        x += prev[i] ?? 0;
        y += prev[i + 1] ?? 0;
        w += 1;
      }
      if (c2 >= 0.12) {
        x += next[i] ?? 0;
        y += next[i + 1] ?? 0;
        w += 1;
      }
      out[t]![i] = x / w;
      out[t]![i + 1] = y / w;
      out[t]![i + 2] = c1;
    }
  }
  return out;
}
