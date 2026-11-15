/**
 * Turns the Spotify tracks dataset CSV (114k rows, 114 genres) into n8n/melo-tracks-knowledge.md:
 * a compact, search-friendly document for Melo's "track_finder" vector store in n8n.
 *
 * Usage:
 *   npm run tracks -- "C:\path\to\spotify-tracks-dataset.csv" [--per-genre 30]
 *
 * What it does:
 *   - keeps one entry per track (the dataset repeats tracks under several genres) and merges their genres
 *   - picks the most popular tracks of every genre, plus every track by the artists shown in the app
 *   - writes each track as one line, turning audio features (energy, valence, ...) into words such as
 *     "energetic, happy, good for workouts" so that natural-language searches find them
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? Number(args[i + 1]) : fallback;
};
const csvPath = args.find((a) => !a.startsWith('--') && !/^\d+$/.test(a)) ?? 'data/spotify-tracks-dataset.csv';
const PER_GENRE = flag('--per-genre', 30);
const PER_APP_ARTIST = 15;

if (!existsSync(csvPath)) {
  console.error(`CSV not found: ${csvPath}\nUsage: npm run tracks -- "C:\\path\\to\\spotify-tracks-dataset.csv"`);
  process.exit(1);
}

/** Minimal CSV parser (handles quoted fields, embedded commas, quotes and newlines). */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n') {
      row.push(field.replace(/\r$/, ''));
      rows.push(row);
      row = [];
      field = '';
    } else field += c;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

const KEYS = ['C', 'C♯/D♭', 'D', 'D♯/E♭', 'E', 'F', 'F♯/G♭', 'G', 'G♯/A♭', 'A', 'A♯/B♭', 'B'];
const norm = (s) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]/g, '');
const clean = (s) => s.replace(/\s+/g, ' ').replace(/\|/g, '/').trim();

/** Plain-language description of a track's audio features. */
function describe(t) {
  const feel = [];
  const goodFor = [];
  const { energy: e, danceability: d, valence: v, acousticness: a, instrumentalness: ins, speechiness: sp, liveness: live, tempo } = t;

  if (e >= 0.8) feel.push('high energy');
  else if (e >= 0.6) feel.push('energetic');
  else if (e < 0.3) feel.push('very calm');
  else if (e < 0.45) feel.push('calm');

  if (v >= 0.7) feel.push('happy', 'upbeat');
  else if (v >= 0.5) feel.push('positive');
  else if (v < 0.25) feel.push('sad', 'dark');
  else if (v < 0.4) feel.push('melancholic');

  if (d >= 0.75) feel.push('very danceable');
  else if (d >= 0.6) feel.push('danceable');
  if (a >= 0.6) feel.push('acoustic');
  if (ins >= 0.5) feel.push('instrumental');
  if (sp >= 0.33) feel.push(sp >= 0.66 ? 'spoken word' : 'rap vocals');
  if (live >= 0.8) feel.push('live recording');

  if (e >= 0.7 && d >= 0.6) goodFor.push('workouts', 'parties');
  else if (d >= 0.7) goodFor.push('dancing');
  if (e < 0.45 && (ins >= 0.4 || a >= 0.5) && sp < 0.2) goodFor.push('studying', 'focus');
  if (e < 0.3 && a >= 0.5) goodFor.push('sleep', 'unwinding');
  if (v >= 0.6 && e >= 0.5) goodFor.push('road trips', 'feel-good moments');
  if (v < 0.35 && e < 0.55) goodFor.push('rainy days', 'late nights');
  if (e >= 0.75 && tempo >= 120) goodFor.push('running');

  return { feel: [...new Set(feel)], goodFor: [...new Set(goodFor)].slice(0, 4) };
}

const minutes = (ms) => `${Math.floor(ms / 60000)}:${String(Math.round((ms % 60000) / 1000) % 60).padStart(2, '0')}`;

// --- Load and merge -------------------------------------------------------------------------------

const rows = parseCsv(await readFile(csvPath, 'utf8'));
const header = rows.shift();
const col = Object.fromEntries(header.map((h, i) => [h, i]));
for (const needed of ['track_id', 'artists', 'album_name', 'track_name', 'popularity', 'track_genre', 'energy', 'valence']) {
  if (!(needed in col)) {
    console.error(`Column "${needed}" is missing; is this the Spotify tracks dataset?`);
    process.exit(1);
  }
}

