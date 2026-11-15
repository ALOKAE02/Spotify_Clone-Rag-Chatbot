import { Link } from 'react-router';
import { BRAND } from '../../config/brand';
import { FacebookIcon, InstagramIcon, XSocialIcon } from '../icons';

const COLUMNS = [
  {
    title: 'Company',
    links: [
      { label: 'About', to: '/about' },
      { label: 'Jobs', to: '/jobs' },
      { label: 'For the Record', to: '/for-the-record' },
    ],
  },
  {
    title: 'Communities',
    links: [
      { label: 'For Artists', to: '/for-artists' },
      { label: 'For Creators', to: '/for-creators' },
      { label: 'For Authors', to: '/for-authors' },
      { label: 'Developers', to: '/developers' },
      { label: 'Advertising', to: '/advertising' },
      { label: 'Investors', to: '/investors' },
      { label: 'Vendors', to: '/vendors' },
    ],
  },
  {
    title: 'Useful links',
    links: [
      { label: 'Support', to: '/support' },
      { label: 'Free Mobile App', to: '/download' },
      { label: 'Popular by Country', to: '/popular-by-country' },
      { label: 'Import your music', to: '/import-music' },
    ],
  },
  {
    title: `${BRAND.name} Plans`,
    links: [
      { label: 'Premium Standard', to: '/premium/standard' },
      { label: 'Premium Platinum', to: '/premium/platinum' },
      { label: 'Premium Student', to: '/premium/student' },
      { label: `${BRAND.name} Free`, to: '/free' },
    ],
  },
];

const SOCIALS = [
  { label: 'Instagram', Icon: InstagramIcon },
  { label: 'X', Icon: XSocialIcon },
  { label: 'Facebook', Icon: FacebookIcon },
];

export function Footer() {
  return (
    <footer className="px-6 pb-10 pt-8">
      <div className="border-t border-divider pt-16">
        <div className="flex flex-col gap-10 lg:flex-row lg:justify-between">
          <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4 lg:flex lg:gap-0">
            {COLUMNS.map((col) => (
              <nav key={col.title} aria-label={col.title} className="lg:w-[200px]">
                <p className="mb-2 text-base font-bold">{col.title}</p>
                <ul className="space-y-1.5">
                  {col.links.map((link) => (
                    <li key={link.to}>
                      <Link to={link.to} className="text-base text-subdued hover:text-white hover:underline">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
          <div className="flex gap-4">
            {SOCIALS.map(({ label, Icon }) => (
              <a
                key={label}
                href="#"
                onClick={(e) => e.preventDefault()}
                aria-label={label}
                className="grid size-10 place-items-center rounded-full bg-divider text-white transition hover:bg-[#727272]"
              >
                <Icon className="size-5" />
              </a>
            ))}
          </div>
        </div>
        <div className="mt-12 flex flex-col-reverse gap-4 border-t border-divider pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-subdued">
            An educational clone, not affiliated with Spotify AB. Artist photos from{' '}
            <a href="https://www.deezer.com" target="_blank" rel="noreferrer" className="underline hover:text-white">
              Deezer
            </a>
            , song and album artwork from{' '}
            <a href="https://www.apple.com/itunes/" target="_blank" rel="noreferrer" className="underline hover:text-white">
              iTunes
            </a>
            .
          </p>
          <p className="text-sm text-subdued">
            © {BRAND.year} {BRAND.name}
          </p>
        </div>
      </div>
    </footer>
  );
}
