import { useEffect, useRef, useState } from "react";
import type { ViewMode } from "../types";
import { cn } from "../lib/cn";
import { AvatarStage } from "./AvatarStage";
import { usePlayback } from "../hooks/usePlayback";
import { boundsFromFrames } from "../pose/joints";

interface MovementPlayerProps {
  frames: number[][];
  fps: number;
  videoUrl?: string | null;
  initialMode?: ViewMode;
  onFrameChange?: (frame: number) => void;
}

export function MovementPlayer({
  frames,
  fps,
  videoUrl,
  initialMode = "avatar",
  onFrameChange,
}: MovementPlayerProps) {
  const playback = usePlayback(frames.length, fps);
  const [mode, setMode] = useState<ViewMode>(initialMode);
  const videoRef = useRef<HTMLVideoElement>(null);
  const bounds = frames.length > 1 ? boundsFromFrames(frames) : null;

  useEffect(() => {
    onFrameChange?.(playback.frame);
  }, [playback.frame, onFrameChange]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoUrl) return;
    const t = playback.frame / Math.max(fps, 1);
    if (Math.abs(video.currentTime - t) > 1 / Math.max(fps, 1)) {
      video.currentTime = t;
    }
  }, [playback.frame, fps, videoUrl]);

  return (
    <div className="space-y-3">
      <div className="flex rounded-2xl bg-navy-card p-1">
        {(["avatar", "skeleton", "split"] as const).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setMode(id)}
            className={cn(
              "flex-1 rounded-xl px-3 py-2 text-xs font-semibold uppercase tracking-wider",
              mode === id ? "bg-navy-lift text-white" : "text-muted",
            )}
          >
            {id === "avatar" ? "Avatar" : id === "skeleton" ? "Skeleton" : "Side by side"}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-navy-line/80 bg-navy-card">
        {mode === "split" ? (
          <div className="grid grid-cols-2">
            <div className="relative min-h-[280px] bg-black">
              {videoUrl ? (
                <video
                  ref={videoRef}
                  src={videoUrl}
                  muted
                  playsInline
                  className={cn(
                    "absolute inset-0 h-full w-full object-contain",
                    playback.mirror && "scale-x-[-1]",
                  )}
                />
              ) : (
                <p className="absolute inset-0 flex items-center justify-center px-4 text-center text-sm text-muted">
                  Original clip stays on this device with the movement.
                </p>
              )}
            </div>
            <AvatarStage
              frames={frames}
              frame={playback.frame}
              mode="avatar"
              mirror={playback.mirror}
              bounds={bounds}
              className="min-h-[280px]"
            />
          </div>
        ) : (
          <AvatarStage
            frames={frames}
            frame={playback.frame}
            prevFrame={frames[Math.max(0, playback.frame - 1)]}
            mode={mode}
            mirror={playback.mirror}
            bounds={bounds}
            className="aspect-[3/4] w-full"
          />
        )}
      </div>

      <PlayerControls
        frame={playback.frame}
        total={frames.length}
        fps={fps}
        playing={playback.playing}
        loop={playback.loop}
        mirror={playback.mirror}
        onToggle={playback.togglePlay}
        onSeek={playback.seek}
        onLoop={() => playback.setLoop((v) => !v)}
        onMirror={() => playback.setMirror((v) => !v)}
      />
    </div>
  );
}

export function PlayerControls({
  frame,
  total,
  fps,
  playing,
  loop,
  mirror,
  onToggle,
  onSeek,
  onLoop,
  onMirror,
}: {
  frame: number;
  total: number;
  fps: number;
  playing: boolean;
  loop: boolean;
  mirror: boolean;
  onToggle: () => void;
  onSeek: (n: number) => void;
  onLoop: () => void;
  onMirror: () => void;
}) {
  const t = total > 1 ? frame / Math.max(fps, 1) : 0;
  return (
    <div className="rounded-2xl border border-navy-line/70 bg-navy-card p-3">
      <input
        type="range"
        min={0}
        max={Math.max(0, total - 1)}
        value={frame}
        onChange={(e) => onSeek(Number(e.target.value))}
        className="w-full accent-dojang-red"
        aria-label="Scrub frames"
      />
      <div className="mt-2 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onToggle}
          className="rounded-xl bg-dojang-red px-4 py-2 text-sm font-semibold text-white"
        >
          {playing ? "Pause" : "Play"}
        </button>
        <p className="text-xs tabular-nums text-muted">
          {frame + 1}/{Math.max(total, 1)} · {t.toFixed(2)}s
        </p>
        <div className="flex gap-1">
          <ToggleChip on={loop} onClick={onLoop} label="Loop" />
          <ToggleChip on={mirror} onClick={onMirror} label="Mirror" />
        </div>
      </div>
    </div>
  );
}

function ToggleChip({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl px-3 py-2 text-xs font-semibold uppercase tracking-wide",
        on ? "bg-dojang-teal/20 text-dojang-teal" : "bg-navy-lift text-muted",
      )}
    >
      {label}
    </button>
  );
}
