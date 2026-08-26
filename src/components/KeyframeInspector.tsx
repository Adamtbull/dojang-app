import { JOINT_NAMES } from "../pose/landmarks";
import { parseJoints } from "../pose/joints";

export function KeyframeInspector({
  keypoints,
  frame,
}: {
  keypoints: number[];
  frame: number;
}) {
  const joints = parseJoints(keypoints);
  const named = JOINT_NAMES.map((name, i) => {
    const j = joints[i];
    return {
      name,
      x: Number((j?.x ?? 0).toFixed(2)),
      y: Number((j?.y ?? 0).toFixed(2)),
      c: Number((j?.c ?? 0).toFixed(3)),
    };
  });

  return (
    <section className="rounded-2xl border border-navy-line/70 bg-navy-card p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-display text-2xl text-ink">Keyframe inspector</h2>
        <span className="text-xs text-muted">BODY_25 · frame {frame}</span>
      </div>
      <pre className="max-h-56 overflow-auto rounded-xl bg-navy p-3 text-[11px] leading-relaxed text-dojang-teal">
        {JSON.stringify({ frame, format: "BODY_25", keypoints, joints: named }, null, 2)}
      </pre>
    </section>
  );
}
