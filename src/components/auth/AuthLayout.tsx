import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { BRAND } from '../../config/brand';
import { LogoMark } from '../icons/Logo';

/** Full-page shell for the log-in and sign-up screens (no player chrome). */
export function AuthLayout({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className="flex min-h-dvh flex-col bg-surface text-white">
      <main className="flex flex-1 flex-col items-center px-6 pb-12 pt-8 sm:px-8">
        <Link to="/" aria-label={`${BRAND.name} home`} className="transition hover:scale-105">
          <LogoMark className="size-10 text-white" />
        </Link>
        <div className={`mt-6 w-full ${wide ? 'max-w-[436px]' : 'max-w-[324px]'}`}>{children}</div>
      </main>
      <footer className="px-6 pb-6 text-center text-[11px] text-subdued">
        Demo project: accounts are saved only in this browser.
      </footer>
    </div>
  );
}
