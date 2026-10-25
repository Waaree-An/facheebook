import React, { useState, useMemo, useEffect } from 'react';
import { 
  Route, Compass, CheckCircle2, Circle, Clock, Play, BookOpen, 
  ArrowUp, ArrowDown, Sparkles, Filter, ChevronRight, Layers, 
  Plus, Search, Trophy, Flame, SlidersHorizontal, Check, 
  ArrowRight, Video, FileText, Image, RotateCcw, AlertCircle
} from 'lucide-react';
import { ReadingMaterial, ReadingStatus } from '../types';
import confetti from 'canvas-confetti';

interface StudyRoadmapProps {
  materials: ReadingMaterial[];
  onOpenMaterial: (material: ReadingMaterial) => void;
  onUpdateStatus: (id: string, newStatus: ReadingStatus) => void;
  onStartTimer: (material: ReadingMaterial) => void;
  onOpenAddModalWithSubject?: (subject: string) => void;
}

const STORAGE_KEY = 'fachee_study_roadmap_order_v1';

export const StudyRoadmap: React.FC<StudyRoadmapProps> = ({
  materials,
  onOpenMaterial,
  onUpdateStatus,
  onStartTimer,
  onOpenAddModalWithSubject,
}) => {
  // Extract all distinct subjects
  const subjects = useMemo(() => {
    const list = Array.from(new Set(materials.map((m) => m.subject.trim()).filter(Boolean)));
    return list.sort();
  }, [materials]);

  // Selected subject filter ('all' or specific subject)
  const [selectedSubject, setSelectedSubject] = useState<string>(() => {
    return subjects.length > 0 ? subjects[0] : 'all';
  });

  // Keep selected subject valid if subjects change
  useEffect(() => {
    if (selectedSubject !== 'all' && subjects.length > 0 && !subjects.includes(selectedSubject)) {
      setSelectedSubject(subjects[0]);
    }
  }, [subjects, selectedSubject]);

  // View presentation mode: 'timeline' (vertical connected path) or 'stages' (progression pipeline)
  const [viewMode, setViewMode] = useState<'timeline' | 'stages'>('timeline');

  // Search filter inside roadmap
  const [searchQuery, setSearchQuery] = useState('');

  // Status filter inside roadmap
  const [statusFilter, setStatusFilter] = useState<'all' | 'incomplete' | 'completed'>('all');

  // Custom ordering mapping: subject -> array of material ids
  const [customOrder, setCustomOrder] = useState<Record<string, string[]>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Save custom order to localStorage
  const saveOrder = (newOrder: Record<string, string[]>) => {
    setCustomOrder(newOrder);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newOrder));
    } catch {
      // storage unavailable
    }
  };

  // Move a material step up or down within its subject progression
  const handleMoveStep = (subject: string, id: string, direction: 'up' | 'down') => {
    const subjectMaterials = getOrderedMaterialsForSubject(subject);
    const currentIndex = subjectMaterials.findIndex((m) => m.id === id);
    if (currentIndex === -1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= subjectMaterials.length) return;

    const updated = [...subjectMaterials];
    const [moved] = updated.splice(currentIndex, 1);
    updated.splice(targetIndex, 0, moved);

    const newIdList = updated.map((m) => m.id);
    const newOrder = {
      ...customOrder,
      [subject]: newIdList,
    };
    saveOrder(newOrder);
  };

  // Reset order to default (or sort by status)
  const handleSortByStatus = (subject: string) => {
    const statusWeight: Record<ReadingStatus, number> = {
      reading: 0,
      to_read: 1,
      under_review: 2,
      completed: 3,
    };
    const subjectItems = materials.filter((m) => m.subject.trim() === subject.trim());
    const sorted = [...subjectItems].sort((a, b) => statusWeight[a.status] - statusWeight[b.status]);
    const newOrder = {
      ...customOrder,
      [subject]: sorted.map((m) => m.id),
    };
    saveOrder(newOrder);
    confetti({ particleCount: 20, spread: 45, origin: { y: 0.6 } });
  };

  const handleResetOrder = (subject: string) => {
    const newOrder = { ...customOrder };
    delete newOrder[subject];
    saveOrder(newOrder);
  };

  // Helper to get ordered materials for a subject
  const getOrderedMaterialsForSubject = (subject: string): ReadingMaterial[] => {
    const subjectItems = materials.filter((m) => m.subject.trim().toLowerCase() === subject.trim().toLowerCase());
    const orderList = customOrder[subject];

    if (!orderList || orderList.length === 0) {
      return subjectItems;
    }

    // Sort according to orderList; any new items placed at the end
    const itemMap = new Map<string, ReadingMaterial>(subjectItems.map((m) => [m.id, m]));
    const result: ReadingMaterial[] = [];

    orderList.forEach((id) => {
      const item = itemMap.get(id);
      if (item) {
        result.push(item);
        itemMap.delete(id);
      }
    });

    // Add remaining items not in custom list
    itemMap.forEach((item) => result.push(item));
    return result;
  };

  // Active subject list to display
  const activeSubjectsToDisplay = useMemo(() => {
    if (selectedSubject === 'all') {
      return subjects;
    }
    return subjects.filter((s) => s.toLowerCase() === selectedSubject.toLowerCase());
  }, [subjects, selectedSubject]);

  // Calculate subject roadmap stats
  const getSubjectStats = (subject: string) => {
    const items = materials.filter((m) => m.subject.trim().toLowerCase() === subject.trim().toLowerCase());
    const total = items.length;
    const completed = items.filter((m) => m.status === 'completed').length;
    const reading = items.filter((m) => m.status === 'reading').length;
    const toRead = items.filter((m) => m.status === 'to_read').length;
    const underReview = items.filter((m) => m.status === 'under_review').length;
    const totalPages = items.reduce((acc, curr) => acc + (curr.totalPages || 0), 0);
    const pagesRead = items.reduce((acc, curr) => acc + (curr.pagesRead || 0), 0);
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      total,
      completed,
      reading,
      toRead,
      underReview,
      totalPages,
      pagesRead,
      percentage,
    };
  };

  // Overall stats
  const overallStats = useMemo(() => {
    const total = materials.length;
    const completed = materials.filter((m) => m.status === 'completed').length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, percentage };
  }, [materials]);

  // Advance to next status helper
  const handleAdvanceStatus = (material: ReadingMaterial) => {
    let nextStatus: ReadingStatus = 'reading';
    if (material.status === 'to_read') {
      nextStatus = 'reading';
    } else if (material.status === 'reading') {
      nextStatus = 'under_review';
    } else if (material.status === 'under_review') {
      nextStatus = 'completed';
    } else {
      nextStatus = 'reading';
    }

    onUpdateStatus(material.id, nextStatus);

    if (nextStatus === 'completed') {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
      });
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="fb-themed-hero relative overflow-hidden bg-gradient-to-br from-[#111619] via-[#1B242A] to-[#080A0B] text-white rounded-3xl p-6 sm:p-8 shadow-md border border-indigo-800/50">
        <div className="absolute -right-12 -top-12 w-60 h-60 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 w-60 h-60 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-amber-400/20 border border-amber-400/40 text-amber-300 text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full flex items-center gap-1.5 shadow-2xs">
                <Route className="w-3.5 h-3.5 text-amber-400" />
                <span>Visual Learning Path</span>
              </span>
              <span className="bg-white/10 text-slate-300 text-xs font-semibold px-3 py-1 rounded-full border border-white/10">
                Subject-Oriented Progression
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
              Study Roadmaps &amp; Progression Tracks
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
              Structure your lecture notes, book chapters, and multimedia resources into an ordered, multi-step 
              learning trajectory. Re-order steps to suit your syllabus, track milestone completion, and launch 
              focused Pomodoro sessions step-by-step.
            </p>
          </div>

          {/* Quick Overall Mastery Metric */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/15 min-w-[240px] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">Global Mastery</span>
              <span className="text-xs font-black text-amber-300 bg-amber-400/20 px-2 py-0.5 rounded-full">
                {overallStats.percentage}% Done
              </span>
            </div>

            <div className="w-full bg-slate-800/80 rounded-full h-2.5 overflow-hidden p-0.5">
              <div 
                className="bg-gradient-to-r from-amber-400 to-emerald-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${overallStats.percentage}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
              <span>{overallStats.completed} Completed Steps</span>
              <span>{overallStats.total} Total In Hub</span>
            </div>
          </div>
        </div>
      </div>

      {/* Control Bar: Subject Selector & Presentation Modes */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-xs space-y-4">
        {/* Top Controls Row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Subject Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none flex-1">
            <button
              onClick={() => setSelectedSubject('all')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                selectedSubject === 'all'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>All Subjects ({subjects.length})</span>
            </button>

            {subjects.map((sub) => {
              const stats = getSubjectStats(sub);
              const isSelected = selectedSubject.toLowerCase() === sub.toLowerCase();
              return (
                <button
                  key={sub}
                  onClick={() => setSelectedSubject(sub)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <span>{sub}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {stats.completed}/{stats.total}
                  </span>
                </button>
              );
            })}
          </div>

          {/* View Mode Toggle (Timeline vs Stages) */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0 self-start sm:self-auto border border-slate-200/70">
            <button
              onClick={() => setViewMode('timeline')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'timeline'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Route className="w-3.5 h-3.5 text-indigo-600" />
              <span>Milestone Path</span>
            </button>

            <button
              onClick={() => setViewMode('stages')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'stages'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-amber-600" />
              <span>Progression Stages</span>
            </button>
          </div>
        </div>

        {/* Filter & Search Sub-bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search steps within active roadmap..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all placeholder:text-slate-400"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="text-slate-400 text-[11px] font-bold uppercase tracking-wider">Status:</span>
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-indigo-100 text-indigo-800'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              All Steps
            </button>
            <button
              onClick={() => setStatusFilter('incomplete')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                statusFilter === 'incomplete'
                  ? 'bg-amber-100 text-amber-900'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Incomplete Only
            </button>
            <button
              onClick={() => setStatusFilter('completed')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                statusFilter === 'completed'
                  ? 'bg-emerald-100 text-emerald-900'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Completed Only
            </button>
          </div>
        </div>
      </div>

      {/* Main Subject Roadmaps Content */}
      {activeSubjectsToDisplay.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center space-y-3">
          <Route className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="font-extrabold text-base text-slate-800">No Subjects or Materials Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Add reading materials with assigned subjects to automatically generate progression roadmaps.
          </p>
        </div>
      ) : (
        <div className="space-y-12">
          {activeSubjectsToDisplay.map((subjectName) => {
            const stats = getSubjectStats(subjectName);
            const orderedItems = getOrderedMaterialsForSubject(subjectName);

            // Apply search & status filters
            const visibleItems = orderedItems.filter((m) => {
              const query = searchQuery.toLowerCase();
              const matchesSearch = 
                !query ||
                m.title.toLowerCase().includes(query) ||
                m.description.toLowerCase().includes(query) ||
                m.author.toLowerCase().includes(query) ||
                (m.keyDefinitions || []).some(({ term, definition }) => `${term} ${definition}`.toLowerCase().includes(query));

              const matchesStatus = 
                statusFilter === 'all' ||
                (statusFilter === 'completed' && m.status === 'completed') ||
                (statusFilter === 'incomplete' && m.status !== 'completed');

              return matchesSearch && matchesStatus;
            });

            return (
              <div 
                key={subjectName}
                className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xs space-y-6"
              >
                {/* Subject Roadmap Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded-lg">
                        Subject Roadmap
                      </span>
                      <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                        {subjectName}
                      </h2>
                    </div>
                    <p className="text-xs text-slate-500 font-medium">
                      {stats.total} structured materials • {stats.pagesRead} of {stats.totalPages} pages read • {stats.completed} mastered
                    </p>
                  </div>

                  {/* Subject Action & Controls */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Reorder Tools */}
                    <button
                      onClick={() => handleSortByStatus(subjectName)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                      title="Automatically sequence items: In-Progress first, followed by To-Read, then Completed"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Flow By Status</span>
                    </button>

                    <button
                      onClick={() => handleResetOrder(subjectName)}
                      className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 text-xs transition-colors cursor-pointer"
                      title="Reset custom reordering to original input order"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>

                    {onOpenAddModalWithSubject && (
                      <button
                        onClick={() => onOpenAddModalWithSubject(subjectName)}
                        className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Step</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Progress Bar & Stage Breakdown Banner */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/70 space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-amber-500" />
                      <span className="text-slate-800">Progression Trajectory</span>
                    </div>
                    <span className="text-indigo-600 font-black">{stats.percentage}% Completed</span>
                  </div>

                  <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden flex">
                    <div 
                      className="bg-emerald-500 h-full transition-all duration-500"
                      style={{ width: `${stats.percentage}%` }}
                      title={`${stats.completed} Completed`}
                    />
                    <div 
                      className="bg-indigo-500 h-full transition-all duration-500"
                      style={{ width: `${stats.total > 0 ? (stats.reading / stats.total) * 100 : 0}%` }}
                      title={`${stats.reading} Currently Reading`}
                    />
                    <div 
                      className="bg-amber-400 h-full transition-all duration-500"
                      style={{ width: `${stats.total > 0 ? (stats.underReview / stats.total) * 100 : 0}%` }}
                      title={`${stats.underReview} Under Review`}
                    />
                  </div>

                  {/* Micro Legend */}
                  <div className="flex items-center gap-4 text-[11px] font-semibold text-slate-500 flex-wrap">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span>{stats.completed} Completed</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-indigo-500" />
                      <span>{stats.reading} Reading</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      <span>{stats.underReview} Under Review</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-slate-300" />
                      <span>{stats.toRead} Upcoming</span>
                    </span>
                  </div>
                </div>

                {/* VIEW MODE 1: Milestone Path (Vertical Connected Progression Track) */}
                {viewMode === 'timeline' ? (
                  visibleItems.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      No steps match the active search or status filter.
                    </div>
                  ) : (
                    <div className="relative pl-6 sm:pl-10 space-y-6 my-2">
                      {/* Vertical Spine Line */}
                      <div className="absolute left-[19px] sm:left-[35px] top-6 bottom-6 w-1 bg-gradient-to-b from-indigo-500 via-slate-200 to-emerald-500 -translate-x-1/2 rounded-full" />

                      {visibleItems.map((item, index) => {
                        const stepNumber = index + 1;
                        const isCompleted = item.status === 'completed';
                        const isReading = item.status === 'reading';
                        const isUnderReview = item.status === 'under_review';
                        const isUpcoming = item.status === 'to_read';

                        return (
                          <div 
                            key={item.id}
                            className={`relative flex items-start gap-4 sm:gap-6 group transition-all`}
                          >
                            {/* Step Node Marker on the Spine */}
                            <div 
                              className={`relative z-10 w-9 h-9 sm:w-11 sm:h-11 rounded-full flex items-center justify-center font-black text-xs sm:text-sm shrink-0 shadow-sm border-2 transition-transform group-hover:scale-105 ${
                                isCompleted
                                  ? 'bg-emerald-500 border-emerald-300 text-white shadow-emerald-500/20'
                                  : isReading
                                  ? 'bg-indigo-600 border-indigo-400 text-white ring-4 ring-indigo-100 animate-pulse'
                                  : isUnderReview
                                  ? 'bg-amber-500 border-amber-300 text-white ring-4 ring-amber-100'
                                  : 'bg-white border-slate-300 text-slate-600'
                              }`}
                            >
                              {isCompleted ? (
                                <Check className="w-5 h-5 text-white stroke-[3]" />
                              ) : (
                                <span>{stepNumber}</span>
                              )}
                            </div>

                            {/* Milestone Card Content */}
                            <div className={`min-w-0 flex-1 rounded-2xl p-3 sm:p-5 border transition-all ${
                              isReading
                                ? 'bg-indigo-50/40 border-indigo-200 shadow-sm'
                                : isCompleted
                                ? 'bg-emerald-50/30 border-emerald-200/80'
                                : isUnderReview
                                ? 'bg-amber-50/30 border-amber-200/80'
                                : 'bg-white border-slate-200/90 hover:border-slate-300 shadow-2xs'
                            }`}>
                              <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                                {/* Title & Metadata */}
                                <div className="space-y-1.5 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                                      Step {stepNumber}
                                    </span>

                                    {/* Status Badge */}
                                    <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 ${
                                      isCompleted
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : isReading
                                        ? 'bg-indigo-100 text-indigo-800'
                                        : isUnderReview
                                        ? 'bg-amber-100 text-amber-800'
                                        : 'bg-slate-100 text-slate-600'
                                    }`}>
                                      {isCompleted ? (
                                        <>
                                          <CheckCircle2 className="w-3 h-3" />
                                          <span>Mastered</span>
                                        </>
                                      ) : isReading ? (
                                        <>
                                          <Play className="w-3 h-3 fill-indigo-600" />
                                          <span>Active Focus</span>
                                        </>
                                      ) : isUnderReview ? (
                                        <>
                                          <Clock className="w-3 h-3" />
                                          <span>Under Review</span>
                                        </>
                                      ) : (
                                        <>
                                          <Circle className="w-3 h-3" />
                                          <span>To Read</span>
                                        </>
                                      )}
                                    </span>

                                    {item.semester && (
                                      <span className="text-[10px] text-slate-400 font-medium">
                                        • {item.semester}
                                      </span>
                                    )}
                                  </div>

                                  <h4 
                                    onClick={() => onOpenMaterial(item)}
                                    className="text-base font-extrabold text-slate-900 hover:text-indigo-600 cursor-pointer transition-colors leading-snug"
                                  >
                                    {item.title}
                                  </h4>

                                  <p className="text-xs text-slate-500 font-medium line-clamp-2">
                                    {item.description || 'No detailed description provided.'}
                                  </p>

                                  {/* Attached media tags summary */}
                                  <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-400 font-medium flex-wrap">
                                    {item.author && <span>By {item.author}</span>}
                                    <span>•</span>
                                    <span>{item.pagesRead}/{item.totalPages} Pages</span>
                                    {item.documents.length > 0 && (
                                      <span className="flex items-center gap-1 text-slate-600">
                                        <FileText className="w-3 h-3 text-indigo-500" />
                                        <span>{item.documents.length} Docs</span>
                                      </span>
                                    )}
                                    {item.photos.length > 0 && (
                                      <span className="flex items-center gap-1 text-slate-600">
                                        <Image className="w-3 h-3 text-emerald-500" />
                                        <span>{item.photos.length} Photos</span>
                                      </span>
                                    )}
                                    {item.videoLinks.length > 0 && (
                                      <span className="flex items-center gap-1 text-slate-600">
                                        <Video className="w-3 h-3 text-red-500" />
                                        <span>{item.videoLinks.length} Videos</span>
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Step Action Buttons */}
                                <div className="flex flex-wrap items-center gap-2 shrink-0 self-start md:flex-col md:self-stretch md:justify-between">
                                  {/* Step Re-order Controls */}
                                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                                    <button
                                      disabled={index === 0}
                                      onClick={() => handleMoveStep(subjectName, item.id, 'up')}
                                      className="p-1 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                                      title="Move this step earlier in roadmap sequence"
                                    >
                                      <ArrowUp className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      disabled={index === visibleItems.length - 1}
                                      onClick={() => handleMoveStep(subjectName, item.id, 'down')}
                                      className="p-1 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                                      title="Move this step later in roadmap sequence"
                                    >
                                      <ArrowDown className="w-3.5 h-3.5" />
                                    </button>
                                  </div>

                                  {/* Quick Status / Study Actions */}
                                  <div className="flex items-center gap-1.5">
                                    {/* Focus Timer Button */}
                                    <button
                                      onClick={() => onStartTimer(item)}
                                      className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                                      title="Start 25-minute Pomodoro study session on this step"
                                    >
                                      <Play className="w-3 h-3 fill-indigo-600" />
                                      <span className="hidden sm:inline">Focus</span>
                                    </button>

                                    {/* Advance Progression Button */}
                                    <button
                                      onClick={() => handleAdvanceStatus(item)}
                                      aria-label={isCompleted ? 'Review this step again' : isReading || isUnderReview ? 'Mark this step complete' : 'Start this step'}
                                      className={`min-h-9 whitespace-nowrap px-2.5 py-1.5 rounded-xl text-[11px] sm:px-3 sm:text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                                        isCompleted
                                          ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                          : isReading
                                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                          : isUnderReview
                                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                          : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                      }`}
                                    >
                                      {isCompleted ? (
                                        <>
                                          <RotateCcw className="w-3 h-3" />
                                          <span className="hidden sm:inline">Review Again</span>
                                        </>
                                      ) : isReading ? (
                                        <>
                                          <Check className="w-3 h-3 stroke-[2.5]" />
                                          <span>Complete</span>
                                        </>
                                      ) : isUnderReview ? (
                                        <>
                                          <Check className="w-3 h-3 stroke-[2.5]" />
                                          <span>Complete</span>
                                        </>
                                      ) : (
                                        <>
                                          <ArrowRight className="w-3 h-3" />
                                          <span>Start Step</span>
                                        </>
                                      )}
                                    </button>

                                    {/* View Details */}
                                    <button
                                      onClick={() => onOpenMaterial(item)}
                                      className="p-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                                      title="View all reading notes, takeaways, and files"
                                    >
                                      <ChevronRight className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )
                ) : (
                  /* VIEW MODE 2: Multi-Step Progression Pipeline Stages */
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
                    {/* Column 1: Upcoming / To Read */}
                    <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200 flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                          <span className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                            <Circle className="w-3 h-3 text-slate-400" />
                            <span>1. To Read</span>
                          </span>
                          <span className="text-[11px] font-bold bg-slate-200 text-slate-700 px-2 py-0.2 rounded-full">
                            {orderedItems.filter((m) => m.status === 'to_read').length}
                          </span>
                        </div>

                        <div className="space-y-2.5">
                          {orderedItems.filter((m) => m.status === 'to_read').map((m) => (
                            <div 
                              key={m.id}
                              onClick={() => onOpenMaterial(m)}
                              className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs hover:border-indigo-400 transition-all cursor-pointer space-y-1"
                            >
                              <h5 className="font-extrabold text-xs text-slate-900 leading-snug line-clamp-2">
                                {m.title}
                              </h5>
                              <p className="text-[10px] text-slate-400">
                                {m.totalPages} pages total
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Column 2: Currently Reading */}
                    <div className="bg-indigo-50/50 rounded-2xl p-4 border border-indigo-200 flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-indigo-200">
                          <span className="text-xs font-black uppercase tracking-wider text-indigo-800 flex items-center gap-1.5">
                            <Play className="w-3 h-3 fill-indigo-600 text-indigo-600" />
                            <span>2. Reading</span>
                          </span>
                          <span className="text-[11px] font-bold bg-indigo-200 text-indigo-900 px-2 py-0.2 rounded-full">
                            {orderedItems.filter((m) => m.status === 'reading').length}
                          </span>
                        </div>

                        <div className="space-y-2.5">
                          {orderedItems.filter((m) => m.status === 'reading').map((m) => (
                            <div 
                              key={m.id}
                              onClick={() => onOpenMaterial(m)}
                              className="bg-white p-3 rounded-xl border border-indigo-200 shadow-2xs hover:border-indigo-500 transition-all cursor-pointer space-y-1.5"
                            >
                              <h5 className="font-extrabold text-xs text-slate-900 leading-snug line-clamp-2">
                                {m.title}
                              </h5>
                              <div className="flex items-center justify-between text-[10px] text-indigo-600 font-bold">
                                <span>{m.pagesRead}/{m.totalPages} pgs</span>
                                <span>{Math.round((m.pagesRead / (m.totalPages || 1)) * 100)}%</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Column 3: Under Review */}
                    <div className="bg-amber-50/50 rounded-2xl p-4 border border-amber-200 flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-amber-200">
                          <span className="text-xs font-black uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>3. Under Review</span>
                          </span>
                          <span className="text-[11px] font-bold bg-amber-200 text-amber-900 px-2 py-0.2 rounded-full">
                            {orderedItems.filter((m) => m.status === 'under_review').length}
                          </span>
                        </div>

                        <div className="space-y-2.5">
                          {orderedItems.filter((m) => m.status === 'under_review').map((m) => (
                            <div 
                              key={m.id}
                              onClick={() => onOpenMaterial(m)}
                              className="bg-white p-3 rounded-xl border border-amber-200 shadow-2xs hover:border-amber-500 transition-all cursor-pointer space-y-1"
                            >
                              <h5 className="font-extrabold text-xs text-slate-900 leading-snug line-clamp-2">
                                {m.title}
                              </h5>
                              <p className="text-[10px] text-amber-700 font-medium">
                                Active recall & notes review
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Column 4: Mastered */}
                    <div className="bg-emerald-50/50 rounded-2xl p-4 border border-emerald-200 flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-emerald-200">
                          <span className="text-xs font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>4. Mastered</span>
                          </span>
                          <span className="text-[11px] font-bold bg-emerald-200 text-emerald-900 px-2 py-0.2 rounded-full">
                            {orderedItems.filter((m) => m.status === 'completed').length}
                          </span>
                        </div>

                        <div className="space-y-2.5">
                          {orderedItems.filter((m) => m.status === 'completed').map((m) => (
                            <div 
                              key={m.id}
                              onClick={() => onOpenMaterial(m)}
                              className="bg-white p-3 rounded-xl border border-emerald-200/80 shadow-2xs hover:border-emerald-500 transition-all cursor-pointer space-y-1"
                            >
                              <h5 className="font-extrabold text-xs text-slate-900 leading-snug line-clamp-2">
                                {m.title}
                              </h5>
                              <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                                <Check className="w-2.5 h-2.5" />
                                <span>Completed 100%</span>
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
