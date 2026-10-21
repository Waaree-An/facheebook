import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Layers, X, Check, RotateCcw, Award, ChevronRight, ChevronLeft,
  Lightbulb, Keyboard, BookOpen, CircleHelp, Zap,
} from 'lucide-react';
import { ReadingMaterial, Flashcard, FlashcardSRSData } from '../types';
import { calculateNextReview, generateCardId } from '../utils/spacedRepetition';
import confetti from 'canvas-confetti';

interface FlashcardsModalProps {
  isOpen: boolean;
  onClose: () => void;
  materials: ReadingMaterial[];
  singleMaterial?: ReadingMaterial | null;
  /** Called with the XP and the number of cards reviewed so counters can advance. */
  onReview?: (xp: number, reviewed: number) => void;
}

type CardRatingValue = 'again' | 'hard' | 'good' | 'easy';

interface CardSessionState {
  [cardId: string]: { rating: CardRatingValue; reviewedAt: string };
}

const RATING_XP: Record<CardRatingValue, number> = { again: 0, hard: 5, good: 10, easy: 15 };

export const FlashcardsModal: React.FC<FlashcardsModalProps> = ({
  isOpen,
  onClose,
  materials,
  singleMaterial,
  onReview,
}) => {
  const cards: Flashcard[] = useMemo(() => {
    const targetMaterials = singleMaterial ? [singleMaterial] : materials;
    return targetMaterials.flatMap((material) =>
      (material.keyTakeaways ?? [])
        .map((takeaway, index) => ({
          id: generateCardId(material.id, index),
          front: `Recall the key idea from “${material.title}”.`,
          back: takeaway.trim(),
          sourceMaterialTitle: material.title,
        }))
        .filter((card) => card.back.length > 0),
    );
  }, [materials, singleMaterial]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [cardSRS, setCardSRS] = useState<Record<string, FlashcardSRSData>>({});
  const [sessionRatings, setSessionRatings] = useState<CardSessionState>({});
  const [isFinished, setIsFinished] = useState(false);
  const [xpEarnedThisSession, setXPEarnedThisSession] = useState(0);

  const currentCard = cards[currentIndex];
  const currentSRS = cardSRS[currentCard?.id];

  const answeredCount = Object.keys(sessionRatings).length;
  const progress = cards.length ? Math.round((answeredCount / cards.length) * 100) : 0;

  // Reset the study session whenever a new deck is opened or the target changes.
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(0);
      setIsFlipped(false);
      setSessionRatings({});
      setIsFinished(false);
      setXPEarnedThisSession(0);
    }
  }, [isOpen, singleMaterial?.id]);

  const goToCard = useCallback((index: number) => {
    if (index < 0 || index >= cards.length) return;
    setCurrentIndex(index);
    setIsFlipped(false);
  }, [cards.length]);

  const handleRate = useCallback((rating: CardRatingValue) => {
    if (!currentCard) return;
    const now = new Date().toISOString();
    const nextSRS = calculateNextReview(currentSRS || null, rating, now);

    setCardSRS(prev => ({
      ...prev,
      [currentCard.id]: { ...nextSRS, cardId: currentCard.id },
    }));

    setSessionRatings(prev => ({
      ...prev,
      [currentCard.id]: { rating, reviewedAt: now },
    }));

    // Work with the ratings *including* the card rated just now, because the
    // state update above has not been applied to this closure yet.
    const ratingsNow: CardSessionState = {
      ...sessionRatings,
      [currentCard.id]: { rating, reviewedAt: now },
    };

    const xp = RATING_XP[rating];
    setXPEarnedThisSession(prev => prev + xp);
    onReview?.(xp, 1);

    setIsFlipped(false);

    const nextUnanswered = Array.from({ length: cards.length }, (_, offset) =>
      (currentIndex + 1 + offset) % cards.length,
    ).find((index) => ratingsNow[cards[index].id] === undefined && index !== currentIndex);

    if (nextUnanswered !== undefined) {
      setCurrentIndex(nextUnanswered);
    } else if (cards.every((c) => ratingsNow[c.id] !== undefined)) {
      setIsFinished(true);
      try {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      } catch { /* noop */ }
    }
  }, [cards, currentCard, currentIndex, currentSRS, sessionRatings, onReview]);

  const handleRestart = useCallback(() => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setSessionRatings({});
    setIsFinished(false);
    setXPEarnedThisSession(0);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { onClose(); return; }
      if (event.key === ' ') { event.preventDefault(); setIsFlipped(prev => !prev); return; }
      if (event.key === 'ArrowLeft') { goToCard(currentIndex - 1); return; }
      if (event.key === 'ArrowRight') { goToCard(currentIndex + 1); return; }
      if (event.key === '1') { handleRate('again'); return; }
      if (event.key === '2') { handleRate('hard'); return; }
      if (event.key === '3') { handleRate('good'); return; }
      if (event.key === '4') { handleRate('easy'); return; }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, isFlipped, currentIndex, goToCard, handleRate]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-3 backdrop-blur-sm sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="flashcards-title"
        className="flex max-h-[94dvh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
      >
        <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
              <Layers className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2 id="flashcards-title" className="text-base font-extrabold leading-tight text-slate-900 sm:text-lg">
                {singleMaterial ? 'Material flashcards' : 'Active recall'}
              </h2>
              <p className="mt-1 truncate text-xs text-slate-500">
                {singleMaterial?.title ?? 'Practice key takeaways from your reading library'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
              {xpEarnedThisSession} XP
            </span>
            <button type="button" onClick={onClose} aria-label="Close flashcards" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        <div className="overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
          {cards.length === 0 ? (
            <div className="mx-auto flex max-w-md flex-col items-center py-8 text-center sm:py-12">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-indigo-50 text-indigo-500"><BookOpen className="h-8 w-8" /></div>
              <h3 className="text-lg font-extrabold text-slate-900">Your deck is waiting for takeaways</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">Add key takeaways to a reading material first. FacheeBook turns each takeaway into a recall card automatically.</p>
              <button type="button" onClick={onClose} className="mt-5 min-h-11 rounded-xl bg-indigo-600 px-5 text-sm font-bold text-white transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2">Back to materials</button>
            </div>
          ) : isFinished ? (
            <div className="mx-auto max-w-lg py-3 text-center sm:py-6">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-100 text-amber-700"><Award className="h-8 w-8" /></div>
              <h3 className="text-xl font-extrabold text-slate-900 mb-2">Session Complete! 🎉</h3>
              <p className="mt-2 text-sm text-slate-500">You reviewed {cards.length} card{cards.length !== 1 ? 's' : ''} and earned {xpEarnedThisSession} XP.</p>
              <div className="mt-5 flex gap-2">
                <button type="button" onClick={handleRestart} className="flex-1 min-h-11 rounded-xl bg-indigo-600 px-5 text-sm font-bold text-white transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2">Review Again</button>
                <button type="button" onClick={onClose} className="min-h-11 rounded-xl border border-slate-200 px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2">Done</button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-slate-600">Progress</span>
                <span className="text-sm font-bold text-amber-700">{answeredCount}/{cards.length}</span>
              </div>
              <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>

              <div className="mt-5 flex justify-center">
                <button
                  type="button"
                  onClick={() => setIsFlipped(prev => !prev)}
                  aria-label={isFlipped ? 'Show question side' : 'Reveal the answer'}
                  className={`group relative flex w-full max-w-lg flex-col items-center justify-center gap-4 rounded-3xl border-4 p-6 shadow-xl transition-all duration-300 ${
                    isFlipped
                      ? 'border-emerald-500 bg-gradient-to-br from-emerald-50 to-emerald-100'
                      : 'border-amber-300 bg-gradient-to-br from-amber-50 via-white to-slate-50'
                  }`}
                >
                  <div className="flex w-full items-center justify-between gap-2 text-[10px] font-extrabold uppercase tracking-[0.16em] sm:text-xs">
                    <span className="max-w-[65%] truncate text-slate-500">{currentCard?.sourceMaterialTitle}</span>
                    <span className={isFlipped ? 'text-emerald-700' : 'text-indigo-700'}>{isFlipped ? 'Answer' : 'Recall'}</span>
                  </div>
                  <div className="flex items-center justify-center">
                    <div className={`flex h-14 w-14 items-center justify-center rounded-full ${isFlipped ? 'bg-emerald-200 text-emerald-700' : 'bg-indigo-200 text-indigo-700'}`}>
                      {isFlipped ? <Lightbulb className="h-7 w-7" /> : <CircleHelp className="h-7 w-7" />}
                    </div>
                  </div>
                  <p className="whitespace-pre-wrap break-words text-center text-lg font-bold leading-relaxed text-slate-800">{isFlipped ? currentCard?.back : currentCard?.front}</p>
                  <span className="text-xs text-slate-400">{isFlipped ? 'Tap to return to prompt' : 'Tap to reveal the answer'}</span>
                </button>
              </div>

              {isFlipped && (
                <div className="mt-6 grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => handleRate('again')} className="flex flex-col items-center justify-center gap-2 py-4 rounded-2xl border border-rose-200 bg-rose-50 text-rose-900 font-bold text-xs transition hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"><RotateCcw className="h-5 w-5 mb-1" /> Again</button>
                  <button type="button" onClick={() => handleRate('hard')} className="flex flex-col items-center justify-center gap-2 py-4 rounded-2xl border border-amber-200 bg-amber-50 text-amber-900 font-bold text-xs transition hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"><Zap className="h-5 w-5 mb-1" /> Hard</button>
                  <button type="button" onClick={() => handleRate('good')} className="flex flex-col items-center justify-center gap-2 py-4 rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-900 font-bold text-xs transition hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"><Check className="h-5 w-5 mb-1" /> Good</button>
                  <button type="button" onClick={() => handleRate('easy')} className="flex flex-col items-center justify-center gap-2 py-4 rounded-2xl border border-indigo-200 bg-indigo-50 text-indigo-900 font-bold text-xs transition hover:bg-indigo-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"><Award className="h-5 w-5 mb-1" /> Easy</button>
                </div>
              )}

              {!isFlipped && cards.length > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <button type="button" disabled={currentIndex === 0} onClick={() => goToCard(currentIndex - 1)} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-sm font-bold text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"><ChevronLeft className="h-4 w-4" /> Previous</button>
                  <span className="text-xs font-bold text-slate-400">Card {currentIndex + 1} of {cards.length}</span>
                  <button type="button" disabled={currentIndex + 1 >= cards.length} onClick={() => goToCard(currentIndex + 1)} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-sm font-bold text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">Next <ChevronRight className="h-4 w-4" /></button>
                </div>
              )}

              {!isFlipped && (
                <p className="mt-3 text-center text-xs text-slate-400"><Keyboard className="h-3.5 w-3.5 inline" /> Space to flip · ← → to navigate · 1-4 to rate</p>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
