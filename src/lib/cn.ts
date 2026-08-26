export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function parseTags(input: string): string[] {
  return input
    .split(/[,#]/)
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 12);
}

export function formatDuration(frames: number, fps: number): string {
  const sec = frames / Math.max(fps, 1);
  if (sec < 10) return `${sec.toFixed(1)}s`;
  return `${Math.round(sec)}s`;
}
