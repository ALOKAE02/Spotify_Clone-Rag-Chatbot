/**
 * Prepares the large songs dataset (songs.csv + artists.csv) for a Postgres/Supabase database
 * that Melo queries with SQL.
 *
 * Usage:
 *   npm run songs-db -- "C:\path\to\songs.csv" "C:\path\to\artists.csv"
 *
 * Output (in data/, which is git-ignored):
 *   data/songs_part1.csv, songs_part2.csv, ...  every song, every column EXCEPT the lyrics text
 *   data/artists_clean.csv                      every artist, numbers and genre lists normalised
 *
 * The lyrics are never written out. Each song only gets a few "themes" tags (e.g. love, heartbreak,
 * party) detected from keywords in its lyrics, so Melo can find songs by theme without storing lyrics.
 */
import { createReadStream, createWriteStream, existsSync, mkdirSync } from 'node:fs';
import { once } from 'node:events';

const [songsPath, artistsPath] = process.argv.slice(2);
if (!songsPath || !artistsPath || !existsSync(songsPath) || !existsSync(artistsPath)) {
  console.error('Usage: npm run songs-db -- "C:\\path\\to\\songs.csv" "C:\\path\\to\\artists.csv"');
  process.exit(1);
}
const OUT = 'data';
const PART_BYTES = 40 * 1024 * 1024; // keep each file small enough for Supabase's CSV importer
mkdirSync(OUT, { recursive: true });

/** Streams CSV records (handles quoted fields with commas, quotes and newlines). */
async function* records(path) {
  let row = [];
  let field = '';
  let quoted = false;
  let pendingQuote = false;
  for await (const chunk of createReadStream(path, { encoding: 'utf8', highWaterMark: 1 << 20 })) {
    for (let i = 0; i < chunk.length; i++) {
      const c = chunk[i];
      if (pendingQuote) {
        pendingQuote = false;
        if (c === '"') {
          field += '"';
          continue;
        }
        quoted = false;
      }
      if (quoted) {
        if (c === '"') pendingQuote = true;
        else field += c;
        continue;
      }
      if (c === '"') quoted = true;
      else if (c === ',') {
        row.push(field);
        field = '';
      } else if (c === '\n') {
        row.push(field.replace(/\r$/, ''));
        field = '';
        yield row;
        row = [];
      } else field += c;
    }
  }
  if (field || row.length) {
    row.push(field);
    yield row;
  }
}

