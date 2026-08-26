import { useEffect, useRef, useState } from "react";
import { boundsFromFrames } from "../pose/joints";
import { drawAvatar } from "../avatar/renderer";
import { drawSkeleton } from "../avatar/skeleton";
import { idleStanceKeypoints } from "../pose/readyStance";
import type { Bounds } from "../types";
import { cn } from "../lib/cn";

interface AvatarStageProps {
  frames?: number[][];
  frame?: number;
  prevFrame?: number[];
  mode?: "avatar" | "skeleton";
  mirror?: boolean;
  idle?: boolean;
  autoPlay?: boolean;
  fps?: number;
  className?: string;
  labels?: boolean;
  bounds?: Bounds | null;
}

export function AvatarStage({
  frames,
  frame = 0,
  prevFrame,
  mode = "avatar",
  mirror = false,
  idle = false,
  autoPlay = false,
  fps = 30,
  className,
  labels = false,
  bounds,
}: AvatarStageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [pixelSize, setPixelSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const fit = () => {
      const rect = wrap.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(160, Math.floor(rect.width));
      const h = Math.max(200, Math.floor(rect.height));
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      setPixelSize((prev) =>
        prev.w === canvas.width && prev.h === canvas.height
          ? prev
          : { w: canvas.width, h: canvas.height },
      );
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const sequenceBounds = bounds ?? (frames && frames.length > 1 ? boundsFromFrames(frames) : null);

    if (idle) {
      let raf = 0;
      const tick = (t: number) => {
        drawAvatar(ctx, idleStanceKeypoints(t), { mirror, bounds: null });
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(raf);
    }

    if (autoPlay && frames && frames.length > 1) {
      let raf = 0;
      const origin = performance.now();
      const tick = (now: number) => {
        const i = Math.floor(((now - origin) / 1000) * Math.max(fps, 1)) % frames.length;
        const keypoints = frames[i];
        if (mode === "skeleton") {
          drawSkeleton(ctx, keypoints, {
            mirror,
            bounds: sequenceBounds,
            prev: frames[Math.max(0, i - 1)],
            labels,
          });
        } else {
          drawAvatar(ctx, keypoints, { mirror, bounds: sequenceBounds });
        }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(raf);
    }

    const keypoints = frames?.[frame];
    if (mode === "skeleton") {
      drawSkeleton(ctx, keypoints, {
        mirror,
        bounds: sequenceBounds,
        prev: prevFrame ?? frames?.[Math.max(0, frame - 1)],
        labels,
      });
    } else {
      drawAvatar(ctx, keypoints, { mirror, bounds: sequenceBounds });
    }
  }, [frames, frame, prevFrame, mode, mirror, idle, autoPlay, fps, labels, bounds, pixelSize]);

  return (
    <div ref={wrapRef} className={cn("relative overflow-hidden bg-navy", className)}>
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}
