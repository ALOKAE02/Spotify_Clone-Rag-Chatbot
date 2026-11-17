# Run Melo on n8n (RAG chatbot): step by step

This guide connects Melo, the app's music assistant, to an n8n workflow that answers with **RAG**
(retrieval-augmented generation): before answering, the workflow searches a knowledge base about the app and
its music, then Claude writes the reply from what it found.

## How it fits together

```
Browser (Melo)                  Dev server (Vite)                     n8n Cloud
──────────────                  ─────────────────                     ─────────
click Melo button ──► POST /api/assistant/open ──► webhook  {"action":"open"}    ─► IF ─► "Send greeting"
send a message    ──► POST /api/chat           ──► webhook  {"action":"message"} ─► IF ─► AI Agent
                                                                                          ├─ Anthropic Chat Model (Claude)
                                                                                          ├─ Simple Memory (per sessionId)
                                                                                          └─ Vector store tool ◄─ Embeddings
answer flows in   ◄── streamed text            ◄── "Send answer" (Respond to Webhook)
```

- The browser never calls n8n directly. The dev server forwards the call, so there are no CORS problems and the
  webhook URL stays out of the browser code.
- **Every click that opens Melo** sends `{"action":"open"}` to your webhook. If the workflow responds with text,
  Melo shows it as a greeting under "Hi, I'm Melo".
- **Every chat message** sends `{"action":"message"}`. The workflow's reply is shown with the flowing text animation.
- If n8n doesn't answer (for example the test webhook isn't listening), Melo falls back to Claude (if
  `ANTHROPIC_API_KEY` is set) or to its offline demo answers, and the line under the chat input says why.

You build two workflows:

1. **Melo – load knowledge**: upload `n8n/melo-knowledge.md` once; it's split into chunks, embedded and stored
   in a vector store.
2. **Melo – chat**: your webhook. Greets on button clicks and answers messages with the AI Agent.

## 1. What you need

- An n8n Cloud workspace (or a self-hosted n8n).
- An **Anthropic API key** for the chat model (console.anthropic.com → API keys).
- A key for an **embeddings** model, which turns text into vectors for search. Anthropic doesn't offer
  embeddings, so use any provider n8n supports. The workflow files use **OpenAI** `text-embedding-3-small`;
  Cohere, Google Gemini or Mistral embeddings work too. Use the **same embeddings model in both workflows**.
- This project running locally with `npm run dev`.

## 2. Point the app at your webhook

Copy `.env.example` to `.env.local` in the project root (git-ignored, read only by the dev server) and set your
webhook's URL. You get it from the Webhook node in step 5; use the test URL while building:

```
N8N_WEBHOOK_URL=https://YOUR-INSTANCE.app.n8n.cloud/webhook-test/YOUR-WEBHOOK-PATH
```

Treat this URL like a password: anyone who has it can run your workflow and spend your credits. Never commit
`.env.local` (and don't upload it through GitHub's web uploader, which ignores `.gitignore`).

After editing `.env.local`, restart `npm run dev`. The terminal prints
`[n8n] Melo is connected to YOUR-INSTANCE.app.n8n.cloud (test webhook)`.

## 3. Add credentials in n8n

1. In n8n, open **Overview → Credentials** and click **Create credential** (or **Create → Credential**).
2. Search **Anthropic**, paste your Anthropic API key, save. Name it e.g. "Anthropic account".
3. Create another credential for your embeddings provider (e.g. **OpenAI**), paste that key, save.

## 4. Build the knowledge loader

### Fast path: import

1. **Create workflow** → open the **⋯** menu (top right) → **Import from File** →
   choose `n8n/melo-knowledge-ingest-workflow.json` from this project.
2. Open the **Embeddings** node and pick your OpenAI credential (or swap the node for another embeddings provider).
3. Save.

### Manual path (if the import complains)

1. Add the trigger **On form submission** (Form Trigger). Title: "Load Melo's knowledge". Add one field:
   label "Knowledge file", type **File**, required, accepted types `.md,.txt,.pdf`.
