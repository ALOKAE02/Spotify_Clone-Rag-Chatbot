import { Link, useLocation } from 'react-router';
import { BRAND } from '../config/brand';
import { LogoMark } from '../components/icons/Logo';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const TITLES: Record<string, string> = {
  search: 'Search',
  genre: 'Browse',
  premium: 'Premium',
  download: 'Download',
};

function titleFromPath(pathname: string) {
  const first = pathname.split('/').filter(Boolean)[0] ?? '';
  if (TITLES[first]) return TITLES[first];
  return first
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ') || 'Page';
}

/** Placeholder for routes that are on the roadmap but not built yet. */
export function ComingSoon() {
  const { pathname } = useLocation();
  const title = titleFromPath(pathname);
  useDocumentTitle(`${title} | ${BRAND.name}`);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <LogoMark className="size-14 text-white" />
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      <p className="max-w-md text-subdued">This page is on the roadmap and will be built in an upcoming step.</p>
      <Link
        to="/"
        className="mt-2 flex h-12 items-center rounded-full bg-white px-8 font-bold text-black transition hover:scale-105"
      >
        Back to home
      </Link>
    </div>
  );
}
