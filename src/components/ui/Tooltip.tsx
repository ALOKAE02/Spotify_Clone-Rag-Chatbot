import type { ReactNode } from 'react';

type Side = 'top' | 'bottom' | 'left' | 'right';

const sideClasses: Record<Side, string> = {
  bottom: 'top-full left-1/2 mt-2 -translate-x-1/2',
  top: 'bottom-full left-1/2 mb-2 -translate-x-1/2',
  left: 'right-full top-1/2 mr-2 -translate-y-1/2',
  right: 'left-full top-1/2 ml-2 -translate-y-1/2',
};

/** Small dark label that appears after a short hover delay. */
export function Tooltip({ label, side = 'bottom', children }: { label: string; side?: Side; children: ReactNode }) {
  return (
    <span className="group/tt relative inline-flex">
      {children}
      <span
        role="tooltip"
        className={`pointer-events-none absolute z-40 whitespace-nowrap rounded bg-surface-3 px-2 py-1 text-sm font-medium text-white opacity-0 shadow-[0_8px_16px_rgba(0,0,0,0.4)] transition-opacity duration-150 group-hover/tt:opacity-100 group-hover/tt:delay-500 ${sideClasses[side]}`}
      >
        {label}
      </span>
    </span>
  );
}
