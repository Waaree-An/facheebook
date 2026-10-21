import type { UserGamification, UserStats, Badge } from '../types';

export function calculateLevel(xp: number): { level: number; xpToNextLevel: number } {
  let level = 1;
  let xpForCurrentLevel = 0;
  let xpForNextLevel = 150;
  while (xp >= xpForNextLevel) {
    xpForCurrentLevel = xpForNextLevel;
    level += 1;
    xpForNextLevel = Math.floor(100 * level * Math.pow(1.5, level - 1));
  }
  return { level, xpToNextLevel: xpForNextLevel - xpForCurrentLevel };
}

export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.floor(100 * level * Math.pow(1.5, level - 1));
}

export function xpForMaterialCompletion(pagesRead: number, totalPages: number): number {
  const ratio = totalPages > 0 ? pagesRead / totalPages : 0;
  return Math.round(100 * ratio);
}

export function xpForFlashcardRating(rating: 'again' | 'hard' | 'good' | 'easy'): number {
  const map: Record<string, number> = { again: 0, hard: 5, good: 10, easy: 15 };
  return map[rating] ?? 0;
}

export function xpForQuiz(score: number, totalQuestions: number): number {
  return 50 + Math.round((score / totalQuestions) * 50);
}

export function xpForStudyMinutes(minutes: number): number {
  return Math.floor((minutes / 30) * 25);
}

export function xpForStreak(streakDays: number): number {
  return streakDays * 20;
}

export const STANDARD_BADGES: Badge[] = [
  {
    id: 'first_material',
    name: 'First Steps',
    description: 'Complete your first study material',
    icon: 'BookOpen',
    color: 'text-amber-500 bg-amber-50 border-amber-200',
    xpReward: 50,
    rarity: 'common',
    condition: (stats) => stats.totalMaterialsCompleted >= 1,
  },
  {
    id: 'dedicated_reader',
    name: 'Dedicated Reader',
    description: 'Complete 5 study materials',
    icon: 'BookOpen',
    color: 'text-emerald-500 bg-emerald-50 border-emerald-200',
    xpReward: 100,
    rarity: 'common',
    condition: (stats) => stats.totalMaterialsCompleted >= 5,
  },
  {
    id: 'knowledge_seeker',
    name: 'Knowledge Seeker',
    description: 'Complete 10 study materials',
    icon: 'GraduationCap',
    color: 'text-blue-500 bg-blue-50 border-blue-200',
    xpReward: 200,
    rarity: 'rare',
    condition: (stats) => stats.totalMaterialsCompleted >= 10,
  },
  {
    id: 'flashcard_novice',
    name: 'Flashcard Novice',
    description: 'Review 50 flashcards',
    icon: 'Layers',
    color: 'text-indigo-500 bg-indigo-50 border-indigo-200',
    xpReward: 50,
    rarity: 'common',
    condition: (stats) => stats.totalFlashcardsReviewed >= 50,
  },
  {
    id: 'flashcard_master',
    name: 'Flashcard Master',
    description: 'Review 500 flashcards',
    icon: 'Award',
    color: 'text-purple-500 bg-purple-50 border-purple-200',
    xpReward: 200,
    rarity: 'rare',
    condition: (stats) => stats.totalFlashcardsReviewed >= 500,
  },
  {
    id: 'quiz_taker',
    name: 'Quiz Taker',
    description: 'Take your first quiz',
    icon: 'CheckCircle2',
    color: 'text-rose-500 bg-rose-50 border-rose-200',
    xpReward: 50,
    rarity: 'common',
    condition: (stats) => stats.totalQuizzesTaken >= 1,
  },
  {
    id: 'quiz_expert',
    name: 'Quiz Expert',
    description: 'Take 10 quizzes',
    icon: 'Trophy',
    color: 'text-amber-600 bg-amber-50 border-amber-200',
    xpReward: 150,
    rarity: 'rare',
    condition: (stats) => stats.totalQuizzesTaken >= 10,
  },
  {
    id: 'streak_starter',
    name: 'Streak Starter',
    description: 'Study for 3 consecutive days',
    icon: 'Flame',
    color: 'text-rose-500 bg-rose-50 border-rose-200',
    xpReward: 100,
    rarity: 'common',
    condition: (stats) => stats.currentStreakDays >= 3,
  },
  {
    id: 'streak_legend',
    name: 'Streak Legend',
    description: 'Study for 30 consecutive days',
    icon: 'Flame',
    color: 'text-orange-600 bg-orange-50 border-orange-200',
    xpReward: 500,
    rarity: 'legendary',
    condition: (stats) => stats.currentStreakDays >= 30,
  },
];

export function checkNewBadges(stats: UserStats, earnedBadgeIds: string[]): { badge: Badge; isNew: boolean }[] {
  return STANDARD_BADGES.map((badge) => ({
    badge,
    isNew: !earnedBadgeIds.includes(badge.id) && badge.condition(stats),
  }));
}

export function createDefaultGamification(userId: string): UserGamification {
  const { level, xpToNextLevel } = calculateLevel(0);
  return {
    userId,
    xp: 0,
    level,
    xpToNextLevel,
    totalStudyMinutes: 0,
    totalMaterialsCompleted: 0,
    totalFlashcardsReviewed: 0,
    totalQuizzesTaken: 0,
    currentStreakDays: 0,
    longestStreakDays: 0,
    lastStudyDate: undefined,
    badges: [],
    achievements: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function addXP(gamification: UserGamification, xpAmount: number): { updated: UserGamification; leveledUp: boolean; newLevel?: number } {
  const newXP = gamification.xp + xpAmount;
  const { level: newLevel, xpToNextLevel } = calculateLevel(newXP);
  const leveledUp = newLevel > gamification.level;
  return {
    updated: { ...gamification, xp: newXP, level: newLevel, xpToNextLevel, updatedAt: new Date().toISOString() },
    leveledUp,
    newLevel: leveledUp ? newLevel : undefined,
  };
}

export function xpProgressPercent(gamification: UserGamification): number {
  if (gamification.xpToNextLevel <= 0) return 100;
  const xpForCurrent = xpForLevel(gamification.level);
  const xpForNext = xpForLevel(gamification.level + 1);
  const progress = (gamification.xp - xpForCurrent) / (xpForNext - xpForCurrent);
  return Math.min(100, Math.max(0, Math.round(progress * 100)));
}

/**
 * Register study activity and advance the daily streak.
 * The streak continues only when the previous activity was yesterday.
 */
export function registerStudyActivity(gamification: UserGamification, now: string = new Date().toISOString()): UserGamification {
  const today = new Date(now);
  const todayKey = today.toISOString().slice(0, 10);
  const lastKey = gamification.lastStudyDate ? gamification.lastStudyDate.slice(0, 10) : undefined;

  if (lastKey === todayKey) return gamification;

  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayKey = yesterday.toISOString().slice(0, 10);
  const currentStreakDays = lastKey === yesterdayKey ? gamification.currentStreakDays + 1 : 1;

  return {
    ...gamification,
    currentStreakDays,
    longestStreakDays: Math.max(gamification.longestStreakDays, currentStreakDays),
    lastStudyDate: now,
  };
}