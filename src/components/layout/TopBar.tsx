import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { Bell, CircleArrowDown, Search, X } from 'lucide-react';
import { BRAND } from '../../config/brand';
import { useAuth } from '../../context/authContext';
import { AccountMenu } from './AccountMenu';
import { LogoMark } from '../icons/Logo';
import { BrowseIcon, HomeFilledIcon, HomeOutlineIcon } from '../icons';
import { Tooltip } from '../ui/Tooltip';

const NAV_LINKS = [
  { label: 'Premium', to: '/premium' },
  { label: 'Support', to: '/support' },
  { label: 'Download', to: '/download' },
];

const pillHover = 'transition hover:scale-105 hover:text-white';

export function TopBar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const isHome = pathname === '/';

  // Ctrl/Cmd + K focuses search, like the desktop player.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    navigate(q ? `/search/${encodeURIComponent(q)}` : '/search');
  };

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-2 px-2">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <Link to="/" aria-label={`${BRAND.name} home`} className="shrink-0 px-3 text-white sm:px-5">
          <LogoMark className="size-8" />
        </Link>

        <Tooltip label="Home">
          <Link
            to="/"
            aria-label="Home"
            aria-current={isHome ? 'page' : undefined}
            className="grid size-12 shrink-0 place-items-center rounded-full bg-surface-2 text-white transition hover:scale-105 hover:bg-surface-3"
          >
            {isHome ? <HomeFilledIcon /> : <HomeOutlineIcon className="size-6 text-subdued" />}
          </Link>
        </Tooltip>

        <form
          role="search"
          onSubmit={submit}
          className={`group/search hidden h-12 w-full max-w-[474px] items-center rounded-full bg-surface-2 transition-colors hover:bg-surface-3 sm:flex ${
            focused ? 'ring-2 ring-white' : 'ring-1 ring-transparent hover:ring-white/15'
          }`}
        >
          <button
            type="submit"
            aria-label="Search"
            className="grid shrink-0 place-items-center pl-3 pr-2 text-subdued transition-colors group-hover/search:text-white"
          >
            <Search className="size-6" strokeWidth={1.75} />
          </button>
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="What do you want to play?"
            aria-label="What do you want to play?"
            className="h-full min-w-0 flex-1 truncate bg-transparent text-base text-white outline-none placeholder:text-subdued [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button
              type="button"
              aria-label="Clear search field"
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              className="grid shrink-0 place-items-center px-2 text-subdued hover:text-white"
            >
              <X className="size-5" />
            </button>
          )}
          <span aria-hidden="true" className="h-6 w-px shrink-0 bg-[#7c7c7c]" />
          <Tooltip label="Browse">
            <Link
              to="/search"
              aria-label="Browse"
              className="grid place-items-center px-3 text-subdued transition hover:scale-105 hover:text-white"
            >
              <BrowseIcon />
            </Link>
          </Tooltip>
        </form>

        <Link
          to="/search"
          aria-label="Search"
          className="grid size-12 shrink-0 place-items-center rounded-full bg-surface-2 text-subdued hover:text-white sm:hidden"
        >
          <Search className="size-6" strokeWidth={1.75} />
        </Link>
      </div>

      {user ? (
        <div className="flex shrink-0 items-center">
          <Link
            to="/premium"
            className="mr-2 hidden h-8 items-center rounded-full bg-white px-4 text-sm font-bold text-black transition hover:scale-105 lg:flex"
          >
            Explore Premium
          </Link>
          <Link
            to="/download"
            className={`hidden items-center gap-2 px-2 text-sm font-bold text-subdued lg:flex ${pillHover}`}
          >
            <CircleArrowDown className="size-4" strokeWidth={2} />
            Install App
          </Link>
          <Tooltip label="What's New">
            <Link
              to="/content-feed"
              aria-label="What's New"
              className="mx-1 grid size-8 place-items-center text-subdued transition hover:scale-105 hover:text-white"
            >
              <Bell className="size-5" />
            </Link>
          </Tooltip>
          <AccountMenu />
        </div>
      ) : (
      <div className="flex shrink-0 items-center">
        <nav aria-label="Main" className="hidden items-center xl:flex">
          {NAV_LINKS.map((link) => (
            <Link key={link.to} to={link.to} className={`px-2 text-base font-bold text-subdued ${pillHover}`}>
              {link.label}
            </Link>
          ))}
        </nav>
        <span aria-hidden="true" className="mx-4 hidden h-8 w-px bg-white xl:block" />
        <Link
          to="/download"
          className={`mr-2 hidden items-center gap-2 px-2 text-sm font-bold text-subdued lg:flex ${pillHover}`}
        >
          <CircleArrowDown className="size-4" strokeWidth={2} />
          Install App
        </Link>
        <Link to="/signup" className={`hidden px-4 text-base font-bold text-subdued sm:block ${pillHover}`}>
          Sign up
        </Link>
        <Link
          to="/login"
          className="ml-1 flex h-12 items-center rounded-full bg-white px-6 text-base font-bold text-black transition hover:scale-105 hover:bg-[#f0f0f0] sm:px-8"
        >
          Log in
        </Link>
      </div>
      )}
    </header>
  );
}
