import { PALETTE, STAGE, giTone } from "./palette";
import { inferMissing } from "../pose/infer";
import { J } from "../pose/landmarks";
import {
  add,
  dist,
  facingCamera,
  fitJoints,
  isEmptyFrame,
  isLegRaised,
  isPresent,
  jointAt,
  limbAlpha,
  mul,
  norm,
  parseJoints,
  perp,
  sub,
} from "../pose/joints";
import { readyStanceKeypoints } from "../pose/readyStance";
import type { Bounds, Joint } from "../types";

export interface DrawAvatarOptions {
  mirror?: boolean;
  bounds?: Bounds | null;
  background?: string;
}

function roundedPoly(
  ctx: CanvasRenderingContext2D,
  pts: { x: number; y: number }[],
): void {
  if (pts.length < 2) return;
  const first = pts[0];
  const last = pts[pts.length - 1];
  if (!first || !last) return;
  ctx.beginPath();
  ctx.moveTo((last.x + first.x) / 2, (last.y + first.y) / 2);
  for (let i = 0; i < pts.length; i++) {
    const cur = pts[i];
    const nxt = pts[(i + 1) % pts.length];
    if (!cur || !nxt) continue;
    ctx.quadraticCurveTo(cur.x, cur.y, (cur.x + nxt.x) / 2, (cur.y + nxt.y) / 2);
  }
  ctx.closePath();
}

function fillStroke(
  ctx: CanvasRenderingContext2D,
  fill: string,
  stroke: string,
  width: number,
): void {
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = width;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.stroke();
}

function circle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  fill: string,
  stroke?: string,
  width = 1.6,
): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    ctx.stroke();
  }
}

