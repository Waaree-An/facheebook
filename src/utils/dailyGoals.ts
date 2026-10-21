import { DailyStudyGoal } from '../types';

const STORAGE_KEY = 'fachee_daily_study_goal';

export const DEFAULT_DAILY_PAGES = 20;
export const DEFAULT_DAILY_MATERIALS = 2;

/**
 * Returns today's date formatted as YYYY-MM-DD in local time
 */
export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns yesterday's date string YYYY-MM-DD
 */
export function getYesterdayDateString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Load the daily study goal from localStorage, automatically resetting for a new day if needed
 */
export function loadDailyGoal(): DailyStudyGoal {
  const today = getTodayDateString();
  const yesterday = getYesterdayDateString();

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        date: today,
        targetPages: DEFAULT_DAILY_PAGES,
        pagesCompleted: 0,
        targetMaterials: DEFAULT_DAILY_MATERIALS,
        materialsReviewedIds: [],
        streakDays: 0,
        history: {},
      };
    }

    const data: DailyStudyGoal = JSON.parse(raw);

    // If already initialized for today, return as is
    if (data.date === today) {
      return data;
    }

    // It's a new day! Archive the previous day
    const history = data.history || {};
    const prevDate = data.date;
    const prevAchieved = 
      data.pagesCompleted >= data.targetPages || 
      data.materialsReviewedIds.length >= data.targetMaterials;

    history[prevDate] = {
      pages: data.pagesCompleted,
      targetPages: data.targetPages,
      materialsCount: data.materialsReviewedIds.length,
      targetMaterials: data.targetMaterials,
      achieved: prevAchieved,
    };

    // Calculate streak
    let streak = data.streakDays || 0;
    if (prevDate === yesterday) {
      if (prevAchieved) {
        // Maintained streak
        streak = Math.max(1, streak);
      } else {
        // Did not achieve yesterday
        streak = 0;
      }
    } else {
      // Skipped more than 1 day
      streak = 0;
    }

    const newGoal: DailyStudyGoal = {
      date: today,
      targetPages: data.targetPages || DEFAULT_DAILY_PAGES,
      pagesCompleted: 0,
      targetMaterials: data.targetMaterials || DEFAULT_DAILY_MATERIALS,
      materialsReviewedIds: [],
      streakDays: streak,
      lastAchievedDate: data.lastAchievedDate,
      history,
    };

    saveDailyGoal(newGoal);
    return newGoal;
  } catch (err) {
    console.error('Error loading daily study goal', err);
    return {
      date: today,
      targetPages: DEFAULT_DAILY_PAGES,
      pagesCompleted: 0,
      targetMaterials: DEFAULT_DAILY_MATERIALS,
      materialsReviewedIds: [],
      streakDays: 0,
      history: {},
    };
  }
}

/**
 * Save daily study goal to localStorage
 */
export function saveDailyGoal(goal: DailyStudyGoal): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(goal));
  } catch (err) {
    console.error('Error saving daily study goal', err);
  }
}

/**
 * Check if the goal for today is currently met
 */
export function isGoalAchieved(goal: DailyStudyGoal): boolean {
  const pagesMet = goal.pagesCompleted >= goal.targetPages && goal.targetPages > 0;
  const materialsMet = goal.materialsReviewedIds.length >= goal.targetMaterials && goal.targetMaterials > 0;
  return pagesMet || materialsMet;
}

/**
 * Computes overall completion percentage (capped at 100% for progress rings)
 */
export function getOverallProgressPercent(goal: DailyStudyGoal): number {
  const pagePct = goal.targetPages > 0 ? (goal.pagesCompleted / goal.targetPages) * 100 : 0;
  const matPct = goal.targetMaterials > 0 ? (goal.materialsReviewedIds.length / goal.targetMaterials) * 100 : 0;
  // Weighted average or max
  const avg = Math.round((pagePct + matPct) / 2);
  return Math.min(100, Math.max(0, avg));
}
