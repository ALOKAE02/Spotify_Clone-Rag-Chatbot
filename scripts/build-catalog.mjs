/**
 * Builds src/data/catalog.json from two public, key-free APIs:
 *   - Deezer API: artist photos (Deezer hides songs/albums in India, but artist pictures work)
 *   - iTunes Search API (India store): songs and albums with artwork and 30-second preview URLs
 * It looks up a hand-picked list and stores names, ids and artwork URLs only.
 * Re-run any time with: npm run catalog
 */
import { writeFile } from 'node:fs/promises';

const DEEZER = 'https://api.deezer.com';
const ITUNES = 'https://itunes.apple.com/search';
const COUNTRY = 'IN';
const OUT = new URL('../src/data/catalog.json', import.meta.url);

const ARTISTS = [
  'Arijit Singh',
  'Pritam',
  'A.R. Rahman',
  'Shreya Ghoshal',
  'Atif Aslam',
  'Vishal-Shekhar',
  'Sachin-Jigar',
  'Anirudh Ravichander',
  'Diljit Dosanjh',
  'AP Dhillon',
  'Badshah',
  'Jubin Nautiyal',
];

/** [song title, an artist credited on it] */
const SONGS = [
  ['Kesariya', 'Arijit Singh'],
  ['Apna Bana Le', 'Arijit Singh'],
  ['Chaleya', 'Arijit Singh'],
  ['Satranga', 'Arijit Singh'],
  ['Heeriye', 'Jasleen Royal'],
  ['Maan Meri Jaan', 'King'],
  ['Raataan Lambiyan', 'Jubin Nautiyal'],
  ['Excuses', 'AP Dhillon'],
  ['Born To Shine', 'Diljit Dosanjh'],
  ['Tum Hi Ho', 'Arijit Singh'],
  ['Blinding Lights', 'The Weeknd'],
  ['Shape of You', 'Ed Sheeran'],
];

/** [album title, main artist] */
const ALBUMS = [
  ['Brahmastra', 'Pritam'],
  ['Rockstar', 'A.R. Rahman'],
  ['Jawan', 'Anirudh Ravichander'],
  ['Hidden Gems', 'AP Dhillon'],
  ['MoonChild Era', 'Diljit Dosanjh'],
  ['Ae Dil Hai Mushkil', 'Pritam'],
  ['Yeh Jawaani Hai Deewani', 'Pritam'],
  ['Dil Bechara', 'A.R. Rahman'],
  ['After Hours', 'The Weeknd'],
  ['Midnights', 'Taylor Swift'],
  ['thank u, next', 'Ariana Grande'],
  ['BORN PINK', 'BLACKPINK'],
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const norm = (s) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]/g, '');
const bigArtwork = (url) => url.replace(/\/\d+x\d+bb\.(jpg|png)$/, '/600x600bb.$1');
/** "Pritam, Arijit Singh & Amitabh Bhattacharya" -> ["Pritam", "Arijit Singh", "Amitabh Bhattacharya"] */
const splitArtists = (s) => s.split(/\s*(?:,|&| x | feat\.? | ft\.? )\s*/i).filter(Boolean);
/** Display title: "Kesariya (From \"Brahmastra\")" -> "Kesariya", "Hidden Gems - EP" -> "Hidden Gems" */
const cleanTitle = (s) =>
  s
    .replace(/\s*\((?:from|feat|ft)[^)]*\)/gi, '')
    .replace(/\s+-\s+(?:single|ep)$/i, '')
    .trim();
/** Bare title for matching: also drops anything in brackets/parentheses. */
const coreTitle = (s) => norm(cleanTitle(s).replace(/\s*[([][^)\]]*[)\]]/g, ''));
const VARIANT = /synthwave|acoustic|vocals only|remix|lo-?fi|slowed|reverb|instrumental|karaoke|cover|reprise|unplugged|sped up|\b8d\b|\blive\b/i;
const EDITION = /deluxe|edition|expanded|anniversary/i;

