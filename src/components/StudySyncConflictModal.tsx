import { Cloud, HardDrive, X } from 'lucide-react';
import type { StudySyncConflict } from '../utils/cloudStudySync';

interface StudySyncConflictModalProps {
  conflicts: StudySyncConflict[];
  onResolve: (keepChanges: boolean) => void;
}

export function StudySyncConflictModal({ conflicts, onResolve }: StudySyncConflictModalProps) {
  const collectionLabel = conflicts[0]?.collection === 'study_materials' ? 'Library material' : 'Study tip';

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-slate-950/70 p-3 backdrop-blur-sm sm:p-6">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="sync-conflict-title"
        className="my-auto flex max-h-[min(90dvh,720px)] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white text-slate-900 shadow-2xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-700">Sync update</p>
            <h2 id="sync-conflict-title" className="mt-1 text-lg font-extrabold sm:text-xl">
              Newer changes were applied
            </h2>
            <p className="mt-1 text-sm leading-5 text-slate-600">
              We automatically kept the newest version for these {conflicts.length} {collectionLabel.toLowerCase()}{conflicts.length === 1 ? '' : 's'}. Keep these changes, or undo them and return to the older version.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onResolve(true)}
            aria-label="Keep changes and close"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4 sm:p-6">
          {conflicts.map((conflict) => {
            const newer = conflict.newerSource === 'account' ? conflict.account : conflict.local;
            const Icon = conflict.newerSource === 'account' ? Cloud : HardDrive;
            const source = conflict.newerSource === 'account' ? 'Your account' : 'This device';
            return (
              <article key={conflict.id} className="flex items-start gap-3 rounded-xl border border-slate-200 p-3">
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold text-slate-900">{newer.title}</span>
                  <span className="mt-0.5 block text-xs text-slate-600">Newest version from {source}</span>
                </span>
              </article>
            );
          })}
        </div>

        <footer className="flex flex-col-reverse gap-2 border-t border-slate-200 px-4 py-4 sm:flex-row sm:justify-end sm:px-6">
          <button
            type="button"
            onClick={() => onResolve(false)}
            className="min-h-11 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          >
            Undo changes
          </button>
          <button
            type="button"
            onClick={() => onResolve(true)}
            className="min-h-11 rounded-xl bg-amber-500 px-4 text-sm font-bold text-slate-950 hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
          >
            Keep changes
          </button>
        </footer>
      </section>
    </div>
  );
}
