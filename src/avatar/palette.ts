export const STAGE = "#0A1024";

export const PALETTE = {
  outline: "#1A2744",
  outlineSoft: "#243154",
  gi: "#F3F5F8",
  giShade: "#C9D2DE",
  giDeep: "#A8B4C6",
  giFar: "#B7C2D1",
  giFarShade: "#9AA7B8",
  collar: "#152038",
  collarHi: "#1E2E4F",
  trim: "#E5383B",
  belt: "#F7F8FB",
  beltShade: "#D5DCE6",
  skin: "#E2B48A",
  skinShade: "#C99262",
  skinDeep: "#B57A4E",
  hair: "#0C1324",
  hairHi: "#1A2744",
  eye: "#141820",
  brow: "#12161F",
  lip: "#9A5A4A",
  shadow: "rgba(2, 6, 18, 0.55)",
} as const;

export type GiTone = {
  fill: string;
  shade: string;
  deep: string;
};

export function giTone(far: boolean): GiTone {
  return far
    ? { fill: PALETTE.giFar, shade: PALETTE.giFarShade, deep: PALETTE.giDeep }
    : { fill: PALETTE.gi, shade: PALETTE.giShade, deep: PALETTE.giDeep };
}
