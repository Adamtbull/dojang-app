import { STAGE } from "./palette";
import { BONES, J, JOINT_NAMES, openPoseJointCss } from "../pose/landmarks";
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

  const source =
    !keypoints || isEmptyFrame(keypoints)
      ? inferMissing(parseJoints(readyStanceKeypoints()))
      : inferMissing(parseJoints(keypoints));
  const joints = fitJoints(source, width, height, options.bounds ?? null, options.mirror ?? false, 0.78);
  const hot = fastestExtremity(options.prev, keypoints ?? []);
  const scale =
    isPresent(jointAt(joints, J.L_SHOULDER)) && isPresent(jointAt(joints, J.R_SHOULDER))
      ? Math.hypot(
          jointAt(joints, J.L_SHOULDER).x - jointAt(joints, J.R_SHOULDER).x,
          jointAt(joints, J.L_SHOULDER).y - jointAt(joints, J.R_SHOULDER).y,
        )
      : Math.min(width, height) * 0.28;
  const limbW = Math.max(4.5, scale * 0.07);
  const jointR = Math.max(3.4, scale * 0.045);

  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const [a, b] of BONES) {
    const p = jointAt(joints, a);
    const q = jointAt(joints, b);
    if (!isPresent(p) || !isPresent(q)) continue;
    const onHot = hot !== null && (a === hot || b === hot);
    ctx.strokeStyle = onHot ? "#E5383B" : openPoseJointCss(b);
    ctx.lineWidth = onHot ? limbW * 1.15 : limbW;
    ctx.globalAlpha = Math.min(p.c, q.c) * 0.85 + 0.15;
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
    ctx.beginPath();
    ctx.arc(p.x, p.y, isHot ? jointR * 1.35 : jointR, 0, Math.PI * 2);
    ctx.fillStyle = isHot ? "#E5383B" : openPoseJointCss(i);
    ctx.fill();
    ctx.strokeStyle = STAGE;
    ctx.lineWidth = Math.max(1.2, jointR * 0.28);
    ctx.stroke();

    if (options.labels) {
      ctx.font = "10px Outfit, sans-serif";
      ctx.fillStyle = "rgba(232,237,247,0.65)";
      ctx.fillText(JOINT_NAMES[i] ?? String(i), p.x + 6, p.y - 6);
    }
  }
}