const csvCell = (v) => {
  const s = v == null ? '' : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const csvLine = (values) => `${values.map(csvCell).join(',')}\n`;

/** ["A", "B"] or ['a', 'b'] -> "A, B" (plain text is easier to search with ILIKE). */
function listText(v) {
  const t = (v ?? '').trim();
  if (!t.startsWith('[')) return t;
  const items = [...t.matchAll(/"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'/g)].map((m) => (m[1] ?? m[2]).trim());
  return items.filter(Boolean).join(', ');
}

const int = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? String(Math.round(n)) : '';
};
const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? String(n) : '';
};

/** Theme tags from keyword counts. Only the tags are kept; the lyrics text is discarded. */
const THEMES = {
  love: ['love', 'lover', 'kiss', 'darling', 'baby', 'heart', 'romance'],
  heartbreak: ['goodbye', 'broken', 'tears', 'cry', 'crying', 'alone', 'lonely', 'miss you', 'left me', 'hurt'],
  party: ['party', 'dance', 'dancing', 'club', 'drink', 'tonight', 'shots', 'turn up'],
  nostalgia: ['remember', 'memories', 'used to', 'back then', 'yesterday', 'old days', 'young'],
  faith: ['god', 'lord', 'jesus', 'heaven', 'pray', 'prayer', 'faith', 'soul'],
  money: ['money', 'cash', 'rich', 'dollar', 'paid', 'bank'],
  freedom: ['free', 'freedom', 'run away', 'escape', 'fly', 'road', 'highway'],
  night: ['night', 'midnight', 'moon', 'stars', 'dark'],
  summer: ['summer', 'sun', 'sunshine', 'beach', 'ocean', 'waves'],
  anger: ['hate', 'fight', 'war', 'rage', 'kill', 'burn', 'blood'],
  hope: ['hope', 'dream', 'dreams', 'rise', 'believe', 'tomorrow', 'light'],
};
const THEME_PATTERNS = Object.entries(THEMES).map(([theme, words]) => [
  theme,
  new RegExp(`\\b(?:${words.map((w) => w.replace(/ /g, '\\s+')).join('|')})\\b`, 'gi'),
]);
function themesOf(lyrics) {
  if (!lyrics) return '';
  const words = lyrics.split(/\s+/).length || 1;
  const scored = THEME_PATTERNS.map(([theme, re]) => [theme, (lyrics.match(re)?.length ?? 0) / words])
    .filter(([, score]) => score >= 0.008)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  return scored.map(([t]) => t).join(', ');
}

// --- Songs ----------------------------------------------------------------------------------------

const SONG_COLUMNS = [
  'id', 'name', 'album_name', 'artists', 'year', 'genre', 'niche_genres', 'themes', 'popularity',
  'danceability', 'energy', 'valence', 'tempo', 'acousticness', 'instrumentalness', 'speechiness',
  'liveness', 'loudness', 'key', 'mode', 'duration_ms', 'total_artist_followers', 'avg_artist_popularity', 'artist_ids',
];

let part = 0;
let out = null;
let written = 0;
async function nextPart() {
  if (out) {
    out.end();
    await once(out, 'finish');
  }
  part++;
  out = createWriteStream(`${OUT}/songs_part${part}.csv`);
  written = 0;
  const header = csvLine(SONG_COLUMNS);
  out.write(header);
  written += Buffer.byteLength(header);
}

let header = null;
let songs = 0;
let skipped = 0;
let themed = 0;
await nextPart();
for await (const r of records(songsPath)) {
  if (!header) {
    header = Object.fromEntries(r.map((h, i) => [h, i]));
    if (!('lyrics' in header) || !('id' in header)) throw new Error('songs.csv does not have the expected columns');
    continue;
  }
  if (r.length < Object.keys(header).length || !r[header.id]) {
    skipped++;
    continue;
  }
  const get = (k) => r[header[k]];
  const themes = themesOf(get('lyrics'));
  if (themes) themed++;
  const line = csvLine([
    get('id'), get('name'), get('album_name'), listText(get('artists')), int(get('year')), get('genre'),
    listText(get('niche_genres')), themes, int(get('popularity')),
    num(get('danceability')), num(get('energy')), num(get('valence')), num(get('tempo')), num(get('acousticness')),
    num(get('instrumentalness')), num(get('speechiness')), num(get('liveness')), num(get('loudness')),
    int(get('key')), int(get('mode')), int(get('duration_ms')), int(get('total_artist_followers')),
    num(get('avg_artist_popularity')), listText(get('artist_ids')),
  ]);
  if (written + Buffer.byteLength(line) > PART_BYTES) await nextPart();
  if (!out.write(line)) await once(out, 'drain');
  written += Buffer.byteLength(line);
  songs++;
}
out.end();
await once(out, 'finish');

// --- Artists --------------------------------------------------------------------------------------

const ARTIST_COLUMNS = ['id', 'name', 'followers', 'popularity', 'genres', 'main_genre'];
const artistsOut = createWriteStream(`${OUT}/artists_clean.csv`);
artistsOut.write(csvLine(ARTIST_COLUMNS));
let aHeader = null;
let artists = 0;
for await (const r of records(artistsPath)) {
  if (!aHeader) {
    aHeader = Object.fromEntries(r.map((h, i) => [h, i]));
    continue;
  }
  if (!r[aHeader.id]) continue;
  const get = (k) => r[aHeader[k]];
  if (!artistsOut.write(csvLine([get('id'), get('name'), int(get('followers')), int(get('popularity')), listText(get('genres')), get('main_genre')]))) {
    await once(artistsOut, 'drain');
  }
  artists++;
}
artistsOut.end();
await once(artistsOut, 'finish');

console.log(`Songs: ${songs.toLocaleString('en')} written to ${part} file(s) data/songs_part1..${part}.csv (lyrics removed; ${themed.toLocaleString('en')} songs tagged with themes; ${skipped} malformed rows skipped).`);
console.log(`Artists: ${artists.toLocaleString('en')} written to data/artists_clean.csv.`);
