import React from 'react';
import {
  GraduationCap,
  BookOpen,
  Plus,
  Lightbulb,
  Layers,
  Clock,
  Download,
  CheckCircle2,
  Flame,
  Heart,
  Route,
  LogOut,
} from 'lucide-react';

import {
  ReadingMaterial,
  ReadingStatus,
  StudentProfile,
} from '../types';
import { InactivityAlertItem } from '../utils/inactivityAlerts';
import { NotificationDropdown } from './NotificationDropdown';
import { FacheeBookLogo } from './FacheeBookLogo';

interface NavbarProps {
  materials: ReadingMaterial[];
  currentTab: 'materials' | 'roadmap' | 'tips' | 'flashcards' | 'about';
  onSelectTab: (
    tab: 'materials' | 'roadmap' | 'tips' | 'flashcards' | 'about'
  ) => void;
  onOpenAddModal: () => void;
  onOpenTimerModal: () => void;
  onOpenExportModal: () => void;
  timerActive: boolean;
  timerSecondsRemaining: number;
  studentProfile: StudentProfile | null;
  accountEmail: string;
  isAuthenticated: boolean;
  isSigningOut: boolean;
  onOpenRegistrationModal: () => void;
  onSignOut: () => Promise<void>;
  alerts: InactivityAlertItem[];
  thresholdDays: number;
  onSetThresholdDays: (days: number) => void;
  onOpenMaterial: (material: ReadingMaterial) => void;
  onRefreshActivity: (id: string) => void;
  onRefreshAllActivities: () => void;
  onStartTimerForMaterial: (material: ReadingMaterial) => void;
  onUpdateStatus: (id: string, newStatus: ReadingStatus) => void;
  onSimulateInactivity?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  materials,
  currentTab,
  onSelectTab,
  onOpenAddModal,
  onOpenTimerModal,
  onOpenExportModal,
  timerActive,
  timerSecondsRemaining,
  studentProfile,
  accountEmail,
  isAuthenticated,
  isSigningOut,
  onOpenRegistrationModal,
  onSignOut,
  alerts,
  thresholdDays,
  onSetThresholdDays,
  onOpenMaterial,
  onRefreshActivity,
  onRefreshAllActivities,
  onStartTimerForMaterial,
  onUpdateStatus,
  onSimulateInactivity,
}) => {
  const totalMaterials = materials.length;

  const totalPagesRead = materials.reduce(
    (sum, material) => sum + (material.pagesRead || 0),
    0
  );

  const totalPages = materials.reduce(
    (sum, material) => sum + (material.totalPages || 0),
    0
  );

  const completionPercent =
    totalPages > 0
      ? Math.min(100, Math.round((totalPagesRead / totalPages) * 100))
      : 0;

  const formattedTime = `${Math.floor(timerSecondsRemaining / 60)
    .toString()
    .padStart(2, '0')}:${(timerSecondsRemaining % 60)
    .toString()
    .padStart(2, '0')}`;

  const navItems = [
    { id: 'materials' as const, label: 'Library', icon: BookOpen },
    { id: 'roadmap' as const, label: 'Progress', icon: Route },
    { id: 'tips' as const, label: 'Tips', icon: Lightbulb },
    { id: 'flashcards' as const, label: 'Cards', icon: Layers },
    { id: 'about' as const, label: 'About', icon: Heart },
  ];

  const renderNotifications = () => (
    <NotificationDropdown
      alerts={alerts}
      thresholdDays={thresholdDays}
      onSetThresholdDays={onSetThresholdDays}
      onOpenMaterial={onOpenMaterial}
      onRefreshActivity={onRefreshActivity}
      onRefreshAllActivities={onRefreshAllActivities}
      onStartTimer={onStartTimerForMaterial}
      onUpdateStatus={onUpdateStatus}
      onSimulateInactivity={onSimulateInactivity}
    />
  );

  const renderTimerButton = (mobile = false) => (
    <button
      type="button"
      onClick={onOpenTimerModal}
      title="Open study timer"
      aria-label={`Study timer ${formattedTime}`}
      className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 ${
        mobile ? 'px-2.5 py-2 text-xs' : 'px-3 py-2 text-sm'
      } ${
        timerActive
          ? 'border-blue-300 bg-blue-100 text-blue-950'
          : 'border-slate-300 bg-white text-slate-800 hover:border-blue-400 hover:bg-blue-50'
      }`}
    >
      <Clock
        className={`h-4 w-4 ${
          timerActive ? 'text-blue-800' : 'text-slate-700'
        }`}
      />
      <span>{formattedTime}</span>
    </button>
  );

  return (
    <header className="sticky top-0 z-30 w-full border-b border-slate-300 bg-white shadow-md">
      <div className="mx-auto max-w-7xl px-3 sm:px-5 lg:px-8">
        {/* Brand and quick actions */}
        <div className="flex min-h-[68px] items-center justify-between gap-3 py-2.5">
          <button
            type="button"
            onClick={() => onSelectTab('materials')}
            className="min-w-0 rounded-xl text-left transition-opacity hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            aria-label="FacheeBook home"
          >
            <FacheeBookLogo
              markClassName="h-10 w-10 rounded-xl"
              className="gap-2.5 sm:gap-3"
            />
          </button>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {/* Mobile and tablet profile */}
            <button
              type="button"
              onClick={onOpenRegistrationModal}
              title={
                studentProfile
                  ? `${studentProfile.firstName} ${studentProfile.lastName}`
                  : 'Set up your student profile'
              }
              aria-label="Student profile"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-800 transition-colors hover:border-blue-400 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 md:hidden"
            >
              {studentProfile || isAuthenticated ? (
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#071A3A] text-xs font-bold text-white">
                  {studentProfile?.firstName?.[0]?.toUpperCase() || accountEmail[0]?.toUpperCase() || 'S'}
                </span>
              ) : (
                <GraduationCap className="h-5 w-5 text-blue-800" />
              )}
            </button>

            {/* Desktop quick stats */}
            <div className="hidden items-center gap-3 rounded-xl border border-slate-300 bg-slate-100 px-3 py-2 lg:flex">
              <div className="flex items-center gap-1.5 text-sm">
                <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                <span className="font-bold text-slate-900">
                  {totalPagesRead}
                </span>
                <span className="font-medium text-slate-700">
                  / {totalPages} pages
                </span>
              </div>

              <div className="h-5 w-px bg-slate-300" />

              <div className="flex items-center gap-1.5 text-sm">
                <Flame className="h-4 w-4 text-blue-700" />
                <span className="font-bold text-slate-800">
                  {completionPercent}%
                </span>
              </div>
            </div>

            {renderNotifications()}

            <div className="hidden sm:block">{renderTimerButton()}</div>

            {/* Desktop export */}
            <button
              type="button"
              onClick={onOpenExportModal}
              title="Export or back up your library"
              aria-label="Export or back up library"
              className="hidden h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-800 transition-colors hover:border-blue-400 hover:bg-blue-50 hover:text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 sm:flex"
            >
              <Download className="h-4 w-4" />
            </button>

            {/* Desktop profile */}
            {studentProfile || isAuthenticated ? (
              <button
                type="button"
                onClick={onOpenRegistrationModal}
                title="View or edit student profile"
                className="hidden items-center gap-2 rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-left transition-colors hover:border-blue-400 hover:bg-blue-50 md:flex"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#071A3A] text-xs font-bold text-white">
                  {studentProfile?.firstName?.[0]?.toUpperCase() || accountEmail[0]?.toUpperCase() || 'S'}
                  {studentProfile?.lastName?.[0]?.toUpperCase() || ''}
                </span>

                <span className="max-w-[105px]">
                  <span className="block truncate text-xs font-bold text-slate-900">
                    {studentProfile
                      ? `${studentProfile.firstName} ${studentProfile.lastName ? `${studentProfile.lastName[0]}.` : ''}`
                      : accountEmail}
                  </span>
                  <span className="block truncate text-[10px] font-medium text-slate-700">
                    {studentProfile
                      ? studentProfile.educationLevel === 'university'
                        ? studentProfile.universityYear?.split(' ')[0] || 'University'
                        : studentProfile.highSchoolGrade?.split(' ')[0] || 'Student'
                      : 'Signed in'}
                  </span>
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenRegistrationModal}
                className="hidden items-center gap-1.5 rounded-xl border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-bold text-blue-950 transition-colors hover:bg-blue-200 md:flex"
              >
                <GraduationCap className="h-4 w-4" />
                Register
              </button>
            )}

            {/* Signing out clears the account/profile session but keeps study data on this device. */}
            {(studentProfile || isAuthenticated) && (
              <button
                type="button"
                onClick={() => { void onSignOut(); }}
                disabled={isSigningOut}
                title={isSigningOut ? 'Signing out…' : isAuthenticated ? 'Sign out of your account' : 'Clear student profile'}
                aria-label={isSigningOut ? 'Signing out' : isAuthenticated ? 'Sign out of your account' : 'Clear student profile'}
                aria-busy={isSigningOut}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 transition-colors hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
              >
                {isSigningOut
                  ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-500/30 border-t-slate-700" />
                  : <LogOut className="h-4 w-4" />}
              </button>
            )}

            {/* Primary action */}
            <button
              type="button"
              onClick={onOpenAddModal}
              className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-blue-700 px-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 sm:px-4"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add material</span>
              <span className="sm:hidden">Add</span>
            </button>
          </div>
        </div>

        {/* Primary navigation */}
        <nav
          aria-label="Main navigation"
          className="-mx-1 flex items-center gap-1 overflow-x-auto border-t border-slate-200 py-2 scrollbar-none"
        >
          {navItems.map(({ id, label, icon: Icon }) => {
            const active = currentTab === id;

            return (
              <button
                key={id}
                type="button"
                onClick={() => onSelectTab(id)}
                aria-current={active ? 'page' : undefined}
                className={`relative inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border px-3 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 sm:px-4 sm:text-sm ${
                  active
                    ? 'border-blue-300 bg-blue-100 text-blue-950 shadow-sm'
                    : 'border-transparent text-slate-700 hover:border-slate-300 hover:bg-slate-100 hover:text-slate-950'
                }`}
              >
                <Icon
                  className={`h-4 w-4 ${
                    active ? 'text-blue-800' : 'text-slate-700'
                  }`}
                />

                <span>{label}</span>

                {id === 'materials' && (
                  <span
                    className={`min-w-5 rounded-full px-1.5 py-0.5 text-center text-[10px] font-bold ${
                      active
                        ? 'bg-blue-700 text-white'
                        : 'bg-slate-200 text-slate-800'
                    }`}
                  >
                    {totalMaterials}
                  </span>
                )}
              </button>
            );
          })}

          {/* Compact timer for narrow screens */}
          <div className="ml-auto shrink-0 sm:hidden">
            {renderTimerButton(true)}
          </div>
        </nav>
      </div>
    </header>
  );
};