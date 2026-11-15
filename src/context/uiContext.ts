import { createContext, useContext } from 'react';
import type { MediaItem } from '../data/home';
import type { Language } from '../data/languages';
import type { LoginPopoverContent } from '../components/ui/LoginPopover';

/*
 * The context object lives in its own module (no component imports) so Vite hot reload
 * doesn't recreate it when a modal or card file changes.
 */

export interface UIContextValue {
  /** Logged-out users get a "sign up to listen" modal when they try to play something. */
  openSignupPrompt: (item: MediaItem) => void;
  openLanguagePicker: () => void;
  language: Language;
  /** Blue "Log in to …" popover anchored next to a button (toggles if already open for that anchor). */
  toggleLoginPopover: (anchor: HTMLElement, content: LoginPopoverContent) => void;
  /** Short message at the bottom of the screen that fades out on its own. */
  showToast: (message: string) => void;
}

export const UIContext = createContext<UIContextValue | null>(null);

export function useUI() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useUI must be used inside <UIProvider>');
  return ctx;
}
