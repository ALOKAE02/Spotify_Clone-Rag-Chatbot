import { useEffect, useRef } from 'react';

interface Blob {
  color: string; // "r g b"
  alpha: number;
  radius: number; // fraction of the panel's larger side
  fx: number;
  fy: number;
  phase: number;
}

const BLOBS: Blob[] = [
  { color: '30 215 96', alpha: 0.2, radius: 0.55, fx: 0.31, fy: 0.23, phase: 0 },
  { color: '29 185 84', alpha: 0.16, radius: 0.5, fx: 0.19, fy: 0.29, phase: 2.1 },
  { color: '10 92 46', alpha: 0.38, radius: 0.7, fx: 0.13, fy: 0.17, phase: 4.2 },
  { color: '26 160 130', alpha: 0.1, radius: 0.45, fx: 0.27, fy: 0.11, phase: 1.3 },
];

interface Particle {
  x: number;
  y: number;
  r: number;
  speed: number;
  seed: number;
}

/**
 * Living background for the chat panel: drifting green aurora, flowing sound-wave lines and rising sparks.
 * Everything speeds up and brightens while `active` (the assistant is thinking or answering).
 */
export function AssistantBackground({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activeRef = useRef(active);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let width = 0;
    let height = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    const particles: Particle[] = Array.from({ length: 30 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: 0.6 + Math.random() * 1.6,
      speed: 0.015 + Math.random() * 0.04,
      seed: Math.random() * Math.PI * 2,
    }));

    let energy = 0; // 0 idle -> 1 busy, eased
    let time = 0;
    let last = performance.now();
    let raf = 0;

    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      energy += ((activeRef.current ? 1 : 0) - energy) * Math.min(1, dt * 2.2);
      time += dt * (0.35 + energy * 1.1);

      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#080808';
      ctx.fillRect(0, 0, width, height);

      // Aurora blobs
      const size = Math.max(width, height);
      for (const b of BLOBS) {
        const x = width * (0.5 + 0.42 * Math.sin(time * b.fx * 2 + b.phase));
        const y = height * (0.5 + 0.42 * Math.cos(time * b.fy * 2 + b.phase * 1.3));
        const r = size * (b.radius + energy * 0.08);
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, `rgb(${b.color} / ${b.alpha + energy * 0.12})`);
        g.addColorStop(1, `rgb(${b.color} / 0)`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, width, height);
      }

      // Flowing sound waves along the lower part
      for (let k = 0; k < 3; k++) {
        ctx.beginPath();
        const baseY = height * (0.72 + k * 0.06);
        for (let x = 0; x <= width + 6; x += 6) {
          const envelope = Math.sin((x / width) * Math.PI);
          const y =
            baseY +
            Math.sin(x * 0.012 + time * (1.6 + k * 0.45) + k) * (6 + energy * 22) * envelope +
            Math.sin(x * 0.033 - time * 2.3 + k * 2) * (2 + energy * 7) * envelope;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        const grad = ctx.createLinearGradient(0, 0, width, 0);
        const a = 0.16 + energy * 0.3 - k * 0.04;
        grad.addColorStop(0, 'rgb(30 215 96 / 0)');
        grad.addColorStop(0.5, `rgb(30 215 96 / ${a})`);
        grad.addColorStop(1, 'rgb(30 215 96 / 0)');
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.6 - k * 0.3;
        ctx.stroke();
      }

      // Rising sparks
      for (const p of particles) {
        p.y -= p.speed * dt * (1 + energy * 3.5);
        if (p.y < -0.05) {
          p.y = 1.05;
          p.x = Math.random();
        }
        const twinkle = Math.sin(time * 2.4 + p.seed) ** 2;
        ctx.beginPath();
        ctx.arc(p.x * width, p.y * height, p.r * (1 + energy * 0.6), 0, Math.PI * 2);
        ctx.fillStyle = `rgb(30 215 96 / ${0.12 + twinkle * (0.3 + energy * 0.4)})`;
        ctx.fill();
      }

      if (!reduceMotion) raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0 size-full" />;
}
