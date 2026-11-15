import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type Ref } from 'react';
import { ArrowUp, RotateCcw, Square, X } from 'lucide-react';
import { useAuth } from '../../context/authContext';
import { useAssistantChat, type AssistantMode, type ChatMessage } from '../../hooks/useAssistantChat';
import { LogoMark } from '../icons/Logo';
import { Tooltip } from '../ui/Tooltip';
import { AssistantBackground } from './AssistantBackground';
import { RevealText } from './RevealText';

const SUGGESTIONS = [
  'Something chill for studying',
  'Tell me about Arijit Singh',
  'What’s trending right now?',
  'Songs for a road trip',
];

const ASSISTANT_NAME = 'Melo';

/** Floating glowing button + chat window, anchored to the bottom-right of the main view. */
export function Assistant() {
  const { user } = useAuth();
  const firstName = user?.displayName.split(' ')[0];
  const chat = useAssistantChat({ loggedIn: !!user, firstName });
  const [open, setOpen] = useState(false);
  const launcherRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    launcherRef.current?.focus();
  }, []);

  const openChat = () => {
    setOpen(true);
    void chat.notifyOpen(); // every click that opens Melo is sent to the n8n webhook
  };

  return (
    <>
      {open && <ChatPanel chat={chat} onClose={close} firstName={firstName} />}
      <Launcher ref={launcherRef} open={open} busy={chat.busy} onClick={() => (open ? close() : openChat())} />
    </>
  );
}

function Launcher({
  open,
  busy,
  onClick,
  ref,
}: {
  open: boolean;
  busy: boolean;
  onClick: () => void;
  ref: Ref<HTMLButtonElement>;
}) {
  return (
    <div className="absolute bottom-5 right-5 z-30">
      <Tooltip label={open ? 'Close chat' : `Ask ${ASSISTANT_NAME}`} side="left">
        <button
          ref={ref}
          type="button"
          onClick={onClick}
          aria-label={open ? 'Close music assistant' : `Open ${ASSISTANT_NAME}, the music assistant`}
          aria-expanded={open}
          className="group relative grid size-14 place-items-center rounded-full transition-transform duration-200 hover:scale-110 active:scale-95"
        >
          {/* Spinning halo behind the button */}
          <span
            aria-hidden="true"
            className="absolute -inset-1.5 rounded-full bg-[conic-gradient(from_0deg,#1ed760,#0d6b30,#1ed760,#b8ffd2,#1ed760)] opacity-70 blur-md animate-halo-spin"
          />
          {/* Button body with pulsing glow */}
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_32%_28%,#6ff0a0_0%,#1ed760_42%,#13a84a_100%)] animate-assistant-glow"
          />
          <span className="relative text-black">
            {open ? (
              <X className="size-6" strokeWidth={2.75} />
            ) : (
              <span className="flex h-6 items-end gap-[3px]" aria-hidden="true">
                {[0, 0.2, 0.4, 0.1].map((delay, i) => (
                  <span
                    key={i}
                    className="block w-[4px] origin-bottom rounded-full bg-black animate-eq-bar"
                    style={{ height: `${[14, 22, 17, 11][i]}px`, animationDelay: `${delay}s`, animationDuration: busy ? '0.5s' : '1.1s' }}
                  />
                ))}
              </span>
            )}
          </span>
        </button>
      </Tooltip>
    </div>
  );
}

const statusLabel = (busy: boolean, mode: AssistantMode) => {
  if (busy) return 'Thinking…';
  if (mode === 'n8n') return 'Powered by n8n';
  if (mode === 'offline') return 'Offline demo mode';
  if (mode === 'live') return 'Powered by Claude';
  return 'Your music assistant';
};

/** Footer line under the input: explains fallbacks so n8n setup problems are easy to spot. */
function footerNote(mode: AssistantMode, notice: string | null) {
  switch (notice) {
    case 'n8n-not-listening':
      return 'n8n isn’t listening, so a fallback answered. In test mode, click “Execute workflow” in n8n first.';
    case 'n8n-no-answer':
      return 'n8n replied without an answer, so a fallback answered. Check the Respond to Webhook node.';
    case 'n8n-unreachable':
    case 'n8n-error':
      return 'Couldn’t get an answer from n8n, so a fallback answered. Check the execution in n8n.';
  }
  if (mode === 'offline') return 'Demo answers. Connect n8n or add an Anthropic API key in .env.local for real ones.';
  return `${ASSISTANT_NAME} can make mistakes. Check important info.`;
}

