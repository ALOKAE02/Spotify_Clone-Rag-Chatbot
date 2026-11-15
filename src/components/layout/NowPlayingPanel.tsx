import { useState } from 'react';
import { Link } from 'react-router';
import { ChevronLeft, ChevronRight, Music } from 'lucide-react';
import { Tooltip } from '../ui/Tooltip';
import { useAuth } from '../../context/authContext';

/** Right-hand "Now Playing" view. Collapsed to a thin strip until a user logs in and plays something. */
export function NowPlayingPanel() {
  const [expanded, setExpanded] = useState(false);
  const { user } = useAuth();

  if (!expanded) {
    return (
      <div className="ml-2 hidden w-9 shrink-0 items-center justify-center rounded-lg bg-surface lg:flex">
        <Tooltip label="Expand Now Playing view" side="left">
          <button
            type="button"
            aria-label="Expand Now Playing view"
            onClick={() => setExpanded(true)}
            className="grid size-8 place-items-center rounded-full text-subdued transition hover:bg-surface-2 hover:text-white"
          >
            <ChevronLeft className="size-5" />
          </button>
        </Tooltip>
      </div>
    );
  }

  return (
    <aside
      aria-label="Now Playing view"
      className="ml-2 hidden w-[300px] shrink-0 flex-col rounded-lg bg-surface animate-fade-in lg:flex"
    >
      <header className="flex h-16 items-center justify-between px-4">
        <h2 className="text-base font-bold">Now playing</h2>
        <Tooltip label="Collapse" side="left">
          <button
            type="button"
            aria-label="Collapse Now Playing view"
            onClick={() => setExpanded(false)}
            className="grid size-8 place-items-center rounded-full text-subdued transition hover:bg-surface-2 hover:text-white"
          >
            <ChevronRight className="size-5" />
          </button>
        </Tooltip>
      </header>
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 pb-16 text-center">
        <span className="grid size-16 place-items-center rounded-full bg-surface-2">
          <Music className="size-7 text-subdued" />
        </span>
        <p className="text-lg font-bold">Nothing playing yet</p>
        {user ? (
          <p className="text-sm text-subdued">Play something and it will show up here.</p>
        ) : (
          <>
            <p className="text-sm text-subdued">Log in to see what's playing and what's up next.</p>
            <Link
              to="/login"
              className="mt-2 flex h-10 items-center rounded-full bg-white px-6 text-sm font-bold text-black transition hover:scale-105"
            >
              Log in
            </Link>
          </>
        )}
      </div>
    </aside>
  );
}