2. Add **Simple Vector Store** (shown as "In-Memory Vector Store" in some versions). Operation **Insert Documents**,
   Memory Key `melo_knowledge`, turn on **Clear Store**. Connect the form to it.
3. On the vector store's **Embedding** input, add your embeddings node (OpenAI → `text-embedding-3-small`).
4. On its **Document** input, add **Default Data Loader** with Type of Data **Binary**.
5. On the data loader's **Text Splitter** input, add **Recursive Character Text Splitter**:
   chunk size `800`, overlap `100`.

### Load the file

1. Click **Execute workflow** (or **Test workflow**). A form opens in a new tab.
2. Upload `n8n/melo-knowledge.md` from this project and submit.
3. Back in n8n, the run should show green nodes and a few dozen inserted chunks.

> To change what Melo knows, edit `scripts/build-knowledge.mjs` (or the catalogue via `npm run catalog`),
> run `npm run knowledge`, and upload the new file. **Clear Store** replaces the old content.
>
> The Simple Vector Store lives in n8n's memory: it's emptied when your n8n instance restarts, so re-upload after
> that. For a permanent knowledge base, use the **Pinecone**, **Supabase** or **Qdrant** vector store nodes instead
> (same wiring, in both workflows).

## 4b. (Retired) the small tracks dataset

Melo used to search a 2,900-song vector store called `track_finder`, built from the first tracks dataset with
`npm run tracks`. It was removed: all song retrieval now comes from the big SQL database in section 4c.
The script (`scripts/build-tracks-knowledge.mjs`) is still in the repo if you want a vector store again.

## 4c. Add the big songs dataset (550,000 songs) as a SQL database (songs_db)

`songs.csv` (857 MB, mostly lyrics) and `artists.csv` are too big for a vector store, and lyrics are copyrighted,
so Melo never stores them. Instead, every song and artist goes into a free Supabase database *without lyrics*, and
the agent queries it with SQL. SQL handles everything about songs, moods included (energy, valence and tempo filters),
so there is no separate song vector store.

**1. Convert the CSVs** (about 1.5 minutes):

```bash
npm run songs-db -- "C:path	osongs.csv" "C:path	oartists.csv"
```

This writes `data/songs_part1.csv` ... `songs_part4.csv` (about 40 MB each) and `data/artists_clean.csv`. The `data/` folder is git-ignored.
Each song also gets up to 3 theme tags (love, heartbreak, party ...) detected from its lyrics; the lyrics text itself is discarded.

