import type { CardRating, FlashcardSRSData } from '../types';

/**
 * SM-2 Spaced Repetition Algorithm (used by Anki)
 *
 * Implements the SuperMemo SM-2 algorithm for scheduling flashcard reviews.
 * Based on the original SM-2 described by Piotr Woźniak.
 *
 * Key variables:
 * - EF (Ease Factor): How easy the card is. Starts at 2.5, ranges 1.3-∞
 * - Interval: Days until next review
 * - Repetitions: Number of consecutive successful reviews
 */

const DEFAULT_EASE_FACTOR = 2.5;
const MIN_EASE_FACTOR = 1.3;
const INTERVAL_DAYS = [1, 6]; // First interval, second interval

/**
 * Calculate new SRS data after a user rates a card.
 * Uses the SM-2 algorithm:
 *
 * 1. If rating is 'again' (reset): repetitions = 0, interval = 1 day, EF -= 0.2 (min 1.3)
 * 2. If rating is 'hard': interval = max(1, round(interval * EF * 0.8)), EF -= 0.15 (min 1.3)
 * 3. If rating is 'good': interval = round(interval * EF), repetitions++, EF unchanged
 * 4. If rating is 'easy': interval = round(interval * EF * 1.3), repetitions++, EF += 0.15
 *
 * @param current - Current SRS data (or null for new card)
 * @param rating - User's rating of the card
 * @param now - Current timestamp (ISO string), defaults to now
 */
export function calculateNextReview(
  current: FlashcardSRSData | null,
  rating: CardRating,
  now: string = new Date().toISOString()
): FlashcardSRSData {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  if (!current) {
    // New card — start with ease factor 2.5
    let easeFactor = DEFAULT_EASE_FACTOR;
    let interval = 1;
    let repetitions = 0;

    if (rating === 'again') {
      interval = 1;
      repetitions = 0;
      easeFactor = Math.max(MIN_EASE_FACTOR, easeFactor - 0.2);
    } else if (rating === 'hard') {
      interval = 1;
      repetitions = 0;
      easeFactor = Math.max(MIN_EASE_FACTOR, easeFactor - 0.15);
    } else if (rating === 'good') {
      interval = 1;
      repetitions = 1;
    } else if (rating === 'easy') {
      interval = 4;
      repetitions = 1;
      easeFactor += 0.15;
    }

    const nextReview = new Date(today);
    nextReview.setDate(today.getDate() + interval);

    return {
      cardId: '',
      easeFactor,
      interval,
      repetitions,
      nextReviewAt: nextReview.toISOString(),
      lastReviewedAt: now,
      totalReviews: 1,
      lapses: rating === 'again' ? 1 : 0,
      createdAt: now,
    };
  }

  // Existing card — apply SM-2
  let { easeFactor, interval, repetitions, lapses } = current;
  let newRepetitions = repetitions;

  if (rating === 'again') {
    // Reset: card was forgotten
    newRepetitions = 0;
    interval = 1;
    easeFactor = Math.max(MIN_EASE_FACTOR, easeFactor - 0.2);
    lapses += 1;
  } else if (rating === 'hard') {
    // Hard: reduce interval multiplier
    newRepetitions = 0;
    interval = Math.max(1, Math.round(interval * easeFactor * 0.8));
    easeFactor = Math.max(MIN_EASE_FACTOR, easeFactor - 0.15);
  } else if (rating === 'good') {
    // Good: normal progression
    newRepetitions += 1;
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
  } else if (rating === 'easy') {
    // Easy: boost interval
    newRepetitions += 1;
    if (repetitions === 0) {
      interval = 1;
    } else {
      interval = Math.round(interval * easeFactor * 1.3);
    }
    easeFactor += 0.15;
  }

  const nextReview = new Date(today);
  nextReview.setDate(today.getDate() + interval);

  return {
    cardId: current.cardId,
    easeFactor,
    interval,
    repetitions: newRepetitions,
    nextReviewAt: nextReview.toISOString(),
    lastReviewedAt: now,
    totalReviews: current.totalReviews + 1,
    lapses,
    createdAt: current.createdAt,
  };
}

/**
 * Check if a card is due for review today.
 */
export function isCardDue(srs: FlashcardSRSData | null, now: string = new Date().toISOString()): boolean {
  if (!srs) return true; // New cards are always due
  const nextReview = new Date(srs.nextReviewAt);
  nextReview.setHours(0, 0, 0, 0);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  return nextReview <= today;
}

/**
 * Get the number of days until a card is due (negative = overdue).
 */
export function daysUntilDue(srs: FlashcardSRSData | null, now: string = new Date().toISOString()): number {
  if (!srs) return 0;
  const nextReview = new Date(srs.nextReviewAt);
  nextReview.setHours(0, 0, 0, 0);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const diffMs = nextReview.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Format ease factor for display (e.g., 2.50 → "2.50")
 */
export function formatEaseFactor(ef: number): string {
  return ef.toFixed(2);
}

/**
 * Generate a unique card ID.
 */
export function generateCardId(materialId: string, takeawayIndex: number): string {
  return `${materialId}_card_${takeawayIndex}`;
}