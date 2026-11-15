import { Fragment, useEffect, useState } from 'react';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

interface RevealTextProps {
  text: string;
  /** More text may still arrive (streaming). */
  streaming: boolean;
  /** False for history restored from storage: show it instantly. */
  animate: boolean;
  /** Called once when every word is on screen and the message is final. */
  onRevealed?: () => void;
}

/**
 * Releases an answer word by word at a steady rhythm, whatever size chunks the stream delivers.
 * Each word mounts with the `reveal-word` animation (green blur -> white), so the text flows in.
 */
export function RevealText({ text, streaming, animate, onRevealed }: RevealTextProps) {
  const tokens = text.split(/(\s+)/).filter(Boolean);
  // While streaming, hold back a trailing partial word until whitespace follows it.
  const ready = streaming && tokens.length && !/^\s+$/.test(tokens[tokens.length - 1]) ? tokens.length - 1 : tokens.length;
  const instant = !animate || prefersReducedMotion();
  const [shown, setShown] = useState(instant ? ready : 0);
  const visible = instant ? ready : Math.min(shown, ready);
  const complete = !streaming && visible >= tokens.length;

  useEffect(() => {
    if (instant || shown >= ready) return;
    // Speed up when far behind so long answers don't drag; ~30 ms per word otherwise.
    const id = window.setTimeout(() => setShown((s) => s + Math.max(1, Math.ceil((ready - s) / 16))), 30);
    return () => window.clearTimeout(id);
  }, [instant, shown, ready]);

  useEffect(() => {
    if (complete) onRevealed?.();
  }, [complete, onRevealed]);

  return (
    <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">
      {tokens.slice(0, visible).map((token, i) =>
        /^\s+$/.test(token) ? (
          <Fragment key={i}>{token}</Fragment>
        ) : (
          <span key={i} className={instant ? undefined : 'reveal-word'}>
            {token}
          </span>
        ),
      )}
      {!complete && !instant && <span className="reveal-caret" aria-hidden="true" />}
    </p>
  );
}
