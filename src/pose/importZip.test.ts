import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { importArchive, importJsonText } from "../data/importZip";
import { zipMovement, zipOpenPoseJson } from "../data/exportZip";
import { sampleFrontKick } from "./readyStance";
import { openPoseFrameDocument, openPoseFrameFileName, OPENPOSE_SOURCE_MESSAGE } from "./openpose";
import type { MovementRecord } from "../types";
import { parseJoints } from "./joints";
import { J } from "./landmarks";

function movement(): MovementRecord {
  return {
    id: "11111111-2222-3333-4444-555555555555",
    name: "Ap Chagi",
    category: "Taekwondo",
    tags: ["kick"],
    notes: "chamber",
    fps: 30,
    width: 600,
    height: 1000,
    keypoints: sampleFrontKick(8),
    thumbnail: new Blob(["png"], { type: "image/png" }),
    createdAt: 1,
    updatedAt: 1,
  };
}

describe("import OpenPose and Dojang archives", () => {
  it("round-trips a Dojang zip including the openpose/ folder", async () => {
    const blob = await zipMovement(movement());
    const result = await importArchive(blob, "Ap Chagi");
    expect(result.kind).toBe("movements");
    if (result.kind !== "movements") return;
    expect(result.source).toBe("dojang");
    expect(result.drafts).toHaveLength(1);
    expect(result.drafts[0]?.keypoints).toHaveLength(8);
    expect(result.drafts[0]?.keypoints[0]).toHaveLength(75);
  });

  it("imports an official OpenPose --write_json zip", async () => {
    const frames = sampleFrontKick(5);
    const zip = new JSZip();
    frames.forEach((kp, i) => {
      zip.file(openPoseFrameFileName(i), JSON.stringify(openPoseFrameDocument(kp, { width: 600, height: 1000 })));
    });
    const blob = await zip.generateAsync({ type: "blob" });
    const result = await importArchive(blob, "desktop-openpose");
    expect(result.kind).toBe("movements");
    if (result.kind !== "movements") return;
    expect(result.source).toBe("openpose");
    expect(result.drafts[0]?.keypoints).toHaveLength(5);
    const peak = parseJoints(result.drafts[0]!.keypoints[2]!);
    expect(peak[J.L_ANKLE]?.c).toBeGreaterThan(0);
  });

  it("imports a zipOpenPoseJson export", async () => {
    const blob = await zipOpenPoseJson(movement());
    const result = await importArchive(blob, "ap-chagi-openpose.zip");
    expect(result.kind).toBe("movements");
    if (result.kind !== "movements") return;
    expect(result.drafts[0]?.keypoints).toHaveLength(8);
  });

  it("imports a single OpenPose JSON file", async () => {
    const doc = openPoseFrameDocument(sampleFrontKick(1)[0]!, { width: 600, height: 1000 });
    const result = await importJsonText(JSON.stringify(doc), "ready.json");
    expect(result.kind).toBe("movements");
    if (result.kind !== "movements") return;
    expect(result.drafts[0]?.keypoints).toHaveLength(1);
  });

  it("explains when the zip is OpenPose C++ source", async () => {
    const zip = new JSZip();
    zip.file("openpose-master/CMakeLists.txt", "cmake_minimum_required(VERSION 3.5)\nproject(OpenPose)\n");
    zip.file("openpose-master/include/openpose/pose/poseParameters.hpp", "#pragma once\nnamespace op {}\n");
    zip.file("openpose-master/src/openpose/pose/poseParameters.cpp", "// pose parameters\n");
    const blob = await zip.generateAsync({ type: "blob" });
    const result = await importArchive(blob, "openpose-master.zip");
    expect(result.kind).toBe("openpose-source");
    if (result.kind !== "openpose-source") return;
    expect(result.message).toBe(OPENPOSE_SOURCE_MESSAGE);
  });
});
