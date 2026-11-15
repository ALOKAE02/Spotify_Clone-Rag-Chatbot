import { useState } from 'react';
import { Link } from 'react-router';
import { X } from 'lucide-react';
import { BRAND } from '../../config/brand';
import { useAuth } from '../../context/authContext';
import { readStored, writeStored } from '../../lib/storage';

const DISMISSED_KEY = 'sc-preview-banner-dismissed';

/** Gradient sign-up strip at the bottom of the logged-out player. Hidden once dismissed or logged in. */
export function PreviewBanner() {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(() => readStored(DISMISSED_KEY) === '1');

  if (user || dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    writeStored(DISMISSED_KEY, '1');
  };

  return (
    <div className="shrink-0 px-2 pb-2 pt-2 animate-fade-in">
      <div className="flex min-h-[66px] items-center gap-2 bg-[linear-gradient(90deg,#af2896,#509bf5)] py-2.5 pl-4 pr-2 sm:gap-3 sm:pr-3">
        <Link to="/signup" className="flex min-w-0 flex-1 items-center justify-between gap-4">
          <span className="min-w-0">
            <span className="block text-sm font-bold">Preview of {BRAND.name}</span>
            <span className="hidden text-base font-semibold sm:block">
              Sign up to get unlimited songs and podcasts with occasional ads. No credit card needed.
            </span>
            <span className="block text-sm font-medium sm:hidden">Sign up for unlimited songs and podcasts.</span>
          </span>
          <span className="flex h-12 shrink-0 items-center rounded-full bg-white px-6 text-base font-bold text-black transition hover:scale-105 sm:px-8">
            Sign up free
          </span>
        </Link>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss sign-up banner"
          title="Dismiss"
          className="grid size-9 shrink-0 place-items-center rounded-full text-white/85 transition hover:scale-105 hover:bg-black/20 hover:text-white"
        >
          <X className="size-5" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
