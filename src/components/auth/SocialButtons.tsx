import type { ReactNode } from 'react';
import { Smartphone } from 'lucide-react';

/* Simple monochrome glyphs (not the providers' official logos). */
function GlyphG() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round">
      <path d="M19 12h-7M19 12a7 7 0 1 1-2.1-5" />
    </svg>
  );
}

function GlyphF() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="currentColor">
      <circle cx="12" cy="12" r="10" />
      <path d="M13.2 20v-6.2h2.1l.3-2.5h-2.4V9.9c0-.7.3-1.2 1.3-1.2h1.2V6.5c-.6-.1-1.2-.1-1.8-.1-1.8 0-3.1 1.1-3.1 3.2v1.8H9v2.5h1.8V20z" fill="#121212" />
    </svg>
  );
}

function GlyphApple() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="currentColor">
      <path d="M16.5 12.6c0-2.3 1.9-3.4 2-3.5a4.4 4.4 0 0 0-3.4-1.9c-1.4-.1-2.8.9-3.5.9s-1.9-.8-3.1-.8A4.6 4.6 0 0 0 4.6 9.7c-1.7 2.9-.4 7.2 1.2 9.6.8 1.2 1.8 2.5 3 2.4 1.2 0 1.7-.8 3.1-.8s1.9.8 3.1.8c1.3 0 2.1-1.2 2.9-2.3a10 10 0 0 0 1.3-2.7 4.2 4.2 0 0 1-2.7-4.1zM14.2 5.6a4.2 4.2 0 0 0 1-3.1 4.3 4.3 0 0 0-2.8 1.4 4 4 0 0 0-1 3 3.6 3.6 0 0 0 2.8-1.3z" />
    </svg>
  );
}

export type Provider = 'phone' | 'google' | 'facebook' | 'apple';

const PROVIDERS: Record<Provider, { label: string; icon: ReactNode }> = {
  phone: { label: 'phone number', icon: <Smartphone className="size-5" /> },
  google: { label: 'Google', icon: <GlyphG /> },
  facebook: { label: 'Facebook', icon: <GlyphF /> },
  apple: { label: 'Apple', icon: <GlyphApple /> },
};

interface SocialButtonsProps {
  verb: 'Continue with' | 'Sign up with';
  providers: Provider[];
  onSelect: (provider: Provider) => void;
}

/** Sign-in-with buttons. The demo only supports email, so the parent shows a notice when one is picked. */
export function SocialButtons({ verb, providers, onSelect }: SocialButtonsProps) {
  return (
    <div className="flex flex-col gap-2">
      {providers.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onSelect(p)}
          className="relative flex h-12 w-full items-center justify-center rounded-full border border-muted px-12 font-bold transition hover:border-white"
        >
          <span className="absolute left-5">{PROVIDERS[p].icon}</span>
          {verb} {PROVIDERS[p].label}
        </button>
      ))}
    </div>
  );
}

export const providerLabel = (p: Provider) => PROVIDERS[p].label;
