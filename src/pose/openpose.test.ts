import { describe, expect, it } from "vitest";
import {
  coco18ToBody25,
  detectPoseModel,
  framesFromUnknown,
  isOpenPoseSourceTree,
  keypointsFromUnknown,
  mpi15ToBody25,
  openPoseFrameDocument,
  openPoseFrameFileName,
  pickBestPerson,
  rescaleOpenPoseSequence,
  toBody25,
} from "./openpose";
import { BONES, J, KEYPOINT_LENGTH, OPENPOSE_JOINT_COLORS } from "./landmarks";
import { parseJoints } from "./joints";
import { readyStanceKeypoints } from "./readyStance";

function sparse(map: Partial<Record<number, [number, number, number]>>): number[] {
  const out = new Array<number>(KEYPOINT_LENGTH).fill(0);
  for (const [key, xyz] of Object.entries(map)) {
    if (!xyz) continue;
    const i = Number(key) * 3;
    out[i] = xyz[0];
    out[i + 1] = xyz[1];
    out[i + 2] = xyz[2];
  }
  return out;
}

describe("OpenPose BODY_25 spec", () => {
  it("has 24 official render pairs and 25 joint colors", () => {
    expect(BONES).toHaveLength(24);
    expect(OPENPOSE_JOINT_COLORS).toHaveLength(25);
    expect(BONES[0]).toEqual([J.NECK, J.MID_HIP]);
  });

  it("names OpenPose --write_json frames with 12-digit indices", () => {
    expect(openPoseFrameFileName(0)).toBe("000000000000_keypoints.json");
    expect(openPoseFrameFileName(12)).toBe("000000000012_keypoints.json");
  });
});

describe("OpenPose JSON parse", () => {
  it("reads people[].pose_keypoints_2d and picks the stronger person", () => {
    const weak = readyStanceKeypoints().map((n, i) => (i % 3 === 2 ? 0.1 : n));
    const strong = readyStanceKeypoints();
    strong[0] = 100;
    strong[1] = 40;
    strong[2] = 0.95;
    const picked = pickBestPerson([
      { pose_keypoints_2d: weak },
      { pose_keypoints_2d: strong },
    ]);
    expect(picked?.[0]).toBe(100);
    expect(picked?.[2]).toBe(0.95);
  });

  it("accepts a raw 75-number array and an official frame document", () => {
    const pose = readyStanceKeypoints();
    expect(keypointsFromUnknown(pose)).toHaveLength(KEYPOINT_LENGTH);
    const doc = openPoseFrameDocument(pose, { width: 600, height: 1000 });
    expect(doc.people?.[0]?.pose_keypoints_2d).toHaveLength(75);
    expect(framesFromUnknown(doc)).toHaveLength(1);
  });

  it("lifts COCO-18 and MPI-15 into BODY_25", () => {
    expect(detectPoseModel(54)).toBe("COCO_18");
    expect(detectPoseModel(45)).toBe("MPI_15");
    const coco = new Array(54).fill(0);
    coco[0] = 50;
    coco[1] = 20;
    coco[2] = 1;
    coco[8 * 3] = 40;
    coco[8 * 3 + 1] = 80;
    coco[8 * 3 + 2] = 1;
    coco[11 * 3] = 60;
    coco[11 * 3 + 1] = 80;
    coco[11 * 3 + 2] = 1;
    const lifted = coco18ToBody25(coco);
    const joints = parseJoints(lifted);
    expect(joints[J.NOSE]?.x).toBe(50);
    expect(joints[J.MID_HIP]?.x).toBe(50);
    expect(joints[J.R_HIP]?.x).toBe(40);
    expect(joints[J.L_HIP]?.x).toBe(60);
    expect(joints[J.L_ANKLE]?.c).toBe(0);

    const mpi = mpi15ToBody25(new Array(45).fill(0).map((_, i) => (i % 3 === 2 ? 1 : i)));
    expect(toBody25(mpi)).toHaveLength(75);
  });

  it("scales unit and signed keypoints into pixel space", () => {
    const unit = sparse({
      [J.NOSE]: [0.5, 0.1, 1],
      [J.L_ANKLE]: [0.6, 0.9, 1],
      [J.R_ANKLE]: [0.4, 0.9, 1],
    });
    const scaled = rescaleOpenPoseSequence([unit]);
    expect(scaled.normalized).toBe(true);
    expect(scaled.width).toBe(1920);
    expect(scaled.frames[0]![0]).toBeCloseTo(960);

    const signed = sparse({
      [J.NOSE]: [0, -0.8, 1],
      [J.MID_HIP]: [0, 0, 1],
    });
    const mapped = rescaleOpenPoseSequence([signed]);
    expect(mapped.normalized).toBe(true);
    expect(mapped.frames[0]![0]).toBeCloseTo(960);
  });
});

describe("OpenPose source tree detection", () => {
  it("recognizes GitHub master.zip paths", () => {
    expect(
      isOpenPoseSourceTree([
        "openpose-master/CMakeLists.txt",
        "openpose-master/include/openpose/pose/poseParameters.hpp",
        "openpose-master/src/openpose/pose/poseParameters.cpp",
      ]),
    ).toBe(true);
    expect(isOpenPoseSourceTree(["frames/0000.json", "manifest.json"])).toBe(false);
  });
});
