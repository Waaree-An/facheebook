import React, { useState } from 'react';
import { 
  BellRing, Clock, AlertTriangle, ChevronRight, BookOpen, 
  CheckCircle2, Play, RefreshCw, Eye, Sliders, ChevronDown, 
  ChevronUp, Sparkles, X, Check, ArrowRight
} from 'lucide-react';
import { ReadingMaterial, ReadingStatus } from '../types';
import { InactivityAlertItem, formatInactiveTime } from '../utils/inactivityAlerts';

interface DashboardAlertBannerProps {
  alerts: InactivityAlertItem[];
  thresholdDays: number;
  onSetThresholdDays: (days: number) => void;
  onOpenMaterial: (material: ReadingMaterial) => void;
  onUpdateStatus: (id: string, newStatus: ReadingStatus) => void;
  onRefreshActivity: (id: string) => void;
  onStartTimer: (material: ReadingMaterial) => void;
  onFilterInactiveOnly: () => void;
  isFilteredByInactive: boolean;
}

export const DashboardAlertBanner: React.FC<DashboardAlertBannerProps> = ({
  alerts,
  thresholdDays,
  onSetThresholdDays,
  onOpenMaterial,
  onUpdateStatus,
  onRefreshActivity,
  onStartTimer,
  onFilterInactiveOnly,
  isFilteredByInactive,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [dismissedUntilReload, setDismissedUntilReload] = useState(false);

  if (dismissedUntilReload) {
    return null;
  }

  const toReadCount = alerts.filter((a) => a.material.status === 'to_read').length;
  const underReviewCount = alerts.filter((a) => a.material.status === 'under_review').length;
  const criticalCount = alerts.filter((a) => a.urgency === 'critical').length;

  if (alerts.length === 0) {
    return (
      <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-emerald-100 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-emerald-950 text-sm flex items-center gap-1.5">
              <span>All Active & Up to Date!</span>
              <span className="bg-emerald-200/60 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                0 Inactive
              </span>
            </h4>
            <p className="text-emerald-700 font-medium mt-0.5">
              None of your "To Read" or "Under Review" materials have been inactive for more than {thresholdDays} days.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-emerald-200 text-emerald-800 hover:bg-emerald-100 font-bold transition-all cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Threshold ({thresholdDays}d)</span>
          </button>
        </div>

        {showSettings && (
          <div className="w-full pt-3 border-t border-emerald-200/60 flex items-center justify-between flex-wrap gap-2">
            <span className="text-emerald-900 font-semibold">
              Adjust reminder threshold:
            </span>
            <div className="flex items-center gap-1.5">
              {[2, 3, 5, 7, 14].map((days) => (
                <button
                  key={days}
                  onClick={() => {
                    onSetThresholdDays(days);
                    setShowSettings(false);
                  }}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                    thresholdDays === days
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-white border border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                  }`}
                >
                  {days} Days
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-amber-50 via-orange-50/60 to-rose-50/40 border-2 border-amber-300/80 rounded-3xl p-4 sm:p-6 shadow-sm relative overflow-hidden transition-all">
      {/* Decorative accent background pill */}
      <div className="absolute -right-12 -top-12 w-44 h-44 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />

      <div className="flex flex-col gap-4 relative z-10">
        {/* Top Header Row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/25 shrink-0 animate-pulse">
              <BellRing className="w-5 h-5" />
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-amber-500 text-white font-black text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md shadow-2xs">
                  Review Reminder Alert
                </span>
                {criticalCount > 0 && (
                  <span className="bg-rose-100 text-rose-800 font-extrabold text-[10px] px-2 py-0.5 rounded-md border border-rose-200">
                    🔥 {criticalCount} Overdue
                  </span>
                )}
                <span className="text-xs text-amber-900/70 font-semibold">
                  Inactive for ≥ {thresholdDays} days
                </span>
              </div>

              <h3 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight mt-0.5 flex items-center gap-2">
                <span>{alerts.length} Reading {alerts.length === 1 ? 'Material Needs' : 'Materials Need'} Your Review</span>
              </h3>
            </div>
          </div>

          {/* Right Action buttons */}
          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end flex-wrap">
            <button
              onClick={onFilterInactiveOnly}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                isFilteredByInactive
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white border border-amber-300 text-amber-900 hover:bg-amber-100/70'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{isFilteredByInactive ? 'Showing Inactive Only' : `Filter Grid (${alerts.length})`}</span>
            </button>

            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-white border border-amber-300/80 text-amber-900 hover:bg-amber-100/60 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
              title="Alert Threshold Settings"
            >
              <Sliders className="w-3.5 h-3.5 text-amber-700" />
              <span className="hidden sm:inline">{thresholdDays}d Threshold</span>
            </button>

            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 rounded-xl bg-white border border-amber-300/80 text-amber-900 hover:bg-amber-100/60 text-xs font-bold flex items-center transition-all cursor-pointer"
              title={isExpanded ? 'Collapse alerts' : 'Expand alerts'}
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            <button
              onClick={() => setDismissedUntilReload(true)}
              className="p-1.5 rounded-xl text-amber-700 hover:text-amber-900 hover:bg-amber-200/50 transition-colors"
              title="Dismiss for this session"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Breakdown Stats & Context */}
        <div className="flex items-center gap-2 sm:gap-4 text-xs flex-wrap">
          <span className="text-slate-600 font-medium">
            Spaced repetition rule: Reviewing inactive materials prevents the forgetting curve!
          </span>
          <div className="flex items-center gap-2 font-bold">
            {toReadCount > 0 && (
              <span className="bg-slate-200/80 text-slate-800 px-2 py-0.5 rounded-md text-[11px]">
                📌 {toReadCount} "To Read"
              </span>
            )}
            {underReviewCount > 0 && (
              <span className="bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-md text-[11px]">
                🔍 {underReviewCount} "Under Review"
              </span>
            )}
          </div>
        </div>

        {/* Threshold Settings Panel Drawer */}
        {showSettings && (
          <div className="bg-white/90 backdrop-blur-xs rounded-2xl p-3 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-700">
                Trigger review reminder after:
              </span>
              <span className="text-slate-500 text-[11px]">
                (Materials untouched for this duration will trigger alerts)
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {[2, 3, 5, 7, 10, 14].map((days) => (
                <button
                  key={days}
                  onClick={() => {
                    onSetThresholdDays(days);
                    setShowSettings(false);
                  }}
                  className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                    thresholdDays === days
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {days}d
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Detailed Material Review Cards Carousel/List (when expanded) */}
        {isExpanded && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2 border-t border-amber-200/60">
            {alerts.map((item) => {
              const { material, daysInactive, hoursInactive, urgency } = item;
              const isUnderReview = material.status === 'under_review';

              return (
                <div
                  key={material.id}
                  className="bg-white rounded-2xl p-3.5 border border-amber-200/90 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between gap-1.5 mb-1.5">
                      <span className="bg-indigo-50 text-indigo-700 text-[10px] font-extrabold px-2 py-0.5 rounded-md border border-indigo-100 truncate max-w-[120px]">
                        {material.subject}
                      </span>
                      
                      <div className="flex items-center gap-1">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 ${
                          urgency === 'critical'
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}>
                          <Clock className="w-3 h-3" />
                          <span>{daysInactive}d inactive</span>
                        </span>
                      </div>
                    </div>

                    <h4 
                      onClick={() => onOpenMaterial(material)}
                      className="font-extrabold text-sm text-slate-900 group-hover:text-indigo-600 line-clamp-1 cursor-pointer transition-colors"
                      title={material.title}
                    >
                      {material.title}
                    </h4>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1 mb-2.5">
                      <span>
                        Status: <strong className="text-slate-700">{isUnderReview ? 'Under Review' : 'To Read'}</strong>
                      </span>
                      <span>
                        Progress: <strong className="font-mono text-indigo-700">{material.pagesRead}/{material.totalPages} pgs</strong>
                      </span>
                    </div>
                  </div>

                  {/* Action Quick-Buttons for the material */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5 flex-wrap">
                    <button
                      onClick={() => onOpenMaterial(material)}
                      className="flex-1 min-w-[70px] py-1.5 px-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] flex items-center justify-center gap-1 transition-all cursor-pointer"
                      title="Open full reader view"
                    >
                      <BookOpen className="w-3 h-3" />
                      <span>Review</span>
                    </button>

                    <button
                      onClick={() => onStartTimer(material)}
                      className="py-1.5 px-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer"
                      title="Launch 25m Focus Sprint"
                    >
                      <Play className="w-3 h-3 text-amber-700 fill-amber-700" />
                      <span>Sprint</span>
                    </button>

                    <button
                      onClick={() => onUpdateStatus(material.id, 'reading')}
                      className="py-1.5 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer"
                      title="Move status to In Progress"
                    >
                      <Sparkles className="w-3 h-3 text-indigo-500" />
                      <span>Read</span>
                    </button>

                    <button
                      onClick={() => onRefreshActivity(material.id)}
                      className="py-1.5 px-2 rounded-xl bg-slate-100 hover:bg-emerald-100 text-slate-600 hover:text-emerald-800 font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer"
                      title="Mark as refreshed (resets inactivity timer to today)"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span className="hidden sm:inline">Reset</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
