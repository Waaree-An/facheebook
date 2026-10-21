import React from 'react';
import { Trophy, Flame, Zap, Star } from 'lucide-react';
import type { UserGamification, Badge } from '../types';
import { xpProgressPercent, STANDARD_BADGES } from '../utils/gamification';

interface GamificationDisplayProps {
  gamification: UserGamification | null;
}

export const GamificationDisplay: React.FC<GamificationDisplayProps> = ({
  gamification,
}) => {
  if (!gamification) return null;

  const progress = xpProgressPercent(gamification);

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 shadow-sm">
            <Trophy className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Study Level</p>
            <p className="text-xl font-black text-slate-900">Level {gamification.level}</p>
          </div>
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">XP</p>
          <p className="text-lg font-black text-slate-900">{gamification.xp} ⭐</p>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-bold text-slate-600">Progress to Level {gamification.level + 1}</span>
          <span className="text-xs font-bold text-amber-700">{progress}%</span>
        </div>
        <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden border border-slate-100">
          <div
            className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-300 rounded-full transition-all duration-700 ease-out shadow-[0_0_15px_rgba(244,199,91,0.4)]"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-amber-50 border border-amber-100">
          <Flame className="h-4 w-4 text-amber-600" />
          <div>
            <p className="text-[10px] font-bold text-amber-700 uppercase">Study Streak</p>
            <p className="text-sm font-black text-slate-900">{gamification.currentStreakDays} days</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-indigo-50 border border-indigo-100">
          <Zap className="h-4 w-4 text-indigo-600" />
          <div>
            <p className="text-[10px] font-bold text-indigo-700 uppercase">Materials Done</p>
            <p className="text-sm font-black text-slate-900">{gamification.totalMaterialsCompleted}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-rose-50 border border-rose-100">
          <Zap className="h-4 w-4 text-rose-600" />
          <div>
            <p className="text-[10px] font-bold text-rose-700 uppercase">Flashcards</p>
            <p className="text-sm font-black text-slate-900">{gamification.totalFlashcardsReviewed}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-purple-50 border border-purple-100">
          <Star className="h-4 w-4 text-purple-600" />
          <div>
            <p className="text-[10px] font-bold text-purple-700 uppercase">Quizzes</p>
            <p className="text-sm font-black text-slate-900">{gamification.totalQuizzesTaken}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Badges & Achievements</h3>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {gamification.badges.length > 0 ? (
          gamification.badges.map((userBadge) => {
            const badge = STANDARD_BADGES.find((b) => b.id === userBadge.badgeId);
            if (!badge) return null;
            return (
              <div key={badge.id} className="flex-shrink-0 flex flex-col items-center gap-1.5">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${badge.color} shadow-sm border`}>
                  {badge.icon === 'BookOpen' && <span className="h-5 w-5">📖</span>}
                  {badge.icon === 'GraduationCap' && <span className="h-5 w-5">🎓</span>}
                  {badge.icon === 'Layers' && <span className="h-5 w-5">🃏</span>}
                  {badge.icon === 'Award' && <span className="h-5 w-5">🏆</span>}
                  {badge.icon === 'CheckCircle2' && <span className="h-5 w-5">✅</span>}
                  {badge.icon === 'Trophy' && <span className="h-5 w-5">🏆</span>}
                  {badge.icon === 'Flame' && <span className="h-5 w-5">🔥</span>}
                  {badge.icon === 'Sunrise' && <span className="h-5 w-5">🌅</span>}
                  {badge.icon === 'Moon' && <span className="h-5 w-5">🌙</span>}
                  {!badge.icon && <span className="h-5 w-5">🏅</span>}
                </div>
                <span className="text-[10px] font-bold text-slate-700 text-center leading-tight">{badge.name}</span>
              </div>
            );
          })
        ) : (
          <span className="text-xs text-slate-400">No badges yet. Keep studying to unlock achievements!</span>
        )}
      </div>
    </div>
  );
};