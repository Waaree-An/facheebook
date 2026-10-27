import React from 'react';
import {
  Image,
  Video,
  FileText,
  Link2,
  CheckCircle2,
  Edit3,
  Trash2,
  Share2,
  Layers,
  Plus,
  BellRing,
  RefreshCw,
} from 'lucide-react';
import { ReadingMaterial, ReadingStatus } from '../types';
import confetti from 'canvas-confetti';
import { DeleteMaterialDialog } from './DeleteMaterialDialog';

interface MaterialCardProps {
  material: ReadingMaterial;
  isInactiveAlert?: boolean;
  daysInactive?: number;
  onOpenDetail: (material: ReadingMaterial) => void;
  onEdit: (material: ReadingMaterial) => void;
  onDelete: (id: string) => void;
  onShare: (material: ReadingMaterial) => void;
  onQuickFlashcards: (material: ReadingMaterial) => void;
  onUpdateProgress: (
    id: string,
    newPagesRead: number,
    newStatus?: ReadingStatus
  ) => void;
  onRefreshActivity?: (id: string) => void;
}

export const MaterialCard: React.FC<MaterialCardProps> = ({
  material,
  isInactiveAlert = false,
  daysInactive = 0,
  onOpenDetail,
  onEdit,
  onDelete,
  onShare,
  onQuickFlashcards,
  onUpdateProgress,
  onRefreshActivity,
}) => {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const percent =
    material.totalPages > 0
      ? Math.min(
          100,
          Math.round((material.pagesRead / material.totalPages) * 100)
        )
      : 0;

  const handleIncrementPages = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();

    const nextPages = Math.min(
      material.totalPages,
      material.pagesRead + 5
    );
    const newStatus: ReadingStatus =
      nextPages >= material.totalPages ? 'completed' : 'reading';

    if (
      nextPages >= material.totalPages &&
      material.status !== 'completed'
    ) {
      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.8 },
      });
    }

    onUpdateProgress(material.id, nextPages, newStatus);
  };

  const handleToggleComplete = (
    e: React.MouseEvent<HTMLButtonElement>
  ) => {
    e.stopPropagation();

    if (material.status === 'completed') {
      onUpdateProgress(material.id, 0, 'to_read');
    } else {
      confetti({
        particleCount: 75,
        spread: 70,
        origin: { y: 0.7 },
      });
      onUpdateProgress(
        material.id,
        material.totalPages,
        'completed'
      );
    }
  };

  const getStatusBadge = (status: ReadingStatus) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center rounded-full border border-emerald-300 bg-emerald-100 px-2.5 py-1 text-[10px] font-extrabold text-emerald-900">
            ✓ Completed
          </span>
        );

      case 'reading':
        return (
          <span className="inline-flex items-center rounded-full border border-blue-300 bg-blue-100 px-2.5 py-1 text-[10px] font-extrabold text-blue-900">
            📖 Reading
          </span>
        );

      case 'under_review':
        return (
          <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-100 px-2.5 py-1 text-[10px] font-extrabold text-amber-900">
            🔍 Review
          </span>
        );

      default:
        return (
          <span className="inline-flex items-center rounded-full border border-slate-300 bg-slate-100 px-2.5 py-1 text-[10px] font-extrabold text-slate-800">
            📌 To Read
          </span>
        );
    }
  };

  const getPriorityDot = (priority: ReadingMaterial['priority']) => {
    switch (priority) {
      case 'high':
        return (
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full bg-rose-600 ring-2 ring-rose-100"
            title="Exam Prep / High Priority"
          />
        );

      case 'medium':
        return (
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full bg-amber-500 ring-2 ring-amber-100"
            title="Important"
          />
        );

      default:
        return (
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full bg-slate-500 ring-2 ring-slate-200"
            title="Normal"
          />
        );
    }
  };

  const iconButtonClass =
    'inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500';

  return (
    <div
      onClick={() => onOpenDetail(material)}
      className={`group relative flex cursor-pointer flex-col justify-between overflow-hidden rounded-2xl border bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${
        isInactiveAlert
          ? 'border-amber-400 ring-1 ring-amber-200'
          : 'border-slate-300 hover:border-blue-400'
      }`}
    >
      {isInactiveAlert && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-300 bg-amber-100 px-3 py-2 text-amber-950">
          <div className="flex items-center gap-2 text-xs font-extrabold">
            <BellRing className="h-4 w-4 shrink-0 text-amber-800" />
            <span>Review Due: {daysInactive}d Inactive</span>
          </div>

          {onRefreshActivity && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRefreshActivity(material.id);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400 bg-white px-2.5 py-1.5 text-[11px] font-extrabold text-amber-950 transition-colors hover:bg-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
              title="Reset inactivity counter (marked reviewed)"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Mark Reviewed
            </button>
          )}
        </div>
      )}

      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {getPriorityDot(material.priority)}

            <span className="rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-extrabold text-blue-900">
              {material.subject}
            </span>

            {material.semester && (
              <span className="text-[11px] font-semibold text-slate-600">
                • {material.semester}
              </span>
            )}
          </div>

          {getStatusBadge(material.status)}
        </div>

        <h3 className="mb-1.5 break-words text-base font-extrabold leading-snug text-slate-900 [overflow-wrap:anywhere]">
          {material.title}
        </h3>

        <p className="mb-3 truncate text-xs font-semibold text-slate-600">
          By {material.author || 'Unknown Author'}
          {material.professor ? ` • Prof. ${material.professor}` : ''}
        </p>

        {material.description && (
          <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-slate-700">
            {material.description}
          </p>
        )}

        <div className="mb-4 flex flex-wrap items-center gap-2">
          {material.photos.length > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-[11px] font-bold text-blue-900">
              <Image className="h-3.5 w-3.5" />
              {material.photos.length} photos
            </span>
          )}

          {material.videoLinks.length > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-[11px] font-bold text-sky-900">
              <Link2 className="h-3.5 w-3.5" />
              {material.videoLinks.length} videos
            </span>
          )}

          {material.shortVideos.length > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-bold text-emerald-900">
              <Video className="h-3.5 w-3.5" />
              {material.shortVideos.length} clips
            </span>
          )}

          {material.documents.length > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-1.5 text-[11px] font-bold text-violet-900">
              <FileText className="h-3.5 w-3.5" />
              {material.documents.length} docs (
              {material.documents
                .map((d) => d.format)
                .slice(0, 2)
                .join(', ')}
              )
            </span>
          )}

          {material.keyTakeaways.length > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] font-bold text-amber-950">
              <Layers className="h-3.5 w-3.5" />
              {material.keyTakeaways.length} takeaways
            </span>
          )}
        </div>
      </div>

      <div>
        <div className="mb-4 rounded-xl border border-slate-300 bg-slate-50 p-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-extrabold text-slate-800">
              Reading Progress
            </span>

            <span className="font-mono font-extrabold text-blue-900">
              {material.totalPages > 0
                ? `${material.pagesRead} / ${material.totalPages} pages (${percent}%)`
                : `${material.pagesRead} pages read · total not set`}
            </span>
          </div>

          <div
            className="mb-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-300"
            role="progressbar"
            aria-label="Reading progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
          >
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                percent >= 100 ? 'bg-emerald-600' : 'bg-blue-700'
              }`}
              style={{ width: `${percent}%` }}
            />
          </div>

          <div className="flex items-center justify-between gap-2">
            <button
              onClick={handleIncrementPages}
              disabled={material.pagesRead >= material.totalPages}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-blue-300 bg-white px-2.5 py-1.5 text-[11px] font-extrabold text-blue-900 transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <Plus className="h-3.5 w-3.5" />
              +5 Pages
            </button>

            <button
              onClick={handleToggleComplete}
              className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-extrabold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                material.status === 'completed'
                  ? 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                  : 'border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100'
              }`}
            >
              <CheckCircle2 className="h-4 w-4" />
              {material.status === 'completed' ? 'Reset' : 'Mark Done'}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-slate-200 pt-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onQuickFlashcards(material);
            }}
            className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-extrabold text-blue-900 transition-colors hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            title="Recall Flashcards"
          >
            <Layers className="h-4 w-4" />
            Quiz
          </button>

          <div className="flex items-center gap-1.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onShare(material);
              }}
              className={iconButtonClass}
              title="Share Study Summary"
              aria-label="Share study summary"
            >
              <Share2 className="h-4 w-4" />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(material);
              }}
              className={iconButtonClass}
              title="Edit Material"
              aria-label="Edit material"
            >
              <Edit3 className="h-4 w-4" />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsDeleteDialogOpen(true);
              }}
              className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg border border-rose-200 bg-white text-rose-700 transition-colors hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
              title="Delete Material"
              aria-label="Delete material"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
      {isDeleteDialogOpen && (
        <DeleteMaterialDialog
          materialTitle={material.title}
          onCancel={() => setIsDeleteDialogOpen(false)}
          onConfirm={() => {
            setIsDeleteDialogOpen(false);
            onDelete(material.id);
          }}
        />
      )}
    </div>
  );
};