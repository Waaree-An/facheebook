import React, { useState } from 'react';
import { 
  Target, Flame, CheckCircle2, BookOpen, Layers, 
  Settings2, ChevronDown, ChevronUp, Plus, Minus, 
  RotateCcw, Sparkles, Trophy, Calendar, Check, X, ArrowRight
} from 'lucide-react';
import { DailyStudyGoal, ReadingMaterial } from '../types';
import confetti from 'canvas-confetti';

interface DailyStudyGoalTrackerProps {
  goal: DailyStudyGoal;
  materials: ReadingMaterial[];
  onUpdateGoal: (updated: DailyStudyGoal) => void;
  onOpenMaterial?: (material: ReadingMaterial) => void;
}

export const DailyStudyGoalTracker: React.FC<DailyStudyGoalTrackerProps> = ({
  goal,
  materials,
  onUpdateGoal,
  onOpenMaterial,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [customPagesInput, setCustomPagesInput] = useState('');
  const [selectedMaterialIdToReview, setSelectedMaterialIdToReview] = useState('');
  
  // Settings edit state
  const [editTargetPages, setEditTargetPages] = useState(goal.targetPages);
  const [editTargetMaterials, setEditTargetMaterials] = useState(goal.targetMaterials);

  // Computations
  const pagePct = goal.targetPages > 0 
    ? Math.min(100, Math.round((goal.pagesCompleted / goal.targetPages) * 100)) 
    : 0;
  const isPagesGoalMet = goal.pagesCompleted >= goal.targetPages && goal.targetPages > 0;

  const matPct = goal.targetMaterials > 0 
    ? Math.min(100, Math.round((goal.materialsReviewedIds.length / goal.targetMaterials) * 100)) 
    : 0;
  const isMaterialsGoalMet = goal.materialsReviewedIds.length >= goal.targetMaterials && goal.targetMaterials > 0;

  const isOverallAchieved = isPagesGoalMet && isMaterialsGoalMet;
  const isEitherAchieved = isPagesGoalMet || isMaterialsGoalMet;

  // Format today's human-readable date
  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  // Handlers
  const handleAddPages = (delta: number) => {
    const nextPages = Math.max(0, goal.pagesCompleted + delta);
    const wasMet = goal.pagesCompleted >= goal.targetPages;
    const nowMet = nextPages >= goal.targetPages && goal.targetPages > 0;

    const updated: DailyStudyGoal = {
      ...goal,
      pagesCompleted: nextPages,
      lastAchievedDate: (nowMet || isMaterialsGoalMet) ? goal.date : goal.lastAchievedDate,
    };

    if (!wasMet && nowMet) {
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
    }

    onUpdateGoal(updated);
  };

  const handleCustomPagesSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(customPagesInput, 10);
    if (!isNaN(val) && val > 0) {
      handleAddPages(val);
      setCustomPagesInput('');
    }
  };

  const handleToggleReviewMaterial = (materialId: string) => {
    const alreadyReviewed = goal.materialsReviewedIds.includes(materialId);
    let nextReviewedIds: string[];

    if (alreadyReviewed) {
      nextReviewedIds = goal.materialsReviewedIds.filter((id) => id !== materialId);
    } else {
      nextReviewedIds = [...goal.materialsReviewedIds, materialId];
      if (nextReviewedIds.length >= goal.targetMaterials && goal.targetMaterials > 0) {
        confetti({ particleCount: 40, spread: 50, origin: { y: 0.7 } });
      }
    }

    const updated: DailyStudyGoal = {
      ...goal,
      materialsReviewedIds: nextReviewedIds,
      lastAchievedDate: (nextReviewedIds.length >= goal.targetMaterials || isPagesGoalMet) 
        ? goal.date 
        : goal.lastAchievedDate,
    };

    onUpdateGoal(updated);
    setSelectedMaterialIdToReview('');
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPages = Math.max(1, editTargetPages || 1);
    const cleanMaterials = Math.max(1, editTargetMaterials || 1);

    const updated: DailyStudyGoal = {
      ...goal,
      targetPages: cleanPages,
      targetMaterials: cleanMaterials,
    };

    onUpdateGoal(updated);
    setIsSettingsOpen(false);
    confetti({ particleCount: 25, spread: 45, origin: { y: 0.8 } });
  };

  const handleResetToday = () => {
    if (window.confirm("Reset today's logged pages and reviewed materials count?")) {
      const updated: DailyStudyGoal = {
        ...goal,
        pagesCompleted: 0,
        materialsReviewedIds: [],
      };
      onUpdateGoal(updated);
    }
  };

  // Materials currently reviewed today
  const reviewedMaterials = materials.filter((m) => goal.materialsReviewedIds.includes(m.id));
  const unreviewedMaterials = materials.filter((m) => !goal.materialsReviewedIds.includes(m.id));

  return (
    <div id="daily-study-goals" className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden transition-all">
      {/* Top Banner & Control Bar */}
      <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-[#111619] via-[#111619] to-[#1B242A] border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                Today's goals
              </h3>
              
              {/* Date Badge */}
              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-mono text-[11px] font-bold flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-400" />
                {todayFormatted}
              </span>

              {/* Streak Badge */}
              <div 
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold flex items-center gap-1 ${
                  goal.streakDays > 0 
                    ? 'bg-amber-100 text-amber-900 border border-amber-300' 
                    : 'bg-slate-100 text-slate-500'
                }`}
                title="Maintain consecutive daily goals to build your study streak!"
              >
                <Flame className={`w-3.5 h-3.5 ${goal.streakDays > 0 ? 'text-amber-500 fill-amber-500 animate-pulse' : 'text-slate-400'}`} />
                <span>{goal.streakDays > 0 ? `${goal.streakDays} Day Streak` : 'Start Streak'}</span>
              </div>

              {/* Status Pill */}
              {isOverallAchieved ? (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-black flex items-center gap-1 border border-emerald-200 shadow-2xs">
                  <Trophy className="w-3 h-3 text-emerald-600" />
                  All Goals Achieved!
                </span>
              ) : isEitherAchieved ? (
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[11px] font-bold flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-indigo-600" />
                  Partially Complete
                </span>
              ) : null}
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              Track today's reading and reviews in one place.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          <button
            onClick={() => {
              setEditTargetPages(goal.targetPages);
              setEditTargetMaterials(goal.targetMaterials);
              setIsSettingsOpen(!isSettingsOpen);
            }}
            className={`p-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              isSettingsOpen 
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs' 
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-2xs'
            }`}
            title="Configure Daily Targets"
          >
            <Settings2 className="w-4 h-4" />
            <span className="text-xs">Edit Targets</span>
          </button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 transition-all shadow-2xs cursor-pointer"
            title={isExpanded ? 'Collapse Tracker' : 'Expand Tracker'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Settings Panel (Inline Config) */}
      {isSettingsOpen && (
        <form 
          onSubmit={handleSaveSettings}
          className="p-4 sm:p-5 bg-slate-50/90 border-b border-slate-200 transition-all space-y-4"
        >
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <div>
              <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                Configure Your Daily Study Goals
              </h4>
              <p className="text-[11px] text-slate-500">
                Choose realistic daily targets. These will automatically persist for every new study day.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsSettingsOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Target Pages Input */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-2">
              <label className="block text-xs font-bold text-slate-800">
                📖 Daily Pages Target: <span className="text-indigo-600 font-extrabold">{editTargetPages} pages</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={editTargetPages}
                  onChange={(e) => setEditTargetPages(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-24 px-3 py-1.5 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500"
                />
                <div className="flex items-center gap-1 flex-wrap">
                  {[10, 20, 30, 50].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setEditTargetPages(preset)}
                      className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                        editTargetPages === preset
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {preset}p
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Target Materials Input */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-2">
              <label className="block text-xs font-bold text-slate-800">
                📚 Daily Materials to Review: <span className="text-purple-600 font-extrabold">{editTargetMaterials} materials</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={editTargetMaterials}
                  onChange={(e) => setEditTargetMaterials(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-24 px-3 py-1.5 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-purple-500"
                />
                <div className="flex items-center gap-1 flex-wrap">
                  {[1, 2, 3, 5].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setEditTargetMaterials(preset)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                        editTargetMaterials === preset
                          ? 'bg-purple-600 text-white'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {preset} items
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={handleResetToday}
              className="text-[11px] text-rose-600 hover:text-rose-800 font-bold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Today's Log</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                Save Daily Target
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Main Tracker Body */}
      {isExpanded && (
        <div className="p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* COLUMN 1: Reading Pages Target Card */}
            <div className={`p-4 rounded-2xl border transition-all ${
              isPagesGoalMet 
                ? 'bg-emerald-50/40 border-emerald-200' 
                : 'bg-slate-50/70 border-slate-200/80'
            }`}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                    isPagesGoalMet ? 'bg-emerald-100 text-emerald-800' : 'bg-indigo-100 text-indigo-700'
                  }`}>
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                      <span>Pages Read Today</span>
                      {isPagesGoalMet && (
                        <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-md">
                          Goal Met!
                        </span>
                      )}
                    </h4>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Target: {goal.targetPages} pages / day
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-lg font-black text-slate-900 font-mono">
                    {goal.pagesCompleted}
                  </span>
                  <span className="text-xs text-slate-400 font-mono font-bold"> / {goal.targetPages}</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1 mb-3">
                <div className="w-full h-2.5 bg-slate-200/80 rounded-full overflow-hidden p-0.5">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isPagesGoalMet 
                        ? 'bg-emerald-500' 
                        : 'bg-indigo-600'
                    }`}
                    style={{ width: `${pagePct}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                  <span>{pagePct}% complete</span>
                  <span>
                    {isPagesGoalMet 
                      ? `+${goal.pagesCompleted - goal.targetPages} beyond target!` 
                      : `${goal.targetPages - goal.pagesCompleted} pages left`}
                  </span>
                </div>
              </div>

              {/* Quick Increment Controls */}
              <div className="pt-2 border-t border-slate-200/60 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="text-[10px] font-bold text-slate-400 mr-1">Quick Log:</span>
                  {[1, 5, 10, 20].map((inc) => (
                    <button
                      key={inc}
                      onClick={() => handleAddPages(inc)}
                      className="px-2 py-1 rounded-lg bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-[11px] font-bold text-slate-700 hover:text-indigo-700 transition-all shadow-2xs cursor-pointer active:scale-95"
                    >
                      +{inc}
                    </button>
                  ))}
                  {goal.pagesCompleted > 0 && (
                    <button
                      onClick={() => handleAddPages(-1)}
                      className="p-1 rounded-lg bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-400 hover:text-rose-600 transition-all cursor-pointer"
                      title="Subtract 1 page"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Custom Page Input */}
                <form onSubmit={handleCustomPagesSubmit} className="flex items-center gap-1">
                  <input
                    type="number"
                    min="1"
                    placeholder="Custom"
                    value={customPagesInput}
                    onChange={(e) => setCustomPagesInput(e.target.value)}
                    className="w-16 px-2 py-1 text-[11px] bg-white border border-slate-200 rounded-lg outline-none focus:border-indigo-500 font-medium"
                  />
                  <button
                    type="submit"
                    disabled={!customPagesInput}
                    className="px-2 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-[11px] font-bold shadow-2xs cursor-pointer"
                  >
                    Add
                  </button>
                </form>
              </div>
            </div>

            {/* COLUMN 2: Review Materials Target Card */}
            <div className={`p-4 rounded-2xl border transition-all ${
              isMaterialsGoalMet 
                ? 'bg-purple-50/40 border-purple-200' 
                : 'bg-slate-50/70 border-slate-200/80'
            }`}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                    isMaterialsGoalMet ? 'bg-purple-100 text-purple-800' : 'bg-purple-100 text-purple-700'
                  }`}>
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                      <span>Materials Reviewed Today</span>
                      {isMaterialsGoalMet && (
                        <span className="text-[10px] font-extrabold bg-purple-100 text-purple-800 px-1.5 py-0.2 rounded-md">
                          Goal Met!
                        </span>
                      )}
                    </h4>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Target: {goal.targetMaterials} materials / day
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-lg font-black text-slate-900 font-mono">
                    {goal.materialsReviewedIds.length}
                  </span>
                  <span className="text-xs text-slate-400 font-mono font-bold"> / {goal.targetMaterials}</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1 mb-3">
                <div className="w-full h-2.5 bg-slate-200/80 rounded-full overflow-hidden p-0.5">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isMaterialsGoalMet 
                        ? 'bg-purple-600' 
                        : 'bg-purple-500'
                    }`}
                    style={{ width: `${matPct}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                  <span>{matPct}% complete</span>
                  <span>
                    {isMaterialsGoalMet 
                      ? 'Target fulfilled!' 
                      : `${goal.targetMaterials - goal.materialsReviewedIds.length} more to review`}
                  </span>
                </div>
              </div>

              {/* Select Material to Review Quick-Action */}
              <div className="pt-2 border-t border-slate-200/60 space-y-2">
                <div className="flex items-center gap-1.5">
                  <select
                    value={selectedMaterialIdToReview}
                    onChange={(e) => {
                      if (e.target.value) {
                        handleToggleReviewMaterial(e.target.value);
                      }
                    }}
                    className="flex-1 px-2.5 py-1 text-xs font-medium bg-white border border-slate-200 rounded-lg outline-none text-slate-700 truncate"
                  >
                    <option value="">+ Mark a material as reviewed today...</option>
                    {unreviewedMaterials.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.title} ({m.subject})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Chips of Materials Reviewed Today */}
                {reviewedMaterials.length > 0 ? (
                  <div className="flex items-center gap-1.5 flex-wrap max-h-16 overflow-y-auto">
                    {reviewedMaterials.map((m) => (
                      <div
                        key={m.id}
                        className="px-2 py-0.5 rounded-lg bg-purple-100/80 text-purple-900 border border-purple-200 text-[10px] font-bold flex items-center gap-1.5"
                      >
                        <Check className="w-3 h-3 text-purple-700" />
                        <span 
                          onClick={() => onOpenMaterial && onOpenMaterial(m)}
                          className="truncate max-w-[140px] hover:underline cursor-pointer"
                          title="Open material detail"
                        >
                          {m.title}
                        </span>
                        <button
                          onClick={() => handleToggleReviewMaterial(m.id)}
                          className="text-purple-400 hover:text-purple-700 ml-0.5 cursor-pointer"
                          title="Remove from today's reviewed list"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-400 italic">
                    No materials reviewed yet today. Select one above or review via cards.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Motivational Footer / Mini Streak Strip */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-indigo-700 font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Daily Consistency Tip:</span>
              </span>
              <span className="text-slate-600 text-[11px]">
                {isOverallAchieved 
                  ? "Outstanding discipline! You've crushed both your daily page and material review goals today." 
                  : isPagesGoalMet
                  ? "Great job finishing your reading pages! Review your chosen materials to achieve 100%."
                  : "Studying 20 pages every day totals over 600 pages per month. Small daily efforts compound fast!"}
              </span>
            </div>

            {isOverallAchieved && (
              <button
                onClick={() => confetti({ particleCount: 75, spread: 80, origin: { y: 0.6 } })}
                className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 cursor-pointer"
              >
                <span>Celebrate</span>
                <Sparkles className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
