import catalog from '../data/catalog.json';

/*
 * Offline demo answers, used when the server has no Anthropic API key (or no server, e.g. a static build).
 * Simple keyword matching over the app's catalogue; deliberately modest.
 */

type Mood = 'romantic' | 'chill' | 'party' | 'sad';

const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

/** Hand-tagged moods for the catalogue songs (by normalised title). */
const SONG_MOODS: Record<string, Mood[]> = {
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

const MOOD_WORDS: Record<Mood, string[]> = {
  romantic: ['romantic', 'love', 'date', 'crush', 'wedding'],
  chill: ['chill', 'relax', 'calm', 'study', 'focus', 'sleep', 'lofi', 'rain', 'evening'],
  party: ['party', 'dance', 'workout', 'gym', 'run', 'upbeat', 'energy', 'hype', 'drive', 'road trip'],
  sad: ['sad', 'heartbreak', 'cry', 'lonely', 'breakup', 'miss'],
};

const MOOD_INTRO: Record<Mood, string> = {
  romantic: 'Here’s something for a romantic mood:',
  chill: 'A few calmer picks to unwind with:',
  party: 'Turn it up with these:',
  sad: 'For the heavier days, these hit the right note:',
};

const songLine = (s: (typeof catalog.songs)[number]) => `• ${s.title} – ${s.artists.slice(0, 2).join(', ')}`;

function pick<T>(items: T[], count: number) {
  return [...items].sort(() => Math.random() - 0.5).slice(0, count);
}

function songsForMood(mood: Mood) {
  return catalog.songs.filter((s) => SONG_MOODS[norm(s.title)]?.includes(mood));
}

function findArtist(text: string) {
  const names = new Set<string>([
    ...catalog.artists.map((a) => a.name),
    ...catalog.songs.flatMap((s) => s.artists),
    ...catalog.albums.map((a) => a.artist),
  ]);
  return [...names]
    .sort((a, b) => b.length - a.length)
    .find((name) => norm(name).length > 2 && ` ${text} `.includes(` ${norm(name)} `));
}

function findSong(text: string) {
  return catalog.songs.find((s) => text.includes(norm(s.title)));
}

function findAlbum(text: string) {
  return catalog.albums.find((a) => {
    const core = norm(a.title.replace(/\(.*?\)|\[.*?\]/g, ''));
    return core.length > 2 && text.includes(core);
  });
}

const year = (iso?: string) => (iso ? new Date(iso).getFullYear() : null);

export function localReply(question: string, displayName?: string): string {
  const text = norm(question);
  const has = (...words: string[]) => words.some((w) => ` ${text} `.includes(` ${w} `));

  if (has('lyrics', 'lyric', 'words to')) {
    return 'I can’t share song lyrics, but I’m happy to tell you what a song is about, its mood, or suggest similar tracks. Which song did you have in mind?';
  }

  if (has('play', 'start', 'shuffle', 'queue') && !has('playlist')) {
    return 'Playback isn’t built into this demo yet; the music player is coming soon. In the meantime I can line up what to listen to first. Want a few picks?';
  }

  const song = findSong(text);
  if (song) {
    const moods = SONG_MOODS[norm(song.title)] ?? [];
    const similar = pick(
      catalog.songs.filter((s) => s !== song && (SONG_MOODS[norm(s.title)] ?? []).some((m) => moods.includes(m))),
      3,
    );
    const released = year(song.releaseDate);
    return [
      `${song.title} is by ${song.artists.join(', ')}${song.album && song.album !== song.title ? `, from “${song.album}”` : ''}${released ? ` (${released})` : ''}.`,
      similar.length ? 'If you like it, try:' : '',
      ...similar.map(songLine),
    ]
      .filter(Boolean)
      .join('\n');
  }

  const album = findAlbum(text);
  if (album) {
    const released = year(album.releaseDate);
    return `${album.title} is by ${album.artist}${released ? `, released in ${released}` : ''}, with ${album.trackCount} tracks. Open it from “Popular albums and singles” on the home page once album pages arrive.`;
  }

  const artist = findArtist(text);
  if (artist) {
    const target = norm(artist);
    const songs = catalog.songs.filter((s) => s.artists.some((a) => norm(a) === target));
    const albums = catalog.albums.filter((a) => norm(a.artist).includes(target));
    const lines = [...songs.map(songLine), ...albums.map((a) => `• ${a.title} (album)`)].slice(0, 6);
    if (!lines.length) {
      return `${artist} is in the app’s Popular artists. I don’t have their tracks in this offline demo yet. Add an API key for fuller answers.`;
    }
    return [`Here’s ${artist} in the app right now:`, ...lines].join('\n');
  }

  const mood = (Object.keys(MOOD_WORDS) as Mood[]).find((m) => MOOD_WORDS[m].some((w) => text.includes(w)));
  if (mood) {
    return [MOOD_INTRO[mood], ...pick(songsForMood(mood), 4).map(songLine)].join('\n');
  }

  if (has('trending', 'popular', 'top', 'hot', 'new', 'latest', 'charts')) {
    return ['Trending in the app right now:', ...catalog.songs.slice(0, 5).map(songLine)].join('\n');
  }

  if (has('recommend', 'suggest', 'playlist', 'something', 'listen', 'mix')) {
    return [
      'Here’s a quick mix to start with:',
      ...pick(catalog.songs, 5).map(songLine),
      'Tell me a mood (chill, romantic, party, sad) and I’ll tailor it.',
    ].join('\n');
  }

  if (has('hi', 'hello', 'hey', 'namaste', 'hola', 'yo')) {
    return `Hey${displayName ? ` ${displayName.split(' ')[0]}` : ''}! I’m Melo. Ask me for songs by mood, about an artist, or what’s trending.`;
  }

  if (has('help', 'can you', 'what do you', 'who are you')) {
    return 'I’m Melo, the app’s music assistant. I can suggest songs for a mood, tell you about artists and albums in the catalogue, and share what’s trending. Try “something chill for studying”.';
  }

  if (has('thanks', 'thank', 'thx', 'great', 'nice', 'cool')) {
    return 'Anytime! Want more picks in the same vibe?';
  }

  return 'I’m running in offline demo mode, so I only know the songs, artists and albums in this app. Try asking about Arijit Singh, “something for a road trip”, or what’s trending.';
}