const tracks = new Map(); // track_id -> track
for (const r of rows) {
  if (r.length !== header.length || !r[col.track_id]) continue;
  const id = r[col.track_id];
  const genre = r[col.track_genre];
  const existing = tracks.get(id);
  if (existing) {
    existing.genres.add(genre);
    continue;
  }
  const num = (name) => Number(r[col[name]]);
  tracks.set(id, {
    id,
    name: clean(r[col.track_name]),
    artists: r[col.artists].split(';').map(clean).filter(Boolean),
    album: clean(r[col.album_name]),
    popularity: num('popularity'),
    durationMs: num('duration_ms'),
    explicit: r[col.explicit] === 'True',
    danceability: num('danceability'),
    energy: num('energy'),
    key: num('key'),
    mode: num('mode'),
    speechiness: num('speechiness'),
    acousticness: num('acousticness'),
    instrumentalness: num('instrumentalness'),
    liveness: num('liveness'),
    valence: num('valence'),
    tempo: num('tempo'),
    genres: new Set([genre]),
  });
}

// The same song is often listed several times (album, single, compilation): keep the most popular copy.
const bySong = new Map();
for (const t of tracks.values()) {
  if (!t.name || !t.artists.length) continue;
  const key = `${norm(t.name)}|${norm(t.artists[0])}`;
  const kept = bySong.get(key);
  if (!kept) bySong.set(key, t);
  else {
    for (const g of t.genres) kept.genres.add(g);
    if (t.popularity > kept.popularity) {
      t.genres = kept.genres;
      bySong.set(key, t);
    }
  }
}
const songs = [...bySong.values()];

// --- Select ---------------------------------------------------------------------------------------

const genres = [...new Set(songs.flatMap((t) => [...t.genres]))].sort();
const selected = new Map(); // track -> section genre
for (const genre of genres) {
  songs
    .filter((t) => t.genres.has(genre))
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, PER_GENRE)
    .forEach((t) => {
      if (!selected.has(t)) selected.set(t, genre);
    });
}

// Always include the artists that appear on the app's home page.
let appArtists = [];
try {
  const catalog = JSON.parse(await readFile(new URL('../src/data/catalog.json', import.meta.url), 'utf8'));
  appArtists = catalog.artists.map((a) => norm(a.name));
} catch {
  /* catalogue missing: skip */
}
let fromAppArtists = 0;
for (const target of appArtists) {
  songs
    .filter((t) => t.artists.some((a) => norm(a) === target))
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, PER_APP_ARTIST)
    .forEach((t) => {
      if (!selected.has(t)) {
        selected.set(t, [...t.genres].sort()[0]);
        fromAppArtists++;
      }
    });
}

// --- Write ----------------------------------------------------------------------------------------

const sections = new Map();
for (const [t, genre] of selected) {
  if (!sections.has(genre)) sections.set(genre, []);
  sections.get(genre).push(t);
}

const lines = [
  '# Melo track finder: songs by genre and mood',
  '',
  `A selection of ${selected.size.toLocaleString('en')} popular tracks across ${sections.size} genres from a public Spotify tracks dataset (a snapshot, not live charts).`,
  'Each line: Song – Artists | album | genres | popularity (0-100 in the dataset) | length | tempo and key | feel | good for | explicit.',
  '',
];

for (const genre of [...sections.keys()].sort()) {
  lines.push(`## Genre: ${genre}`, '');
  for (const t of sections.get(genre).sort((a, b) => b.popularity - a.popularity)) {
    const { feel, goodFor } = describe(t);
    const key = t.key >= 0 && t.key < 12 ? `${KEYS[t.key]} ${t.mode === 1 ? 'major' : 'minor'}` : 'key unknown';
    lines.push(
      [
        `${t.name} – ${t.artists.join(', ')}`,
        `album: ${t.album}`,
        `genres: ${[...t.genres].sort().join(', ')}`,
        `popularity ${t.popularity}/100`,
        minutes(t.durationMs),
        `${Math.round(t.tempo)} BPM, ${key}`,
        feel.length ? `feel: ${feel.join(', ')}` : 'feel: balanced',
        goodFor.length ? `good for: ${goodFor.join(', ')}` : null,
        `explicit: ${t.explicit ? 'yes' : 'no'}`,
      ]
        .filter(Boolean)
        .join(' | '),
      '',
    );
  }
}

const out = new URL('../n8n/melo-tracks-knowledge.md', import.meta.url);
await mkdir(new URL('../n8n/', import.meta.url), { recursive: true });
const text = lines.join('\n');
await writeFile(out, text);

console.log(`Read ${rows.length.toLocaleString('en')} rows: ${tracks.size.toLocaleString('en')} unique track ids, ${songs.length.toLocaleString('en')} unique songs, ${genres.length} genres.`);
console.log(`Selected ${selected.size.toLocaleString('en')} tracks (${PER_GENRE} per genre + ${fromAppArtists} more by the app's artists).`);
console.log(`Wrote n8n/melo-tracks-knowledge.md (${(Buffer.byteLength(text) / 1024).toFixed(0)} KB).`);
