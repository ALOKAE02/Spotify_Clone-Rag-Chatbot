/**
 * Writes n8n/melo-knowledge.md: the document Melo's n8n workflow stores in its vector store (the "R" in RAG).
 * It combines app FAQs with facts from src/data/catalog.json. Re-run after `npm run catalog`:
 *   npm run knowledge
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const catalog = JSON.parse(await readFile(new URL('../src/data/catalog.json', import.meta.url), 'utf8'));
const OUT_DIR = new URL('../n8n/', import.meta.url);

/** Hand-tagged moods (same tags the offline demo uses). */
const MOODS = {
  kesariya: ['romantic'],
  'apna bana le': ['romantic', 'chill'],
  chaleya: ['romantic', 'party'],
  satranga: ['sad', 'chill'],
  heeriye: ['romantic', 'chill'],
  'maan meri jaan': ['romantic', 'chill'],
  'raataan lambiyan': ['romantic'],
  excuses: ['party'],
  'born to shine': ['party'],
  'tum hi ho': ['sad', 'romantic'],
  'blinding lights': ['party'],
  'shape of you': ['party'],
};

const RADIOS = [
  ['Arijit Singh', 'Pritam', 'Atif Aslam'],
  ['Pritam', 'Vishal-Shekhar', 'Arijit Singh'],
  ['A.R. Rahman', 'Shreya Ghoshal', 'Anirudh Ravichander'],
  ['Atif Aslam', 'Jubin Nautiyal', 'Arijit Singh'],
  ['Diljit Dosanjh', 'AP Dhillon', 'Badshah'],
  ['Shreya Ghoshal', 'Arijit Singh', 'Sachin-Jigar'],
  ['Anirudh Ravichander', 'A.R. Rahman', 'Sachin-Jigar'],
  ['AP Dhillon', 'Diljit Dosanjh', 'Badshah'],
];

const year = (iso) => (iso ? new Date(iso).getFullYear() : 'unknown');
const minutes = (ms) => (ms ? `${Math.floor(ms / 60000)}:${String(Math.round((ms % 60000) / 1000)).padStart(2, '0')}` : 'unknown');
const norm = (s) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9 ]/g, '').trim();

const lines = [];
const add = (...l) => lines.push(...l);

add(
  '# Melo knowledge base: Spotify Clone',
  '',
  'This document describes the Spotify Clone web app and the music in its catalogue. It is the reference the assistant Melo searches before answering. Spotify Clone is an educational project and is not affiliated with Spotify.',
  '',
  '## About the app',
  '',
  'Q: What is Spotify Clone?',
  'A: A web app that recreates the look and feel of a music streaming web player for learning purposes. It has a home page with music shelves, a Your Library sidebar, sign up and log in, and Melo, the music assistant.',
  '',
  'Q: How do I sign up?',
  'A: Click "Sign up" in the top bar or "Sign up free" in the banner. Enter your email, create a password (at least 10 characters, with a letter and a number or special character), add your name, date of birth and gender, then accept the terms. You must be at least 13.',
  '',
  'Q: How do I log in?',
  'A: Click "Log in", enter your email, then your password. The log-in page also has a "Use the demo account" button to try the app without signing up. Accounts are demo accounts stored only in your browser.',
  '',
  'Q: Can I play music?',
  'A: Not yet. The music player is being built. Melo can still recommend what to listen to.',
  '',
  'Q: Can I create playlists?',
  'A: Not yet. Creating playlists and saving to Your Library are coming in a later step.',
  '',
  'Q: What can Melo do?',
  'A: Melo suggests songs for a mood, tells you about the artists, songs and albums in the app, and shares what is trending. Melo does not share song lyrics.',
  '',
  'Q: What are the sections on the home page?',
  'A: Trending songs, Popular artists, Popular albums and singles, Popular radio, and Featured Charts. Each shelf has "Show all" to see everything in a grid.',
  '',
  'Q: How do I change the language or hide the sign-up banner?',
  'A: Use the language button at the bottom of Your Library. The purple-to-blue sign-up banner at the bottom has an X to dismiss it, and it disappears when you log in.',
  '',
  '## Trending songs',
  '',
);

for (const s of catalog.songs) {
  const moods = MOODS[norm(s.title)] ?? [];
  add(
    `### ${s.title}`,
    `${s.title} is a song by ${s.artists.join(', ')}. It is on "${s.album}", released in ${year(s.releaseDate)}. Length: ${minutes(s.durationMs)}.${moods.length ? ` Mood: ${moods.join(', ')}.` : ''} It appears in the Trending songs shelf.`,
    '',
  );
}

add('## Popular artists', '');
for (const a of catalog.artists) {
  const target = norm(a.name);
  const songs = catalog.songs.filter((s) => s.artists.some((x) => norm(x) === target)).map((s) => s.title);
  const albums = catalog.albums.filter((al) => norm(al.artist).includes(target)).map((al) => al.title);
  const parts = [];
  if (songs.length) parts.push(`songs in the app: ${songs.join(', ')}`);
  if (albums.length) parts.push(`albums in the app: ${albums.join(', ')}`);
  add(
    `### ${a.name}`,
    `${a.name} is one of the Popular artists in the app${parts.length ? `. ${parts.join('; ')}` : ''}.`,
    '',
  );
}

add('## Popular albums and singles', '');
for (const al of catalog.albums) {
  add(`### ${al.title}`, `${al.title} is by ${al.artist}, released in ${year(al.releaseDate)}, with ${al.trackCount} tracks.`, '');
}

add('## Popular radio', '');
for (const [main, ...others] of RADIOS) {
  add(`- ${main} Radio: music by ${main}, ${others.join(', ')} and similar artists.`);
}

add(
  '',
  '## Featured Charts',
  '',
  '- Top Songs – Global: weekly update of the most played tracks worldwide.',
  '- Top Songs – India: weekly update of the most played tracks in India.',
  '- Top 50 – Global: daily update of the most played tracks worldwide.',
  '- Top 50 – India: daily update of the most played tracks in India.',
  '',
  '## Mood guide',
  '',
);

for (const mood of ['romantic', 'chill', 'party', 'sad']) {
  const picks = catalog.songs.filter((s) => (MOODS[norm(s.title)] ?? []).includes(mood)).map((s) => `${s.title} (${s.artists.slice(0, 2).join(', ')})`);
  add(`- ${mood[0].toUpperCase()}${mood.slice(1)}: ${picks.join('; ')}.`);
}
add('');

await mkdir(OUT_DIR, { recursive: true });
await writeFile(new URL('melo-knowledge.md', OUT_DIR), lines.join('\n'));
console.log(`Wrote n8n/melo-knowledge.md (${lines.length} lines)`);