function taperedLimb(
  ctx: CanvasRenderingContext2D,
  a: Joint,
  b: Joint,
  wa: number,
  wb: number,
  fill: string,
  shade: string,
  outline: string,
  lineW: number,
): void {
  const angle = Math.atan2(b.y - a.y, b.x - a.x);
  ctx.beginPath();
  ctx.arc(a.x, a.y, wa, angle + Math.PI / 2, angle - Math.PI / 2, false);
  ctx.arc(b.x, b.y, wb, angle - Math.PI / 2, angle + Math.PI / 2, false);
  ctx.closePath();
  fillStroke(ctx, fill, outline, lineW);

  const nx = Math.cos(angle + Math.PI / 2);
  const ny = Math.sin(angle + Math.PI / 2);
  ctx.beginPath();
  ctx.arc(a.x, a.y, wa, angle, angle + Math.PI, false);
  ctx.arc(b.x, b.y, wb, angle + Math.PI, angle, false);
  ctx.closePath();
  ctx.fillStyle = shade;
  ctx.globalAlpha = 0.42;
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.beginPath();
  ctx.arc(a.x + nx * wa * 0.15, a.y + ny * wa * 0.15, Math.max(wa, wb) * 0.92, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.globalAlpha = 0.35;
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawFist(
  ctx: CanvasRenderingContext2D,
  wrist: Joint,
  elbow: Joint,
  size: number,
): void {
  const dir = norm(sub(wrist, elbow));
  const center = add(wrist, mul(dir, size * 0.52));
  const angle = Math.atan2(dir.y, dir.x);

  ctx.save();
  ctx.translate(center.x, center.y);
  ctx.rotate(angle);

  ctx.beginPath();
  const w = size * 1.05;
  const h = size * 0.78;
  const r = size * 0.28;
  roundedRectPath(ctx, -w * 0.48, -h * 0.5, w, h, r);
  fillStroke(ctx, PALETTE.skin, PALETTE.outline, Math.max(1.4, size * 0.08));

  ctx.beginPath();
  ctx.ellipse(-size * 0.08, -h * 0.52, size * 0.2, size * 0.28, -0.35, 0, Math.PI * 2);
  fillStroke(ctx, PALETTE.skinShade, PALETTE.outline, Math.max(1.2, size * 0.07));

  ctx.fillStyle = PALETTE.skinDeep;
  ctx.globalAlpha = 0.35;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.ellipse(size * 0.18, -size * 0.18 + i * size * 0.18, size * 0.16, size * 0.09, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function drawFoot(
  ctx: CanvasRenderingContext2D,
  ankle: Joint,
  heel: Joint,
  big: Joint,
  small: Joint,
  outline: number,
): void {
  if (!isPresent(ankle)) return;
  const pts = [heel, small, big, ankle].filter(isPresent);
  if (pts.length < 3) return;

  roundedPoly(ctx, pts);
  fillStroke(ctx, PALETTE.skin, PALETTE.outline, outline);

  const toeDir = norm(sub(big, heel));
  const toePerp = perp(toeDir);
  const toeBase = add(big, mul(toeDir, -4));
  for (let i = -1; i <= 1; i++) {
    const p = add(toeBase, mul(toePerp, i * 5.2));
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, 3.1, 4.4, Math.atan2(toeDir.y, toeDir.x), 0, Math.PI * 2);
    fillStroke(ctx, i === 0 ? PALETTE.skin : PALETTE.skinShade, PALETTE.outline, 1);
  }

  circle(ctx, ankle.x, ankle.y, 5.5, PALETTE.skin, PALETTE.outline, outline * 0.8);
}

function drawLeg(
  ctx: CanvasRenderingContext2D,
  hip: Joint,
  knee: Joint,
  ankle: Joint,
  heel: Joint,
  big: Joint,
  small: Joint,
  far: boolean,
  scale: number,
  alpha: number,
): void {
  if (!isPresent(hip) || !isPresent(knee)) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  const tone = giTone(far);
  const thighW = scale * 0.29;
  const kneeW = scale * 0.22;
  const calfW = scale * 0.185;
  const ankleW = scale * 0.12;
  const line = Math.max(1.6, scale * 0.028);

  if (isPresent(ankle)) {
    drawFoot(ctx, ankle, heel, big, small, line);
    taperedLimb(ctx, knee, ankle, calfW, ankleW, tone.fill, tone.shade, PALETTE.outline, line);
  }
  taperedLimb(ctx, hip, knee, thighW, kneeW, tone.fill, tone.shade, PALETTE.outline, line);
  ctx.restore();
}

function drawArm(
  ctx: CanvasRenderingContext2D,
  shoulder: Joint,
  elbow: Joint,
  wrist: Joint,
  far: boolean,
  scale: number,
  alpha: number,
): void {
  if (!isPresent(shoulder) || !isPresent(elbow)) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  const tone = giTone(far);
  const upper = scale * 0.2;
  const elbowW = scale * 0.165;
  const forearm = scale * 0.145;
  const wristW = scale * 0.11;
  const line = Math.max(1.6, scale * 0.028);
  const fist = scale * 0.095;

  if (isPresent(wrist)) {
    taperedLimb(ctx, elbow, wrist, forearm, wristW, tone.fill, tone.shade, PALETTE.outline, line);
    drawFist(ctx, wrist, elbow, fist);
  }
  taperedLimb(ctx, shoulder, elbow, upper, elbowW, tone.fill, tone.shade, PALETTE.outline, line);
  ctx.restore();
}

function drawPantsBridge(
  ctx: CanvasRenderingContext2D,
  lHip: Joint,
  rHip: Joint,
  lKnee: Joint,
  rKnee: Joint,
  scale: number,
): void {
  if (!isPresent(lHip) || !isPresent(rHip)) return;
  const tone = giTone(false);
  const mid = { x: (lHip.x + rHip.x) / 2, y: (lHip.y + rHip.y) / 2 + scale * 0.12 };
  const lDown = isPresent(lKnee) ? { x: (lHip.x + lKnee.x) / 2, y: (lHip.y + lKnee.y) / 2 } : lHip;
  const rDown = isPresent(rKnee) ? { x: (rHip.x + rKnee.x) / 2, y: (rHip.y + rKnee.y) / 2 } : rHip;
  roundedPoly(ctx, [
    { x: rHip.x - scale * 0.08, y: rHip.y - scale * 0.04 },
    { x: lHip.x + scale * 0.08, y: lHip.y - scale * 0.04 },
    lDown,
    mid,
    rDown,
  ]);
  fillStroke(ctx, tone.fill, PALETTE.outline, Math.max(1.5, scale * 0.024));
}

function drawJacket(
  ctx: CanvasRenderingContext2D,
  joints: Joint[],
  scale: number,
): void {
  const neck = jointAt(joints, J.NECK);
  const lSh = jointAt(joints, J.L_SHOULDER);
  const rSh = jointAt(joints, J.R_SHOULDER);
  const lHip = jointAt(joints, J.L_HIP);
  const rHip = jointAt(joints, J.R_HIP);
  const midHip = jointAt(joints, J.MID_HIP);
  if (!isPresent(lSh) || !isPresent(rSh) || !isPresent(midHip)) return;

  const shLine = sub(lSh, rSh);
  const shN = norm(shLine);
  const torsoDown = isPresent(neck) ? norm(sub(midHip, neck)) : { x: 0, y: 1 };
  const flare = scale * 0.22;
  const hem = scale * 0.38;
  const shoulderPad = scale * 0.1;

  const rOuter = add(add(rSh, mul(shN, -shoulderPad)), mul(torsoDown, -scale * 0.04));
  const lOuter = add(add(lSh, mul(shN, shoulderPad)), mul(torsoDown, -scale * 0.04));
  const rHem = add(add(isPresent(rHip) ? rHip : midHip, mul(shN, -flare)), mul(torsoDown, hem));
  const lHem = add(add(isPresent(lHip) ? lHip : midHip, mul(shN, flare)), mul(torsoDown, hem));
  const cHem = add(midHip, mul(torsoDown, hem * 1.05));

  roundedPoly(ctx, [rOuter, lOuter, lHem, cHem, rHem]);
  fillStroke(ctx, PALETTE.gi, PALETTE.outline, Math.max(1.8, scale * 0.03));

  ctx.beginPath();
  ctx.moveTo(rOuter.x, rOuter.y);
  ctx.quadraticCurveTo(midHip.x - scale * 0.12, midHip.y, cHem.x - scale * 0.04, cHem.y);
  ctx.lineTo(rHem.x, rHem.y);
  ctx.closePath();
  ctx.fillStyle = PALETTE.giShade;
  ctx.globalAlpha = 0.35;
  ctx.fill();
  ctx.globalAlpha = 1;

  const vDepth = dist(neck, midHip) * 0.36;
  const vPoint = isPresent(neck)
    ? add(neck, mul(torsoDown, vDepth))
    : add(midHip, mul(torsoDown, -scale * 0.55));
  const collarInset = scale * 0.085;
  const rInner = add(rSh, mul(shN, collarInset * 0.6));
  const lInner = add(lSh, mul(shN, -collarInset * 0.6));
  const rCol = add(rInner, mul(torsoDown, scale * 0.02));
  const lCol = add(lInner, mul(torsoDown, scale * 0.02));

  ctx.beginPath();
  ctx.moveTo(rCol.x, rCol.y);
  ctx.lineTo(vPoint.x, vPoint.y);
  ctx.lineTo(lCol.x, lCol.y);
  ctx.closePath();
  ctx.fillStyle = PALETTE.skin;
  ctx.fill();

  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  const navyW = Math.max(6.2, scale * 0.1);
  ctx.strokeStyle = PALETTE.trim;
  ctx.lineWidth = navyW + Math.max(2.4, scale * 0.038);
  ctx.beginPath();
  ctx.moveTo(rCol.x, rCol.y);
  ctx.lineTo(vPoint.x, vPoint.y);
  ctx.lineTo(lCol.x, lCol.y);
  ctx.stroke();
  ctx.strokeStyle = PALETTE.collar;
  ctx.lineWidth = navyW;
  ctx.beginPath();
  ctx.moveTo(rCol.x, rCol.y);
  ctx.lineTo(vPoint.x, vPoint.y);
  ctx.lineTo(lCol.x, lCol.y);
  ctx.stroke();

  ctx.strokeStyle = PALETTE.giDeep;
  ctx.globalAlpha = 0.7;
  ctx.lineWidth = Math.max(1.4, scale * 0.022);
  ctx.beginPath();
  ctx.moveTo(rInner.x + torsoDown.x * scale * 0.08, rInner.y + torsoDown.y * scale * 0.08);
  ctx.quadraticCurveTo(
    vPoint.x - scale * 0.12,
    midHip.y - scale * 0.08,
    midHip.x + scale * 0.02,
    midHip.y - scale * 0.02,
  );
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawBelt(ctx: CanvasRenderingContext2D, joints: Joint[], scale: number): void {
  const lHip = jointAt(joints, J.L_HIP);
  const rHip = jointAt(joints, J.R_HIP);
  const midHip = jointAt(joints, J.MID_HIP);
  if (!isPresent(midHip)) return;

  const width = isPresent(lHip) && isPresent(rHip) ? dist(lHip, rHip) * 1.25 : scale * 0.7;
  const height = scale * 0.11;
  const angle =
    isPresent(lHip) && isPresent(rHip) ? Math.atan2(lHip.y - rHip.y, lHip.x - rHip.x) : 0;

  ctx.save();
  ctx.translate(midHip.x, midHip.y - height * 0.15);
  ctx.rotate(angle);
  ctx.beginPath();
  roundedRectPath(ctx, -width / 2, -height / 2, width, height, height * 0.25);
  fillStroke(ctx, PALETTE.belt, PALETTE.outline, Math.max(1.5, scale * 0.024));

  ctx.fillStyle = PALETTE.beltShade;
  ctx.fillRect(-width / 2 + 4, 0, width - 8, height * 0.28);

  const knotW = height * 1.15;
  const knotH = height * 1.05;
  ctx.beginPath();
  roundedRectPath(ctx, -knotW * 0.55, -knotH * 0.55, knotW, knotH, 4);
  fillStroke(ctx, PALETTE.belt, PALETTE.outline, 1.6);
  ctx.beginPath();
  roundedRectPath(ctx, -knotW * 0.2, -knotH * 0.55, knotW * 0.55, knotH, 4);
  fillStroke(ctx, PALETTE.beltShade, PALETTE.outline, 1.4);

  const tail = (ox: number, redTab: boolean) => {
    ctx.beginPath();
    roundedRectPath(ctx, ox, height * 0.35, height * 0.42, scale * 0.42, 3);
    fillStroke(ctx, PALETTE.belt, PALETTE.outline, 1.4);
    if (redTab) {
      ctx.fillStyle = PALETTE.trim;
      ctx.fillRect(ox + 2, height * 0.35 + scale * 0.3, height * 0.42 - 4, 5);
    }
  };
  tail(-height * 0.55, false);
  tail(height * 0.12, true);
  ctx.restore();
}

function drawHead(ctx: CanvasRenderingContext2D, joints: Joint[], scale: number): void {
  const neck = jointAt(joints, J.NECK);
  const nose = jointAt(joints, J.NOSE);
  if (!isPresent(neck) && !isPresent(nose)) return;

  const headW = scale / 3;
  const headH = headW * 1.16;
  const origin = isPresent(neck) ? neck : nose;
  const toward = isPresent(nose) && isPresent(neck) ? sub(nose, neck) : { x: 0, y: -1 };
  const up = norm({ x: -toward.x, y: -toward.y });
  const down = { x: -up.x, y: -up.y };
  const center = isPresent(nose)
    ? add(nose, mul(down, headH * 0.28))
    : add(origin, mul(up, headH * 0.55));
  const angle = Math.atan2(down.x, -down.y);

  const lEye = jointAt(joints, J.L_EYE);
  const rEye = jointAt(joints, J.R_EYE);

  ctx.save();
  ctx.translate(center.x, center.y);
  ctx.rotate(angle);

  const neckW = headW * 0.42;
  ctx.beginPath();
  ctx.moveTo(-neckW, headH * 0.28);
  ctx.lineTo(neckW, headH * 0.28);
  ctx.lineTo(neckW * 0.7, headH * 0.72);
  ctx.lineTo(-neckW * 0.7, headH * 0.72);
  ctx.closePath();
  fillStroke(ctx, PALETTE.skin, PALETTE.outline, Math.max(1.5, scale * 0.024));

  const earY = headH * 0.02;
  const earX = headW * 0.52;
  const drawEar = (x: number) => {
    ctx.beginPath();
    ctx.ellipse(x, earY, headW * 0.11, headH * 0.16, 0, 0, Math.PI * 2);
    fillStroke(ctx, PALETTE.skin, PALETTE.outline, 1.5);
    ctx.beginPath();
    ctx.ellipse(x + Math.sign(x) * -2, earY + 1, headW * 0.05, headH * 0.08, 0, 0, Math.PI * 2);
    ctx.fillStyle = PALETTE.skinShade;
    ctx.fill();
  };
  drawEar(-earX);
  drawEar(earX);

  ctx.beginPath();
  ctx.ellipse(0, 0, headW * 0.5, headH * 0.5, 0, 0, Math.PI * 2);
  fillStroke(ctx, PALETTE.skin, PALETTE.outline, Math.max(1.7, scale * 0.026));

  ctx.beginPath();
  ctx.ellipse(-headW * 0.12, headH * 0.08, headW * 0.28, headH * 0.22, -0.4, 0, Math.PI * 2);
  ctx.fillStyle = PALETTE.skinShade;
  ctx.globalAlpha = 0.28;
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.beginPath();
  ctx.moveTo(-headW * 0.46, -headH * 0.02);
  ctx.bezierCurveTo(-headW * 0.5, -headH * 0.62, headW * 0.18, -headH * 0.72, headW * 0.42, -headH * 0.18);
  ctx.bezierCurveTo(headW * 0.46, -headH * 0.02, headW * 0.3, headH * 0.06, headW * 0.18, -headH * 0.08);
  ctx.quadraticCurveTo(headW * 0.02, headH * 0.16, -headW * 0.16, -headH * 0.02);
  ctx.quadraticCurveTo(-headW * 0.28, headH * 0.12, -headW * 0.42, -headH * 0.02);
  ctx.closePath();
  fillStroke(ctx, PALETTE.hair, PALETTE.outline, 1.6);

  ctx.beginPath();
  ctx.ellipse(-headW * 0.08, -headH * 0.38, headW * 0.22, headH * 0.1, -0.4, 0, Math.PI * 2);
  ctx.fillStyle = PALETTE.hairHi;
  ctx.globalAlpha = 0.35;
  ctx.fill();
  ctx.globalAlpha = 1;

  const toLocal = (p: Joint) => {
    const dx = p.x - center.x;
    const dy = p.y - center.y;
    const c = Math.cos(-angle);
    const s = Math.sin(-angle);
    return { x: dx * c - dy * s, y: dx * s + dy * c };
  };

  const eyeL = isPresent(lEye) ? toLocal(lEye) : { x: headW * 0.16, y: -headH * 0.04 };
  const eyeR = isPresent(rEye) ? toLocal(rEye) : { x: -headW * 0.16, y: -headH * 0.04 };

  const paintEye = (e: { x: number; y: number }) => {
    ctx.beginPath();
    ctx.ellipse(e.x, e.y, headW * 0.055, headH * 0.07, 0, 0, Math.PI * 2);
    ctx.fillStyle = PALETTE.eye;
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(e.x - 1.2, e.y + headH * 0.09, headW * 0.05, 2.2, 0, 0, Math.PI * 2);
    ctx.fillStyle = PALETTE.skinShade;
    ctx.globalAlpha = 0.35;
    ctx.fill();
    ctx.globalAlpha = 1;
  };
  paintEye(eyeR);
  paintEye(eyeL);

  ctx.strokeStyle = PALETTE.brow;
  ctx.lineWidth = Math.max(2.1, headW * 0.07);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(eyeR.x - headW * 0.09, eyeR.y - headH * 0.11);
  ctx.lineTo(eyeR.x + headW * 0.07, eyeR.y - headH * 0.13);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(eyeL.x + headW * 0.09, eyeL.y - headH * 0.11);
  ctx.lineTo(eyeL.x - headW * 0.07, eyeL.y - headH * 0.13);
  ctx.stroke();

  ctx.strokeStyle = PALETTE.skinDeep;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(0, headH * 0.02);
  ctx.lineTo(-headW * 0.03, headH * 0.14);
  ctx.stroke();

  ctx.strokeStyle = PALETTE.lip;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(-headW * 0.07, headH * 0.24);
  ctx.quadraticCurveTo(0, headH * 0.27, headW * 0.07, headH * 0.24);
  ctx.stroke();

  ctx.restore();
}

function drawShadow(ctx: CanvasRenderingContext2D, joints: Joint[], w: number, h: number): void {
  const l = jointAt(joints, J.L_ANKLE);
  const r = jointAt(joints, J.R_ANKLE);
  const feet = [l, r].filter(isPresent);
  if (feet.length === 0) {
    ctx.fillStyle = PALETTE.shadow;
    ctx.beginPath();
    ctx.ellipse(w / 2, h * 0.86, w * 0.22, h * 0.035, 0, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  const cx = feet.reduce((s, p) => s + p.x, 0) / feet.length;
  const cy = Math.max(...feet.map((p) => p.y)) + 10;
  const spread = feet.length === 2 ? Math.abs(feet[0]!.x - feet[1]!.x) * 0.7 + 36 : 48;
  ctx.fillStyle = PALETTE.shadow;
  ctx.beginPath();
  ctx.ellipse(cx, cy, spread, Math.max(10, spread * 0.16), 0, 0, Math.PI * 2);
  ctx.fill();
}

function resolvedJoints(keypoints: number[] | undefined): Joint[] {
  if (!keypoints || isEmptyFrame(keypoints)) {
    return inferMissing(parseJoints(readyStanceKeypoints()));
  }
  return inferMissing(parseJoints(keypoints));
}

export function drawAvatar(
  ctx: CanvasRenderingContext2D,
  keypoints: number[] | undefined,
  options: DrawAvatarOptions = {},
): void {
  const { mirror = false, bounds = null, background = STAGE } = options;
  const { width, height } = ctx.canvas;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  const source = resolvedJoints(keypoints);
  const joints = fitJoints(source, width, height, bounds ?? null, mirror, 0.78);
  const lSh = jointAt(joints, J.L_SHOULDER);
  const rSh = jointAt(joints, J.R_SHOULDER);
  const scale =
    isPresent(lSh) && isPresent(rSh) ? dist(lSh, rSh) : Math.min(width, height) * 0.28;

  drawShadow(ctx, joints, width, height);

  const face = facingCamera(joints);
  const farIsRight = face;
  const lHip = jointAt(joints, J.L_HIP);
  const rHip = jointAt(joints, J.R_HIP);
  const lKnee = jointAt(joints, J.L_KNEE);
  const rKnee = jointAt(joints, J.R_KNEE);
  const lAnkle = jointAt(joints, J.L_ANKLE);
  const rAnkle = jointAt(joints, J.R_ANKLE);
  const leftRaised = isLegRaised(lHip, lAnkle, lKnee);
  const rightRaised = isLegRaised(rHip, rAnkle, rKnee);

  const paintLeg = (left: boolean, far: boolean) => {
    drawLeg(
      ctx,
      jointAt(joints, left ? J.L_HIP : J.R_HIP),
      jointAt(joints, left ? J.L_KNEE : J.R_KNEE),
      jointAt(joints, left ? J.L_ANKLE : J.R_ANKLE),
      jointAt(joints, left ? J.L_HEEL : J.R_HEEL),
      jointAt(joints, left ? J.L_BIG_TOE : J.R_BIG_TOE),
      jointAt(joints, left ? J.L_SMALL_TOE : J.R_SMALL_TOE),
      far,
      scale,
      limbAlpha(joints, left ? [J.L_HIP, J.L_KNEE, J.L_ANKLE] : [J.R_HIP, J.R_KNEE, J.R_ANKLE]),
    );
  };
  const paintArm = (left: boolean, far: boolean) => {
    drawArm(
      ctx,
      jointAt(joints, left ? J.L_SHOULDER : J.R_SHOULDER),
      jointAt(joints, left ? J.L_ELBOW : J.R_ELBOW),
      jointAt(joints, left ? J.L_WRIST : J.R_WRIST),
      far,
      scale,
      limbAlpha(
        joints,
        left ? [J.L_SHOULDER, J.L_ELBOW, J.L_WRIST] : [J.R_SHOULDER, J.R_ELBOW, J.R_WRIST],
      ),
    );
  };

  if (!leftRaised) paintLeg(true, !farIsRight);
  if (!rightRaised) paintLeg(false, farIsRight);
  drawPantsBridge(ctx, lHip, rHip, lKnee, rKnee, scale);

  paintArm(!farIsRight, true);
  drawJacket(ctx, joints, scale);
  drawBelt(ctx, joints, scale);

  if (leftRaised) paintLeg(true, !farIsRight);
  if (rightRaised) paintLeg(false, farIsRight);

  paintArm(farIsRight, false);
  drawHead(ctx, joints, scale);
}

export function renderAvatarToCanvas(
  canvas: HTMLCanvasElement,
  keypoints: number[] | undefined,
  options: DrawAvatarOptions = {},
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  drawAvatar(ctx, keypoints, options);
}

export async function avatarFrameToBlob(
  keypoints: number[] | undefined,
  width = 480,
  height = 640,
  bounds?: Bounds | null,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  renderAvatarToCanvas(canvas, keypoints, { bounds: bounds ?? null });
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/png"),
  );
  return blob ?? new Blob();
}
