import { createPortal } from 'react-dom';

export interface ToastMessage {
  id: number;
  message: string;
}

/** Blue notification pill near the bottom of the screen. */
export function Toast({ toast }: { toast: ToastMessage | null }) {
  return createPortal(
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-28 z-[60] flex justify-center px-4">
      {toast && (
        <div
          key={toast.id}
          className="max-w-md rounded-lg bg-[#2e77d0] px-4 py-3 text-center text-sm font-semibold text-white shadow-[0_8px_24px_rgba(0,0,0,0.5)] animate-pop-in"
        >
          {toast.message}
        </div>
      )}
    </div>,
    document.body,
  );
}
