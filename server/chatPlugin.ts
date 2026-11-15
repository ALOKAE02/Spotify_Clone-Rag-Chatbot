import type { IncomingMessage, ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import type { Connect, Plugin } from 'vite';
import Anthropic from '@anthropic-ai/sdk';
import { SYSTEM_PROMPT } from './chatPrompt.ts';
import {
  callN8n,
  logN8n,
  n8nSettingsFrom,
  readAnswer,
  type AssistantMeta,
  type N8nFailure,
  type N8nSettings,
} from './n8n.ts';

/*
 * Assistant routes on the dev and preview servers:
 *
 *   POST /api/assistant/open  The Melo button was clicked: forwards {"action":"open"} to the n8n webhook
 *                             and returns {delivered, greeting?}.
 *   POST /api/chat            A chat message. Answered by, in order:
 *                               1. the n8n workflow (N8N_WEBHOOK_URL), if configured and it answers
 *                               2. Claude (ANTHROPIC_API_KEY), if configured
 *                               3. otherwise 503 {"error":"no-credentials"} and the browser uses demo answers
 *                             The reply streams back as plain text. Response headers say who answered
 *                             (X-Assistant-Source: n8n | claude) and why n8n was skipped (X-Assistant-Note).
 *
 * Keys and the webhook URL are read from .env.local / the environment and stay on the server.
 */

const MODEL = 'claude-opus-5-5';
const MAX_MESSAGES = 20;
const MAX_CHARS = 2000;
const MAX_BODY_BYTES = 64_000;
const N8N_CHAT_TIMEOUT_MS = 90_000; // AI Agent workflows can take a while
const N8N_OPEN_TIMEOUT_MS = 8_000;

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error('body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

/** Keeps only well-formed user/assistant turns, trimmed to the last MAX_MESSAGES, starting with a user turn. */
function sanitizeMessages(input: unknown): Anthropic.Beta.BetaMessageParam[] | null {
  if (!Array.isArray(input)) return null;
  const messages = input
    .filter(
      (m): m is { role: 'user' | 'assistant'; content: string } =>
        !!m &&
        (m.role === 'user' || m.role === 'assistant') &&
        typeof m.content === 'string' &&
        m.content.trim().length > 0,
    )
    .slice(-MAX_MESSAGES)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CHARS) }));
  while (messages.length && messages[0].role !== 'user') messages.shift();
  if (!messages.length || messages[messages.length - 1].role !== 'user') return null;
  return messages;
}

/** Session id, login state, first name and page: the only context forwarded to n8n (no email or account data). */
function sanitizeMeta(body: Record<string, unknown>): AssistantMeta {
  const user = (body.user ?? {}) as Record<string, unknown>;
  const sessionId = typeof body.sessionId === 'string' && /^[\w-]{8,64}$/.test(body.sessionId) ? body.sessionId : randomUUID();
  return {
    sessionId,
    user: {
      loggedIn: user.loggedIn === true,
      ...(typeof user.firstName === 'string' && user.firstName.trim() ? { firstName: user.firstName.trim().slice(0, 40) } : {}),
    },
    page: typeof body.page === 'string' ? body.page.slice(0, 200) : '/',
  };
}

const textHeaders = (source: 'n8n' | 'claude', note?: string) => ({
  'Content-Type': 'text/plain; charset=utf-8',
  'Cache-Control': 'no-cache, no-transform',
  'X-Content-Type-Options': 'nosniff',
  'X-Assistant-Source': source,
  ...(note ? { 'X-Assistant-Note': note } : {}),
});

/** Streams the n8n answer to the browser. Returns 'answered', or why n8n didn't answer (nothing written then). */
async function answerWithN8n(
  res: ServerResponse,
  n8n: N8nSettings,
  payload: Record<string, unknown>,
  signal: AbortSignal,
): Promise<'answered' | N8nFailure> {
  let started = false;
  try {
    const upstream = await callN8n(n8n, 'message', payload, N8N_CHAT_TIMEOUT_MS, signal);
    if (upstream.status === 404) {
      logN8n('not-listening');
      return 'not-listening';
    }
    if (!upstream.ok) {
      logN8n('error', `HTTP ${upstream.status}`);
      return 'error';
    }
    for await (const part of readAnswer(upstream)) {
      if (!started) {
        started = true;
        res.writeHead(200, textHeaders('n8n'));
      }
      res.write(part);
    }
    if (!started) {
      logN8n('no-answer');
      return 'no-answer';
    }
    res.end();
    return 'answered';
  } catch (err) {
    if (started) {
      res.end(); // keep what already streamed
      return 'answered';
    }
    if (!signal.aborted) logN8n('unreachable', err instanceof Error ? err.message : String(err));
    return 'unreachable';
  }
}