function ChatPanel({
  chat,
  onClose,
  firstName,
}: {
  chat: ReturnType<typeof useAssistantChat>;
  onClose: () => void;
  firstName?: string;
}) {
  const { messages, busy, mode, notice, greeting, send, stop, reset } = chat;
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Follow the conversation as words appear, unless the user scrolled up to read.
  useEffect(() => {
    const scroller = scrollRef.current;
    const content = contentRef.current;
    if (!scroller || !content) return;
    const onScroll = () => {
      stickToBottom.current = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 60;
    };
    const observer = new ResizeObserver(() => {
      if (stickToBottom.current) scroller.scrollTop = scroller.scrollHeight;
    });
    scroller.addEventListener('scroll', onScroll);
    observer.observe(content);
    return () => {
      scroller.removeEventListener('scroll', onScroll);
      observer.disconnect();
    };
  }, []);

  const resizeInput = () => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  const submit = (text: string) => {
    if (!text.trim() || busy) return;
    stickToBottom.current = true;
    void send(text);
    setDraft('');
    requestAnimationFrame(resizeInput);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    submit(draft);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit(draft);
    }
  };

  return (
    <section
      role="dialog"
      aria-label={`${ASSISTANT_NAME}, music assistant`}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
      className="absolute bottom-24 right-5 z-30 flex h-[min(600px,calc(100%-120px))] w-[min(400px,calc(100%-40px))] origin-bottom-right flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#080808] shadow-[0_24px_60px_rgba(0,0,0,0.7),0_0_40px_rgba(30,215,96,0.12)] animate-panel-in"
    >
      <AssistantBackground active={busy} />

      <header className="relative z-10 flex items-center gap-3 border-b border-white/10 bg-black/35 px-4 py-3 backdrop-blur-md">
        <AssistantOrb busy={busy} />
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold leading-tight">{ASSISTANT_NAME}</h2>
          <p className={`truncate text-xs font-medium ${busy ? 'text-accent' : 'text-subdued'}`}>{statusLabel(busy, mode)}</p>
        </div>
        {messages.length > 0 && (
          <Tooltip label="New chat">
            <button
              type="button"
              onClick={reset}
              aria-label="Start a new chat"
              className="grid size-8 place-items-center rounded-full text-subdued transition hover:bg-white/10 hover:text-white"
            >
              <RotateCcw className="size-4" />
            </button>
          </Tooltip>
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close chat"
          className="grid size-8 place-items-center rounded-full text-subdued transition hover:bg-white/10 hover:text-white"
        >
          <X className="size-5" />
        </button>
      </header>

      <div ref={scrollRef} className="scroll-area relative z-10 flex-1 overflow-y-auto px-4 py-4">
        <div ref={contentRef} role="log" aria-live="polite" aria-busy={busy} className="flex flex-col gap-3">
          {messages.length === 0 ? (
            <EmptyState firstName={firstName} greeting={greeting} onPick={submit} />
          ) : (
            messages.map((m) => <MessageBubble key={m.id} message={m} />)
          )}
        </div>
      </div>

      <form onSubmit={onSubmit} className="relative z-10 border-t border-white/10 bg-black/40 p-3 backdrop-blur-md">
        <div className="flex items-end gap-2 rounded-3xl bg-white/[0.07] py-1.5 pl-4 pr-1.5 ring-1 ring-white/10 transition focus-within:bg-white/[0.1] focus-within:ring-accent/70">
          <textarea
            ref={inputRef}
            rows={1}
            value={draft}
            maxLength={2000}
            onChange={(e) => {
              setDraft(e.target.value);
              resizeInput();
            }}
            onKeyDown={onKeyDown}
            placeholder="Ask about songs, artists, moods…"
            aria-label={`Message ${ASSISTANT_NAME}`}
            className="max-h-[120px] min-h-[36px] flex-1 resize-none bg-transparent py-2 text-[15px] text-white outline-none placeholder:text-subdued"
          />
          {busy ? (
            <button
              type="button"
              onClick={stop}
              aria-label="Stop answering"
              className="mb-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-white text-black transition hover:scale-105"
            >
              <Square className="size-3.5 fill-current" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!draft.trim()}
              aria-label="Send message"
              className="mb-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-accent text-black shadow-[0_0_16px_rgba(30,215,96,0.5)] transition hover:scale-105 hover:bg-accent-hover disabled:bg-white/15 disabled:text-white/40 disabled:shadow-none disabled:hover:scale-100"
            >
              <ArrowUp className="size-5" strokeWidth={2.5} />
            </button>
          )}
        </div>
        <p className={`mt-2 text-center text-[11px] ${notice ? 'text-[#ffc864]' : 'text-subdued'}`}>
          {footerNote(mode, notice)}
        </p>
      </form>
    </section>
  );
}

