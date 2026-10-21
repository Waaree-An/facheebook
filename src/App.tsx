import React, { lazy, Suspense, useState, useEffect, useRef, useCallback } from 'react';
import { ReadingMaterial, StudyTip, ReadingStatus, StudentProfile, UserStats, Badge, UserGamification } from './types';

/** Optional counter increments applied alongside an XP award. */
interface GamificationStatDelta {
  flashcardsReviewed?: number;
  quizzesTaken?: number;
  materialsCompleted?: number;
  studyMinutes?: number;
}
import { INITIAL_READING_MATERIALS, INITIAL_STUDY_TIPS } from './utils/initialData';
import { loadMaterialsFromDB, saveMaterialsToDB, loadTipsFromDB, saveTipsToDB } from './utils/storage';
import { Navbar } from './components/Navbar';
import { MaterialCard } from './components/MaterialCard';
import { DashboardAlertBanner } from './components/DashboardAlertBanner';
import { DailyStudyGoalTracker } from './components/DailyStudyGoalTracker';
import { DailyStudyGoal } from './types';
import { loadDailyGoal, saveDailyGoal, getYesterdayDateString, isGoalAchieved } from './utils/dailyGoals';
import { 
  getInactiveMaterials, 
  DEFAULT_INACTIVITY_THRESHOLD_DAYS, 
  sendDesktopAlert 
} from './utils/inactivityAlerts';
import { 
  Search, Filter, Plus, BookOpen, Layers, Lightbulb, X, Target, Library,
  Sparkles, CheckCircle2, Image, Video, FileText, Link2, 
  Flame, Clock, ArrowUpDown, BellRing, Bell, AlertTriangle,
  Heart, Youtube, Facebook, ExternalLink, Route, Trophy, Zap, ZapIcon, Timer, CalendarDays, Award
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { GamificationDisplay } from './components/GamificationDisplay';
import { QuizGenerator } from './components/QuizGenerator';
import { StudyCalendar } from './components/StudyCalendar';
import type { StudyCalendarEvent } from './types';
import { useFacheeAuth } from './lib/AuthGate';
import { supabase } from './lib/supabase';
import { recordStudyDeletion, syncStudyCollection } from './utils/cloudStudySync';
import { 
  createDefaultGamification, 
  addXP, 
  checkNewBadges, 
  registerStudyActivity,
  xpForMaterialCompletion,
} from './utils/gamification';

const MaterialModal = lazy(() => import('./components/MaterialModal').then((module) => ({ default: module.MaterialModal })));
const MaterialDetailView = lazy(() => import('./components/MaterialDetailView').then((module) => ({ default: module.MaterialDetailView })));
const StudyTipsHub = lazy(() => import('./components/StudyTipsHub').then((module) => ({ default: module.StudyTipsHub })));
const FlashcardsModal = lazy(() => import('./components/FlashcardsModal').then((module) => ({ default: module.FlashcardsModal })));
const StudyTimerModal = lazy(() => import('./components/StudyTimerModal').then((module) => ({ default: module.StudyTimerModal })));
const ShareModal = lazy(() => import('./components/ShareModal').then((module) => ({ default: module.ShareModal })));
const AboutSection = lazy(() => import('./components/AboutSection').then((module) => ({ default: module.AboutSection })));
const StudyRoadmap = lazy(() => import('./components/StudyRoadmap').then((module) => ({ default: module.StudyRoadmap })));
const StudentRegistrationModal = lazy(() => import('./components/StudentRegistrationModal').then((module) => ({ default: module.StudentRegistrationModal })));

export default function App() {
  const { session, signOut } = useFacheeAuth();
  const loadingFallback = (
    <div role="status" className="flex min-h-32 items-center justify-center text-sm font-semibold text-slate-500">
      Loading study tools…
    </div>
  );
  // Core State
  const [materials, setMaterials] = useState<ReadingMaterial[]>(INITIAL_READING_MATERIALS);
  const [tips, setTips] = useState<StudyTip[]>(INITIAL_STUDY_TIPS);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [cloudReady, setCloudReady] = useState(false);
  const [cloudSyncError, setCloudSyncError] = useState('');
  const [syncRequest, setSyncRequest] = useState(0);
  
  // Gamification State
  const [userGamification, setUserGamification] = useState<UserGamification | null>(null);
  const [newBadges, setNewBadges] = useState<Badge[]>([]);
  const [showBadgeToast, setShowBadgeToast] = useState(false);

  // Auto-dismiss the badge toast a few seconds after it appears.
  useEffect(() => {
    if (!showBadgeToast) return;
    const timer = window.setTimeout(() => {
      setShowBadgeToast(false);
      setNewBadges([]);
    }, 6000);
    return () => window.clearTimeout(timer);
  }, [showBadgeToast]);
  const [legacyDataAvailable] = useState(() => {
    try {
      return localStorage.getItem('fachee_materials_initialized') === '1'
        || localStorage.getItem('fachee_tips_initialized') === '1'
        || Boolean(localStorage.getItem('fachee_materials_backup'))
        || Boolean(localStorage.getItem('fachee_tips_backup'));
    } catch {
      return false;
    }
  });
  const [legacyImportUsed, setLegacyImportUsed] = useState(() => {
    try { return localStorage.getItem('fachee_legacy_imported') === '1'; } catch { return false; }
  });
  const dataScope = session?.user?.id ? `account_${session.user.id}` : 'local';
  const [currentTab, setCurrentTab] = useState<'materials' | 'roadmap' | 'tips' | 'flashcards' | 'about'>('materials');
  const [selectedMaterialDetail, setSelectedMaterialDetail] = useState<ReadingMaterial | null>(null);

  // Inactivity Alert System State
  const [alertThresholdDays, setAlertThresholdDays] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('fachee_alert_threshold_days');
      return saved ? parseInt(saved, 10) || DEFAULT_INACTIVITY_THRESHOLD_DAYS : DEFAULT_INACTIVITY_THRESHOLD_DAYS;
    } catch {
      return DEFAULT_INACTIVITY_THRESHOLD_DAYS;
    }
  });
  const [filterInactiveOnly, setFilterInactiveOnly] = useState<boolean>(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedMediaType, setSelectedMediaType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'updated' | 'title' | 'progress' | 'priority'>('updated');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<ReadingMaterial | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [materialToShare, setMaterialToShare] = useState<ReadingMaterial | null>(null);
  const [isFlashcardModalOpen, setIsFlashcardModalOpen] = useState(false);
  const [flashcardTarget, setFlashcardTarget] = useState<ReadingMaterial | null>(null);
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
  const [isTimerModalOpen, setIsTimerModalOpen] = useState(false);

  // Study Calendar State (persisted locally per account scope)
  const [calendarEvents, setCalendarEvents] = useState<StudyCalendarEvent[]>(() => {
    try {
      const saved = localStorage.getItem('fachee_calendar_events');
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? (parsed as StudyCalendarEvent[]) : [];
    } catch {
      return [];
    }
  });
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const persistCalendarEvents = useCallback((events: StudyCalendarEvent[]) => {
    try {
      localStorage.setItem('fachee_calendar_events', JSON.stringify(events));
    } catch { /* storage may be restricted */ }
  }, []);

  const handleAddCalendarEvent = useCallback((event: StudyCalendarEvent) => {
    setCalendarEvents((prev) => {
      const next = [...prev, event];
      persistCalendarEvents(next);
      return next;
    });
  }, [persistCalendarEvents]);

  const handleDeleteCalendarEvent = useCallback((id: string) => {
    setCalendarEvents((prev) => {
      const next = prev.filter((e) => e.id !== id);
      persistCalendarEvents(next);
      return next;
    });
  }, [persistCalendarEvents]);

  const handleToggleCalendarEvent = useCallback((id: string) => {
    setCalendarEvents((prev) => {
      const next = prev.map((e) => (e.id === id ? { ...e, completed: !e.completed } : e));
      persistCalendarEvents(next);
      return next;
    });
  }, [persistCalendarEvents]);

  // Student Registration & Profile State
  const [isRegistrationModalOpen, setIsRegistrationModalOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(() => {
    try {
      const saved = localStorage.getItem('fachee_student_profile');
      if (!saved) return null;
      const profile: StudentProfile = JSON.parse(saved);
      return session?.user?.id && profile.id !== session.user.id ? null : profile;
    } catch {
      return null;
    }
  });

  // Cloud profile is the source of truth when signed in. Local storage remains a
  // cache/fallback so existing profiles are not discarded during migration.
  useEffect(() => {
    let cancelled = false;
    async function loadCloudProfile() {
      if (!session?.user || !supabase) return;
      const { data, error } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
      if (error) { console.error('Could not load cloud student profile', error); return; }
      if (cancelled) return;
      if (!data) {
        setStudentProfile(null);
        try { localStorage.removeItem('fachee_student_profile'); } catch (storageError) {
          console.warn('Could not clear the cached student profile', storageError);
        }
        return;
      }
      const metadata = session.user.user_metadata || {};
      const cloudProfile: StudentProfile = {
        id: session.user.id,
        firstName: data.first_name || metadata.first_name || '',
        lastName: data.last_name || metadata.last_name || '',
        email: session.user.email || '',
        educationLevel: data.education_level === 'high_school' ? 'high_school' : 'university',
        universityName: data.university_name || undefined,
        majorFaculty: data.major_faculty || undefined,
        universityYear: data.university_year || undefined,
        highSchoolName: data.high_school_name || undefined,
        highSchoolGrade: data.high_school_grade || undefined,
        academicStream: data.academic_stream || undefined,
        primarySubjects: Array.isArray(data.primary_subjects) ? data.primary_subjects : [],
        studentIdNumber: data.facheebook_id || undefined,
        registeredAt: data.created_at || new Date().toISOString(),
        updatedAt: data.updated_at || undefined,
      };
      setStudentProfile(cloudProfile);
      try { localStorage.setItem('fachee_student_profile', JSON.stringify(cloudProfile)); } catch { /* cache is optional */ }
    }
    void loadCloudProfile();
    return () => { cancelled = true; };
  }, [session?.user?.id]);

  const handleSaveProfile = async (profile: StudentProfile): Promise<StudentProfile> => {
    if (!session?.user || !supabase) throw new Error('Please sign in to save your student profile to the cloud. Your changes were not saved.');
    const payload = {
      id: session.user.id,
      first_name: profile.firstName,
      last_name: profile.lastName,
      education_level: profile.educationLevel,
      university_name: profile.universityName || null,
      major_faculty: profile.majorFaculty || null,
      university_year: profile.universityYear || null,
      high_school_name: profile.highSchoolName || null,
      high_school_grade: profile.highSchoolGrade || null,
      academic_stream: profile.academicStream || null,
      primary_subjects: profile.primarySubjects || [],
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' }).select('*').single();
    if (error) throw new Error(`Cloud profile save failed: ${error.message}. Apply the latest Supabase migration, then try again.`);
    const savedProfile: StudentProfile = { ...profile, id: session.user.id, studentIdNumber: data.facheebook_id || undefined, registeredAt: data.created_at || profile.registeredAt, updatedAt: data.updated_at || profile.updatedAt };
    setStudentProfile(savedProfile);
    try { localStorage.setItem('fachee_student_profile', JSON.stringify(savedProfile)); } catch { /* cloud save succeeded; local cache is optional */ }
    return savedProfile;
  };

  // Sign out of the real cloud account without deleting local study data.
  const handleSignOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    try {
      if (session?.user) {
        await signOut();
      } else {
        setStudentProfile(null);
        try { localStorage.removeItem('fachee_student_profile'); } catch (storageError) {
          console.warn('Could not clear the local student profile', storageError);
        }
      }
      setIsRegistrationModalOpen(false);
    } catch (e) {
      console.error('Could not sign out of FacheeBook', e);
      window.alert(e instanceof Error ? e.message : 'Could not sign out. Please try again.');
    } finally {
      setIsSigningOut(false);
    }
  };

  // Daily Study Goal Tracker State
  const [dailyGoal, setDailyGoal] = useState<DailyStudyGoal>(() => loadDailyGoal());

  // Count a goal streak only on the first achievement of the current day.
  // Keeping this in one place makes manual edits and material progress behave consistently.
  const applyAchievementStreak = (previous: DailyStudyGoal, updated: DailyStudyGoal): DailyStudyGoal => {
    const newlyAchieved = isGoalAchieved(updated) && previous.lastAchievedDate !== updated.date;
    if (!newlyAchieved) return updated;
    const wasAchievedYesterday = previous.lastAchievedDate === getYesterdayDateString();
    return {
      ...updated,
      streakDays: wasAchievedYesterday ? Math.max(1, previous.streakDays) + 1 : 1,
      lastAchievedDate: updated.date,
    };
  };

  const handleUpdateDailyGoal = (updated: DailyStudyGoal) => {
    setDailyGoal((previous) => {
      const next = applyAchievementStreak(previous, updated);
      saveDailyGoal(next);
      return next;
    });
  };

  // Pomodoro Study Timer State
  const localDateKey = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const readSavedTimer = () => {
    try {
      const raw = localStorage.getItem('fachee_study_timer_v1');
      if (!raw) return null;
      const parsed = JSON.parse(raw) as {
        active?: boolean; mode?: 'focus' | 'break'; secondsRemaining?: number;
        deadline?: number | null; completedPomodoros?: number; countDate?: string;
      };
      const today = localDateKey();
      let mode = parsed.mode === 'break' ? 'break' : 'focus';
      const deadline = typeof parsed.deadline === 'number' ? parsed.deadline : null;
      const wasRunning = Boolean(parsed.active && deadline);
      const expired = Boolean(wasRunning && deadline && deadline <= Date.now());
      const active = Boolean(wasRunning && deadline && deadline > Date.now());
      let completedPomodoros = parsed.countDate === today && Number.isFinite(parsed.completedPomodoros)
        ? Math.max(0, Number(parsed.completedPomodoros)) : 0;
      let secondsRemaining: number;
      if (active && deadline) {
        secondsRemaining = Math.max(1, Math.ceil((deadline - Date.now()) / 1000));
      } else if (expired) {
        if (mode === 'focus') completedPomodoros += 1;
        mode = mode === 'focus' ? 'break' : 'focus';
        secondsRemaining = mode === 'focus' ? 25 * 60 : 5 * 60;
      } else {
        secondsRemaining = Math.max(0, Math.min(mode === 'focus' ? 25 * 60 : 5 * 60,
          Number.isFinite(parsed.secondsRemaining) ? Number(parsed.secondsRemaining) : (mode === 'focus' ? 25 * 60 : 5 * 60)));
      }
      return { active, mode, secondsRemaining, deadline: active ? deadline : null, completedPomodoros };
    } catch {
      return null;
    }
  };
  const [initialTimer] = useState(readSavedTimer);
  const [timerActive, setTimerActive] = useState(() => initialTimer?.active ?? false);
  const [timerSecondsRemaining, setTimerSecondsRemaining] = useState(() => initialTimer?.secondsRemaining ?? 25 * 60);
  const [timerMode, setTimerMode] = useState<'focus' | 'break'>(() => initialTimer?.mode ?? 'focus');
  const [completedPomodoros, setCompletedPomodoros] = useState(() => initialTimer?.completedPomodoros ?? 0);
  const [pomodoroCountDate, setPomodoroCountDate] = useState(() => localDateKey());
  const timerIntervalRef = useRef<number | null>(null);
  const timerDeadlineRef = useRef<number | null>(initialTimer?.deadline ?? null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>(() =>
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported'
  );
  const confirmSyncConflicts = (count: number) => window.confirm(
    `This account and this device both have ${count} matching record ID${count === 1 ? '' : 's'} with different content. Continue using the latest record timestamp? If timestamps tie, the account copy is kept. Cancel to leave this collection unchanged.`
  );

  // Signed-in accounts use separate local databases; signed-out study data stays local.
  useEffect(() => {
    let cancelled = false;
    setDataLoaded(false);
    setCloudReady(false);
    setCloudSyncError('');
    async function loadData() {
      try {
        const [savedMaterials, savedTips] = await Promise.all([
          loadMaterialsFromDB(dataScope), loadTipsFromDB(dataScope),
        ]);
        if (cancelled) return;
        let nextMaterials = savedMaterials ?? (session?.user ? [] : INITIAL_READING_MATERIALS);
        let nextTips = savedTips ?? (session?.user ? [] : INITIAL_STUDY_TIPS);
        if (session?.user && supabase) {
          try {
            nextMaterials = await syncStudyCollection(supabase, session.user.id, 'study_materials', nextMaterials, confirmSyncConflicts);
            nextTips = await syncStudyCollection(supabase, session.user.id, 'study_tips', nextTips, confirmSyncConflicts);
            if (cancelled) return;
            setCloudReady(true);
          } catch (error) {
            if (cancelled) return;
            console.error('Initial study-data cloud sync failed', error);
            setCloudSyncError(error instanceof Error ? error.message : 'Cloud sync failed. Your account data remains available on this device.');
          }
        }
        setMaterials(nextMaterials);
        setTips(nextTips);
        await Promise.all([saveMaterialsToDB(nextMaterials, dataScope), saveTipsToDB(nextTips, dataScope)]);

        // Initialize gamification state for the user
        if (!cancelled) {
          const userId = session?.user?.id || 'local_user';
          const savedGamification = localStorage.getItem(`fachee_gamification_${userId}`);
          if (savedGamification) {
            try {
              setUserGamification(JSON.parse(savedGamification));
            } catch {
              setUserGamification(createDefaultGamification(userId));
            }
          } else {
            setUserGamification(createDefaultGamification(userId));
          }
        }
      } catch (error) {
        console.error('Unable to restore FacheeBook data', error);
        setCloudSyncError('Could not load study data from this device. Please reload and try again.');
      } finally {
        if (!cancelled) setDataLoaded(true);
      }
    }
    loadData();
    return () => { cancelled = true; };
  }, [dataScope, session?.user?.id]);

  // Persist only after hydration has completed (including intentionally empty libraries).
  useEffect(() => {
    if (dataLoaded) void saveMaterialsToDB(materials, dataScope);
  }, [materials, dataLoaded, dataScope]);

  useEffect(() => {
    if (dataLoaded) void saveTipsToDB(tips, dataScope);
  }, [tips, dataLoaded, dataScope]);

  useEffect(() => {
    if (!dataLoaded || !cloudReady || !session?.user || !supabase) return;
    let cancelled = false;
    const timeout = window.setTimeout(async () => {
      try {
        const [mergedMaterials, mergedTips] = await Promise.all([
          syncStudyCollection(supabase, session.user.id, 'study_materials', materials, confirmSyncConflicts),
          syncStudyCollection(supabase, session.user.id, 'study_tips', tips, confirmSyncConflicts),
        ]);
        if (cancelled) return;
        setMaterials((current) => JSON.stringify(current) === JSON.stringify(mergedMaterials) ? current : mergedMaterials);
        setTips((current) => JSON.stringify(current) === JSON.stringify(mergedTips) ? current : mergedTips);
        setCloudSyncError('');
      } catch (error) {
        if (cancelled) return;
        console.error('Study-data cloud sync failed', error);
        setCloudSyncError(error instanceof Error ? error.message : 'Cloud sync failed. Your latest changes remain saved on this device.');
      }
    }, 900);
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [materials, tips, dataLoaded, cloudReady, session?.user?.id, syncRequest]);

  useEffect(() => {
    if (!cloudReady || !session?.user) return;
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') setSyncRequest((count) => count + 1);
    };
    const interval = window.setInterval(refreshWhenVisible, 60_000);
    window.addEventListener('focus', refreshWhenVisible);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', refreshWhenVisible);
    };
  }, [cloudReady, session?.user?.id]);

  // Detect the mobile soft keyboard so the floating quick-action dock never
  // covers form controls while a user is typing. visualViewport works in modern
  // mobile browsers and the Android WebView; the fallback keeps desktop inert.
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const updateKeyboardState = () => {
      const viewportReduction = Math.max(window.innerHeight, window.screen.height) - viewport.height;
      const keyboardLikelyOpen = viewportReduction > 180;
      document.documentElement.classList.toggle('fb-keyboard-open', keyboardLikelyOpen);
    };
    viewport.addEventListener('resize', updateKeyboardState);
    viewport.addEventListener('scroll', updateKeyboardState);
    window.addEventListener('orientationchange', updateKeyboardState);
    updateKeyboardState();
    return () => {
      viewport.removeEventListener('resize', updateKeyboardState);
      viewport.removeEventListener('scroll', updateKeyboardState);
      window.removeEventListener('orientationchange', updateKeyboardState);
      document.documentElement.classList.remove('fb-keyboard-open');
    };
  }, []);

  // Keyboard shortcuts: / or Ctrl/Cmd+K focuses search; Escape clears it.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if ((event.key === '/' && !typing) || ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k')) {
        if (currentTab !== 'materials') setCurrentTab('materials');
        window.setTimeout(() => document.getElementById('material-search')?.focus(), 0);
        event.preventDefault();
      }
      if (event.key === 'Escape' && searchQuery) setSearchQuery('');
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [currentTab, searchQuery]);

  // Reset the 'today' counter when the local calendar day changes, including while the app stays open overnight.
  useEffect(() => {
    const checkLocalDay = () => {
      const today = localDateKey();
      if (pomodoroCountDate !== today) {
        setPomodoroCountDate(today);
        setCompletedPomodoros(0);
      }
    };
    const dayCheck = window.setInterval(checkLocalDay, 60_000);
    return () => window.clearInterval(dayCheck);
  }, [pomodoroCountDate]);

  // Persist timer state so a reload or temporary navigation does not lose a session.
  useEffect(() => {
    try {
      localStorage.setItem('fachee_study_timer_v1', JSON.stringify({
        active: timerActive,
        mode: timerMode,
        secondsRemaining: timerSecondsRemaining,
        deadline: timerActive ? timerDeadlineRef.current : null,
        completedPomodoros,
        countDate: pomodoroCountDate,
      }));
    } catch (error) {
      console.warn('Unable to save study timer state', error);
    }
  }, [timerActive, timerMode, timerSecondsRemaining, completedPomodoros, pomodoroCountDate]);

  const notifyTimerComplete = (modeJustCompleted: 'focus' | 'break') => {
    const title = modeJustCompleted === 'focus' ? 'Focus session complete!' : 'Break complete!';
    const body = modeJustCompleted === 'focus'
      ? 'Great work. Your break is starting now.'
      : 'Break finished. Ready for another focus session?';
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try { new Notification(title, { body, tag: 'fachee-study-timer' }); } catch { /* Some embedded browsers block notifications. */ }
    }
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      playChimeSound();
      try { confetti({ particleCount: 65, spread: 65, origin: { y: 0.7 } }); } catch { /* Visual effect is optional. */ }
    }
  };

  // Deadline-based timer engine: elapsed time is derived from the clock, not interval ticks.
  // This stays accurate when the browser throttles timers in a background tab.
  useEffect(() => {
    if (!timerActive) {
      if (timerIntervalRef.current !== null) window.clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
      return;
    }
    if (!timerDeadlineRef.current) {
      timerDeadlineRef.current = Date.now() + timerSecondsRemaining * 1000;
    }
    const tick = () => {
      let deadline = timerDeadlineRef.current;
      if (!deadline) return;
      const now = Date.now();
      let modeAfterTransitions = timerMode;
      let completedFocusSessions = 0;
      let lastCompletedMode: 'focus' | 'break' | null = null;
      let transitions = 0;

      // If the browser or device slept, catch up from the original deadlines instead of
      // adding the delay to every future session. The cap protects against corrupted data.
      while (deadline <= now && transitions < 100) {
        lastCompletedMode = modeAfterTransitions;
        if (modeAfterTransitions === 'focus') completedFocusSessions += 1;
        modeAfterTransitions = modeAfterTransitions === 'focus' ? 'break' : 'focus';
        deadline += (modeAfterTransitions === 'focus' ? 25 * 60 : 5 * 60) * 1000;
        transitions += 1;
      }

      if (transitions > 0) {
        // Commit the new deadline before state updates so the same expiry cannot be counted twice.
        timerDeadlineRef.current = deadline;
        setTimerMode(modeAfterTransitions);
        if (completedFocusSessions > 0) {
          setCompletedPomodoros((count) => count + completedFocusSessions);
        }
        if (lastCompletedMode) notifyTimerComplete(lastCompletedMode);
      }
      const remaining = Math.max(0, Math.ceil((deadline - now) / 1000));
      setTimerSecondsRemaining(remaining);
    };
    tick();
    timerIntervalRef.current = window.setInterval(tick, 250);
    return () => {
      if (timerIntervalRef.current !== null) window.clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    };
  }, [timerActive, timerMode]);

  // Web Audio chime sound helper. Audio is best-effort because some browsers require a user gesture.
  const playChimeSound = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioContextClass();
      if (ctx.state === 'suspended') void ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.22, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.8);
      window.setTimeout(() => { void ctx.close().catch(() => undefined); }, 1000);
    } catch { /* Audio is optional; visual and in-app feedback remain available. */ }
  };

  const handleToggleTimer = () => {
    if (timerActive) {
      timerDeadlineRef.current = null;
      setTimerActive(false);
    } else {
      timerDeadlineRef.current = Date.now() + timerSecondsRemaining * 1000;
      setTimerActive(true);
    }
  };

  const handleResetTimer = () => {
    setTimerActive(false);
    timerDeadlineRef.current = null;
    setTimerSecondsRemaining(timerMode === 'focus' ? 25 * 60 : 5 * 60);
  };

  const handleSetTimerMode = (mode: 'focus' | 'break') => {
    setTimerActive(false);
    timerDeadlineRef.current = null;
    setTimerMode(mode);
    setTimerSecondsRemaining(mode === 'focus' ? 25 * 60 : 5 * 60);
  };

  const handleEnableTimerNotifications = async () => {
    if (!('Notification' in window)) {
      setNotificationPermission('unsupported');
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
    } catch {
      setNotificationPermission(Notification.permission);
    }
  };

  // Material Handlers
  const handleSaveMaterial = (material: ReadingMaterial) => {
    const wasCreated = !materials.some((item) => item.id === material.id);
    setMaterials((current) => {
      const existingIndex = current.findIndex((item) => item.id === material.id);
      if (existingIndex >= 0) {
        const updated = [...current];
        updated[existingIndex] = material;
        return updated;
      }
      return [material, ...current];
    });

    // Keep an open detail view in sync with edits to that material.
    setSelectedMaterialDetail((current) =>
      current?.id === material.id ? material : current
    );
    if (wasCreated) confetti({ particleCount: 50, spread: 60 });
  };

  const handleDeleteMaterial = (id: string) => {
    const deletedMaterial = materials.find((material) => material.id === id);
    if (session?.user && deletedMaterial) {
      try {
        recordStudyDeletion(session.user.id, 'study_materials', deletedMaterial.id);
      } catch (error) {
        window.alert(error instanceof Error ? error.message : 'Could not record this deletion for cloud sync.');
        return;
      }
    }
    setMaterials((current) => current.filter((material) => material.id !== id));
    setSelectedMaterialDetail((current) => current?.id === id ? null : current);
    // Remove deleted materials from today's review list so the goal count stays truthful.
    setDailyGoal((previous) => {
      if (!previous.materialsReviewedIds.includes(id)) return previous;
      const next = {
        ...previous,
        materialsReviewedIds: previous.materialsReviewedIds.filter((reviewedId) => reviewedId !== id),
      };
      saveDailyGoal(next);
      return next;
    });
  };

  const handleUpdateProgress = (id: string, newPagesRead: number, newStatus?: ReadingStatus) => {
    const existing = materials.find((m) => m.id === id);
    if (existing && newPagesRead > existing.pagesRead) {
      const delta = newPagesRead - existing.pagesRead;
      setDailyGoal((prev) => {
        const nextPages = prev.pagesCompleted + delta;
        const updatedGoal: DailyStudyGoal = {
          ...prev,
          pagesCompleted: nextPages,
          lastAchievedDate: (nextPages >= prev.targetPages || prev.materialsReviewedIds.length >= prev.targetMaterials)
            ? prev.date
            : prev.lastAchievedDate,
        };
        const next = applyAchievementStreak(prev, updatedGoal);
        saveDailyGoal(next);
        return next;
      });
    }

    if (newStatus === 'completed' || newStatus === 'under_review') {
      setDailyGoal((prev) => {
        if (!prev.materialsReviewedIds.includes(id)) {
          const updatedGoal: DailyStudyGoal = {
            ...prev,
            materialsReviewedIds: [...prev.materialsReviewedIds, id],
            lastAchievedDate: (prev.pagesCompleted >= prev.targetPages || (prev.materialsReviewedIds.length + 1) >= prev.targetMaterials)
              ? prev.date
              : prev.lastAchievedDate,
          };
          const next = applyAchievementStreak(prev, updatedGoal);
          saveDailyGoal(next);
          return next;
        }
        return prev;
      });
      // Award XP for completing/reviewing a material
      if (userGamification && newStatus === 'completed') {
        const xpReward = xpForMaterialCompletion(existing.pagesRead, existing.totalPages);
        handleXPEarned(xpReward, { materialsCompleted: 1 });
      }
    }

    setMaterials((current) => current.map((m) => {
      if (m.id !== id) return m;
      return {
        ...m,
        pagesRead: Math.max(0, Math.min(m.totalPages || newPagesRead, newPagesRead)),
        status: newStatus || m.status,
        updatedAt: new Date().toISOString(),
      };
    }));
    setSelectedMaterialDetail((current) => {
      if (!current || current.id !== id) return current;
      return {
        ...current,
        pagesRead: Math.max(0, Math.min(current.totalPages || newPagesRead, newPagesRead)),
        status: newStatus || current.status,
        updatedAt: new Date().toISOString(),
      };
    });
  };

  // Gamification Handlers
  const handleXPEarned = useCallback((xpAmount: number, statDelta?: GamificationStatDelta) => {
    if (!userGamification) return;

    // Apply stat deltas (flashcards reviewed, quizzes taken, etc.) first so
    // badge conditions are evaluated against the post-activity numbers.
    const withStats: UserGamification = statDelta
      ? {
          ...userGamification,
          totalFlashcardsReviewed: userGamification.totalFlashcardsReviewed + (statDelta.flashcardsReviewed ?? 0),
          totalQuizzesTaken: userGamification.totalQuizzesTaken + (statDelta.quizzesTaken ?? 0),
          totalMaterialsCompleted: userGamification.totalMaterialsCompleted + (statDelta.materialsCompleted ?? 0),
          totalStudyMinutes: userGamification.totalStudyMinutes + (statDelta.studyMinutes ?? 0),
        }
      : userGamification;

    const withStreak = registerStudyActivity(withStats);
    const { updated, leveledUp, newLevel } = addXP(withStreak, xpAmount);

    // Check for new badges against the updated stats
    const stats: UserStats = {
      xp: updated.xp,
      level: updated.level,
      totalStudyMinutes: updated.totalStudyMinutes,
      totalMaterialsCompleted: updated.totalMaterialsCompleted,
      totalFlashcardsReviewed: updated.totalFlashcardsReviewed,
      totalQuizzesTaken: updated.totalQuizzesTaken,
      currentStreakDays: updated.currentStreakDays,
      longestStreakDays: updated.longestStreakDays,
      materialsBySubject: {},
      studySessionsThisWeek: 0,
      averageQuizScore: 0,
    };

    const earnedBadgeIds = updated.badges.map((b) => b.badgeId);
    const badgeChecks = checkNewBadges(stats, earnedBadgeIds);
    const newlyEarned = badgeChecks.filter((b) => b.isNew).map((b) => b.badge);

    let finalState = updated;

    if (newlyEarned.length > 0) {
      setNewBadges(newlyEarned);
      setShowBadgeToast(true);
      // Record the badges so their XP is never awarded twice.
      finalState = {
        ...finalState,
        badges: [
          ...finalState.badges,
          ...newlyEarned.map((badge) => ({ badgeId: badge.id, earnedAt: new Date().toISOString() })),
        ],
      };
      const badgeXP = newlyEarned.reduce((sum, badge) => sum + badge.xpReward, 0);
      if (badgeXP > 0) {
        finalState = { ...addXP(finalState, badgeXP).updated, badges: finalState.badges };
      }
    }

    setUserGamification(finalState);
    persistGamification(finalState);

    if (leveledUp && newLevel) {
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.4 } });
    }
  }, [userGamification]);

  const persistGamification = (gamification: UserGamification) => {
    const userId = session?.user?.id || 'local_user';
    try {
      localStorage.setItem(`fachee_gamification_${userId}`, JSON.stringify(gamification));
    } catch { /* storage may be restricted */ }
  };

  // Study Tips Handlers
  const handleAddTip = (newTip: StudyTip) => {
    setTips((current) => [{ ...newTip, updatedAt: new Date().toISOString() }, ...current]);
  };

  const handleLikeTip = (id: string) => {
    setTips((current) => current.map((tip) => {
      if (tip.id !== id) return tip;
      const liked = !tip.userLiked;
      return {
        ...tip,
        userLiked: liked,
        likes: liked ? tip.likes + 1 : Math.max(0, tip.likes - 1),
        updatedAt: new Date().toISOString(),
      };
    }));
  };

  const handleImportLegacyDeviceData = async () => {
    if (!session?.user) return;
    try {
      const [legacyMaterials, legacyTips] = await Promise.all([
        loadMaterialsFromDB('local'),
        loadTipsFromDB('local'),
      ]);
      const materialsToImport = legacyMaterials ?? [];
      const tipsToImport = legacyTips ?? [];
      if (!materialsToImport.length && !tipsToImport.length) {
        window.alert('There is no existing local library to import from this device.');
        return;
      }
      const currentMaterials = new Map<string, ReadingMaterial>(materials.map((item): [string, ReadingMaterial] => [item.id, item]));
      const currentTips = new Map<string, StudyTip>(tips.map((item): [string, StudyTip] => [item.id, item]));
      const materialConflicts = materialsToImport.filter((item) => currentMaterials.has(item.id)).length;
      const tipConflicts = tipsToImport.filter((item) => currentTips.has(item.id)).length;
      const conflictMessage = materialConflicts || tipConflicts
        ? ` There are ${materialConflicts} material and ${tipConflicts} tip ID conflicts. For each conflict, the latest updated version will be kept; ties keep this account's version.`
        : '';
      if (!window.confirm(`Import ${materialsToImport.length} materials and ${tipsToImport.length} study tips into this account?${conflictMessage} This will not delete the original local library.`)) return;

      for (const item of materialsToImport) {
        const existing = currentMaterials.get(item.id);
        if (!existing || Date.parse(item.updatedAt) > Date.parse(existing.updatedAt)) currentMaterials.set(item.id, item);
      }
      for (const item of tipsToImport) {
        const existing = currentTips.get(item.id);
        const itemTime = Date.parse(item.updatedAt || item.createdAt);
        const existingTime = existing ? Date.parse(existing.updatedAt || existing.createdAt) : -1;
        if (!existing || itemTime > existingTime) currentTips.set(item.id, item);
      }
      setMaterials(Array.from(currentMaterials.values()));
      setTips(Array.from(currentTips.values()));
      localStorage.setItem('fachee_legacy_imported', '1');
      setLegacyImportUsed(true);
    } catch (error) {
      console.error('Could not import the existing local study library', error);
      window.alert(error instanceof Error ? error.message : 'Could not import the existing local study library.');
    }
  };

  // Import Data Handler
  const handleImportData = (importedMaterials: ReadingMaterial[], importedTips?: StudyTip[]) => {
    // Merge by ID, preserving existing records and using functional updates to avoid stale state.
    const currentMaterialIds = new Set(materials.map((m) => m.id));
    const newMaterials = importedMaterials.filter((m) => {
      if (currentMaterialIds.has(m.id)) return false;
      currentMaterialIds.add(m.id); // Also remove duplicate IDs inside the imported file itself.
      return true;
    });
    const currentTipIds = new Set(tips.map((t) => t.id));
    const newTips = (importedTips ?? []).filter((t) => {
      if (currentTipIds.has(t.id)) return false;
      currentTipIds.add(t.id);
      return true;
    });

    if (newMaterials.length) setMaterials((previous) => {
      const existing = new Set(previous.map((m) => m.id));
      return [...newMaterials.filter((m) => !existing.has(m.id)), ...previous];
    });
    if (newTips.length) setTips((previous) => {
      const existing = new Set(previous.map((t) => t.id));
      return [...newTips.filter((t) => !existing.has(t.id)), ...previous];
    });
    return { materialsAdded: newMaterials.length, tipsAdded: newTips.length };
  };

  // Inactivity Alert System Computations & Handlers
  const handleSetThresholdDays = (days: number) => {
    setAlertThresholdDays(days);
    try {
      localStorage.setItem('fachee_alert_threshold_days', days.toString());
    } catch {
      // ignore
    }
  };

  const inactivityAlerts = getInactiveMaterials(materials, alertThresholdDays);
  const inactiveIdSet = new Set(inactivityAlerts.map((a) => a.material.id));

  const handleRefreshActivity = (id: string) => {
    setMaterials((prev) =>
      prev.map((m) => {
        if (m.id === id) {
          return {
            ...m,
            updatedAt: new Date().toISOString(),
          };
        }
        return m;
      })
    );
    confetti({ particleCount: 35, spread: 55, origin: { y: 0.7 } });
  };

  const handleRefreshAllActivities = () => {
    const now = new Date().toISOString();
    setMaterials((prev) =>
      prev.map((m) => {
        if (inactiveIdSet.has(m.id)) {
          return {
            ...m,
            updatedAt: now,
          };
        }
        return m;
      })
    );
    confetti({ particleCount: 75, spread: 70, origin: { y: 0.6 } });
  };

  const handleStartTimerForMaterial = (material: ReadingMaterial) => {
    setTimerMode('focus');
    setTimerSecondsRemaining(25 * 60);
    timerDeadlineRef.current = Date.now() + 25 * 60 * 1000;
    setTimerActive(true);
    setIsTimerModalOpen(true);
  };

  const handleSimulateInactivity = () => {
    handleSetThresholdDays(1);
  };

  // Subject list from existing materials
  const availableSubjects = Array.from(new Set(materials.map((m) => m.subject).filter(Boolean)));

  // Filtered and Sorted Materials
  const filteredMaterials = materials
    .filter((m) => {
      // Inactivity filter toggle
      if (filterInactiveOnly && !inactiveIdSet.has(m.id)) {
        return false;
      }

      // Search match
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        !query ||
        m.title.toLowerCase().includes(query) ||
        m.subject.toLowerCase().includes(query) ||
        m.author.toLowerCase().includes(query) ||
        (m.description || '').toLowerCase().includes(query) ||
        m.tags.some((t) => t.toLowerCase().includes(query)) ||
        (m.keyTakeaways || []).some((takeaway) => takeaway.toLowerCase().includes(query)) ||
        m.documents.some((d) => d.name.toLowerCase().includes(query)) ||
        m.videoLinks.some((video) => `${video.title} ${video.url} ${video.notes || ''}`.toLowerCase().includes(query)) ||
        m.shortVideos.some((video) => `${video.name} ${video.format}`.toLowerCase().includes(query));

      // Subject match
      const matchesSubject = selectedSubject === 'all' || m.subject === selectedSubject;

      // Status match
      const matchesStatus = selectedStatus === 'all' || m.status === selectedStatus;

      // Media type match
      let matchesMedia = true;
      if (selectedMediaType === 'has_photos') matchesMedia = m.photos.length > 0;
      else if (selectedMediaType === 'has_videos') matchesMedia = m.videoLinks.length > 0;
      else if (selectedMediaType === 'has_short_videos') matchesMedia = m.shortVideos.length > 0;
      else if (selectedMediaType === 'has_docs') matchesMedia = m.documents.length > 0;

      return matchesSearch && matchesSubject && matchesStatus && matchesMedia;
    })
    .sort((a, b) => {
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      if (sortBy === 'progress') {
        const pctA = a.totalPages > 0 ? a.pagesRead / a.totalPages : 0;
        const pctB = b.totalPages > 0 ? b.pagesRead / b.totalPages : 0;
        return pctB - pctA;
      }
      if (sortBy === 'priority') {
        const pMap = { high: 3, medium: 2, low: 1 };
        return pMap[b.priority] - pMap[a.priority];
      }
      // default: updated
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

  const handleRetryCloudSync = async () => {
    if (!session?.user || !supabase) return;
    setCloudSyncError('');
    try {
      const [localMaterials, localTips] = await Promise.all([
        loadMaterialsFromDB(dataScope),
        loadTipsFromDB(dataScope),
      ]);
      const mergedMaterials = await syncStudyCollection(supabase, session.user.id, 'study_materials', localMaterials ?? [], confirmSyncConflicts);
      const mergedTips = await syncStudyCollection(supabase, session.user.id, 'study_tips', localTips ?? [], confirmSyncConflicts);
      setMaterials(mergedMaterials);
      setTips(mergedTips);
      setCloudReady(true);
    } catch (error) {
      console.error('Manual study-data cloud sync failed', error);
      setCloudSyncError(error instanceof Error ? error.message : 'Cloud sync failed. Please try again.');
    }
  };

  if (!dataLoaded) {
    return <div role="status" className="flex min-h-screen items-center justify-center bg-[#080A0B] text-sm font-semibold text-amber-200">Loading your study library…</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-['Plus_Jakarta_Sans',sans-serif] selection:bg-indigo-600 selection:text-white">
      
      {/* Top Navigation */}
      <Navbar
        materials={materials}
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          if (tab === 'flashcards') {
            setFlashcardTarget(null);
            setIsFlashcardModalOpen(true);
          }
        }}
        onOpenAddModal={() => {
          setEditingMaterial(null);
          setIsAddModalOpen(true);
        }}
        onOpenTimerModal={() => setIsTimerModalOpen(true)}
        onOpenExportModal={() => {
          setMaterialToShare(null);
          setIsShareModalOpen(true);
        }}
        timerActive={timerActive}
        timerSecondsRemaining={timerSecondsRemaining}
        studentProfile={studentProfile}
        accountEmail={session?.user?.email ?? ''}
        isAuthenticated={Boolean(session?.user)}
        isSigningOut={isSigningOut}
        onOpenRegistrationModal={() => setIsRegistrationModalOpen(true)}
        onSignOut={handleSignOut}
        alerts={inactivityAlerts}
        thresholdDays={alertThresholdDays}
        onSetThresholdDays={handleSetThresholdDays}
        onOpenMaterial={(m) => setSelectedMaterialDetail(m)}
        onRefreshActivity={handleRefreshActivity}
        onRefreshAllActivities={handleRefreshAllActivities}
        onStartTimerForMaterial={handleStartTimerForMaterial}
        onUpdateStatus={(id, newStatus) => {
          const currentMat = materials.find((m) => m.id === id);
          handleUpdateProgress(id, currentMat ? currentMat.pagesRead : 0, newStatus);
        }}
        onSimulateInactivity={handleSimulateInactivity}
      />

      {session?.user && (
        <section className="mx-auto mt-4 flex w-full max-w-7xl flex-col gap-3 px-4 sm:px-6" aria-label="Cloud sync status">
          <div className={`flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between ${cloudSyncError ? 'border-red-200 bg-red-50 text-red-900' : 'border-emerald-200 bg-emerald-50 text-emerald-900'}`}>
            <div>
              <p className="text-sm font-bold">{cloudSyncError ? 'Cloud sync needs attention' : cloudReady ? 'Cloud sync is on' : 'Connecting your study library…'}</p>
              <p className="mt-1 text-xs">{cloudSyncError || 'Materials and study tips sync for this account. File attachments and voice recordings stay on this device.'}</p>
            </div>
            {cloudSyncError && <button type="button" onClick={() => void handleRetryCloudSync()} className="shrink-0 rounded-xl border border-current px-3 py-2 text-xs font-bold">Retry sync</button>}
          </div>
          {legacyDataAvailable && !legacyImportUsed && (
            <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-bold">Import this device’s existing library?</p>
                <p className="mt-1 text-xs">Your signed-in library is separate. Importing merges local materials and tips into this account; the original local library is kept.</p>
              </div>
              <button type="button" onClick={() => void handleImportLegacyDeviceData()} className="shrink-0 rounded-xl bg-amber-300 px-3 py-2 text-xs font-bold text-slate-950">Review and import</button>
            </div>
          )}
        </section>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 fb-main">
        
        {/* VIEW 1: Reading Material Detail Reader View */}
        {selectedMaterialDetail ? (
          <Suspense fallback={loadingFallback}>
            <MaterialDetailView
              material={selectedMaterialDetail}
              onBack={() => setSelectedMaterialDetail(null)}
              onEdit={(m) => {
                setEditingMaterial(m);
                setIsAddModalOpen(true);
              }}
              onDelete={handleDeleteMaterial}
              onShare={(m) => {
                setMaterialToShare(m);
                setIsShareModalOpen(true);
              }}
              onUpdateMaterial={(updated) => {
                const previous = materials.find((item) => item.id === updated.id);
                if (previous && (previous.pagesRead !== updated.pagesRead || previous.status !== updated.status)) {
                  handleUpdateProgress(updated.id, updated.pagesRead, updated.status);
                }
                handleSaveMaterial(updated);
                setSelectedMaterialDetail(updated);
              }}
            />
          </Suspense>
        ) : currentTab === 'roadmap' ? (
          /* VIEW 2: Visual Study Roadmap Progression Tracks */
          <Suspense fallback={loadingFallback}>
            <StudyRoadmap
              materials={materials}
              onOpenMaterial={(m) => setSelectedMaterialDetail(m)}
              onUpdateStatus={(id, newStatus) => {
                const currentMat = materials.find((m) => m.id === id);
                handleUpdateProgress(id, currentMat ? currentMat.pagesRead : 0, newStatus);
              }}
              onStartTimer={(m) => handleStartTimerForMaterial(m)}
              onOpenAddModalWithSubject={(subject) => {
                setEditingMaterial({
                  id: '',
                  title: '',
                  subject: subject,
                  author: '',
                  description: '',
                  status: 'to_read',
                  priority: 'medium',
                  rating: 5,
                  totalPages: 10,
                  pagesRead: 0,
                  tags: [subject],
                  keyTakeaways: [],
                  photos: [],
                  videoLinks: [],
                  shortVideos: [],
                  documents: [],
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                });
                setIsAddModalOpen(true);
              }}
            />
          </Suspense>
        ) : currentTab === 'about' ? (
          /* VIEW 3: About Section & Creator Info */
          <Suspense fallback={loadingFallback}><AboutSection /></Suspense>
        ) : currentTab === 'tips' ? (
          /* VIEW 4: Study Tips & Wisdom Hub */
          <Suspense fallback={loadingFallback}>
            <StudyTipsHub
              tips={tips}
              onAddTip={handleAddTip}
              onLikeTip={handleLikeTip}
            />
          </Suspense>
        ) : (
          /* VIEW 5: Reading Materials Directory & Media Hub */
          <div className="space-y-6">
            
            {/* Header Hero Banner for Materials */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                {/* Student Greeting or Registration prompt */}
                {studentProfile ? (
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <div className="px-2.5 py-1 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center gap-1.5 text-xs text-indigo-950 font-bold">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Welcome, {studentProfile.firstName}!</span>
                      <span className="text-slate-300">•</span>
                      <span className="text-indigo-700 font-medium">
                        {studentProfile.educationLevel === 'university'
                          ? `🎓 ${studentProfile.universityYear} (${studentProfile.majorFaculty || 'University'})`
                          : `🎒 ${studentProfile.highSchoolGrade} (${studentProfile.academicStream || 'High School'})`}
                      </span>
                      <button
                        onClick={() => setIsRegistrationModalOpen(true)}
                        className="text-[11px] text-indigo-600 hover:text-indigo-900 underline font-bold ml-1 cursor-pointer"
                      >
                        Edit profile
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mb-2">
                    <button
                      onClick={() => setIsRegistrationModalOpen(true)}
                      className="px-3 py-1 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 flex items-center gap-2 text-xs text-amber-950 font-bold transition-all cursor-pointer shadow-2xs group"
                    >
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                      <span>Register as a University or High School Student</span>
                      <span className="text-amber-700 group-hover:translate-x-0.5 transition-transform font-black">→</span>
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-2 mb-1">
                  <span className="bg-indigo-100 text-indigo-800 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md">
                    Study library
                  </span>
                  <span className="text-xs text-slate-500 font-semibold">
                    Your personal study space
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Student Reading Materials & Media Hub
                </h2>
                <p className="text-xs text-slate-500 max-w-2xl font-medium mt-0.5">
                  Organize reading materials, photos, lecture videos, short clips, and documents in one place.
                </p>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                <button
                  onClick={() => setCurrentTab('roadmap')}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-200 transition-all cursor-pointer"
                >
                  <Route className="w-4 h-4 text-indigo-600" />
                  <span>Study Roadmap</span>
                </button>

                <button
                  onClick={() => {
                    setFlashcardTarget(null);
                    setIsFlashcardModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                >
                  <Layers className="w-4 h-4 text-indigo-600" />
                  <span>Flashcard Deck</span>
                </button>

                <button
                  onClick={() => {
                    setEditingMaterial(null);
                    setIsAddModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm shadow-indigo-600/20 active:scale-95 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add material</span>
                </button>

                <button
                  onClick={() => setIsQuizModalOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold border border-purple-200 transition-all cursor-pointer"
                >
                  <Timer className="w-4 h-4 text-purple-600" />
                  <span>Practice Quiz</span>
                </button>

                <button
                  onClick={() => setIsCalendarOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-200 transition-all cursor-pointer"
                >
                  <CalendarDays className="w-4 h-4 text-emerald-600" />
                  <span>Study Calendar</span>
                </button>
              </div>

            {/* Gamification Display - XP, Level, Badges */}
            {userGamification && (
              <GamificationDisplay gamification={userGamification} />
            )}
            </div>

            {/* At-a-glance dashboard: primary counts are visible before the user scrolls. */}
            <section className="fb-overview-grid" aria-label="Library overview">
              <div className="fb-overview-card fb-overview-primary">
                <span className="fb-overview-icon"><Library size={18} /></span>
                <div><p className="fb-overview-label">Your library</p><strong>{materials.length}</strong><small>saved materials</small></div>
              </div>
              <div className="fb-overview-card">
                <span className="fb-overview-icon"><BookOpen size={18} /></span>
                <div><p className="fb-overview-label">In progress</p><strong>{materials.filter((m) => m.status === 'reading').length}</strong><small>currently studying</small></div>
              </div>
              <div className="fb-overview-card">
                <span className="fb-overview-icon"><CheckCircle2 size={18} /></span>
                <div><p className="fb-overview-label">Completed</p><strong>{materials.filter((m) => m.status === 'completed').length}</strong><small>finished materials</small></div>
              </div>
              <div className="fb-overview-card">
                <span className="fb-overview-icon"><BellRing size={18} /></span>
                <div><p className="fb-overview-label">Review due</p><strong>{inactivityAlerts.length}</strong><small>need attention</small></div>
              </div>
            </section>

            {/* Daily Study Goal Tracker */}
            <DailyStudyGoalTracker
              goal={dailyGoal}
              materials={materials}
              onUpdateGoal={handleUpdateDailyGoal}
              onOpenMaterial={(m) => setSelectedMaterialDetail(m)}
            />

            {/* Inactivity Alert Dashboard Banner (Reminds students of stale 'To Read' / 'Under Review' materials) */}
            <DashboardAlertBanner
              alerts={inactivityAlerts}
              thresholdDays={alertThresholdDays}
              onSetThresholdDays={handleSetThresholdDays}
              onOpenMaterial={(m) => setSelectedMaterialDetail(m)}
              onUpdateStatus={(id, newStatus) => {
                const currentMat = materials.find((m) => m.id === id);
                handleUpdateProgress(id, currentMat ? currentMat.pagesRead : 0, newStatus);
              }}
              onRefreshActivity={handleRefreshActivity}
              onRefreshAllActivities={handleRefreshAllActivities}
              onStartTimer={handleStartTimerForMaterial}
              onFilterInactiveOnly={() => setFilterInactiveOnly(!filterInactiveOnly)}
              isFilteredByInactive={filterInactiveOnly}
            />

            {/* Filter & Search Bar */}
            <div className="bg-white p-4 rounded-3xl border border-slate-200/90 shadow-xs space-y-3">
              <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
                {/* Search Box */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="material-search"
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search materials, subjects, authors, tags…"
                    aria-label="Search reading materials"
                    className="w-full pl-9 pr-20 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:bg-white transition-all font-medium"
                  />
                  <div className="fb-search-tools">
                    {searchQuery ? <button type="button" onClick={() => setSearchQuery('')} aria-label="Clear search" title="Clear search"><X size={15} /></button> : null}
                    <kbd>/</kbd>
                  </div>
                </div>

                {/* Course/Subject Filter */}
                <div className="flex items-center gap-2">
                  <select
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    className="px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-700"
                  >
                    <option value="all">📚 All Subjects</option>
                    {availableSubjects.map((sub) => (
                      <option key={sub} value={sub}>
                        {sub}
                      </option>
                    ))}
                  </select>

                  {/* Status Filter */}
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-700"
                  >
                    <option value="all">⚡ All Statuses</option>
                    <option value="reading">📖 In Progress</option>
                    <option value="to_read">📌 To Read</option>
                    <option value="under_review">🔍 Under Review</option>
                    <option value="completed">✅ Completed</option>
                  </select>

                  {/* Sort By */}
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-700"
                  >
                    <option value="updated">🕒 Recent</option>
                    <option value="progress">📊 Progress</option>
                    <option value="priority">🔥 Priority</option>
                    <option value="title">🔤 Title</option>
                  </select>
                </div>
              </div>

              {/* Media Format & Inactivity Filter Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pt-3 border-t border-slate-100 text-xs fb-filter-strip">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                  Filter:
                </span>

                {/* Inactivity Alert Toggle Pill */}
                <button
                  onClick={() => setFilterInactiveOnly(!filterInactiveOnly)}
                  className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    filterInactiveOnly
                      ? 'bg-amber-600 text-white shadow-xs'
                      : inactivityAlerts.length > 0
                      ? 'bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                  title="Toggle filter to show only inactive materials requiring review"
                >
                  <BellRing className={`w-3.5 h-3.5 ${inactivityAlerts.length > 0 ? 'text-amber-700 animate-pulse' : ''}`} />
                  <span>Review Due ({inactivityAlerts.length})</span>
                </button>

                <div className="w-px h-4 bg-slate-200 mx-1" />

                <button
                  onClick={() => setSelectedMediaType('all')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all whitespace-nowrap ${
                    selectedMediaType === 'all'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All Formats ({materials.length})
                </button>
                <button
                  onClick={() => setSelectedMediaType('has_docs')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1 whitespace-nowrap ${
                    selectedMediaType === 'has_docs'
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Has Documents</span>
                </button>
                <button
                  onClick={() => setSelectedMediaType('has_photos')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1 whitespace-nowrap ${
                    selectedMediaType === 'has_photos'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Image className="w-3.5 h-3.5" />
                  <span>Has Photos</span>
                </button>
                <button
                  onClick={() => setSelectedMediaType('has_videos')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1 whitespace-nowrap ${
                    selectedMediaType === 'has_videos'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Link2 className="w-3.5 h-3.5" />
                  <span>Has Video Links</span>
                </button>
                <button
                  onClick={() => setSelectedMediaType('has_short_videos')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1 whitespace-nowrap ${
                    selectedMediaType === 'has_short_videos'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>Has Short Videos</span>
                </button>
              </div>
            </div>

            {/* Results count and one-tap reset keep filter state understandable. */}
            <div className="fb-results-row">
              <div><strong>{filteredMaterials.length}</strong> of <strong>{materials.length}</strong> materials <span>shown</span></div>
              {(searchQuery || selectedSubject !== 'all' || selectedStatus !== 'all' || selectedMediaType !== 'all' || filterInactiveOnly) && (
                <button type="button" onClick={() => { setSearchQuery(''); setSelectedSubject('all'); setSelectedStatus('all'); setSelectedMediaType('all'); setFilterInactiveOnly(false); }}>
                  <X size={14} /> Clear filters
                </button>
              )}
            </div>

            {/* Materials Grid */}
            {filteredMaterials.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredMaterials.map((material) => {
                  const isInactive = inactiveIdSet.has(material.id);
                  const alertItem = inactivityAlerts.find((a) => a.material.id === material.id);
                  return (
                    <MaterialCard
                      key={material.id}
                      material={material}
                      isInactiveAlert={isInactive}
                      daysInactive={alertItem ? alertItem.daysInactive : 0}
                      onOpenDetail={(m) => setSelectedMaterialDetail(m)}
                      onEdit={(m) => {
                        setEditingMaterial(m);
                        setIsAddModalOpen(true);
                      }}
                      onDelete={handleDeleteMaterial}
                      onShare={(m) => {
                        setMaterialToShare(m);
                        setIsShareModalOpen(true);
                      }}
                      onQuickFlashcards={(m) => {
                        setFlashcardTarget(m);
                        setIsFlashcardModalOpen(true);
                      }}
                      onUpdateProgress={handleUpdateProgress}
                      onRefreshActivity={handleRefreshActivity}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center space-y-3">
                <BookOpen className="w-12 h-12 text-slate-300 mx-auto" />
                <h3 className="font-extrabold text-base text-slate-800">
                  {filterInactiveOnly ? 'No inactive materials needing review under this filter' : 'No reading materials found'}
                </h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  {filterInactiveOnly
                    ? 'All your "To Read" and "Under Review" items have been recently reviewed or accessed.'
                    : 'Try adjusting your search query, subject, or format filters.'}
                </p>
                {materials.length === 0 && !searchQuery && !filterInactiveOnly ? (
                  <button type="button" onClick={() => { setEditingMaterial(null); setIsAddModalOpen(true); }} className="fb-empty-primary"><Plus size={16} /> Add your first material</button>
                ) : null}
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedSubject('all');
                    setSelectedStatus('all');
                    setSelectedMediaType('all');
                    setFilterInactiveOnly(false);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Persistent mobile navigation: core destinations stay reachable on every screen. */}
      {!selectedMaterialDetail && (
        <nav className="fb-mobile-dock" aria-label="Main navigation">
          <button type="button" onClick={() => setCurrentTab('materials')} className={currentTab === 'materials' ? 'is-active' : ''} aria-current={currentTab === 'materials' ? 'page' : undefined}>
            <BookOpen size={19} /><span>Library</span>
          </button>
          <button type="button" onClick={() => setCurrentTab('roadmap')} className={currentTab === 'roadmap' ? 'is-active' : ''} aria-current={currentTab === 'roadmap' ? 'page' : undefined}>
            <Route size={19} /><span>Progress</span>
          </button>
          <button type="button" onClick={() => { setEditingMaterial(null); setIsAddModalOpen(true); }} className="fb-dock-add" aria-label="Add study material">
            <Plus size={21} /><span>Add</span>
          </button>
          <button type="button" onClick={() => setCurrentTab('tips')} className={currentTab === 'tips' ? 'is-active' : ''} aria-current={currentTab === 'tips' ? 'page' : undefined}>
            <Lightbulb size={19} /><span>Tips</span>
          </button>
          <button type="button" onClick={() => { setCurrentTab('flashcards'); setFlashcardTarget(null); setIsFlashcardModalOpen(true); }} className={currentTab === 'flashcards' ? 'is-active' : ''} aria-current={currentTab === 'flashcards' ? 'page' : undefined}>
            <Layers size={19} /><span>Cards</span>
          </button>
        </nav>
      )}

      {/* Modal 1: Add / Edit Reading Material Modal */}
      {isAddModalOpen && (
        <Suspense fallback={loadingFallback}>
          <MaterialModal
            key={editingMaterial?.id ?? 'new-material'}
            isOpen={true}
            onClose={() => setIsAddModalOpen(false)}
            onSave={handleSaveMaterial}
            initialData={editingMaterial}
          />
        </Suspense>
      )}

      {/* Modal 2: Active Recall Flashcard Deck */}
      {isFlashcardModalOpen && (
        <Suspense fallback={loadingFallback}>
          <FlashcardsModal
            isOpen={true}
            onClose={() => setIsFlashcardModalOpen(false)}
            materials={materials}
            singleMaterial={flashcardTarget}
            onReview={(xp, reviewed) => handleXPEarned(xp, { flashcardsReviewed: reviewed })}
          />
        </Suspense>
      )}

      {/* Modal 3: AI Practice Quiz Generator */}
      {isQuizModalOpen && (
        <Suspense fallback={loadingFallback}>
          <QuizGenerator
            materials={materials}
            onClose={() => setIsQuizModalOpen(false)}
            onComplete={(xp, quizzes) => handleXPEarned(xp, { quizzesTaken: quizzes })}
          />
        </Suspense>
      )}

      {/* Study Calendar Planner */}
      {isCalendarOpen && (
        <Suspense fallback={loadingFallback}>
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/65 p-3 backdrop-blur-sm sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsCalendarOpen(false); }}>
            <div className="w-full max-w-4xl">
              <div className="mb-3 flex items-center justify-end">
                <button type="button" onClick={() => setIsCalendarOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/95 text-slate-600 shadow-sm transition hover:bg-white hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" aria-label="Close study calendar">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <StudyCalendar
                events={calendarEvents}
                onAddEvent={handleAddCalendarEvent}
                onDeleteEvent={handleDeleteCalendarEvent}
              />
            </div>
          </div>
        </Suspense>
      )}

      {/* Modal 4: Pomodoro Study Sprint Clock */}
      {isTimerModalOpen && (
        <Suspense fallback={loadingFallback}>
          <StudyTimerModal
            isOpen={true}
            onClose={() => setIsTimerModalOpen(false)}
            timerActive={timerActive}
            timerSecondsRemaining={timerSecondsRemaining}
            timerMode={timerMode}
            completedPomodoros={completedPomodoros}
            onToggleTimer={handleToggleTimer}
            onResetTimer={handleResetTimer}
            onSetMode={handleSetTimerMode}
            notificationPermission={notificationPermission}
            onEnableNotifications={handleEnableTimerNotifications}
          />
        </Suspense>
      )}

      {/* Modal 4: Share & Backup Modal */}
      {isShareModalOpen && (
        <Suspense fallback={loadingFallback}>
          <ShareModal
            isOpen={true}
            onClose={() => setIsShareModalOpen(false)}
            materialToShare={materialToShare}
            allMaterials={materials}
            allTips={tips}
            onImportData={handleImportData}
          />
        </Suspense>
      )}

      {/* Modal 5: Student Registration & Profile Modal */}
      {isRegistrationModalOpen && (
        <Suspense fallback={loadingFallback}>
          <StudentRegistrationModal
            isOpen={true}
            onClose={() => setIsRegistrationModalOpen(false)}
            currentProfile={studentProfile}
            onSaveProfile={handleSaveProfile}
          />
        </Suspense>
      )}

      {/* Footer */}
      <footer className="w-full bg-white border-t border-slate-200 py-8 text-xs text-slate-500 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="text-center md:text-left">
              <p className="font-extrabold text-slate-800 text-sm flex items-center justify-center md:justify-start gap-1.5">
                <span>FacheeBook</span>
                <span className="text-slate-300">•</span>
                <span className="text-rose-600 font-bold flex items-center gap-1">
                  <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
                  Made with care by Waaree Jabboo Bakar
                </span>
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Supporting documents of any format, photos, video links, short videos, flashcards, and study tips sharing.
              </p>
            </div>

            {/* Social Links in Footer */}
            <div className="flex items-center gap-3 flex-wrap justify-center">
              <a
                href="https://www.youtube.com/@Waareetube"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs border border-red-200 transition-colors"
              >
                <Youtube className="w-4 h-4 text-red-600" />
                <span>Waaree Tube💥</span>
                <ExternalLink className="w-3 h-3 opacity-70" />
              </a>

              <a
                href="https://www.facebook.com/Waareetube"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#1877F2] font-bold text-xs border border-blue-200 transition-colors"
              >
                <Facebook className="w-4 h-4 text-[#1877F2]" />
                <span>Waaree J Bakar</span>
                <ExternalLink className="w-3 h-3 opacity-70" />
              </a>

              <button
                onClick={() => {
                  setSelectedMaterialDetail(null);
                  setCurrentTab('about');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-100" />
                <span>About Section</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-2">
            <p>© {new Date().getFullYear()} FacheeBook. Dedicated to academic excellence and peer collaboration.</p>
            <p className="font-medium text-slate-500">Facebook: Waaree J Bakar • YouTube: Waaree Tube💥</p>
          </div>
        </div>
      </footer>

      {/* Badge unlock toast */}
      {showBadgeToast && newBadges.length > 0 && (
        <div className="fixed bottom-24 left-1/2 z-[60] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 sm:bottom-8" role="status" aria-live="polite">
          <div className="rounded-2xl border border-amber-200 bg-white p-4 shadow-2xl">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-700"><Trophy className="h-5 w-5" /></span>
              <div>
                <p className="text-sm font-extrabold text-slate-900">Badge unlocked!</p>
                <p className="text-[11px] font-semibold text-slate-500">Keep the momentum going.</p>
              </div>
            </div>
            <ul className="space-y-2">
              {newBadges.map((badge) => (
                <li key={badge.id} className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${badge.color}`}>
                    <Award className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-extrabold text-slate-800">{badge.name}</p>
                    <p className="truncate text-[11px] text-slate-500">{badge.description}</p>
                  </div>
                  <span className="shrink-0 text-[11px] font-extrabold text-amber-700">+{badge.xpReward} XP</span>
                </li>
              ))}
            </ul>
            <button type="button" onClick={() => { setShowBadgeToast(false); setNewBadges([]); }} className="mt-3 w-full rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2">
              Nice!
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
