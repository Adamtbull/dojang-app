import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { zipMovement, zipLibrary, slugify } from "../data/exportZip";
import { sampleFrontKick } from "./readyStance";
import type { MovementRecord } from "../types";

function movement(name: string): MovementRecord {
  return {
    id: "11111111-2222-3333-4444-555555555555",
    name,
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

describe("export zip", () => {
  it("slugifies movement names", () => {
    expect(slugify("Dollyo Chagi")).toBe("dollyo-chagi");
    expect(slugify("???")).toBe("movement");
  });

  it("packs manifest, metadata, and per-frame JSON for one movement", async () => {
    const blob = await zipMovement(movement("Ap Chagi"));
    const zip = await JSZip.loadAsync(blob);
    expect(Object.keys(zip.files)).toEqual(
      expect.arrayContaining([
        "manifest.json",
        "metadata.json",
        "frames/0000.json",
        "frames/0007.json",
      ]),
    );
    const manifest = JSON.parse(await zip.file("manifest.json")!.async("string"));
    expect(manifest.format).toBe("BODY_25");
    expect(manifest.type).toBe("movement");
    const frame = JSON.parse(await zip.file("frames/0000.json")!.async("string"));
    expect(frame.keypoints).toHaveLength(75);
    expect(frame.joints).toHaveLength(25);
  });

  it("packs a library with a top-level manifest", async () => {
    const blob = await zipLibrary([movement("One"), movement("Two")]);
    const zip = await JSZip.loadAsync(blob);
    const manifest = JSON.parse(await zip.file("manifest.json")!.async("string"));
    expect(manifest.type).toBe("library");
    expect(manifest.count).toBe(2);
    expect(zip.file("movements/one-11111111/metadata.json")).toBeTruthy();
  });
});