export function chatApiPlugin(env: Record<string, string>): Plugin {
  const n8n = n8nSettingsFrom(env);
  let client: Anthropic | null = null;

  const getClient = () => {
    if (!client) {
      // With no key here the SDK still tries its other credential sources (env vars, `ant auth login` profile).
      client = new Anthropic(env.ANTHROPIC_API_KEY ? { apiKey: env.ANTHROPIC_API_KEY } : {});
    }
    return client;
  };

  /** The Melo button was clicked. Never fails loudly: the chat works whether or not n8n hears about it. */
  const handleOpen = async (body: Record<string, unknown>, res: ServerResponse) => {
    if (!n8n.url) return sendJson(res, 200, { delivered: false, reason: 'not-configured' });
    const meta = sanitizeMeta(body);
    try {
      const upstream = await callN8n(n8n, 'open', { ...meta }, N8N_OPEN_TIMEOUT_MS);
      if (upstream.status === 404) {
        logN8n('not-listening');
        return sendJson(res, 200, { delivered: false, reason: 'not-listening' });
      }
      if (!upstream.ok) {
        logN8n('error', `HTTP ${upstream.status}`);
        return sendJson(res, 200, { delivered: false, reason: 'error' });
      }
      let greeting = '';
      for await (const part of readAnswer(upstream)) greeting += part;
      return sendJson(res, 200, { delivered: true, greeting: greeting.trim().slice(0, 600) || null });
    } catch (err) {
      logN8n('unreachable', err instanceof Error ? err.message : String(err));
      return sendJson(res, 200, { delivered: false, reason: 'unreachable' });
    }
  };

  const handleChat = async (body: Record<string, unknown>, res: ServerResponse) => {
    const messages = sanitizeMessages(body.messages);
    if (!messages) return sendJson(res, 400, { error: 'bad-request' });
    const meta = sanitizeMeta(body);

    const abort = new AbortController();
    res.on('close', () => {
      if (!res.writableEnded) abort.abort(); // browser pressed Stop or closed the chat
    });

    // 1. n8n workflow
    let note: string | undefined;
    if (n8n.url) {
      const last = messages[messages.length - 1];
      const outcome = await answerWithN8n(
        res,
        n8n,
        { ...meta, message: last.content, history: messages.slice(0, -1) },
        abort.signal,
      );
      if (outcome === 'answered' || abort.signal.aborted) return;
      note = `n8n-${outcome}`;
    }

    // 2. Claude
    let anthropic: Anthropic;
    try {
      anthropic = getClient();
    } catch {
      return sendJson(res, 503, { error: 'no-credentials', note });
    }

    let started = false;
    const start = () => {
      if (started) return;
      started = true;
      res.writeHead(200, textHeaders('claude', note));
    };

    try {
      const stream = anthropic.beta.messages.stream(
        {
          model: MODEL,
          max_tokens: 16000,
          // Chat replies are short; low effort keeps them quick. Thinking stays adaptive (always on for this model).
          output_config: { effort: 'low' },
          // If a safety classifier declines, the API retries on a suitable fallback model in the same call.
          betas: ['server-side-fallback-2026-07-01'],
          fallbacks: 'default',
          system: SYSTEM_PROMPT,
          messages,
        },
        { signal: abort.signal },
      );

      for await (const event of stream) {
        if (event.type === 'message_start') start();
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          start();
          res.write(event.delta.text);
        }
      }

      const final = await stream.finalMessage();
      start();
      if (final.stop_reason === 'refusal') {
        res.write('\n\nSorry, I can’t help with that one. Ask me about songs, artists or playlists instead.');
      }
      res.end();
    } catch (err) {
      if (abort.signal.aborted) return;
      if (started) {
        res.end();
        return;
      }
      // 3. Nothing could answer: tell the browser to use its demo answers.
      if (err instanceof Anthropic.AuthenticationError) return sendJson(res, 503, { error: 'no-credentials', note });
      if (err instanceof Anthropic.RateLimitError) return sendJson(res, 429, { error: 'rate-limited', note });
      if (err instanceof Anthropic.APIConnectionError) return sendJson(res, 502, { error: 'connection', note });
      if (err instanceof Anthropic.APIError) return sendJson(res, 502, { error: 'upstream', status: err.status, note });
      // Not an API response at all: most often no credentials could be resolved.
      return sendJson(res, 503, { error: 'no-credentials', note });
    }
  };

  const handler: Connect.NextHandleFunction = async (req, res, next) => {
    const path = req.url?.split('?')[0];
    if (path !== '/api/chat' && path !== '/api/assistant/open') return next();
    if (req.method !== 'POST') return sendJson(res, 405, { error: 'method-not-allowed' });

    let body: Record<string, unknown>;
    try {
      const parsed: unknown = JSON.parse(await readBody(req));
      body = parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
    } catch {
      return sendJson(res, 400, { error: 'bad-request' });
    }

    if (path === '/api/assistant/open') return handleOpen(body, res);
    return handleChat(body, res);
  };

  return {
    name: 'spotify-clone-chat-api',
    configureServer(server) {
      server.middlewares.use(handler);
      if (n8n.url) console.log(`[n8n] Melo is connected to ${new URL(n8n.url).host} (${n8n.url.includes('/webhook-test/') ? 'test' : 'production'} webhook)`);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler);
    },
  };
}
