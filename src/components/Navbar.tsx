import React, { useEffect, useRef, useState } from 'react';
import {
  House,
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
  Settings,
  ChevronDown,
  UserRound,
  UsersRound,
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
  isNavigationHidden: boolean;
  onRevealNavigation: () => void;
  materials: ReadingMaterial[];
  currentTab: 'home' | 'materials' | 'roadmap' | 'tips' | 'community' | 'flashcards' | 'about';
  onSelectTab: (
    tab: 'home' | 'materials' | 'roadmap' | 'tips' | 'community' | 'flashcards' | 'about'
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
  onOpenSettings: () => void;
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
  isNavigationHidden,
  onRevealNavigation,
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
  onOpenSettings,
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
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    if (!isAccountMenuOpen) return;
    const closeOnPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !accountMenuRef.current?.contains(event.target)) {
        setIsAccountMenuOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsAccountMenuOpen(false);
    };
    document.addEventListener('pointerdown', closeOnPointerDown);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnPointerDown);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isAccountMenuOpen]);

  const navItems = [
    { id: 'home' as const, label: 'Home', icon: House },
    { id: 'materials' as const, label: 'Library', icon: BookOpen },
    { id: 'roadmap' as const, label: 'Progress', icon: Route },
    { id: 'tips' as const, label: 'Tips', icon: Lightbulb },
    { id: 'community' as const, label: 'Peers', icon: UsersRound },
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

  const renderTimerButton = () => (
    <button
      type="button"
      onClick={onOpenTimerModal}
      title="Open study timer"
      aria-label={`Study timer ${formattedTime}`}
      className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 ${
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
    <header
      onFocusCapture={onRevealNavigation}
      className="sticky top-0 z-30 w-full border-b border-slate-300 bg-white shadow-md"
    >
      <div className="mx-auto max-w-7xl px-3 sm:px-5 lg:px-8">
        {/* Brand and quick actions */}
        <div className="flex min-h-[68px] items-center justify-between gap-3 py-2.5 max-[380px]:gap-2">
          <button
            type="button"
            onClick={() => onSelectTab('home')}
            className="min-w-0 rounded-xl text-left transition-opacity hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            aria-label="FacheeBook home"
          >
            <FacheeBookLogo
              markClassName="h-10 w-10 rounded-xl max-[380px]:h-9 max-[380px]:w-9"
              className="gap-2.5 sm:gap-3 max-[380px]:gap-1.5"
            />
          </button>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2 max-[380px]:gap-1">

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

            <div className="relative" ref={accountMenuRef}>
              <button
                type="button"
                onClick={() => setIsAccountMenuOpen((open) => !open)}
                aria-expanded={isAccountMenuOpen}
                aria-controls="account-settings-menu"
                aria-label="Account and settings"
                title="Account and settings"
                className="inline-flex h-10 items-center justify-center gap-1 rounded-xl border border-slate-300 bg-white px-1.5 text-slate-800 transition-colors hover:border-amber-400 hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 sm:px-2"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#332D1D] text-xs font-bold text-amber-300">
                  {studentProfile?.firstName?.[0]?.toUpperCase() || accountEmail[0]?.toUpperCase() || 'S'}
                  {studentProfile?.lastName?.[0]?.toUpperCase() || ''}
                </span>
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isAccountMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              {isAccountMenuOpen && (
                <div
                  id="account-settings-menu"
                  aria-label="Account and settings"
                  className="absolute right-0 top-full z-50 mt-2 w-[min(18rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-slate-700 bg-[#111619] p-2 text-slate-100 shadow-2xl"
                >
                  <div className="mb-1 flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800/60 px-2.5 py-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#332D1D] text-sm font-bold text-amber-300">
                      {studentProfile?.firstName?.[0]?.toUpperCase() || accountEmail[0]?.toUpperCase() || 'S'}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-slate-100">
                        {studentProfile?.firstName
                          ? `${studentProfile.firstName} ${studentProfile.lastName || ''}`.trim()
                          : isAuthenticated ? accountEmail : 'Student profile'}
                      </span>
                      <span className="mt-1 flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
                        <span className={`h-1.5 w-1.5 rounded-full ${isAuthenticated ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                        {isAuthenticated ? 'Student account' : 'Local profile'}
                      </span>
                    </span>
                  </div>
                  <p className="px-3 pb-1 pt-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500">Account</p>
                  <button
                    type="button"
                    onClick={() => { setIsAccountMenuOpen(false); onOpenRegistrationModal(); }}
                    className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm text-slate-200 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                  >
                    <UserRound className="h-4 w-4 text-amber-300" /> My profile
                  </button>
                  <button
                    type="button"
                    onClick={() => { setIsAccountMenuOpen(false); onOpenSettings(); }}
                    className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm text-slate-200 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                  >
                    <Settings className="h-4 w-4 text-amber-300" /> Settings
                  </button>
                  <button
                    type="button"
                    onClick={() => { setIsAccountMenuOpen(false); onOpenExportModal(); }}
                    className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm text-slate-200 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                  >
                    <Download className="h-4 w-4 text-amber-300" /> My study data & backup
                  </button>
                  {(studentProfile || isAuthenticated) && (
                    <>
                      <div className="mx-2 my-2 border-t border-slate-700" />
                      <p className="px-3 pb-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500">Session</p>
                      <button
                        type="button"
                        onClick={() => { void onSignOut().then(() => setIsAccountMenuOpen(false)); }}
                        disabled={isSigningOut}
                        aria-busy={isSigningOut}
                        className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm text-rose-300 hover:bg-rose-950/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 disabled:cursor-wait disabled:opacity-60"
                      >
                        {isSigningOut
                          ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-rose-300/30 border-t-rose-300" />
                          : <LogOut className="h-4 w-4" />}
                        {isSigningOut ? 'Signing out…' : isAuthenticated ? 'Sign out' : 'Clear student profile'}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Primary action */}
            <button
              type="button"
              onClick={onOpenAddModal}
              className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-blue-700 px-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 sm:px-4 max-[380px]:h-8 max-[380px]:gap-1 max-[380px]:px-2 max-[380px]:text-xs"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add material</span>
              <span className="sm:hidden max-[380px]:hidden">Add</span>
            </button>
          </div>
        </div>

        {/* Primary navigation */}
        <nav
          aria-label="Main navigation"
          className={`fb-primary-nav -mx-1 flex items-center gap-1 overflow-x-auto overflow-y-hidden scrollbar-none transition-[opacity,transform] duration-200 motion-reduce:transition-none ${
            isNavigationHidden
              ? 'pointer-events-none max-h-0 -translate-y-2 border-transparent py-0 opacity-0'
              : 'max-h-16 translate-y-0 border-t border-slate-200 py-2 opacity-100'
          }`}
        >
          {navItems.map(({ id, label, icon: Icon }) => {
            const active = currentTab === id;

            return (
              <button
                key={id}
                type="button"
                onClick={() => onSelectTab(id)}
                aria-current={active ? 'page' : undefined}
                aria-label={label}
                title={id === 'community' ? label : undefined}
                className={`fb-primary-nav-button relative ${id === 'about' ? 'hidden sm:inline-flex' : 'inline-flex'} min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border px-3 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 sm:px-4 sm:text-sm ${
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

                <span className="fb-primary-nav-label">{label}</span>

                {id === 'materials' && (
                  <span
                    className={`min-w-5 rounded-full px-1.5 py-0.5 text-center text-[10px] font-bold max-[480px]:hidden ${
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
        </nav>
      </div>
    </header>
  );
};