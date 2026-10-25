import React from 'react';
import { Monitor, Moon, Sun, X } from 'lucide-react';
import type { ThemePreference } from '../utils/theme';

interface SettingsModalProps {
  appearance: ThemePreference;
  onChangeAppearance: (preference: ThemePreference) => void;
  onClose: () => void;
}

const appearanceOptions: Array<{
  value: ThemePreference;
  label: string;
  description: string;
  Icon: typeof Monitor;
}> = [
  { value: 'system', label: 'Use device setting', description: 'Follow your phone or computer appearance.', Icon: Monitor },
  { value: 'light', label: 'Light', description: 'A bright, high-contrast study space.', Icon: Sun },
  { value: 'dark', label: 'Dark', description: 'Charcoal surfaces with FacheeBook gold accents.', Icon: Moon },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  appearance,
  onChangeAppearance,
  onClose,
}) => (
  <div
    className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-black/70 p-3 backdrop-blur-sm sm:p-6"
    onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}
  >
    <section
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
      className="fb-settings-panel my-auto w-full max-w-xl overflow-hidden rounded-3xl border border-slate-700 bg-[#111619] text-slate-100 shadow-2xl"
    >
      <header className="flex items-center justify-between border-b border-slate-700 px-5 py-4 sm:px-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-300">Your preferences</p>
          <h2 id="settings-title" className="mt-1 text-xl font-extrabold">Settings</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close settings"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-300 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
        >
          <X className="h-5 w-5" />
        </button>
      </header>

      <div className="max-h-[min(72vh,640px)] space-y-7 overflow-y-auto p-5 sm:p-6">
        <section aria-labelledby="appearance-heading">
          <h3 id="appearance-heading" className="text-sm font-bold">Appearance</h3>
          <p className="mt-1 text-xs leading-5 text-slate-400">Choose how FacheeBook looks on this device.</p>
          <div className="mt-3 grid gap-2">
            {appearanceOptions.map(({ value, label, description, Icon }) => (
              <button
                key={value}
                type="button"
                aria-pressed={appearance === value}
                onClick={() => onChangeAppearance(value)}
                className={`flex min-h-14 items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                  appearance === value
                    ? 'border-amber-300 bg-amber-300/10'
                    : 'border-slate-700 hover:border-slate-500 hover:bg-slate-800'
                }`}
              >
                <Icon className={`h-5 w-5 shrink-0 ${appearance === value ? 'text-amber-300' : 'text-slate-400'}`} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{label}</span>
                  <span className="mt-0.5 block text-xs text-slate-400">{description}</span>
                </span>
                <span className={`h-4 w-4 shrink-0 rounded-full border-2 ${appearance === value ? 'border-amber-300 bg-amber-300 shadow-[inset_0_0_0_3px_#111619]' : 'border-slate-500'}`} />
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-slate-500">This preference is stored on this device.</p>
        </section>

        <section aria-labelledby="privacy-heading" className="border-t border-slate-700 pt-5">
          <h3 id="privacy-heading" className="text-sm font-bold">Privacy & sharing</h3>
          <p className="mt-1 text-xs leading-5 text-slate-400">
            Your personal library stays private to your account. Community tips and study resources (including selected files and video links) are shared only after moderator approval.
          </p>
        </section>

        <section aria-labelledby="data-heading" className="border-t border-slate-700 pt-5">
          <h3 id="data-heading" className="text-sm font-bold">Study data</h3>
          <p className="mt-1 text-xs leading-5 text-slate-400">
            Materials and text tips can sync to your account. Attachments, voice recordings, flashcards, and study progress are currently device-only.
          </p>
        </section>
      </div>

      <footer className="flex justify-end border-t border-slate-700 px-5 py-4 sm:px-6">
        <button
          type="button"
          onClick={onClose}
          className="min-h-10 rounded-xl bg-amber-300 px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111619]"
        >
          Done
        </button>
      </footer>
    </section>
  </div>
);
