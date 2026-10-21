import React, { useState, useRef, useEffect } from 'react';
import { 
  Bell, BellRing, Clock, AlertTriangle, CheckCircle2, 
  ExternalLink, Play, RefreshCw, Sliders, Volume2, ShieldCheck, Sparkles, X
} from 'lucide-react';
import { ReadingMaterial, ReadingStatus } from '../types';
import { InactivityAlertItem, sendDesktopAlert } from '../utils/inactivityAlerts';

interface NotificationDropdownProps {
  alerts: InactivityAlertItem[];
  thresholdDays: number;
  onSetThresholdDays: (days: number) => void;
  onOpenMaterial: (material: ReadingMaterial) => void;
  onRefreshActivity: (id: string) => void;
  onRefreshAllActivities: () => void;
  onStartTimer: (material: ReadingMaterial) => void;
  onUpdateStatus: (id: string, newStatus: ReadingStatus) => void;
  onSimulateInactivity?: () => void;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  alerts,
  thresholdDays,
  onSetThresholdDays,
  onOpenMaterial,
  onRefreshActivity,
  onRefreshAllActivities,
  onStartTimer,
  onUpdateStatus,
  onSimulateInactivity,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [hasRequestedPermission, setHasRequestedPermission] = useState(false);
  const [desktopEnabled, setDesktopEnabled] = useState(
    typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted'
  );
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleEnableDesktopAlerts = async () => {
    if (!('Notification' in window)) {
      alert('Desktop notifications are not supported in this browser window.');
      return;
    }
    const permission = await Notification.requestPermission();
    setHasRequestedPermission(true);
    if (permission === 'granted') {
      setDesktopEnabled(true);
      sendDesktopAlert(
        'FacheeBook review alerts enabled!',
        `You will be notified when reading materials have been inactive for ${thresholdDays} days.`
      );
    }
  };

