export type ReadingStatus = 'to_read' | 'reading' | 'under_review' | 'completed';

export type MediaType = 'photo' | 'video_link' | 'short_video' | 'document';

export interface FileAttachment {
  id: string;
  name: string;
  type: MediaType;
  format: string; // e.g., 'pdf', 'docx', 'png', 'mp4', 'pptx', 'zip', etc.
  sizeBytes: number;
  dataUrl?: string; // base64 or object URL for preview and download
  textContent?: string; // for text-based docs preview
  createdAt: string;
}

export interface VideoLink {
  id: string;
  title: string;
  url: string;
  platform: 'youtube' | 'vimeo' | 'direct' | 'other';
  notes?: string;
}

export interface ReadingMaterial {
  id: string;
  title: string;
  subject: string; // e.g. "Computer Science", "Biology", "Calculus"
  author: string;
  professor?: string;
  semester?: string;
  description: string;
  status: ReadingStatus;
  priority: 'low' | 'medium' | 'high';
  rating: number; // 1-5 stars
  totalPages: number;
  pagesRead: number;
  tags: string[];
  keyTakeaways: string[];
  keyDefinitions?: KeyDefinition[];
  notesMarkdown?: string;
  
  // Media items
  photos: FileAttachment[];
  videoLinks: VideoLink[];
  shortVideos: FileAttachment[];
  documents: FileAttachment[];

  createdAt: string;
  updatedAt: string;
}

export interface KeyDefinition {
  term: string;
  definition: string;
}

export interface VoiceMessage {
  id: string;
  audioUrl: string; // Base64 data URI or blob URL
  durationSeconds: number;
  recordedAt: string;
  fileSizeFormatted?: string;
  waveform?: number[]; // Array of 0..1 amplitude values for stylized waveform rendering
}

export interface StudyTip {
  id: string;
  ownerId?: string;
  communityStatus?: 'pending' | 'approved' | 'rejected';
  moderationNote?: string | null;
  title: string;
  authorName: string;
  category: 'active_recall' | 'time_management' | 'note_taking' | 'exam_prep' | 'wellness' | 'resource_sharing';
  content: string;
  tags: string[];
  likes: number;
  userLiked?: boolean;
  createdAt: string;
  updatedAt?: string;
  voiceMessage?: VoiceMessage;
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  sourceMaterialTitle?: string;
}

export type EducationLevelType = 'university' | 'high_school';

export type UniversityYear = 
  | 'Year 1 (Freshman)'
  | 'Year 2 (Sophomore)'
  | 'Year 3 (Junior)'
  | 'Year 4 (Senior)'
  | 'Year 5+ (Extended)'
  | "Master's Degree"
  | 'PhD / Doctoral Candidate';

export type HighSchoolGrade = 
  | 'Grade 9 (Freshman)'
  | 'Grade 10 (Sophomore)'
  | 'Grade 11 (Junior)'
  | 'Grade 12 (Senior)'
  | 'Grade 7-8 (Junior High)';

export interface StudentProfile {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  educationLevel: EducationLevelType;
  universityYear?: UniversityYear;
  universityName?: string;
  majorFaculty?: string;
  highSchoolGrade?: HighSchoolGrade;
  highSchoolName?: string;
  academicStream?: string;
  primarySubjects?: string[];
  studentIdNumber?: string;
  registeredAt: string;
  updatedAt?: string;
}

export interface DailyStudyGoal {
  date: string; // YYYY-MM-DD
  targetPages: number;
  pagesCompleted: number;
  targetMaterials: number;
  materialsReviewedIds: string[];
  streakDays: number;
  lastAchievedDate?: string;
  history?: {
    [date: string]: {
      pages: number;
      targetPages: number;
      materialsCount: number;
      targetMaterials: number;
      achieved: boolean;
    };
  };
}

/* ============================================================================
   SPACED REPETITION (Anki-style) — Flashcard scheduling
   ============================================================================ */

export type CardRating = 'again' | 'hard' | 'good' | 'easy';