**2. Create the database.** At supabase.com create a free project and save the database password. Open
**SQL Editor → New query**, paste `n8n/songs-db-setup.sql`, **change the `melo_reader` password on the `create role` line**, and Run.
It creates the `songs` and `artists` tables, a few indexes, turns on row-level security (so Supabase's public web API sees nothing),
and creates a **read-only** login `melo_reader` with a 5-second query limit.

**3. Import the data.** In **Table Editor**, open `songs` → **Insert → Import data from CSV**, and import
`songs_part1.csv`, then 2, 3 and 4 (check "first row is the header"). Then import `artists_clean.csv` into `artists`.
If the importer rejects a file, use the command line instead (needs the free `psql` tool; connection string from
**Project Settings → Database → Connection string**, the "Session pooler" one, using the `postgres` user):

```bash
psql "YOUR-CONNECTION-STRING" -c "copy songs from 'data/songs_part1.csv' csv header"
```

(repeat for parts 2-4, and `copy artists from 'data/artists_clean.csv' csv header`).
Check it worked by running `select count(*) from songs;` in the SQL Editor: it should say 550622.

**4. Connect n8n.** Create a **Postgres** credential: Host, Port and Database from the Session pooler connection string,
**User `melo_reader.YOUR-PROJECT-REF`** (the pooler needs the project ref after a dot), the password you chose, SSL on.
Then under the AI Agent's **Tool** connector click **+**, add **Postgres Tool** and set:
- Rename the node to `songs_db`
- Credential: the one you just made; Operation: **Execute Query**
- Query: click **Expression** and paste `{{ $fromAI('sql_query', 'One read-only SELECT statement with LIMIT 10 or less', 'string') }}`
- Description: `SQL over all 550,000 songs and 71,000 artists. Use it for exact filters, rankings and counts.`

**5. Update the System Message** with the new contents of `n8n/melo-system-prompt.md` (it now describes `songs_db`, its columns,
and when to use each tool; keep the three `$json.body` lines at the end), save, and **Publish** again.

**Test:** ask Melo "top 5 rock songs of 2016" (expect `songs_db` to run) and "something chill for studying" (expect `songs_db` again, with energy and acousticness filters).

## 5. Build the chat workflow

If you already created a webhook for Melo, either build these nodes in **that**
workflow, or import the file and delete the old one (two workflows can't share a webhook path).

### Fast path: import

1. **Create workflow** → **⋯** → **Import from File** → `n8n/melo-chat-workflow.json`.
2. Open **Anthropic Chat Model** and pick your Anthropic credential.
3. Open **Embeddings** and pick the same embeddings credential and model as the loader.
4. Save. Open the **Webhook** node and copy its **Test URL** into `N8N_WEBHOOK_URL` in `.env.local`.

### Manual path

1. **Webhook** node
   - HTTP Method: **POST**
   - Path: a long, hard-to-guess value (the imported file uses `melo-chat`; change it). It becomes the end of the webhook URL
   - Respond: **Using 'Respond to Webhook' Node** (important: with "Immediately", n8n only replies
     "Workflow was started" and Melo gets no answer)
2. **If** node named "Melo button clicked?": condition `{{ $json.body.action }}` **is equal to** `open`.
3. On the **true** branch, add **Respond to Webhook**: Respond With **Text**, body:
   ```
   Hey{{ $json.body.user && $json.body.user.firstName ? ' ' + $json.body.user.firstName : '' }}! I'm Melo, now running on n8n. Ask me for songs that fit a mood, about an artist, or what's trending.
   ```
   (Leave this branch out if you only want to record clicks; respond with empty text then.)
4. On the **false** branch, add **AI Agent**:
   - Source for prompt: **Define below**, Prompt: `{{ $json.body.message }}`
   - **System Message**: switch the field to **Expression**, then paste all of `n8n/melo-system-prompt.md`.
     It tells Melo when to use each search tool, to recommend only tracks it found, to keep answers short and
     plain, and never to share song lyrics. (In Fixed mode the `{{ … }}` lines about the listener stay as text.)
5. Attach to the agent:
   - **Chat Model** → **Anthropic Chat Model**, your credential, model `claude-opus-5-5`.
     Don't add Sampling Temperature, Top P or Top K options: this model rejects them. If your n8n version's node
     still errors with this model, choose the newest Claude model it lists.
   - **Memory** → **Simple Memory**: Session ID **Define below**, Key `{{ $json.body.sessionId }}`,
     Context Window Length `10`. Each chat (and each "New chat" in the app) gets its own memory.
   - **Tool** → **Simple Vector Store** with Operation **Retrieve Documents (As Tool for AI Agent)**:
     name `melo_knowledge`, a description like "Facts about the Spotify Clone app and its music catalogue…",
     Memory Key `melo_knowledge` (the same key the loader used), Limit `6`. Attach the **same embeddings** node.
   - **Tool** → **Postgres Tool** named `songs_db` (see section 4c).
6. After the agent, add **Respond to Webhook**: Respond With **Text**, body `{{ $json.output }}`.

## 6. Test with the test URL

A `/webhook-test/` URL only works while n8n is listening, and **only for one call each time you click
"Execute workflow"**.

1. In the chat workflow, click **Execute workflow**. n8n shows "Waiting for trigger event".
2. In the app, click the green **Melo** button. n8n receives `{"action":"open", …}`, the run turns green, and
   (with the greeting branch) Melo shows "Hey …! I'm Melo, now running on n8n" in the chat window.
3. Click **Execute workflow** again, then send Melo a message such as "Who sings Kesariya?".
   The header changes to **Powered by n8n** and the answer flows in.
4. Open the run in n8n to see what the agent searched and answered.

If you send a message while n8n isn't listening, Melo answers with a fallback and the line under the input says
"n8n isn't listening…". That's expected in test mode.

## 7. Go live (no more clicking "Execute workflow")

1. In the chat workflow, turn it on with the **Active** toggle (in newer n8n versions: **Publish**).
2. Copy the Webhook node's **Production URL**: the same address with `/webhook/` instead of `/webhook-test/`.
3. In `.env.local`, set:
   ```
   N8N_WEBHOOK_URL=https://YOUR-INSTANCE.app.n8n.cloud/webhook/YOUR-WEBHOOK-PATH
   ```
4. Restart `npm run dev`. Every click and message now reaches n8n. See them under **Executions**.

## 8. Optional: protect the webhook

Anyone who learns the URL can call it, and every call costs model usage.

1. In `.env.local`, set a long random value: `N8N_WEBHOOK_TOKEN=…`. The dev server sends it as the
   `X-Melo-Token` header.
2. In the n8n Webhook node, set **Authentication → Header Auth** and create a credential with
   Name `X-Melo-Token` and the same value. Calls without it are rejected.

## 9. Optional: stream answers word by word from n8n

The app already understands n8n's streaming format. In n8n versions that support it, set the Webhook node's
**Respond** option to **Streaming** and turn on **Enable Streaming** in the AI Agent options. The answer then
reaches the chat while Claude is still writing. (The non-streaming setup above also works: the text is revealed
with the same flowing animation once it arrives.)

## What the app sends and expects

**Button click** (every click that opens Melo):

```json
{
  "action": "open",
  "sessionId": "8f2c…",
  "user": { "loggedIn": true, "firstName": "Asha" },
  "page": "/",
  "source": "spotify-clone",
  "timestamp": "2026-11-15T14:30:00.000Z"
}
```

**Chat message**:

```json
{
  "action": "message",
  "sessionId": "8f2c…",
  "message": "Something chill for studying",
  "history": [
    { "role": "user", "content": "Hi" },
    { "role": "assistant", "content": "Hey! I'm Melo…" }
  ],
  "user": { "loggedIn": false },
  "page": "/",
  "source": "spotify-clone",
  "timestamp": "2026-11-15T14:30:05.000Z"
}
```

`firstName` is only included for logged-in users. No email or other account data is sent.
In n8n these fields are under `$json.body` (for example `$json.body.message`).

**Response**: plain text (as set up above) is simplest. JSON also works if the answer is in `output`, `text`,
`answer`, `reply` or `greeting` (an array of such objects is fine too). n8n's streaming format is supported.

## Troubleshooting

| What you see | Cause and fix |
| --- | --- |
| Chat footer: "n8n isn't listening…"; terminal: `Webhook not registered (404)` | Test URL without a listening workflow. Click **Execute workflow** before each call, or go live (step 7). |
| Footer: "n8n replied without an answer…" | Webhook **Respond** is set to "Immediately", or the Respond to Webhook body is empty. Use "Using 'Respond to Webhook' Node" and `{{ $json.output }}`. |
| Run fails at the Anthropic node | Check the credential. Remove temperature/top-p/top-k options. If the model isn't accepted by your node version, pick the newest Claude model it lists. |
| Answers ignore the knowledge base | The vector store is empty (n8n restarted, or the loader wasn't run) or the memory keys differ. Re-run the loader; both workflows must use `melo_knowledge` and the same embeddings model. |
| Terminal: `Could not reach the webhook` | Wrong URL in `.env.local`, or no internet. The URL must start with `https://`. |
| Nothing reaches n8n | Restart `npm run dev` after changing `.env.local`; look for the `[n8n] Melo is connected…` line. |

Server code: `server/chatPlugin.ts` (routes) and `server/n8n.ts` (webhook calls and response parsing).
App code: `src/hooks/useAssistantChat.ts` (`notifyOpen` for clicks, `send` for messages).
