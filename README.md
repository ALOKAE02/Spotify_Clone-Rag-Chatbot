# Spotify Clone (educational)

A step-by-step clone of the Spotify web player, built with React 19, TypeScript, Vite and Tailwind CSS v4.
It uses its own logo and name. Artist photos come from the Deezer API and song/album artwork from the
iTunes Search API, loaded from their servers at runtime; no Spotify assets are included.

## Run it

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Type-check and production build into `dist/` |
| `npm run preview` | Serve the production build |
| `npm run typecheck` | Type-check only |
| `npm run catalog` | Re-fetch the home-page catalogue into `src/data/catalog.json` (takes about 90 s) |

## Demo account

The app creates one account the first time it runs in a browser, so you can log in without signing up:

- Email: `demo@spotifyclone.test`
- Password: `DemoPass123`

The log-in page also has a **Use the demo account** button.

Accounts are **demo only**: they live in this browser's `localStorage` (passwords are salted SHA-256 hashes,
but anyone with access to the browser can read or change them). Clearing site data removes them.
Don't use a real password. A real backend replaces this in a later step.

## What works

### Landing page (logged out)
- Top bar: logo, Home, search (Ctrl/Cmd+K to focus, Enter to search), Browse, Premium / Support / Download,
  Install App, Sign up, Log in
- "Your Library" sidebar: Create / Create playlist open the blue "Log in to create playlists" popover;
  Browse podcasts, legal links, language picker (32 languages, remembered)
- Drag the gutter between the library and the main view to resize it (also arrow keys); the width is remembered
- Home rows with real artwork: Trending songs, Popular artists, Popular albums and singles, Popular radio
  (stacked artist photos), Featured Charts. Rows scroll sideways with hover arrows; "Show all" opens a grid
- Cards: hover shows the green play button; clicking opens the "Start listening with a free account" modal,
  tinted with the colour of that artwork
- Gradient "Preview" banner with an **X** to dismiss it (stays dismissed in this browser)
- Collapsible Now Playing panel, footer, responsive down to phone width

### Sign up (`/signup`)
Email → Step 1 password (live checklist: a letter, a number or special character, 10+ characters) →
Step 2 name, date of birth (13+), gender → Step 3 terms → signed in. Validates every step, blocks emails
that already have an account, and shows a notice for the phone/Google/Apple buttons (email only in the demo).

### Log in (`/login`)
Email first, then password with show/hide and "Remember me" (off = session ends when the tab closes).
Clear errors for unknown email and wrong password.

### Logged in
- Top bar shows Explore Premium, Install App, What's New and an avatar menu
  (Account, Profile, Upgrade to Premium, Support, Download, Settings, Log out)
- The preview banner is hidden
- Playing music and creating playlists show a "coming soon" notice until the player and library are built

Routes that are not built yet (search, premium, account, footer pages, …) show a "coming soon" page.

### Music assistant ("Melo")
- Glowing green button in the bottom-right of the main view (pulsing glow, spinning halo, equaliser icon)
- Opens a chat window with an animated background: drifting green aurora, flowing sound-wave lines and rising
  sparks that speed up and brighten while the assistant is thinking or answering
- Answers flow in word by word (each word rises out of a green blur and settles to white), followed by a light
  sweep across the bubble
- Suggestion chips, Enter to send (Shift+Enter for a new line), Stop, New chat, Escape to close;
  the conversation is kept for the browser session
- Respects "reduce motion" settings

**n8n (RAG workflow):** every click that opens Melo sends `{"action":"open"}` and every message sends
`{"action":"message"}` to the n8n webhook in `N8N_WEBHOOK_URL` (`.env.local`), through the dev server.
The workflow answers from a knowledge base (`n8n/melo-knowledge.md`, regenerate with `npm run knowledge`).
Step-by-step setup, importable workflows and troubleshooting: **[docs/n8n-rag-guide.md](docs/n8n-rag-guide.md)**.
If n8n doesn't answer, Melo falls back to Claude, then to offline demo answers.

**Real answers from Claude:** copy `.env.example` to `.env.local`, set `ANTHROPIC_API_KEY`, and restart
`npm run dev`. The key is read only by the dev/preview server (`server/chatPlugin.ts`, route `POST /api/chat`),
which streams replies from `claude-opus-5-5` (effort `low` for quick chat replies, with the API's server-side
refusal fallback enabled via `fallbacks: "default"`). The key never reaches the browser.

**Without a key** the assistant runs in offline demo mode: simple keyword answers about the app's catalogue
(moods, artists, songs, albums, trending). A static build with no server also falls back to this mode.
Either way it won't reproduce song lyrics.

## Catalogue data

`scripts/build-catalog.mjs` looks up a hand-picked list of artists, songs and albums and writes
`src/data/catalog.json` (names, ids, artwork URLs, and 30-second preview URLs for the future player).
Deezer hides songs and albums in India, so songs and albums come from the iTunes India store and only artist
photos come from Deezer. Edit the lists at the top of the script and run `npm run catalog` to change what shows.
If an image fails to load, the card falls back to generated cover art.

## Project layout

```
scripts/build-catalog.mjs  fetches the catalogue (Deezer + iTunes)
server/chatPlugin.ts       POST /api/chat on the dev/preview server (streams Claude replies)
server/chatPrompt.ts       the assistant's system prompt (includes the catalogue)
src/
  components/assistant/    Assistant (launcher + chat window), AssistantBackground (canvas), RevealText
  hooks/useAssistantChat.ts chat state, streaming, offline fallback
  lib/localAssistant.ts    offline demo answers
  config/brand.ts          app name (one place to change it)
  data/catalog.json        generated catalogue
  data/home.ts             home rows built from the catalogue
  lib/auth.ts              demo accounts and sessions (localStorage)
  lib/art.ts               colour helpers and seeded random for generated art
  context/                 Auth and UI providers (modals, popover, toasts, language)
  components/auth/         AuthLayout, form fields, sign-in-with buttons
  components/layout/       TopBar, AccountMenu, Sidebar, ResizeHandle, NowPlayingPanel, PreviewBanner, Footer
  components/media/        Shelf, MediaCard, Artwork, GeneratedCover
  components/modals/       SignupPromptModal, LanguageModal
  components/ui/           Modal, LoginPopover, Tooltip, Toast
  pages/                   Home, SectionPage, ComingSoon, auth/LoginPage, auth/SignupPage
```

## Next steps (planned)

Search and browse, album / artist / playlist pages, a working audio player (using the preview URLs),
library and playlists, and a real backend for accounts.
