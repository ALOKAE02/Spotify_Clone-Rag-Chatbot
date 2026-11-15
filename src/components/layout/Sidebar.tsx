import type { MouseEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { Globe, Plus } from 'lucide-react';
import { useUI } from '../../context/uiContext';
import { useAuth } from '../../context/authContext';

const LEGAL_LINKS = [
  { label: 'Legal', to: '/legal' },
  { label: 'Safety & Privacy Center', to: '/safety-and-privacy' },
  { label: 'Privacy Policy', to: '/privacy' },
  { label: 'Cookies', to: '/cookies' },
  { label: 'About Ads', to: '/about-ads' },
  { label: 'Accessibility', to: '/accessibility' },
];

const CREATE_PLAYLIST_PROMPT = {
  title: 'Create a playlist',
  body: 'Log in to create and share playlists.',
};

interface PromoCardProps {
  title: string;
  text: string;
  action: string;
  onAction: (e: MouseEvent<HTMLButtonElement>) => void;
}

function PromoCard({ title, text, action, onAction }: PromoCardProps) {
  return (
    <div className="rounded-lg bg-surface-2 px-5 py-4">
      <p className="text-base font-bold">{title}</p>
      <p className="mt-2 text-sm font-medium">{text}</p>
      <button
        type="button"
        onClick={onAction}
        className="mt-5 h-8 rounded-full bg-white px-4 text-sm font-bold text-black transition hover:scale-105 hover:bg-[#f0f0f0]"
      >
        {action}
      </button>
    </div>
  );
}

/** "Your Library" panel as logged-out visitors see it. */
export function Sidebar({ width }: { width: number }) {
  const { toggleLoginPopover, openLanguagePicker, language, showToast } = useUI();
  const { user } = useAuth();
  const navigate = useNavigate();

  const createPlaylist = (e: MouseEvent<HTMLButtonElement>) => {
    if (user) showToast('Creating playlists arrives in an upcoming step.');
    else toggleLoginPopover(e.currentTarget, CREATE_PLAYLIST_PROMPT);
  };

  return (
    <aside
      aria-label="Your Library"
      style={{ width }}
      className="hidden shrink-0 flex-col overflow-hidden rounded-lg bg-surface md:flex"
    >
      <header className="flex h-16 shrink-0 items-center justify-between px-4">
        <h2 className="px-2 text-base font-bold">Your Library</h2>
        <button
          type="button"
          onClick={createPlaylist}
          className="flex h-8 items-center gap-1.5 rounded-full bg-surface-2 pl-3 pr-4 text-sm font-bold transition hover:scale-105 hover:bg-surface-3"
        >
          <Plus className="size-4" strokeWidth={2.5} />
          Create
        </button>
      </header>

      <div className="scroll-area flex flex-1 flex-col gap-6 overflow-y-auto px-2 pb-2 pt-2">
        <PromoCard
          title="Create your first playlist"
          text="It's easy, we'll help you"
          action="Create playlist"
          onAction={createPlaylist}
        />
        <PromoCard
          title="Let's find some podcasts to follow"
          text="We'll keep you updated on new episodes"
          action="Browse podcasts"
          onAction={() => navigate('/genre/podcasts')}
        />
      </div>

      <footer className="shrink-0 px-6 pb-8 pt-6">
        <ul className="flex flex-wrap gap-x-4 gap-y-2">
          {LEGAL_LINKS.map((link) => (
            <li key={link.to}>
              <Link to={link.to} className="text-[11px] text-subdued hover:text-white">
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
        <Link to="/cookie-settings" className="mt-3 inline-block text-[12px] font-medium text-white hover:underline">
          Cookie Settings
        </Link>
        <button
          type="button"
          onClick={openLanguagePicker}
          className="mt-8 flex h-8 items-center gap-1.5 rounded-full border border-muted px-3 text-sm font-bold transition hover:scale-105 hover:border-white"
        >
          <Globe className="size-4" strokeWidth={2} />
          {language.native}
        </button>
      </footer>
    </aside>
  );
}
