import type { KeyboardEvent } from 'react';
import type { MediaItem } from '../../data/home';
import { useUI } from '../../context/uiContext';
import { useAuth } from '../../context/authContext';
import { PlayIcon } from '../icons';
import { Artwork } from './Artwork';

interface MediaCardProps {
  item: MediaItem;
  className?: string;
}

/**
 * Card used on every shelf. Hover lifts a green play button out of the artwork.
 * Logged out, both the card and the play button open the "sign up to listen" prompt.
 * Logged in, playback is not built yet, so a toast says so.
 */
export function MediaCard({ item, className = '' }: MediaCardProps) {
  const { openSignupPrompt, showToast } = useUI();
  const { user } = useAuth();
  const showTitle = item.type !== 'radio' && item.type !== 'chart';
  const open = () =>
    user ? showToast(`Playing “${item.title}” arrives with the music player, coming soon.`) : openSignupPrompt(item);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      open();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={showTitle ? `${item.title}, ${item.subtitle}` : item.subtitle}
      onClick={open}
      onKeyDown={onKeyDown}
      className={`group relative flex cursor-pointer flex-col gap-2 rounded-md p-3 outline-none transition-colors duration-200 hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:ring-2 focus-visible:ring-white/60 ${className}`}
    >
      <div className="relative">
        <Artwork item={item} />
        <button
          type="button"
          tabIndex={-1}
          aria-label={`Play ${item.title}`}
          onClick={(e) => {
            e.stopPropagation();
            open();
          }}
          className="absolute bottom-2 right-2 grid size-12 translate-y-2 place-items-center rounded-full bg-accent text-black opacity-0 shadow-[0_8px_8px_rgba(0,0,0,0.3)] transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100 hover:scale-105 hover:bg-accent-hover active:scale-95"
        >
          <PlayIcon className="size-6" />
        </button>
      </div>
      <div className="min-w-0">
        {showTitle && <p className="line-clamp-2 text-base font-medium leading-snug">{item.title}</p>}
        <p className="mt-0.5 line-clamp-2 text-sm leading-snug text-subdued">{item.subtitle}</p>
      </div>
    </div>
  );
}
