import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { ExternalLink } from 'lucide-react';
import { useAuth } from '../../context/authContext';
import { useUI } from '../../context/uiContext';
import { hashString } from '../../lib/art';
import { Tooltip } from '../ui/Tooltip';

const AVATAR_COLORS = ['#f573a0', '#ffc864', '#77d9c2', '#9cb7ff', '#ff9a6b', '#c39bff', '#7fdc7f'];

const ITEMS = [
  { label: 'Account', to: '/account', external: true },
  { label: 'Profile', to: '/user/me' },
  { label: 'Upgrade to Premium', to: '/premium', external: true },
  { label: 'Support', to: '/support', external: true },
  { label: 'Download', to: '/download', external: true },
  { label: 'Settings', to: '/preferences' },
];

/** Avatar button with the account dropdown, shown in the top bar when logged in. */
export function AccountMenu() {
  const { user, logOut } = useAuth();
  const { showToast } = useUI();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!user) return null;

  const close = () => setOpen(false);

  return (
    <div ref={ref} className="relative ml-2">
      <Tooltip label={user.displayName}>
        <button
          type="button"
          aria-label={`Account menu for ${user.displayName}`}
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="grid size-12 place-items-center rounded-full bg-surface-2 transition hover:scale-105"
        >
          <span
            className="grid size-8 place-items-center rounded-full text-sm font-bold text-black"
            style={{ backgroundColor: AVATAR_COLORS[hashString(user.id) % AVATAR_COLORS.length] }}
          >
            {user.displayName.charAt(0).toUpperCase()}
          </span>
        </button>
      </Tooltip>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-56 rounded-md bg-surface-3 p-1 shadow-[0_16px_24px_rgba(0,0,0,0.3),0_6px_8px_rgba(0,0,0,0.2)] animate-fade-in"
        >
          <div className="mb-1 border-b border-white/10 px-3 pb-2.5 pt-2">
            <p className="truncate text-sm font-bold">{user.displayName}</p>
            <p className="truncate text-xs text-subdued">{user.email}</p>
          </div>
          {ITEMS.map((item) => (
            <Link
              key={item.to}
              role="menuitem"
              to={item.to}
              onClick={close}
              className="flex h-10 items-center justify-between rounded-sm px-3 text-sm font-medium text-white/90 hover:bg-white/10 hover:text-white"
            >
              {item.label}
              {item.external && <ExternalLink className="size-4 text-subdued" />}
            </Link>
          ))}
          <div className="my-1 h-px bg-white/10" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              close();
              logOut();
              showToast('You’re logged out.');
              navigate('/');
            }}
            className="flex h-10 w-full items-center rounded-sm px-3 text-left text-sm font-medium text-white/90 hover:bg-white/10 hover:text-white"
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