  const alertCount = alerts.length;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-xl transition-all border cursor-pointer ${
          alertCount > 0
            ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100 shadow-2xs'
            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
        }`}
        title={alertCount > 0 ? `${alertCount} materials need review` : 'Review Notifications'}
      >
        {alertCount > 0 ? (
          <BellRing className="w-4 h-4 text-amber-600 animate-bounce" />
        ) : (
          <Bell className="w-4 h-4 text-slate-500" />
        )}

        {/* Badge counter */}
        {alertCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-600 text-white font-black text-[10px] rounded-full flex items-center justify-center border-2 border-white shadow-xs">
            {alertCount > 9 ? '9+' : alertCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-3xl shadow-xl border border-slate-200 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="px-4 py-3 bg-slate-50/90 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold text-xs">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
                  <span>Review Reminders</span>
                  {alertCount > 0 && (
                    <span className="bg-amber-100 text-amber-900 text-[10px] font-black px-1.5 py-0.2 rounded-full border border-amber-300">
                      {alertCount} Due
                    </span>
                  )}
                </h4>
                <p className="text-[10px] text-slate-500 font-medium">
                  Untouched for ≥ {thresholdDays} days
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`p-1.5 rounded-lg text-slate-500 hover:text-slate-800 transition-colors ${
                  showSettings ? 'bg-slate-200 text-slate-900' : 'hover:bg-slate-200/60'
                }`}
                title="Configure reminder threshold"
              >
                <Sliders className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Threshold Config Slider Drawer (if opened) */}
          {showSettings && (
            <div className="p-3 bg-indigo-50/70 border-b border-indigo-100 text-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-indigo-950">Inactivity Trigger:</span>
                <span className="font-extrabold text-indigo-700 font-mono">{thresholdDays} Days</span>
              </div>
              <div className="flex items-center gap-1 justify-between">
                {[1, 2, 3, 5, 7, 14].map((d) => (
                  <button
                    key={d}
                    onClick={() => onSetThresholdDays(d)}
                    className={`flex-1 py-1 text-[11px] font-bold rounded-lg transition-all ${
                      thresholdDays === d
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'bg-white border border-indigo-200 text-indigo-900 hover:bg-indigo-100'
                    }`}
                  >
                    {d}d
                  </button>
                ))}
              </div>

              {/* Desktop notification trigger */}
              <div className="mt-3 pt-2.5 border-t border-indigo-200/60 flex items-center justify-between">
                <span className="text-[11px] text-indigo-900 font-medium">
                  Browser Notifications:
                </span>
                {desktopEnabled ? (
                  <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Enabled
                  </span>
                ) : (
                  <button
                    onClick={handleEnableDesktopAlerts}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-white px-2 py-0.5 rounded-md border border-indigo-200 hover:bg-indigo-50 transition-colors"
                  >
                    Turn On
                  </button>
                )}
              </div>
            </div>
          )}

          {/* List of Alerts */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {alertCount === 0 ? (
              <div className="p-6 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <h5 className="font-bold text-xs text-slate-800">You're completely up to date!</h5>
                <p className="text-[11px] text-slate-400 max-w-[240px] mx-auto">
                  No materials marked "To Read" or "Under Review" have been inactive for {thresholdDays}+ days.
                </p>
                {onSimulateInactivity && (
                  <button
                    onClick={onSimulateInactivity}
                    className="mt-2 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
                  >
                    Set Threshold to 1 Day (Test Alerts)
                  </button>
                )}
              </div>
            ) : (
              alerts.map((item) => {
                const { material, daysInactive, urgency } = item;
                const isUnderReview = material.status === 'under_review';

                return (
                  <div 
                    key={material.id}
                    className="p-3.5 hover:bg-slate-50/80 transition-colors space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5 flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-[9px] font-black px-1.5 py-0.2 rounded-md ${
                            isUnderReview 
                              ? 'bg-amber-100 text-amber-900 border border-amber-300' 
                              : 'bg-slate-100 text-slate-700 border border-slate-300'
                          }`}>
                            {isUnderReview ? 'Under Review' : 'To Read'}
                          </span>
                          <span className="text-[10px] text-indigo-600 font-bold truncate">
                            {material.subject}
                          </span>
                        </div>

                        <h5 
                          onClick={() => {
                            onOpenMaterial(material);
                            setIsOpen(false);
                          }}
                          className="font-bold text-xs text-slate-900 hover:text-indigo-600 cursor-pointer truncate"
                          title={material.title}
                        >
                          {material.title}
                        </h5>

                        <div className="flex items-center gap-2 text-[10px] text-slate-500">
                          <span className="flex items-center gap-1 text-amber-700 font-bold">
                            <Clock className="w-3 h-3" />
                            {daysInactive} days inactive
                          </span>
                          <span>•</span>
                          <span>{material.pagesRead}/{material.totalPages} pgs</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Bar for this item */}
                    <div className="flex items-center gap-1.5 pt-1">
                      <button
                        onClick={() => {
                          onOpenMaterial(material);
                          setIsOpen(false);
                        }}
                        className="flex-1 py-1 px-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] text-center transition-colors"
                      >
                        Review Now
                      </button>

                      <button
                        onClick={() => {
                          onStartTimer(material);
                          setIsOpen(false);
                        }}
                        className="py-1 px-2 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-[10px] flex items-center gap-1 transition-colors"
                        title="Start 25m Focus Sprint"
                      >
                        <Play className="w-2.5 h-2.5 fill-amber-800 text-amber-800" />
                        <span>Sprint</span>
                      </button>

                      <button
                        onClick={() => {
                          onUpdateStatus(material.id, 'reading');
                        }}
                        className="py-1 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] transition-colors"
                        title="Mark as in progress"
                      >
                        Mark Reading
                      </button>

                      <button
                        onClick={() => onRefreshActivity(material.id)}
                        className="p-1 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                        title="Mark as refreshed (resets inactivity timer)"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer with Reset All Actions */}
          {alertCount > 0 && (
            <div className="p-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
              <button
                onClick={onRefreshAllActivities}
                className="text-[11px] font-bold text-slate-600 hover:text-indigo-600 flex items-center gap-1 transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Mark all as refreshed</span>
              </button>

              <span className="text-[10px] text-slate-400 font-medium">
                Active recall schedule
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
