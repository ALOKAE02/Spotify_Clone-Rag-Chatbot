/** Deterministic helpers for generated cover art: the same seed always draws the same picture. */

export function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Small seeded PRNG (mulberry32). Returns numbers in [0, 1). */
export function seededRandom(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export function hexToHsl(hex: string): [number, number, number] {
  let m = hex.replace('#', '');
  if (m.length === 3) m = m.split('').map((c) => c + c).join('');
  const n = parseInt(m, 16);
  return rgbToHsl((n >> 16) & 255, (n >> 8) & 255, n & 255);
}

/** RGB channels 0-255 -> [hue 0-360, saturation 0-100, lightness 0-100]. */
export function rgbToHsl(red: number, green: number, blue: number): [number, number, number] {
  const r = red / 255;
  const g = green / 255;
  const b = blue / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return [h, s * 100, l * 100];
}

export const hsl = (h: number, s: number, l: number) =>
  `hsl(${(((h % 360) + 360) % 360).toFixed(1)} ${clamp(s, 0, 100).toFixed(1)}% ${clamp(l, 0, 100).toFixed(1)}%)`;

/** "The Velvet Hours" -> "VH", "Kairo" -> "K". */
export function initials(name: string) {
  const skip = new Set(['the', '&', 'and', 'of']);
  const words = name.split(/\s+/).filter((w) => !skip.has(w.toLowerCase()));
  return words
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');
}

/** Break a title into at most `maxLines` short lines for printing on a cover. */
export function coverLines(title: string, maxChars = 12, maxLines = 2) {
  const words = title.replace(/\(.*?\)/g, '').trim().split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxChars) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = word;
    }
    if (lines.length === maxLines) break;
  }
  if (current && lines.length < maxLines) lines.push(current);
  return lines.map((line) => (line.length > maxChars + 2 ? `${line.slice(0, maxChars)}…` : line));
}
