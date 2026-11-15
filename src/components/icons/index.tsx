import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

const base = (props: IconProps) => ({
  viewBox: '0 0 24 24',
  'aria-hidden': true,
  className: 'size-6',
  ...props,
});

export function HomeFilledIcon(props: IconProps) {
  return (
    <svg {...base(props)} fill="currentColor">
      <path d="M12.5 2.6a.8.8 0 0 0-1 0L2.8 9.7a.8.8 0 0 0-.3.6V21a1 1 0 0 0 1 1H9v-6.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 .5.5V22h5.5a1 1 0 0 0 1-1V10.3a.8.8 0 0 0-.3-.6z" />
    </svg>
  );
}

export function HomeOutlineIcon(props: IconProps) {
  return (
    <svg {...base(props)} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round">
      <path d="M12 3.4 3.4 10.4V21h5.4v-6.3h6.4V21h5.4V10.4z" />
    </svg>
  );
}

/** Tray-with-slot icon used for "Browse" inside the search bar. */
export function BrowseIcon(props: IconProps) {
  return (
    <svg {...base(props)} fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="4" width="17" height="16" rx="2.5" />
      <path d="M3.5 9h17" />
      <rect x="9" y="12.5" width="6" height="3.5" rx="1" />
    </svg>
  );
}

export function PlayIcon(props: IconProps) {
  return (
    <svg {...base(props)} fill="currentColor">
      <path d="M7.05 3.6A1 1 0 0 0 5.5 4.45v15.1a1 1 0 0 0 1.55.85l12.1-7.55a1 1 0 0 0 0-1.7z" />
    </svg>
  );
}

export function ChartBarsIcon(props: IconProps) {
  return (
    <svg {...base(props)} fill="currentColor">
      <rect x="4" y="12" width="4" height="8" rx="1" />
      <rect x="10" y="7" width="4" height="13" rx="1" />
      <rect x="16" y="3.5" width="4" height="16.5" rx="1" />
    </svg>
  );
}

export function InstagramIcon(props: IconProps) {
  return (
    <svg {...base(props)} fill="none" stroke="currentColor" strokeWidth={1.8}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function XSocialIcon(props: IconProps) {
  return (
    <svg {...base(props)} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
      <path d="M5 4.5h3.6l10.4 15H15.4z" strokeLinejoin="round" />
      <path d="M18.6 4.5 13.2 10.6M10.8 13.4 5.4 19.5" />
    </svg>
  );
}

export function FacebookIcon(props: IconProps) {
  return (
    <svg {...base(props)} fill="currentColor">
      <path d="M13.6 21v-7.3h2.5l.4-3h-2.9V8.9c0-.9.3-1.5 1.5-1.5h1.5V4.7a19 19 0 0 0-2.2-.1c-2.2 0-3.7 1.3-3.7 3.8v2.3H8.2v3h2.5V21z" />
    </svg>
  );
}
