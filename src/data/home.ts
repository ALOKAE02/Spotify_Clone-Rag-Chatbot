import catalog from './catalog.json';
import { hashString } from '../lib/art';

export type MediaType = 'song' | 'artist' | 'album' | 'radio' | 'chart';

export interface ChartInfo {
  headline: string;
  region: string;
  cadence: 'Weekly' | 'Daily';
}

export interface MediaItem {
  id: string;
  type: MediaType;
  title: string;
  subtitle: string;
  /** Fallback colour: tints the sign-up modal until the artwork's own colour is read, and seeds generated art. */
  color: string;
  /** Artwork URL (album cover or artist photo). Generated art is used when missing or broken. */
  image?: string;
  /** Radio tiles: ids of the three artists whose photos are stacked on the tile (left, centre, right). */
  artists?: string[];
  chart?: ChartInfo;
  /** 30-second preview, for the player in a later step. */
  previewUrl?: string | null;
}

export interface HomeSection {
  id: string;
  title: string;
  items: MediaItem[];
}

const PALETTE = ['#7a4b8c', '#a0522d', '#1f6f8b', '#8a6d1e', '#2e4a7d', '#8b3a3a', '#3b5e3b', '#2f6f6f', '#6b4f2a', '#5a3d6e', '#9c5b2e', '#4a4f8c'];
const colorFor = (id: string) => PALETTE[hashString(id) % PALETTE.length];
const slug = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/*
 * Real catalogue from src/data/catalog.json (regenerate with `npm run catalog`):
 * artist photos come from the Deezer API, song and album artwork from the iTunes Search API.
 */

const songs: MediaItem[] = catalog.songs.map((s) => {
  const id = `track-${s.itunesId}`;
  return {
    id,
    type: 'song',
    title: s.title,
    subtitle: s.artists.join(', '),
    image: s.image,
    color: colorFor(id),
    previewUrl: s.previewUrl,
  };
});

const popularArtists: MediaItem[] = catalog.artists.map((a) => {
  const id = `artist-${a.deezerId}`;
  return { id, type: 'artist', title: a.name, subtitle: 'Artist', image: a.image, color: colorFor(id) };
});

const albums: MediaItem[] = catalog.albums.map((a) => {
  const id = `album-${a.itunesId}`;
  return { id, type: 'album', title: a.title, subtitle: a.artist, image: a.image, color: colorFor(id) };
});

export const findArtist = (id: string) => popularArtists.find((a) => a.id === id);
const artistIdByName = (name: string) => popularArtists.find((a) => a.title === name)?.id ?? '';

/** Artist radio tile: the artist in the middle, two similar artists either side. */
function radio(name: string, similar: [string, string], color: string): MediaItem {
  return {
    id: `radio-${slug(name)}`,
    type: 'radio',
    title: name,
    subtitle: `With ${name}, ${similar.join(', ')} and more`,
    color,
    artists: [artistIdByName(similar[0]), artistIdByName(name), artistIdByName(similar[1])],
  };
}

const chart = (id: string, chartInfo: ChartInfo, subtitle: string, color: string): MediaItem => ({
  id: `chart-${id}`,
  type: 'chart',
  title: `${chartInfo.headline} – ${chartInfo.region}`,
  subtitle,
  color,
  chart: chartInfo,
});

export const homeSections: HomeSection[] = [
  { id: 'trending-songs', title: 'Trending songs', items: songs },
  { id: 'popular-artists', title: 'Popular artists', items: popularArtists },
  { id: 'popular-albums', title: 'Popular albums and singles', items: albums },
  {
    id: 'popular-radio',
    title: 'Popular radio',
    items: [
      radio('Arijit Singh', ['Pritam', 'Atif Aslam'], '#8a7a3e'),
      radio('Pritam', ['Vishal-Shekhar', 'Arijit Singh'], '#4f8a80'),
      radio('A.R. Rahman', ['Shreya Ghoshal', 'Anirudh Ravichander'], '#b06a4f'),
      radio('Atif Aslam', ['Jubin Nautiyal', 'Arijit Singh'], '#a8657a'),
      radio('Diljit Dosanjh', ['AP Dhillon', 'Badshah'], '#4f8a7a'),
      radio('Shreya Ghoshal', ['Arijit Singh', 'Sachin-Jigar'], '#2f6f9a'),
      radio('Anirudh Ravichander', ['A.R. Rahman', 'Sachin-Jigar'], '#9a7a4a'),
      radio('AP Dhillon', ['Diljit Dosanjh', 'Badshah'], '#7a4f8a'),
    ],
  },
  {
    id: 'featured-charts',
    title: 'Featured Charts',
    items: [
      chart('top-songs-global', { headline: 'Top Songs', region: 'Global', cadence: 'Weekly' }, 'Your weekly update of the most played tracks right now - Global.', '#7b3fa0'),
      chart('top-songs-india', { headline: 'Top Songs', region: 'India', cadence: 'Weekly' }, 'Your weekly update of the most played tracks right now - India.', '#c0321e'),
      chart('top-50-global', { headline: 'Top 50', region: 'Global', cadence: 'Daily' }, 'Your daily update of the most played tracks right now - Global.', '#1d3a66'),
      chart('top-50-india', { headline: 'Top 50', region: 'India', cadence: 'Daily' }, 'Your daily update of the most played tracks right now - India.', '#0f7350'),
    ],
  },
];

export const findSection = (id: string | undefined) => homeSections.find((s) => s.id === id);