function AssistantOrb({ busy, small = false }: { busy?: boolean; small?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`relative grid shrink-0 place-items-center rounded-full bg-[radial-gradient(circle_at_32%_28%,#6ff0a0,#1ed760_45%,#13a84a)] ${
        small ? 'size-7' : 'size-10'
      } ${busy ? 'animate-assistant-glow' : 'shadow-[0_0_14px_rgba(30,215,96,0.45)]'}`}
    >
      <LogoMark className={`${small ? 'size-4' : 'size-6'} text-[#0b3d1d]`} />
    </span>
  );
}

function EmptyState({
  firstName,
  greeting,
  onPick,
}: {
  firstName?: string;
  greeting: string | null;
  onPick: (text: string) => void;
}) {
  return (
    <div className="flex flex-col items-center px-2 pt-6 text-center animate-msg-in">
      <AssistantOrb />
      <p className="mt-4 text-xl font-bold">Hi{firstName ? ` ${firstName}` : ''}, I’m {ASSISTANT_NAME}</p>
      {greeting ? (
        // Greeting sent back by the n8n workflow for the button click, revealed with the same flowing animation.
        <div className="mt-1 max-w-[280px] text-subdued [&_p]:text-sm">
          <RevealText key={greeting} text={greeting} streaming={false} animate />
        </div>
      ) : (
        <p className="mt-1 max-w-[260px] text-sm text-subdued">
          Ask me for songs that fit a mood, about an artist or album, or what’s trending.
        </p>
      )}
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onPick(s)}
            className="rounded-full border border-white/15 bg-white/[0.06] px-3.5 py-2 text-sm font-medium backdrop-blur-sm transition hover:border-accent/70 hover:bg-accent/15 hover:text-white"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const [revealed, setRevealed] = useState(!message.animate);
  const onRevealed = useCallback(() => setRevealed(true), []);

  if (message.role === 'user') {
    return (
      <div className={`flex justify-end ${message.animate ? 'animate-msg-in' : ''}`}>
        <p className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-accent px-4 py-2.5 text-[15px] font-medium text-black shadow-[0_4px_16px_rgba(30,215,96,0.25)]">
          {message.content}
        </p>
      </div>
    );
  }

  const pending = message.status === 'pending';
  const isError = message.status === 'error';

  return (
    <div className={`flex items-end gap-2 ${message.animate ? 'animate-msg-in' : ''}`}>
      <AssistantOrb small busy={pending} />
      <div
        className={`relative max-w-[85%] overflow-hidden rounded-2xl rounded-bl-md border px-4 py-2.5 backdrop-blur-md ${
          isError ? 'border-[#f3727f]/40 bg-[#3a1015]/70 text-[#ffb3ba]' : 'border-white/10 bg-[#181818]/75'
        } ${revealed && message.animate && !isError ? 'reveal-complete' : ''}`}
      >
        {pending ? (
          <span className="flex h-6 items-end gap-1" role="status" aria-label={`${ASSISTANT_NAME} is thinking`}>
            {[0, 0.15, 0.3, 0.45].map((d) => (
              <span key={d} className="typing-bar" style={{ animationDelay: `${d}s` }} />
            ))}
          </span>
        ) : (
          <RevealText
            text={message.content}
            streaming={message.status === 'streaming'}
            animate={message.animate && !isError}
            onRevealed={onRevealed}
          />
        )}
      </div>
    </div>
  );
}
