/** Original logo mark for the clone: a circle with three equaliser bars. */
export function LogoMark({ className = 'size-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <circle cx="16" cy="16" r="16" fill="currentColor" />
      <rect x="8.4" y="11" width="3.6" height="10" rx="1.8" fill="#000" />
      <rect x="14.2" y="7.5" width="3.6" height="17" rx="1.8" fill="#000" />
      <rect x="20" y="13" width="3.6" height="6" rx="1.8" fill="#000" />
    </svg>
  );
}
