import { Link } from 'react-router';
import type { MediaItem } from '../../data/home';
import { BRAND } from '../../config/brand';
import { Modal } from '../ui/Modal';
import { Artwork } from '../media/Artwork';
import { useDominantColor } from '../../hooks/useDominantColor';

/** Shown when a logged-out visitor tries to play something. Tinted with the artwork's own colour. */
export function SignupPromptModal({ item, onClose }: { item: MediaItem | null; onClose: () => void }) {
  const tint = useDominantColor(item?.image, item?.color ?? '#333333');
  return (
    <Modal open={!!item} onClose={onClose} labelledBy="signup-prompt-title" className="w-full max-w-[860px]">
      {item && (
        <>
          <div
            className="flex flex-col items-center gap-8 rounded-xl p-8 sm:flex-row sm:gap-10 sm:p-14"
            style={{
              background: `linear-gradient(180deg, ${tint} 0%, color-mix(in srgb, ${tint} 30%, #121212) 100%)`,
              transition: 'background 300ms',
            }}
          >
            <div className="w-[200px] shrink-0 sm:w-[300px]">
              <Artwork item={item} />
            </div>
            <div className="flex flex-1 flex-col items-center gap-6 text-center">
              <h2 id="signup-prompt-title" className="text-[28px] font-bold leading-tight tracking-tight sm:text-[32px]">
                Start listening with a free {BRAND.name} account
              </h2>
              <Link
                to="/signup"
                onClick={onClose}
                className="flex h-12 items-center rounded-full bg-accent px-8 font-bold text-black transition hover:scale-105 hover:bg-accent-hover"
              >
                Sign up free
              </Link>
              <Link
                to="/download"
                onClick={onClose}
                className="flex h-12 items-center rounded-full border border-muted px-8 font-bold text-white transition hover:scale-105 hover:border-white"
              >
                Download app
              </Link>
              <p className="text-sm font-semibold text-subdued">
                Already have an account?{' '}
                <Link to="/login" onClick={onClose} className="text-white underline hover:text-accent">
                  Log in
                </Link>
              </p>
            </div>
          </div>
          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={onClose}
              className="font-bold text-subdued transition hover:scale-105 hover:text-white"
            >
              Close
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
