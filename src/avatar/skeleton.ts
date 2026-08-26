import { STAGE } from "./palette";
import { BONES, J, JOINT_NAMES } from "../pose/landmarks";
import {
  fastestExtremity,
  fitJoints,
  isEmptyFrame,
  isPresent,
  jointAt,
  parseJoints,
} from "../pose/joints";
import { inferMissing } from "../pose/infer";
import { readyStanceKeypoints } from "../pose/readyStance";
import type { Bounds } from "../types";

const BONE = "#8b97b8";
const JOINT = "#e8edf7";
const HOT = "#E5383B";
const TEAL = "#2DD4A7";

export function drawSkeleton(
  ctx: CanvasRenderingContext2D,
  keypoints: number[] | undefined,
  options: {
    mirror?: boolean;
    bounds?: Bounds | null;
    prev?: number[];
    labels?: boolean;
  } = {},
): void {
  const { width, height } = ctx.canvas;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = STAGE;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "rgba(45, 212, 167, 0.08)";
  ctx.lineWidth = 1;
  for (let x = 0; x < width; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  const source = !keypoints || isEmptyFrame(keypoints)
    ? inferMissing(parseJoints(readyStanceKeypoints()))
    : inferMissing(parseJoints(keypoints));
  const joints = fitJoints(source, width, height, options.bounds ?? null, options.mirror ?? false, 0.78);
  const hot = fastestExtremity(options.prev, keypoints ?? []);

  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const [a, b] of BONES) {
    const p = jointAt(joints, a);
    const q = jointAt(joints, b);
    if (!isPresent(p) || !isPresent(q)) continue;
    const onHot = hot !== null && (a === hot || b === hot);
    ctx.strokeStyle = onHot ? HOT : BONE;
    ctx.lineWidth = onHot ? 4 : 2.4;
    ctx.globalAlpha = Math.min(p.c, q.c) * 0.9 + 0.2;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(q.x, q.y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  for (let i = 0; i < joints.length; i++) {
    const p = jointAt(joints, i);
    if (!isPresent(p)) continue;
    const isHot = i === hot;
    const isCore = i === J.NECK || i === J.MID_HIP || i === J.NOSE;
    ctx.beginPath();
    ctx.arc(p.x, p.y, isHot ? 7 : isCore ? 5.5 : 4, 0, Math.PI * 2);
    ctx.fillStyle = isHot ? HOT : isCore ? TEAL : JOINT;
    ctx.fill();
    ctx.strokeStyle = STAGE;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    if (options.labels) {
      ctx.font = "10px Outfit, sans-serif";
      ctx.fillStyle = "rgba(232,237,247,0.65)";
      ctx.fillText(JOINT_NAMES[i] ?? String(i), p.x + 6, p.y - 6);
    }
  }
}
