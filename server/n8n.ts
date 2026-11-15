/*
 * Helpers for talking to the n8n workflow that powers Melo.
 * The webhook URL (and optional token) come from .env.local and never reach the browser.
 */

export interface N8nSettings {
  url?: string;
  token?: string;
}

/** Why n8n didn't produce an answer; sent to the browser so the chat can show a hint. */
export type N8nFailure = 'not-listening' | 'no-answer' | 'unreachable' | 'error';

export interface AssistantMeta {
  sessionId: string;
  user: { loggedIn: boolean; firstName?: string };
  page: string;
}

const SOURCE = 'spotify-clone';
const STARTED = /^workflow (was )?started\.?$/i;

export function n8nSettingsFrom(env: Record<string, string>): N8nSettings {
  const url = env.N8N_WEBHOOK_URL?.trim();
  return {
    url: url && /^https?:\/\//.test(url) ? url : undefined,
    token: env.N8N_WEBHOOK_TOKEN?.trim() || undefined,
  };
}

/** POSTs a JSON payload to the webhook. `action` is "open" (Melo button clicked) or "message". */
export function callN8n(
  settings: N8nSettings,
  action: 'open' | 'message',
  payload: Record<string, unknown>,
  timeoutMs: number,
  signal?: AbortSignal,
) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (settings.token) headers['X-Melo-Token'] = settings.token;
  const signals = [AbortSignal.timeout(timeoutMs), ...(signal ? [signal] : [])];
  return fetch(settings.url!, {
    method: 'POST',
    headers,
    body: JSON.stringify({ action, ...payload, source: SOURCE, timestamp: new Date().toISOString() }),
    signal: AbortSignal.any(signals),
  });
}

/** Pulls the answer text out of whatever the workflow returned (plain text, or JSON in a common shape). */
export function extractAnswer(raw: string): string {
  const text = raw.trim();
  if (!text) return '';
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return STARTED.test(text) ? '' : text;
  }
  const pick = (v: unknown, depth = 0): string => {
    if (typeof v === 'string') return v;
    if (Array.isArray(v)) return v.length ? pick(v[0], depth + 1) : '';
    if (v && typeof v === 'object' && depth < 3) {
      const o = v as Record<string, unknown>;
      for (const key of ['output', 'text', 'answer', 'reply', 'response', 'greeting', 'message', 'data', 'json']) {
        if (key in o) {
          const found = pick(o[key], depth + 1);
          if (found) return found;
        }
      }
    }
    return '';
  };
  const answer = pick(value).trim();
  return STARTED.test(answer) ? '' : answer; // "Workflow was started" = webhook set to respond immediately
}

/** null: not an n8n streaming line. '': a begin/end line. Otherwise the text of an "item" line. */
function streamLine(line: string): string | null {
  if (!line) return null;
  try {
    const o = JSON.parse(line) as { type?: unknown; content?: unknown };
    if (o && typeof o === 'object' && ['begin', 'item', 'end', 'error'].includes(String(o.type))) {
      return o.type === 'item' && typeof o.content === 'string' ? o.content : '';
    }
  } catch {
    /* not JSON on its own line */
  }
  return null;
}

/**
 * Yields the answer as it arrives. Supports n8n's streaming response format (one JSON object per line,
 * {"type":"item","content":"..."}) and ordinary responses (yielded once at the end).
 */
export async function* readAnswer(res: Response): AsyncGenerator<string> {
  if (!res.body) return;
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let all = '';
  let buffer = '';
  let streaming = false;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    all += chunk;
    buffer += chunk;
    let newline: number;
    while ((newline = buffer.indexOf('\n')) >= 0) {
      const part = streamLine(buffer.slice(0, newline).trim());
      buffer = buffer.slice(newline + 1);
      if (part !== null) {
        streaming = true;
        if (part) yield part;
      }
    }
  }
  const rest = decoder.decode();
  all += rest;
  buffer += rest;
  if (streaming) {
    const part = streamLine(buffer.trim());
    if (part) yield part;
    return;
  }
  const answer = extractAnswer(all);
  if (answer) yield answer;
}

const HINTS: Record<N8nFailure, string> = {
  'not-listening':
    'Webhook not registered (404). With a /webhook-test/ URL, click "Execute workflow" in n8n before each call; for normal use, activate the workflow and use the /webhook/ URL.',
  'no-answer':
    'The workflow replied without an answer. Set the Webhook node\'s "Respond" option to "Using \'Respond to Webhook\' Node" and respond with the agent\'s output.',
  unreachable: 'Could not reach the webhook (network error or timeout).',
  error: 'The workflow returned an error status. Open the execution in n8n to see which node failed.',
};

export function logN8n(failure: N8nFailure, detail?: string) {
  console.warn(`[n8n] ${HINTS[failure]}${detail ? ` (${detail})` : ''}`);
}
