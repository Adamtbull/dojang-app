export const CATEGORIES = [
  "Taekwondo",
  "Calisthenics",
  "Stretching",
  "Custom",
] as const;

export type Category = (typeof CATEGORIES)[number];

export type ViewMode = "avatar" | "skeleton" | "split";

export type PoseSource = "mediapipe" | "openpose" | "dojang";

export interface Joint {
  x: number;
  y: number;
  c: number;
}

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface MovementRecord {
  id: string;
  name: string;
  category: Category;
  tags: string[];
  notes: string;
  fps: number;
  width: number;
  height: number;
  keypoints: number[][];
  thumbnail: Blob;
  video?: Blob;
  createdAt: number;
  updatedAt: number;
  source?: PoseSource;
}

export interface ExtractProgress {
  phase: "loading-model" | "decoding" | "extracting" | "rendering";
  ratio: number;
  frame: number;
  totalFrames: number;
  message: string;
}

export interface ExtractResult {
  fps: number;
  width: number;
  height: number;
  duration: number;
  keypoints: number[][];
  videoBlob: Blob;
}

export interface SaveDraft {
  name: string;
  category: Category;
  tags: string;
  notes: string;
}
