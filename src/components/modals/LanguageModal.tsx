import { Check, X } from 'lucide-react';
import { LANGUAGES, type Language } from '../../data/languages';
import { BRAND } from '../../config/brand';
import { Modal } from '../ui/Modal';

interface LanguageModalProps {
  open: boolean;
  current: Language;
  onSelect: (lang: Language) => void;
  onClose: () => void;
}

export function LanguageModal({ open, current, onSelect, onClose }: LanguageModalProps) {
  return (
    <Modal open={open} onClose={onClose} labelledBy="language-title" className="w-full max-w-[1000px]">
      <div className="flex max-h-[85vh] flex-col rounded-xl bg-surface-3 shadow-[0_16px_40px_rgba(0,0,0,0.6)]">
        <header className="relative border-b border-white/10 px-6 pb-5 pt-7 sm:px-8">
          <h2 id="language-title" className="text-2xl font-bold">
            Choose a language
          </h2>
          <p className="mt-1 text-sm text-subdued">This updates what you read on {BRAND.name}.</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 grid size-8 place-items-center rounded-full text-subdued transition hover:scale-105 hover:bg-white/10 hover:text-white"
          >
            <X className="size-5" />
          </button>
        </header>
        <ul className="scroll-area grid grid-cols-2 gap-1 overflow-y-auto p-4 sm:grid-cols-3 sm:p-6 lg:grid-cols-4">
          {LANGUAGES.map((lang) => {
            const selected = lang.code === current.code;
            return (
              <li key={lang.code}>
                <button
                  type="button"
                  lang={lang.code}
                  onClick={() => onSelect(lang)}
                  aria-pressed={selected}
                  className={`flex w-full items-start justify-between gap-2 rounded-md p-3 text-left transition hover:bg-white/10 ${selected ? 'bg-white/10' : ''}`}
                >
                  <span className="min-w-0">
                    <span className={`block truncate text-sm font-semibold ${selected ? 'text-accent' : 'text-white'}`}>
                      {lang.native}
                    </span>
                    <span className="block truncate text-sm text-subdued">{lang.english}</span>
                  </span>
                  {selected && <Check className="mt-0.5 size-4 shrink-0 text-accent" />}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </Modal>
  );
}
