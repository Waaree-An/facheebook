import React, { useEffect } from 'react';
import {
  X, Play, Pause, RotateCcw, Clock, Coffee, Flame, Bell, BellOff,
  CheckCircle2, AlertCircle,
} from 'lucide-react';

interface StudyTimerModalProps {
  isOpen: boolean;
  onClose: () => void;
  timerActive: boolean;
  timerSecondsRemaining: number;
  timerMode: 'focus' | 'break';
  completedPomodoros: number;
  onToggleTimer: () => void;
  onResetTimer: () => void;
  onSetMode: (mode: 'focus' | 'break') => void;
  notificationPermission: NotificationPermission | 'unsupported';
  onEnableNotifications: () => void;
}

export const StudyTimerModal: React.FC<StudyTimerModalProps> = ({
  isOpen,
  onClose,
  timerActive,
  timerSecondsRemaining,
  timerMode,
  completedPomodoros,
  onToggleTimer,
  onResetTimer,
  onSetMode,
  notificationPermission,
  onEnableNotifications,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const totalTime = timerMode === 'focus' ? 25 * 60 : 5 * 60;
  const safeRemaining = Math.max(0, Math.min(totalTime, timerSecondsRemaining));
  const minutes = Math.floor(safeRemaining / 60);
  const seconds = safeRemaining % 60;
  const formatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  const progressPercent = Math.max(0, Math.min(100, Math.round(((totalTime - safeRemaining) / totalTime) * 100)));
  const isFocus = timerMode === 'focus';
  const notificationsAvailable = notificationPermission !== 'unsupported';

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="study-timer-title"
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-5 sm:p-7 text-center space-y-5 max-h-[92dvh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150"
      >
        <header className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4 text-left">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-10 h-10 shrink-0 rounded-2xl flex items-center justify-center ${isFocus ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
              <Clock className="w-5 h-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2 id="study-timer-title" className="font-extrabold text-base text-slate-900">Study sprint timer</h2>
              <p className="text-xs text-slate-500 mt-0.5">Focus with intention. Rest with purpose.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close study timer"
            className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1.5" aria-label="Timer mode">
          <button
            type="button"
            aria-pressed={isFocus}
            onClick={() => onSetMode('focus')}
            className={`min-h-12 px-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${isFocus ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <Flame className="w-4 h-4 text-amber-500" /> Focus · 25 min
          </button>
          <button
            type="button"
            aria-pressed={!isFocus}
            onClick={() => onSetMode('break')}
            className={`min-h-12 px-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${!isFocus ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <Coffee className="w-4 h-4 text-emerald-500" /> Break · 5 min
          </button>
        </div>

        <div className={`rounded-3xl px-4 py-6 sm:py-7 ${isFocus ? 'bg-indigo-50/80' : 'bg-emerald-50/80'}`}>
          <div className={`text-6xl sm:text-7xl font-black tracking-tight tabular-nums font-mono ${isFocus ? 'text-indigo-950' : 'text-emerald-950'}`} role="timer" aria-label={`${minutes} minutes and ${seconds} seconds remaining`}>
            {formatted}
          </div>
          <p className="text-sm text-slate-600 font-medium mt-3">
            {timerActive ? (isFocus ? 'You’re in a focus session. Keep going.' : 'Take a breath. Your break is underway.') : (isFocus ? 'Ready for a focused study session?' : 'Take a short reset before the next sprint.')}
          </p>
          <div
            className="mt-5 w-full h-2.5 bg-white/90 rounded-full overflow-hidden"
            role="progressbar"
            aria-label="Timer progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progressPercent}
          >
            <div className={`h-full rounded-full transition-[width] duration-300 ${isFocus ? 'bg-indigo-600' : 'bg-emerald-500'}`} style={{ width: `${progressPercent}%` }} />
          </div>
          <div className="mt-2 flex justify-between text-[11px] text-slate-500 font-semibold">
            <span>{progressPercent}% complete</span>
            <span>{timerActive ? 'Timer running' : 'Timer paused'}</span>
          </div>
        </div>

        <div className="grid grid-cols-[1fr_auto] gap-3">
          <button
            type="button"
            onClick={onToggleTimer}
            className={`min-h-14 flex items-center justify-center gap-2.5 px-5 rounded-2xl text-sm font-extrabold text-white shadow-md active:scale-[0.99] transition-all focus-visible:outline-none focus-visible:ring-4 ${timerActive ? 'bg-amber-600 hover:bg-amber-700 focus-visible:ring-amber-200' : 'bg-indigo-600 hover:bg-indigo-700 focus-visible:ring-indigo-200'}`}
          >
            {timerActive ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
            {timerActive ? 'Pause session' : (safeRemaining === totalTime ? 'Start session' : 'Resume session')}
          </button>
          <button
            type="button"
            onClick={onResetTimer}
            aria-label="Reset timer"
            title="Reset timer"
            className="min-w-14 min-h-14 flex items-center justify-center rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>

        <div className="rounded-2xl border border-slate-200 p-3.5 flex items-center justify-between gap-3 text-left">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 shrink-0 rounded-xl bg-amber-50 flex items-center justify-center text-amber-700 text-lg" aria-hidden="true">🍅</div>
            <div>
              <p className="text-sm font-bold text-slate-800">Focus sprints completed</p>
              <p className="text-xs text-slate-500">Today on this device</p>
            </div>
          </div>
          <span className="text-2xl font-black tabular-nums text-slate-900">{completedPomodoros}</span>
        </div>

        <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3.5 text-left">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 text-slate-500">
              {notificationPermission === 'granted' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : notificationPermission === 'denied' ? <BellOff className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-800">Session completion alerts</p>
              <p className="text-xs text-slate-500 mt-1">
                {notificationPermission === 'granted' ? 'Notifications are enabled. You’ll get an alert when a session ends.' : notificationPermission === 'denied' ? 'Notifications are blocked by your browser. You can change this in site settings.' : notificationPermission === 'unsupported' ? 'This browser does not support desktop notifications. The timer will still show in-app feedback.' : 'Enable notifications to be alerted when a focus or break session ends.'}
              </p>
              {notificationsAvailable && notificationPermission !== 'granted' && notificationPermission !== 'denied' && (
                <button type="button" onClick={onEnableNotifications} className="mt-3 min-h-10 px-3.5 rounded-xl bg-white border border-slate-300 text-slate-800 text-xs font-bold hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
                  Enable notifications
                </button>
              )}
              {notificationPermission === 'denied' && <p className="mt-2 flex items-start gap-1.5 text-[11px] text-amber-800"><AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> Browser permission must be changed in site settings.</p>}
            </div>
          </div>
        </div>
        <p className="text-[11px] leading-relaxed text-slate-400">The timer continues to track elapsed time while this tab is in the background. Keep the app open for the most reliable alerts.</p>
      </section>
    </div>
  );
};
