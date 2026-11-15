import { useCallback, useEffect, useRef, useState } from 'react';
import { localReply } from '../lib/localAssistant';

export type ChatRole = 'user' | 'assistant';
/** pending = waiting for the first words; streaming = words arriving; done/error = final. */
export type ChatStatus = 'pending' | 'streaming' | 'done' | 'error';
/** Who answered last: the n8n workflow, Claude, or the built-in demo answers. */
export type AssistantMode = 'unknown' | 'n8n' | 'live' | 'offline';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  status: ChatStatus;
  /** False for messages restored from earlier in the session, so they don't replay the reveal. */
  animate: boolean;
}

export interface AssistantUserInfo {
  loggedIn: boolean;
  firstName?: string;
}

const STORAGE_KEY = 'sc-assistant-chat';
const SESSION_KEY = 'sc-assistant-session';
const MAX_INPUT = 2000;
const uid = () => Math.random().toString(36).slice(2, 10);
const newSessionId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${uid()}${uid()}`;

function loadHistory(): ChatMessage[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return (JSON.parse(raw) as ChatMessage[])
      .filter((m) => m.content)
      .map((m) => ({ ...m, status: m.status === 'error' ? 'error' : 'done', animate: false }));
  } catch {
    return [];
  }
}

/** One id per conversation, shared with n8n so its memory node can keep context. */
function loadSessionId() {
  try {
    const existing = sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;
  } catch {
    /* ignore */
  }
  const id = newSessionId();
  saveSessionId(id);
  return id;
}

function saveSessionId(id: string) {
  try {
    sessionStorage.setItem(SESSION_KEY, id);
  } catch {
    /* ignore */
  }
}

function sleep(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const id = window.setTimeout(resolve, ms);
    signal.addEventListener('abort', () => {
      window.clearTimeout(id);
      reject(new DOMException('Aborted', 'AbortError'));
    });
  });
}

/**
 * Conversation state for Melo. Messages go to /api/chat, where the dev server asks the n8n workflow
 * (or Claude) and streams the reply back; with neither available, built-in demo answers are used.
 */
export function useAssistantChat({ loggedIn, firstName }: AssistantUserInfo) {
  const [messages, setMessages] = useState<ChatMessage[]>(loadHistory);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<AssistantMode>('unknown');
  /** Set when n8n was skipped for the last answer, e.g. "n8n-not-listening". */
  const [notice, setNotice] = useState<string | null>(null);
  /** Optional greeting the n8n workflow returns when the Melo button is clicked. */
  const [greeting, setGreeting] = useState<string | null>(null);
  const messagesRef = useRef(messages);
  const sessionRef = useRef<string>(loadSessionId());
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    messagesRef.current = messages;
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(messages.filter((m) => m.status === 'done' || m.status === 'error')),
      );
    } catch {
      /* storage unavailable: history lasts until reload */
    }
  }, [messages]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const context = useCallback(
    () => ({
      sessionId: sessionRef.current,
      user: { loggedIn, ...(firstName ? { firstName } : {}) },
      page: window.location.pathname,
    }),
    [loggedIn, firstName],
  );

  const update = useCallback((id: string, patch: (m: ChatMessage) => Partial<ChatMessage>) => {
    setMessages((ms) => ms.map((m) => (m.id === id ? { ...m, ...patch(m) } : m)));
  }, []);

  /** Called on every click that opens Melo: tells the n8n workflow (action "open"). */
  const notifyOpen = useCallback(async () => {
    try {
      const res = await fetch('/api/assistant/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(context()),
      });
      if (!res.ok) return;
      const data = (await res.json()) as { delivered?: boolean; greeting?: string | null };
      if (data.greeting) setGreeting(data.greeting);
    } catch {
      /* the chat works without it */
    }
  }, [context]);

  const send = useCallback(
    async (raw: string) => {
      const text = raw.trim().slice(0, MAX_INPUT);
      if (!text || abortRef.current) return;

      const userMsg: ChatMessage = { id: uid(), role: 'user', content: text, status: 'done', animate: true };
      const botId = uid();
      const history = [...messagesRef.current, userMsg];
      setMessages((ms) => [...ms, userMsg, { id: botId, role: 'assistant', content: '', status: 'pending', animate: true }]);
      setBusy(true);
      const controller = new AbortController();
      abortRef.current = controller;

      const answerOffline = async () => {
        setMode('offline');
        await sleep(700 + Math.random() * 700, controller.signal); // let the "thinking" animation play
        update(botId, () => ({ content: localReply(text, firstName), status: 'streaming' }));
      };

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...context(),
            messages: history
              .filter((m) => m.content && m.status !== 'error')
              .map(({ role, content }) => ({ role, content })),
          }),
          signal: controller.signal,
        });

        if (res.status === 503 || res.status === 404) {
          // 503: neither n8n nor Claude answered. 404: no chat server at all (e.g. a static build).
          const data = (await res.json().catch(() => ({}))) as { note?: string };
          setNotice(data.note ?? null);
          await answerOffline();
        } else if (!res.ok || !res.body) {
          const data = (await res.json().catch(() => ({}))) as { note?: string };
          setNotice(data.note ?? null);
          update(botId, () => ({
            status: 'error',
            content:
              res.status === 429
                ? 'Lots of requests right now. Give it a few seconds and try again.'
                : 'I couldn’t reach the assistant just now. Please try again.',
          }));
        } else {
          setMode(res.headers.get('X-Assistant-Source') === 'n8n' ? 'n8n' : 'live');
          setNotice(res.headers.get('X-Assistant-Note'));
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          for (;;) {
            const { value, done } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            if (chunk) update(botId, (m) => ({ content: m.content + chunk, status: 'streaming' }));
          }
          const tail = decoder.decode();
          if (tail) update(botId, (m) => ({ content: m.content + tail }));
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          if (err instanceof TypeError) {
            await answerOffline().catch(() => undefined); // network failure: no server to talk to
          } else {
            update(botId, () => ({ status: 'error', content: 'Something went wrong. Please try again.' }));
          }
        }
      } finally {
        update(botId, (m) => ({
          status: m.status === 'error' ? 'error' : 'done',
          content: m.content || (controller.signal.aborted ? 'Stopped.' : 'Hmm, I didn’t get an answer. Try asking again?'),
        }));
        setBusy(false);
        abortRef.current = null;
      }
    },
    [context, firstName, update],
  );

  const stop = useCallback(() => abortRef.current?.abort(), []);

  /** New conversation: clears messages and starts a new n8n session id (fresh memory). */
  const reset = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setNotice(null);
    sessionRef.current = newSessionId();
    saveSessionId(sessionRef.current);
  }, []);

  return { messages, busy, mode, notice, greeting, send, stop, reset, notifyOpen };
}
