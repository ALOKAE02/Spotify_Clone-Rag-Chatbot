import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Toast, type ToastMessage } from '../components/ui/Toast';
import type { MediaItem } from '../data/home';
import { LANGUAGES, type Language } from '../data/languages';
import { readStored, writeStored } from '../lib/storage';
import { SignupPromptModal } from '../components/modals/SignupPromptModal';
import { LanguageModal } from '../components/modals/LanguageModal';
import { LoginPopover, type LoginPopoverContent } from '../components/ui/LoginPopover';
import { UIContext, type UIContextValue } from './uiContext';

interface PopoverState extends LoginPopoverContent {
  anchor: HTMLElement;
}

const LANGUAGE_KEY = 'sc-language';

/** Owns app-wide overlays (sign-up prompt, language picker, login popover) and the chosen language. */
export function UIProvider({ children }: { children: ReactNode }) {
  const [signupItem, setSignupItem] = useState<MediaItem | null>(null);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [popover, setPopover] = useState<PopoverState | null>(null);
  const [language, setLanguage] = useState<Language>(() => {
    const code = readStored(LANGUAGE_KEY);
    return LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0];
  });

  const chooseLanguage = useCallback((lang: Language) => {
    setLanguage(lang);
    writeStored(LANGUAGE_KEY, lang.code);
    setLanguageOpen(false);
  }, []);

  const toggleLoginPopover = useCallback((anchor: HTMLElement, content: LoginPopoverContent) => {
    setPopover((current) => (current?.anchor === anchor ? null : { anchor, ...content }));
  }, []);

  const closePopover = useCallback(() => setPopover(null), []);

  const [toast, setToast] = useState<ToastMessage | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);
  const showToast = useCallback((message: string) => {
    window.clearTimeout(toastTimer.current);
    setToast({ id: Date.now(), message });
    toastTimer.current = window.setTimeout(() => setToast(null), 3200);
  }, []);
  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  const value = useMemo<UIContextValue>(
    () => ({
      openSignupPrompt: (item) => {
        setPopover(null);
        setSignupItem(item);
      },
      openLanguagePicker: () => setLanguageOpen(true),
      language,
      toggleLoginPopover,
      showToast,
    }),
    [language, toggleLoginPopover, showToast],
  );

  return (
    <UIContext.Provider value={value}>
      {children}
      <SignupPromptModal item={signupItem} onClose={() => setSignupItem(null)} />
      <LanguageModal
        open={languageOpen}
        current={language}
        onSelect={chooseLanguage}
        onClose={() => setLanguageOpen(false)}
      />
      {popover && <LoginPopover {...popover} onClose={closePopover} />}
      <Toast toast={toast} />
    </UIContext.Provider>
  );
}
