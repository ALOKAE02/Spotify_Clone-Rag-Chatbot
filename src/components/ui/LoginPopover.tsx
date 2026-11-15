import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router';

export interface LoginPopoverContent {
  title: string;
  body: string;
}

interface LoginPopoverProps extends LoginPopoverContent {
  anchor: HTMLElement;
  onClose: () => void;
}

const WIDTH = 330;

/** The blue "Log in to …" bubble the player shows logged-out users, pointing at the button they clicked. */
export function LoginPopover({ anchor, title, body, onClose }: LoginPopoverProps) {
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    const place = () => {
      const r = anchor.getBoundingClientRect();
      setPos({
        left: Math.max(12, Math.min(r.right + 16, window.innerWidth - WIDTH - 12)),
        top: Math.max(12, r.top + r.height / 2 - 28),
      });
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [anchor]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (ref.current?.contains(target) || anchor.contains(target)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [anchor, onClose]);

  if (!pos) return null;

  return createPortal(
    <div
      ref={ref}
      role="dialog"
      aria-label={title}
      style={{ top: pos.top, left: pos.left, width: WIDTH }}
      className="fixed z-50 rounded-lg bg-info p-4 text-black shadow-[0_16px_24px_rgba(0,0,0,0.3)] animate-pop-in"
    >
      <span aria-hidden="true" className="absolute -left-1.5 top-[22px] size-3 rotate-45 bg-info" />
      <p className="text-base font-bold">{title}</p>
      <p className="mt-1 text-sm font-medium">{body}</p>
      <div className="mt-5 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="h-8 px-4 text-sm font-bold text-black/75 transition hover:scale-105 hover:text-black"
        >
          Not now
        </button>
        <button
          type="button"
          onClick={() => {
            onClose();
            navigate('/login');
          }}
          className="h-8 rounded-full bg-white px-4 text-sm font-bold text-black transition hover:scale-105"
        >
          Log in
        </button>
      </div>
    </div>,
    document.body,
  );
}