async function getJson(url, delay) {
  await sleep(delay);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} for ${url}`);
  const json = await res.json();
  if (json.error) throw new Error(`${url}: ${json.error.message}`);
  return json;
}

// Deezer allows 50 requests / 5 s; iTunes roughly 20 / minute.
const deezer = (path) => getJson(DEEZER + path, 150);
const itunes = (params) =>
  getJson(`${ITUNES}?${new URLSearchParams({ country: COUNTRY, limit: '15', ...params })}`, 3200);

async function findArtist(name) {
  const { data } = await deezer(`/search/artist?q=${encodeURIComponent(name)}&limit=5`);
  return data.find((a) => norm(a.name) === norm(name)) ?? data[0] ?? null;
}

/** Highest score wins; ties keep the API's relevance order. */
const best = (items, score) =>
  items
    .map((item, index) => ({ item, index, score: score(item) }))
    .filter((x) => x.score > -Infinity)
    .sort((a, b) => b.score - a.score || a.index - b.index)[0]?.item ?? null;

async function findSong(title, artist) {
  const { results } = await itunes({ term: `${title} ${artist}`, entity: 'song', limit: '25' });
  return best(results, (t) => {
    if (!norm(t.artistName).includes(norm(artist)) || !norm(t.trackName).startsWith(norm(title))) return -Infinity;
    let score = 0;
    if (coreTitle(t.trackName) === norm(title)) score += 3; // the original, not "Kesariya (Synthwave)"
    if (VARIANT.test(t.trackName) || VARIANT.test(t.collectionName)) score -= 5;
    return score;
  });
}

async function findAlbum(title, artist) {
  const { results } = await itunes({ term: `${title} ${artist}`, entity: 'album', limit: '25' });
  return best(results, (a) => {
    if (!norm(a.artistName).includes(norm(artist)) || !norm(a.collectionName).startsWith(norm(title))) return -Infinity;
    let score = Math.min(a.trackCount, 20) / 10; // full albums over singles
    if (coreTitle(a.collectionName) === norm(title)) score += 3;
    if (EDITION.test(a.collectionName)) score -= 1; // standard edition over deluxe
    if (a.trackCount <= 2) score -= 4;
    return score;
  });
}

const missing = [];

const artists = [];
for (const name of ARTISTS) {
  const a = await findArtist(name);
  if (!a) {
    missing.push(`artist ${name}`);
    continue;
  }
  artists.push({ deezerId: a.id, name: a.name, image: a.picture_big });
  console.log(`artist  ${a.name}`);
}

const songs = [];
for (const [title, artist] of SONGS) {
  const t = await findSong(title, artist);
  if (!t) {
    missing.push(`song ${title} – ${artist}`);
    continue;
  }
  songs.push({
    itunesId: t.trackId,
    title: cleanTitle(t.trackName),
    artists: splitArtists(t.artistName).slice(0, 4),
    album: cleanTitle(t.collectionName),
    albumItunesId: t.collectionId,
    image: bigArtwork(t.artworkUrl100),
    previewUrl: t.previewUrl ?? null,
    durationMs: t.trackTimeMillis ?? null,
    releaseDate: t.releaseDate,
  });
  console.log(`song    ${t.trackName} – ${t.artistName}`);
}

const albums = [];
for (const [title, artist] of ALBUMS) {
  const a = await findAlbum(title, artist);
  if (!a) {
    missing.push(`album ${title} – ${artist}`);
    continue;
  }
  albums.push({
    itunesId: a.collectionId,
    title: cleanTitle(a.collectionName),
    artist: a.artistName,
    image: bigArtwork(a.artworkUrl100),
    trackCount: a.trackCount,
    releaseDate: a.releaseDate,
  });
  console.log(`album   ${a.collectionName} – ${a.artistName} (${a.trackCount} tracks)`);
}

await writeFile(
  OUT,
  `${JSON.stringify(
    {
      sources: { artists: 'Deezer API', songs: 'iTunes Search API', albums: 'iTunes Search API' },
      generatedAt: new Date().toISOString(),
      artists,
      songs,
      albums,
    },
    null,
    2,
  )}\n`,
);

console.log(`\nWrote ${artists.length} artists, ${songs.length} songs, ${albums.length} albums to src/data/catalog.json`);
if (missing.length) console.log(`Not found:\n  ${missing.join('\n  ')}`);
