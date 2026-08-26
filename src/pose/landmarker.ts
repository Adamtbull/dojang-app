import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";

const PACKAGE_VERSION = "0.10.32";
export const WASM_CDN = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${PACKAGE_VERSION}/wasm`;
export const MODEL_CDN =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task";

let filesetPromise: ReturnType<typeof FilesetResolver.forVisionTasks> | null = null;

async function visionFileset() {
  if (!filesetPromise) {
    filesetPromise = FilesetResolver.forVisionTasks(WASM_CDN);
  }
  return filesetPromise;
}

export async function createPoseLandmarker(): Promise<PoseLandmarker> {
  const vision = await visionFileset();
  try {
    return await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: MODEL_CDN,
        delegate: "GPU",
      },
      runningMode: "VIDEO",
      numPoses: 1,
      minPoseDetectionConfidence: 0.4,
      minPosePresenceConfidence: 0.4,
      minTrackingConfidence: 0.4,
    });
  } catch {
    return PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: MODEL_CDN,
        delegate: "CPU",
      },
      runningMode: "VIDEO",
      numPoses: 1,
      minPoseDetectionConfidence: 0.4,
      minPosePresenceConfidence: 0.4,
      minTrackingConfidence: 0.4,
    });
  }
}

export function warmupModelFetch(): void {
  void fetch(MODEL_CDN, { mode: "cors" }).catch(() => undefined);
}
