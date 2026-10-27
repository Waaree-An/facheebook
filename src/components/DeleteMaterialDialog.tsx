import React, { useEffect, useRef } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface DeleteMaterialDialogProps {
  materialTitle: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export const DeleteMaterialDialog: React.FC<DeleteMaterialDialogProps> = ({
  materialTitle,
  onCancel,
  onConfirm,
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="delete-material-title"
      aria-describedby="delete-material-description"
      onClose={onCancel}
      onClick={(event) => event.stopPropagation()}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-slate-200 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/70"
    >
      <div className="p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="delete-material-title" className="text-base font-extrabold text-slate-900">
              Delete this material?
            </h2>
            <p id="delete-material-description" className="mt-1 break-words text-sm text-slate-600">
              “{materialTitle}” will be removed from your library. This cannot be undone.
            </p>
          </div>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="Cancel deletion"
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="min-h-10 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-700 hover:bg-slate-100"
          >
            Keep material
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="min-h-10 rounded-xl bg-rose-700 px-4 text-sm font-bold text-white hover:bg-rose-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
          >
            Delete material
          </button>
        </div>
      </div>
    </dialog>
  );
};
