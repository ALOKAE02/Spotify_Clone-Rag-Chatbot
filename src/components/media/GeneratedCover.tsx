import { useId, type ReactNode } from 'react';
import { coverLines, hashString, hexToHsl, hsl, initials, seededRandom } from '../../lib/art';

interface GeneratedCoverProps {
  seed: string;
  color: string;
  title: string;
  shape?: 'square' | 'circle';
}

interface Palette {
  c1: string;
  c2: string;
  accent: string;
  light: string;
  gradient: string;
  blur: string;
  r: () => number;
}

const range = (n: number) => Array.from({ length: n }, (_, i) => i);

/** Abstract patterns for song and album covers. One is picked per seed. */
const PATTERNS: Array<(p: Palette) => ReactNode> = [
  // Retro sunset
  ({ c2, accent, gradient, r }) => (
    <>
      <rect width="100" height="100" fill={`url(#${gradient})`} />
      <circle cx="50" cy="56" r={22 + r() * 8} fill={accent} />
      {range(7).map((i) => (
        <rect key={i} x="0" y={58 + i * 6} width="100" height={1.2 + i * 0.55} fill={c2} />
      ))}
    </>
  ),
  // Concentric rings
  ({ c2, accent, light, r }) => {
    const cx = 20 + r() * 60;
    const cy = 20 + r() * 60;
    return (
      <>
        <rect width="100" height="100" fill={c2} />
        {range(10).map((i) => (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={5 + i * 9}
            fill="none"
            stroke={i % 2 ? light : accent}
            strokeOpacity={0.8}
            strokeWidth={3.2}
          />
        ))}
      </>
    );
  },
  // Diagonal stripes
  ({ c1, accent, light, r }) => {
    const angle = [45, -30, 60, -60][Math.floor(r() * 4)];
    return (
      <>
        <rect width="100" height="100" fill={c1} />
        <g transform={`rotate(${angle} 50 50)`}>
          {range(15).map((i) => (
            <rect key={i} x={-55 + i * 14} y="-60" width={4 + (i % 3) * 2} height="220" fill={i % 2 ? accent : light} opacity={0.75} />
          ))}
        </g>
      </>
    );
  },
  // Soft colour blobs
  ({ c1, c2, accent, light, blur, r }) => (
    <>
      <rect width="100" height="100" fill={c2} />
      <g filter={`url(#${blur})`}>
        {[c1, accent, light].map((fill, i) => (
          <circle key={i} cx={10 + r() * 80} cy={10 + r() * 80} r={22 + r() * 22} fill={fill} opacity={i === 2 ? 0.55 : 0.9} />
        ))}
      </g>
    </>
  ),
  // Dot grid
  ({ light, gradient, r }) => (
    <>
      <rect width="100" height="100" fill={`url(#${gradient})`} />
      {range(36).map((i) => (
        <circle key={i} cx={15 + (i % 6) * 14} cy={15 + Math.floor(i / 6) * 14} r={1.4 + r() * 4} fill={light} opacity={0.9} />
      ))}
    </>
  ),
  // Waves
  ({ c1, accent, light, r }) => (
    <>
      <rect width="100" height="100" fill={c1} />
      {range(9).map((i) => {
        const y = 8 + i * 11;
        const a = 4 + r() * 6;
        return (
          <path
            key={i}
            d={`M-5 ${y} Q 20 ${y - a} 45 ${y} T 95 ${y} T 145 ${y}`}
            fill="none"
            stroke={i % 2 ? accent : light}
            strokeWidth={2.4}
            strokeLinecap="round"
            opacity={0.85}
          />
        );
      })}
    </>
  ),
  // Split with circles
  ({ c1, c2, accent, light, r }) => (
    <>
      <rect width="100" height="100" fill={c2} />
      <polygon points="0,0 100,0 0,100" fill={c1} />
      <circle cx="68" cy="68" r={18 + r() * 10} fill={accent} />
      <circle cx="28" cy="28" r={6 + r() * 7} fill={light} />
    </>
  ),
];

/**
 * Original, deterministic cover art drawn as SVG, so the app needs no image hosting.
 * Squares get an abstract pattern (sometimes with the title printed on it); circles get an initials portrait.
 */
export function GeneratedCover({ seed, color, title, shape = 'square' }: GeneratedCoverProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const r = seededRandom(hashString(seed));
  const [h, s, l] = hexToHsl(color);
  const palette: Palette = {
    c1: hsl(h, s + 10, l + 8),
    c2: hsl(h + 30, s, Math.max(l - 14, 8)),
    accent: hsl(h + 150 + r() * 60, Math.min(s + 25, 85), Math.min(l + 32, 72)),
    light: hsl(h, s * 0.5, 88),
    gradient: `${uid}-g`,
    blur: `${uid}-b`,
    r,
  };

  const defs = (
    <defs>
      <linearGradient id={palette.gradient} x1="0" y1="0" x2="0.4" y2="1">
        <stop offset="0" stopColor={palette.c1} />
        <stop offset="1" stopColor={palette.c2} />
      </linearGradient>
      <radialGradient id={`${uid}-rg`} cx="35%" cy="30%" r="85%">
        <stop offset="0" stopColor={palette.c1} />
        <stop offset="1" stopColor={palette.c2} />
      </radialGradient>
      <linearGradient id={`${uid}-shade`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#000" stopOpacity="0" />
        <stop offset="1" stopColor="#000" stopOpacity="0.5" />
      </linearGradient>
      <filter id={palette.blur} x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="7" />
      </filter>
    </defs>
  );

  if (shape === 'circle') {
    return (
      <svg viewBox="0 0 100 100" className="block size-full" role="img" aria-label={title}>
        {defs}
        <rect width="100" height="100" fill={`url(#${uid}-rg)`} />
        {[28, 40, 52].map((radius) => (
          <circle key={radius} cx="50" cy="50" r={radius} fill="none" stroke={palette.light} strokeOpacity={0.12} strokeWidth={1.5} />
        ))}
        <text
          x="50"
          y="51"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="32"
          fontWeight="800"
          fill="#fff"
          fillOpacity="0.92"
          letterSpacing="-1"
        >
          {initials(title)}
        </text>
      </svg>
    );
  }

  const pattern = PATTERNS[hashString(`${seed}-pattern`) % PATTERNS.length](palette);
  const showTitle = r() > 0.35;
  const lines = showTitle ? coverLines(title) : [];
  const textTop = r() > 0.5;

  return (
    <svg viewBox="0 0 100 100" className="block size-full" role="img" aria-label={title}>
      {defs}
      {pattern}
      {lines.length > 0 && (
        <>
          <rect
            y={textTop ? 0 : 55}
            width="100"
            height="45"
            fill={`url(#${uid}-shade)`}
            transform={textTop ? 'rotate(180 50 22.5)' : undefined}
          />
          <text x="8" y={textTop ? 15 : 92 - (lines.length - 1) * 9} fontSize="8.5" fontWeight="800" fill="#fff" letterSpacing="0.2">
            {lines.map((line, i) => (
              <tspan key={i} x="8" dy={i === 0 ? 0 : 9}>
                {line.toUpperCase()}
              </tspan>
            ))}
          </text>
        </>
      )}
    </svg>
  );
}
