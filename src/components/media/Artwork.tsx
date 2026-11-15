import { useState } from 'react';
import { findArtist, type MediaItem } from '../../data/home';
import { ChartBarsIcon } from '../icons';
import { LogoMark } from '../icons/Logo';
import { GeneratedCover } from './GeneratedCover';

interface ArtImageProps {
  src?: string;
  alt: string;
  seed: string;
  color: string;
  shape: 'square' | 'circle';
}

/**
 * Real artwork when there is a URL and it loads; otherwise an original generated cover.
 * crossOrigin lets the sign-up modal read the image's colours (both artwork hosts allow it).
 */
function ArtImage({ src, alt, seed, color, shape }: ArtImageProps) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <GeneratedCover seed={seed} color={color} title={alt} shape={shape} />;
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      crossOrigin="anonymous"
      draggable={false}
      onError={() => setFailed(true)}
      className="block size-full object-cover"
    />
  );
}

const shadow = 'shadow-[0_8px_24px_rgba(0,0,0,0.5)]';

function Cover({ item, round }: { item: MediaItem; round: boolean }) {
  return (
    <div
      className={`aspect-square w-full overflow-hidden ${round ? 'rounded-full' : 'rounded-md'} ${shadow}`}
      style={{ backgroundColor: item.color }}
    >
      <ArtImage src={item.image} alt={item.title} seed={item.id} color={item.color} shape={round ? 'circle' : 'square'} />
    </div>
  );
}

function ArtistAvatar({ id, className }: { id?: string; className: string }) {
  const artist = id ? findArtist(id) : undefined;
  if (!artist) return null;
  return (
    <div className={`overflow-hidden rounded-full bg-black/30 ${className}`}>
      <ArtImage src={artist.image} alt="" seed={artist.id} color={artist.color} shape="circle" />
    </div>
  );
}

function RadioArt({ item }: { item: MediaItem }) {
  const [left, center, right] = item.artists ?? [];
  return (
    <div
      className={`@container relative aspect-square w-full overflow-hidden rounded-md ${shadow}`}
      style={{ backgroundColor: item.color }}
    >
      <div className="absolute left-[7cqw] top-[7cqw] flex items-center gap-[2.5cqw] text-[6cqw] font-extrabold tracking-[0.18em]">
        <LogoMark className="size-[8cqw] text-white" />
        RADIO
      </div>
      <div className="absolute inset-0 flex items-center justify-center pt-[4cqw]">
        <ArtistAvatar id={left} className="-mr-[9cqw] size-[34cqw] opacity-90" />
        <ArtistAvatar id={center} className="relative z-10 size-[46cqw] shadow-[0_6px_18px_rgba(0,0,0,0.4)]" />
        <ArtistAvatar id={right} className="-ml-[9cqw] size-[34cqw] opacity-90" />
      </div>
      <p className="absolute inset-x-[7cqw] bottom-[6cqw] truncate text-[8.5cqw] font-extrabold">{item.title}</p>
    </div>
  );
}

function ChartArt({ item }: { item: MediaItem }) {
  const chart = item.chart;
  if (!chart) return null;
  return (
    <div
      className={`@container relative aspect-square w-full overflow-hidden rounded-md ${shadow}`}
      style={{ backgroundColor: item.color }}
    >
      <div className="absolute inset-0 p-[8cqw]">
        <p className="text-[17cqw] font-black leading-[0.92] tracking-tight">{chart.headline}</p>
        <p className="mt-[4cqw] text-[8cqw] font-bold uppercase tracking-[0.08em] text-white/90">{chart.region}</p>
      </div>
      <div className="absolute inset-x-0 bottom-0 flex items-center gap-[3cqw] bg-black/20 px-[7cqw] py-[4.5cqw]">
        <span className="grid size-[10cqw] place-items-center rounded-[2cqw] bg-white" style={{ color: item.color }}>
          <ChartBarsIcon className="size-[7cqw]" />
        </span>
        <span className="text-[6.5cqw] font-bold">{chart.cadence} Music Charts</span>
      </div>
    </div>
  );
}

/** Cover art for any media item: square for songs/albums, round for artists, designed tiles for radio and charts. */
export function Artwork({ item }: { item: MediaItem }) {
  switch (item.type) {
    case 'radio':
      return <RadioArt item={item} />;
    case 'chart':
      return <ChartArt item={item} />;
    case 'artist':
      return <Cover key={item.id} item={item} round />;
    default:
      return <Cover key={item.id} item={item} round={false} />;
  }
}
