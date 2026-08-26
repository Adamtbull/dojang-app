import { Link } from "react-router-dom";
import type { MovementRecord } from "../types";
import { AvatarStage } from "./AvatarStage";
import { formatDuration } from "../lib/cn";

export function MovementCard({ movement }: { movement: MovementRecord }) {
  return (
    <Link
      to={`/library/${movement.id}`}
      className="overflow-hidden rounded-2xl border border-navy-line/70 bg-navy-card"
    >
      <AvatarStage
        frames={movement.keypoints}
        autoPlay={movement.keypoints.length > 1}
        fps={Math.min(movement.fps, 24)}
        className="aspect-[3/4] w-full"
      />
      <div className="space-y-1 p-3">
        <p className="truncate text-sm font-semibold text-ink">{movement.name}</p>
        <p className="text-[11px] uppercase tracking-wider text-muted">
          {movement.category} · {formatDuration(movement.keypoints.length, movement.fps)}
        </p>
      </div>
    </Link>
  );
}
