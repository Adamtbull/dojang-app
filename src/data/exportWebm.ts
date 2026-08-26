import { drawAvatar } from "../avatar/renderer";
import type { Bounds } from "../types";

function pickMime(): string {
  const types = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
  for (const type of types) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type)) return type;
  }
  return "video/webm";
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function recordAvatarWebm(
  frames: number[][],
  fps: number,
  bounds: Bounds | null = null,
  size = { width: 480, height: 640 },
): Promise<Blob> {
  if (typeof MediaRecorder === "undefined" || frames.length === 0) {
    throw new Error("WebM recording is not available in this browser.");
  }

  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not open a canvas to record the avatar.");

  const stream = canvas.captureStream(Math.max(1, fps));
  const mimeType = pickMime();
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 2_500_000 });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  };

  const stopped = new Promise<void>((resolve, reject) => {
    recorder.onstop = () => resolve();
    recorder.onerror = () => reject(new Error("WebM recording failed."));
  });

  recorder.start();
  const step = 1000 / Math.max(fps, 1);
  for (const frame of frames) {
    drawAvatar(ctx, frame, { bounds });
    await wait(step);
  }
  recorder.stop();
  stream.getTracks().forEach((track) => track.stop());
  await stopped;
  return new Blob(chunks, { type: mimeType.split(";")[0] });
}
