-- Melo songs database: run this whole script ONCE in Supabase (SQL Editor -> New query -> Run).
-- Then import the CSV files from data/ (see docs/n8n-rag-guide.md, section 4c).

create table if not exists public.songs (
  id text primary key,
  name text,
  album_name text,
  artists text,                 -- "Artist A, Artist B"
  year int,
  genre text,                   -- broad genre: Rock, Pop, Electronic, Folk, Country, Hip-Hop, R&B, Jazz, Blues, Classical
  niche_genres text,            -- "pop punk, skate punk"
  themes text,                  -- up to 3 of: love, heartbreak, party, nostalgia, faith, money, freedom, night, summer, anger, hope
  popularity int,               -- 0-100
  danceability real,            -- 0-1
  energy real,                  -- 0-1
  valence real,                 -- 0-1, musical happiness
  tempo real,                   -- BPM
  acousticness real,
  instrumentalness real,
  speechiness real,
  liveness real,
  loudness real,                -- dB
  key int,                      -- 0 = C ... 11 = B
  mode int,                     -- 1 major, 0 minor
  duration_ms int,
  total_artist_followers bigint,
  avg_artist_popularity real,
  artist_ids text
);

create table if not exists public.artists (
  id text primary key,
  name text,
  followers bigint,
  popularity int,
  genres text,
  main_genre text
);

-- A few indexes for the questions Melo asks most (kept small to stay inside the free 500 MB).
create index if not exists songs_genre_year_pop on public.songs (genre, year, popularity desc);
create index if not exists songs_year_pop on public.songs (year, popularity desc);
create index if not exists artists_followers on public.artists (followers desc);
create index if not exists artists_name_lower on public.artists (lower(name));

-- Lock the tables: Supabase exposes the public schema over its web API, so turn on row-level security
-- with no policies. The web API (anon/public keys) then sees nothing.
alter table public.songs enable row level security;
alter table public.artists enable row level security;

-- Read-only login for n8n. CHANGE THE PASSWORD before running, and save it for the n8n credential.
create role melo_reader login password 'CHANGE-ME-to-a-long-random-password';
grant usage on schema public to melo_reader;
grant select on public.songs, public.artists to melo_reader;
create policy melo_read_songs on public.songs for select to melo_reader using (true);
create policy melo_read_artists on public.artists for select to melo_reader using (true);

-- Safety limits: a runaway query is cancelled after 5 seconds and can't write anything.
alter role melo_reader set statement_timeout = '5s';
alter role melo_reader set default_transaction_read_only = on;
