import type { KeyboardEvent, PointerEvent } from 'react';

interface ResizeHandleProps {
  width: number;
  min: number;
  max: number;
  onResize: (width: number) => void;
}

/** Drag (or arrow-key) handle between the library and the main view. Also acts as the 8px gutter. */
export function ResizeHandle({ width, min, max, onResize }: ResizeHandleProps) {
  const clamp = (w: number) => Math.min(max, Math.max(min, w));

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = width;
    const onMove = (ev: globalThis.PointerEvent) => onResize(clamp(startWidth + ev.clientX - startX));
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowLeft') onResize(clamp(width - 16));
    if (e.key === 'ArrowRight') onResize(clamp(width + 16));
  };

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize Your Library"
      aria-valuenow={width}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
      className="group/handle hidden w-2 shrink-0 cursor-col-resize justify-center outline-none md:flex"
    >
      <span className="h-full w-px bg-transparent transition-colors group-hover/handle:bg-white/30 group-focus-visible/handle:bg-white/60" />
    </div>
  );
}
