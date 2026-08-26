import { mediapipeToBody25 } from "./convert";
import { createPoseLandmarker } from "./landmarker";
import type { ExtractProgress, ExtractResult } from "../types";

const TARGET_FPS = 30;
const MAX_DURATION = 20;

function waitForEvent(el: HTMLMediaElement, event: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const onOk = () => {
      cleanup();
      resolve();
    };
    const onErr = () => {
      cleanup();
      reject(new Error("Video failed to load. Try mp4 or webm."));
    };
    const cleanup = () => {
      el.removeEventListener(event, onOk);
      el.removeEventListener("error", onErr);
    };
    el.addEventListener(event, onOk, { once: true });
    el.addEventListener("error", onErr, { once: true });
  });
}

async function seekTo(video: HTMLVideoElement, time: number): Promise<void> {
  if (Number.isNaN(time)) return;
  const clamped = Math.min(Math.max(0, time), Math.max(0, video.duration - 0.001));
  if (Math.abs(video.currentTime - clamped) < 0.0005 && !video.seeking) return;
  await new Promise<void>((resolve, reject) => {
    const onSeeked = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error("Could not seek in this video."));
    };
    const cleanup = () => {
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("error", onError);
    };
    video.addEventListener("seeked", onSeeked);
    video.addEventListener("error", onError);
    video.currentTime = clamped;
  });
}

export async function extractPoses(
  file: File,
  onProgress: (progress: ExtractProgress) => void,
  signal?: AbortSignal,
): Promise<ExtractResult> {
  const throwIfAborted = () => {
    if (signal?.aborted) throw new DOMException("Extraction cancelled", "AbortError");
  };

  onProgress({
    phase: "loading-model",
    ratio: 0.02,
    frame: 0,
    totalFrames: 0,
    message: "Loading pose model…",
  });

  const landmarker = await createPoseLandmarker();
  throwIfAborted();

  onProgress({
    phase: "decoding",
    ratio: 0.08,
    frame: 0,
    totalFrames: 0,
    message: "Reading video…",
  });

  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.src = url;
  video.crossOrigin = "anonymous";

  try {
    await waitForEvent(video, "loadedmetadata");
    if (video.readyState < 2) {
      video.load();
      await waitForEvent(video, "loadeddata");
    }
    throwIfAborted();

    const duration = Math.min(video.duration || 0, MAX_DURATION);
    if (!Number.isFinite(duration) || duration <= 0) {
      throw new Error("This video has no readable duration.");
    }

    const width = video.videoWidth || 720;
    const height = video.videoHeight || 1280;
    const fps = TARGET_FPS;
    const totalFrames = Math.max(1, Math.round(duration * fps));
    const keypoints: number[][] = [];

    await seekTo(video, 0);

    for (let i = 0; i < totalFrames; i++) {
      throwIfAborted();
      const t = Math.min(duration - 0.0005, i / fps);
      await seekTo(video, t);
      const timestampMs = t * 1000 + i * 0.001;
      const result = landmarker.detectForVideo(video, timestampMs);
      const pose = result.landmarks[0];
      keypoints.push(mediapipeToBody25(pose, width, height));

      if (i % 2 === 0 || i === totalFrames - 1) {
        onProgress({
          phase: "extracting",
          ratio: 0.1 + (0.85 * (i + 1)) / totalFrames,
          frame: i + 1,
          totalFrames,
          message: `Reading pose ${i + 1} / ${totalFrames}`,
        });
        await new Promise((r) => requestAnimationFrame(r));
      }
    }

    onProgress({
      phase: "rendering",
      ratio: 0.97,
      frame: totalFrames,
      totalFrames,
      message: "Composing avatar…",
    });

    return {
      fps,
      width,
      height,
      duration,
      keypoints,
      videoBlob: file,
    };
  } finally {
    landmarker.close();
    URL.revokeObjectURL(url);
    video.src = "";
  }
}

export function blobUrl(blob: Blob): string {
  return URL.createObjectURL(blob);
}