export interface FlashcardSRSData {
  cardId: string;
  easeFactor: number;        // SM-2 ease factor (default 2.5)
  interval: number;          // Days until next review
  repetitions: number;       // Number of successful consecutive reviews
  nextReviewAt: string;      // ISO date string
  lastReviewedAt?: string;   // ISO date string
  totalReviews: number;      // Total times reviewed
  lapses: number;            // Times rated "again"
  createdAt: string;
}

export interface EnhancedFlashcard extends Flashcard {
  srs?: FlashcardSRSData;
}

/* ============================================================================
   QUIZ / PRACTICE TEST
   ============================================================================ */

export type QuizQuestionType = 'multiple_choice' | 'short_answer' | 'true_false';

export interface QuizQuestion {
  id: string;
  type: QuizQuestionType;
  question: string;
  options?: string[];        // For multiple_choice
  correctAnswer: string;     // The correct option index (MC) or text (short_answer/TF)
  explanation?: string;      // Why this is correct
  sourceMaterialId?: string;
  sourceMaterialTitle?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  points: number;
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  questionId: string;
  userAnswer: string;
  isCorrect: boolean;
  pointsEarned: number;
  answeredAt: string;
}

export interface QuizSession {
  id: string;
  title: string;
  questions: QuizQuestion[];
  currentQuestionIndex: number;
  answers: Record<string, string>; // questionId -> userAnswer
  startedAt: string;
  completedAt?: string;
  score: number;
  totalPoints: number;
  timeLimitMinutes?: number;
}

/* ============================================================================
   GAMIFICATION — XP, Badges, Levels, Achievements
   ============================================================================ */

export interface UserGamification {
  userId: string;
  xp: number;
  level: number;
  xpToNextLevel: number;
  totalStudyMinutes: number;
  totalMaterialsCompleted: number;
  totalFlashcardsReviewed: number;
  totalQuizzesTaken: number;
  currentStreakDays: number;
  longestStreakDays: number;
  lastStudyDate?: string;
  badges: UserBadge[];
  achievements: UserAchievement[];
  createdAt: string;
  updatedAt: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;              // Lucide icon name
  color: string;             // Tailwind color class
  xpReward: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  condition: (stats: UserStats) => boolean;
}

export interface UserBadge {
  badgeId: string;
  earnedAt: string;
}

export interface UserAchievement {
  id: string;
  name: string;
  description: string;
  unlockedAt: string;
  xpReward: number;
}

export interface UserStats {
  xp: number;
  level: number;
  totalStudyMinutes: number;
  totalMaterialsCompleted: number;
  totalFlashcardsReviewed: number;
  totalQuizzesTaken: number;
  currentStreakDays: number;
  longestStreakDays: number;
  materialsBySubject: Record<string, number>;
  studySessionsThisWeek: number;
  averageQuizScore: number;
}

/* ============================================================================
   STUDY CALENDAR — Exams, assignments, deadlines
   ============================================================================ */

export type CalendarEventType = 'exam' | 'assignment' | 'study_session' | 'deadline';

export interface StudyCalendarEvent {
  id: string;
  title: string;
  type: CalendarEventType;
  subject: string;
  date: string;              // YYYY-MM-DD
  startTime?: string;        // HH:MM
  endTime?: string;          // HH:MM
  materialId?: string;       // Linked reading material
  description?: string;
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
  createdAt: string;
}

/* ============================================================================
   STUDY ANALYTICS
   ============================================================================ */

export interface StudyAnalytics {
  totalStudyTimeMinutes: number;
  studyTimeByDay: Record<string, number>; // date -> minutes
  studyTimeBySubject: Record<string, number>;
  materialsByStatus: Record<ReadingStatus, number>;
  averagePagesPerSession: number;
  flashcardMasteryRate: number; // 0-100
  quizAverageScore: number;     // 0-100
  streakDays: number;
  weakSubjects: string[];       // Subjects with lowest quiz scores
  strongSubjects: string[];     // Subjects with highest quiz scores
  lastUpdated: string;
}
