import { useEffect, useState } from 'react';
import { hsl, rgbToHsl } from '../lib/art';

const cache = new Map<string, string>();

/** Average colour of an image, biased towards vivid pixels and kept dark enough for white text. */
function averageColor(img: HTMLImageElement): string | null {
  try {
    const size = 24;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, size, size);
    const { data } = ctx.getImageData(0, 0, size, size);
    let r = 0;
    let g = 0;
    let b = 0;
    let total = 0;
    for (let i = 0; i < data.length; i += 4) {
      const max = Math.max(data[i], data[i + 1], data[i + 2]);
      const min = Math.min(data[i], data[i + 1], data[i + 2]);
      const weight = 0.15 + (max === 0 ? 0 : (max - min) / max) * (max / 255);
      r += data[i] * weight;
      g += data[i + 1] * weight;
      b += data[i + 2] * weight;
      total += weight;
    }
    const [h, s, l] = rgbToHsl(r / total, g / total, b / total);
    return hsl(h, Math.min(s * 1.1, 65), Math.min(Math.max(l, 28), 42));
  } catch {
    return null; // image not CORS-readable
  }
}

/** Returns the artwork's dominant colour once it has loaded, `fallback` until then. */
export function useDominantColor(src: string | undefined, fallback: string) {
  const [result, setResult] = useState<{ src: string; color: string } | null>(null);

  useEffect(() => {
    if (!src || cache.has(src)) return;
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const color = averageColor(img);
      if (!color) return;
      cache.set(src, color);
      if (!cancelled) setResult({ src, color });
    };
    img.src = src;
    return () => {
      cancelled = true;
    };
  }, [src]);

  if (!src) return fallback;
  return cache.get(src) ?? (result?.src === src ? result.color : fallback);
}
