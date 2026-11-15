import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { HomeSection } from '../../data/home';
import { MediaCard } from './MediaCard';

/** A titled, horizontally scrolling row of cards with "Show all" and hover scroll arrows. */
export function Shelf({ section }: { section: HomeSection }) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const update = useCallback(() => {
    const el = rowRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [update]);

  const scroll = (direction: 1 | -1) => {
    const el = rowRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: 'smooth' });
  };

  const href = `/section/${section.id}`;

  return (
    <section aria-labelledby={`${section.id}-title`} className="group/shelf relative">
      <div className="mb-1 flex items-end justify-between gap-4 px-3 pr-10">
        <h2 id={`${section.id}-title`} className="text-2xl font-bold tracking-tight">
          <Link to={href} className="hover:underline">
            {section.title}
          </Link>
        </h2>
        <Link to={href} className="shrink-0 text-sm font-bold text-subdued hover:underline">
          Show all
        </Link>
      </div>

      <div className="relative -mr-7">
        <div ref={rowRef} onScroll={update} className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto pr-7">
          {section.items.map((item) => (
            <MediaCard key={item.id} item={item} className="w-[clamp(150px,15vw,196px)] shrink-0 snap-start" />
          ))}
        </div>

        {canLeft && (
          <ScrollButton direction="left" onClick={() => scroll(-1)} className="left-1" />
        )}
        {canRight && (
          <ScrollButton direction="right" onClick={() => scroll(1)} className="right-9" />
        )}
      </div>
    </section>
  );
}

function ScrollButton({
  direction,
  onClick,
  className,
}: {
  direction: 'left' | 'right';
  onClick: () => void;
  className: string;
}) {
  const Icon = direction === 'left' ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      aria-label={direction === 'left' ? 'Scroll left' : 'Scroll right'}
      onClick={onClick}
      className={`absolute top-[34%] z-10 grid size-8 -translate-y-1/2 place-items-center rounded-full bg-surface-2/95 text-white opacity-0 shadow-[0_4px_12px_rgba(0,0,0,0.5)] transition hover:scale-105 hover:bg-surface-3 focus-visible:opacity-100 group-hover/shelf:opacity-100 ${className}`}
    >
      <Icon className="size-5" />
    </button>
  );
}
