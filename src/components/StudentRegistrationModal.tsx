import React, { useState, useEffect } from 'react';
import { 
  GraduationCap, School, User, Mail, BookOpen, CheckCircle2, 
  X, Sparkles, Award, ShieldCheck, ArrowRight, RefreshCw, IdCard, 
  Building2, Hash, Edit3, Check, Heart, Plus
} from 'lucide-react';
import { StudentProfile, EducationLevelType, UniversityYear, HighSchoolGrade } from '../types';
import confetti from 'canvas-confetti';

interface StudentRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProfile: StudentProfile | null;
  onSaveProfile: (profile: StudentProfile) => Promise<StudentProfile | void>;
}

const UNIVERSITY_YEARS: UniversityYear[] = [
  'Year 1 (Freshman)',
  'Year 2 (Sophomore)',
  'Year 3 (Junior)',
  'Year 4 (Senior)',
  'Year 5+ (Extended)',
  "Master's Degree",
  'PhD / Doctoral Candidate',
];

const HIGH_SCHOOL_GRADES: HighSchoolGrade[] = [
  'Grade 9 (Freshman)',
  'Grade 10 (Sophomore)',
  'Grade 11 (Junior)',
  'Grade 12 (Senior)',
  'Grade 7-8 (Junior High)',
];

const SUGGESTED_SUBJECTS = [
  'Computer Science', 'Biology', 'Calculus', 'Physics', 
  'Chemistry', 'Medicine', 'Literature', 'History', 
  'Economics', 'Psychology', 'Engineering', 'Philosophy'
];

export const StudentRegistrationModal: React.FC<StudentRegistrationModalProps> = ({
  isOpen,
  onClose,
  currentProfile,
  onSaveProfile,
}) => {
  // Mode: if profile exists, start in 'view' mode with an option to edit; otherwise start in 'edit' mode.
  const [isEditing, setIsEditing] = useState<boolean>(!currentProfile);

  // Form Fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [educationLevel, setEducationLevel] = useState<EducationLevelType>('university');
  
  // University specific
  const [universityYear, setUniversityYear] = useState<UniversityYear>('Year 2 (Sophomore)');
  const [universityName, setUniversityName] = useState('');
  const [majorFaculty, setMajorFaculty] = useState('');

  // High school specific
  const [highSchoolGrade, setHighSchoolGrade] = useState<HighSchoolGrade>('Grade 11 (Junior)');
  const [highSchoolName, setHighSchoolName] = useState('');
  const [academicStream, setAcademicStream] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [customStream, setCustomStream] = useState('');

  // Primary Subjects
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(['Computer Science']);
  const [customSubjectInput, setCustomSubjectInput] = useState('');

  // Validation
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Sync state with currentProfile
  useEffect(() => {
    if (currentProfile) {
      setFirstName(currentProfile.firstName || '');
      setLastName(currentProfile.lastName || '');
      setEmail(currentProfile.email || '');
      setEducationLevel(currentProfile.educationLevel || 'university');
      if (currentProfile.universityYear) setUniversityYear(currentProfile.universityYear);
      if (currentProfile.universityName) setUniversityName(currentProfile.universityName);
      if (currentProfile.majorFaculty) setMajorFaculty(currentProfile.majorFaculty);
      if (currentProfile.highSchoolGrade) setHighSchoolGrade(currentProfile.highSchoolGrade);
      if (currentProfile.highSchoolName) setHighSchoolName(currentProfile.highSchoolName);
      if (currentProfile.academicStream) {
        const knownStreams = ['Natural Science', 'Social Science', 'Other'];
        if (knownStreams.includes(currentProfile.academicStream)) setAcademicStream(currentProfile.academicStream);
        else { setAcademicStream('Other'); setCustomStream(currentProfile.academicStream); }
      }
      if (currentProfile.primarySubjects) setSelectedSubjects(currentProfile.primarySubjects);
      setIsEditing(false);
    } else {
      setIsEditing(true);
    }
  }, [currentProfile, isOpen]);

  if (!isOpen) return null;

  const toggleSubject = (sub: string) => {
    setSelectedSubjects((prev) => 
      prev.includes(sub) ? prev.filter((s) => s !== sub) : [...prev, sub]
    );
  };

  const handleAddCustomSubject = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    if (customSubjectInput.trim()) {
      const trimmed = customSubjectInput.trim();
      if (!selectedSubjects.includes(trimmed)) {
        setSelectedSubjects((prev) => [...prev, trimmed]);
      }
      setCustomSubjectInput('');
    }
  };

  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};
    if (!firstName.trim()) errs.firstName = 'First name is required';
    if (!lastName.trim()) errs.lastName = 'Last name is required';
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errs.email = 'Enter a valid email address or leave this field blank';
    }

    if (educationLevel === 'university') {
      if (!universityYear) errs.universityYear = 'Please select your university year';
    } else {
      if (!highSchoolGrade) errs.highSchoolGrade = 'Please select your high school grade';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSaving(true);
    setSaveError('');
    const studentIdNumber = currentProfile?.studentIdNumber;

    const newProfile: StudentProfile = {
      id: currentProfile?.id || `student_${Date.now()}`,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim() || undefined,
      educationLevel,
      universityYear: educationLevel === 'university' ? universityYear : undefined,
      universityName: educationLevel === 'university' ? (universityName.trim() || 'University Scholar') : undefined,
      majorFaculty: educationLevel === 'university' ? (majorFaculty.trim() || 'General Studies') : undefined,
      highSchoolGrade: educationLevel === 'high_school' ? highSchoolGrade : undefined,
      highSchoolName: educationLevel === 'high_school' ? (highSchoolName.trim() || 'High School Scholar') : undefined,
      academicStream: educationLevel === 'high_school' ? (academicStream === 'Other' ? customStream.trim() : academicStream) : undefined,
      primarySubjects: selectedSubjects,
      studentIdNumber,
      registeredAt: currentProfile?.registeredAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    void onSaveProfile(newProfile).then((savedProfile) => {
      if (savedProfile) {
        // Parent may return the canonical cloud profile, including its permanent FacheeBook ID.
      }
      setIsEditing(false);
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
    }).catch((error: unknown) => {
      setSaveError(error instanceof Error ? error.message : 'Profile could not be saved. Please try again.');
    }).finally(() => setSaving(false));
  };

  const activeLevelLabel = educationLevel === 'university' 
    ? `University • ${universityYear}` 
    : `High School • ${highSchoolGrade}`;

  const institutionDisplayName = educationLevel === 'university' 
    ? (universityName || 'University / College') 
    : (highSchoolName || 'High School');

  const focusDisplayName = educationLevel === 'university' 
    ? (majorFaculty || 'Major / Field of Study') 
    : (academicStream || 'Academic Track');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-3 sm:my-6 animate-in fade-in zoom-in-95 duration-200 max-h-[94dvh] flex flex-col">
        
        {/* Header Ribbon */}
        <div className="fb-student-modal-header bg-gradient-to-r from-[#111619] via-[#1B242A] to-[#080A0B] text-white p-4 sm:p-6 flex items-start justify-between gap-2 shrink-0 border-b border-indigo-900/50">
          <div className="flex min-w-0 items-start gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-11 sm:h-11 shrink-0 rounded-2xl bg-indigo-600/30 border border-indigo-400/40 text-amber-300 flex items-center justify-center shadow-inner">
              <IdCard className="w-6 h-6 text-amber-400" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <h3 className="min-w-0 text-base sm:text-xl font-black leading-tight text-white">
                  <span className="sm:hidden">Student profile</span>
                  <span className="hidden sm:inline">Student Registration &amp; Academic Profile</span>
                </h3>
                <span className="hidden shrink-0 bg-indigo-500/20 text-indigo-300 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border border-indigo-400/30 sm:inline-flex">
                  FacheeBook
                </span>
              </div>
              <p className="mt-1 text-[11px] leading-snug text-slate-300 font-medium sm:text-xs">
                <span className="sm:hidden">Personalize your study path.</span>
                <span className="hidden sm:inline">Register as a University or High School student to personalize your study path.</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Scrollable */}
        <div className="p-5 sm:p-7 overflow-y-auto space-y-6">

          {/* VIEW MODE: If already registered and not currently editing, show Digital Student Card & Profile Details */}
          {currentProfile && !isEditing ? (
            <div className="space-y-6">
              {/* Digital Student ID Card */}
              <div className="fb-student-card relative overflow-hidden bg-gradient-to-br from-[#111619] via-[#1B242A] to-[#080A0B] text-white rounded-3xl p-6 sm:p-8 shadow-lg border-2 border-indigo-500/30">
                <div className="absolute -right-12 -top-12 w-48 h-48 bg-indigo-500/15 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-amber-500/15 rounded-full blur-2xl pointer-events-none" />

                <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 pb-5 border-b border-white/10">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#B8860B] to-[#F4C75B] text-white font-black text-xl flex items-center justify-center shadow-md border-2 border-white/20">
                      {currentProfile.firstName[0]}{currentProfile.lastName[0]}
                    </div>
                    <div>
                      <span className="text-[10px] font-black tracking-widest uppercase text-amber-400">
                        Official Student Member
                      </span>
                      <h4 className="text-xl sm:text-2xl font-black text-white">
                        {currentProfile.firstName} {currentProfile.lastName}
                      </h4>
                      <p className="text-xs text-slate-300 font-mono">
                        ID: {currentProfile.studentIdNumber || 'Assigned when cloud profile is saved'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-bold text-amber-300 flex items-center gap-1.5 shadow-2xs">
                      {currentProfile.educationLevel === 'university' ? (
                        <GraduationCap className="w-4 h-4 text-amber-400" />
                      ) : (
                        <School className="w-4 h-4 text-emerald-400" />
                      )}
                      <span>
                        {currentProfile.educationLevel === 'university' ? 'University Student' : 'High School Student'}
                      </span>
                    </span>
                  </div>
                </div>

                {/* Card Specific Details */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-5">
                  <div className="bg-white/5 rounded-2xl p-3.5 border border-white/10">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                      {currentProfile.educationLevel === 'university' ? 'University Year' : 'High School Grade'}
                    </span>
                    <span className="text-sm font-extrabold text-white mt-1 block">
                      {currentProfile.educationLevel === 'university' 
                        ? currentProfile.universityYear 
                        : currentProfile.highSchoolGrade}
                    </span>
                  </div>

                  <div className="bg-white/5 rounded-2xl p-3.5 border border-white/10">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                      Institution / School
                    </span>
                    <span className="text-sm font-extrabold text-white mt-1 block truncate">
                      {currentProfile.educationLevel === 'university' 
                        ? (currentProfile.universityName || 'University Scholar') 
                        : (currentProfile.highSchoolName || 'High School Scholar')}
                    </span>
                  </div>

                  <div className="bg-white/5 rounded-2xl p-3.5 border border-white/10">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                      {currentProfile.educationLevel === 'university' ? 'Major / Department' : 'Academic Stream'}
                    </span>
                    <span className="text-sm font-extrabold text-white mt-1 block truncate">
                      {currentProfile.educationLevel === 'university' 
                        ? (currentProfile.majorFaculty || 'General Studies') 
                        : (currentProfile.academicStream || 'General Academic')}
                    </span>
                  </div>
                </div>

                {/* Primary Subjects */}
                {currentProfile.primarySubjects && currentProfile.primarySubjects.length > 0 && (
                  <div className="pt-4 flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] text-slate-400 font-semibold mr-1">Study Focus:</span>
                    {currentProfile.primarySubjects.map((sub) => (
                      <span 
                        key={sub}
                        className="bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 text-[10px] font-bold px-2 py-0.5 rounded-md"
                      >
                        {sub}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Edit or Re-register Action */}
              <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="hidden text-xs text-slate-500 sm:flex sm:items-center sm:gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>FacheeBook student profile</span>
                </div>

                <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:items-center">
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex min-w-0 items-center justify-center gap-1.5 whitespace-nowrap px-2.5 py-2.5 sm:px-4 sm:py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[11px] sm:text-xs font-bold transition-all shadow-xs cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span className="sm:hidden">Edit profile</span>
                    <span className="hidden sm:inline">Edit Registration Details</span>
                  </button>
                  <button
                    onClick={onClose}
                    className="min-w-0 whitespace-nowrap px-2.5 py-2.5 sm:px-4 sm:py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[11px] sm:text-xs font-bold transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* EDIT / REGISTRATION FORM */
            <form onSubmit={handleSubmit} className="space-y-6">

              {/* Education Level Primary Switcher */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700 block">
                  Select Your Level of Education <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* University Option */}
                  <button
                    type="button"
                    onClick={() => {
                      setEducationLevel('university');
                      setErrors((prev) => ({ ...prev, universityYear: '', highSchoolGrade: '' }));
                    }}
                    className={`p-4 rounded-2xl border-2 text-left transition-all flex items-start gap-3.5 cursor-pointer ${
                      educationLevel === 'university'
                        ? 'border-indigo-600 bg-indigo-50/60 shadow-xs ring-2 ring-indigo-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      educationLevel === 'university'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-500'
                    }`}>
                      <GraduationCap className="w-6 h-6" />
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-extrabold text-sm text-slate-900">University / College Student</h4>
                        {educationLevel === 'university' && (
                          <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                        )}
                      </div>
                      <p className="text-xs text-slate-500 font-medium">
                        Undergraduate, Graduate, Master's, or PhD level studies.
                      </p>
                    </div>
                  </button>

                  {/* High School Option */}
                  <button
                    type="button"
                    onClick={() => {
                      setEducationLevel('high_school');
                      setErrors((prev) => ({ ...prev, universityYear: '', highSchoolGrade: '' }));
                    }}
                    className={`p-4 rounded-2xl border-2 text-left transition-all flex items-start gap-3.5 cursor-pointer ${
                      educationLevel === 'high_school'
                        ? 'border-indigo-600 bg-indigo-50/60 shadow-xs ring-2 ring-indigo-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      educationLevel === 'high_school'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-500'
                    }`}>
                      <School className="w-6 h-6" />
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-extrabold text-sm text-slate-900">High School Student</h4>
                        {educationLevel === 'high_school' && (
                          <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                        )}
                      </div>
                      <p className="text-xs text-slate-500 font-medium">
                        Grade 9 to 12, AP/IB, STEM, or secondary school tracks.
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Student Name Section */}
              <div className="bg-slate-50/80 rounded-2xl p-4 sm:p-5 border border-slate-200/80 space-y-4">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-indigo-600" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                    Student Identification
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* First Name */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      First Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Waaree"
                      value={firstName}
                      onChange={(e) => {
                        setFirstName(e.target.value);
                        if (errors.firstName) setErrors((prev) => ({ ...prev, firstName: '' }));
                      }}
                      className={`w-full px-3.5 py-2 text-sm bg-white border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all ${
                        errors.firstName ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200'
                      }`}
                    />
                    {errors.firstName && (
                      <p className="text-[11px] text-rose-500 font-medium mt-1">{errors.firstName}</p>
                    )}
                  </div>

                  {/* Last Name */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Last Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Bakar"
                      value={lastName}
                      onChange={(e) => {
                        setLastName(e.target.value);
                        if (errors.lastName) setErrors((prev) => ({ ...prev, lastName: '' }));
                      }}
                      className={`w-full px-3.5 py-2 text-sm bg-white border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all ${
                        errors.lastName ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200'
                      }`}
                    />
                    {errors.lastName && (
                      <p className="text-[11px] text-rose-500 font-medium mt-1">{errors.lastName}</p>
                    )}
                  </div>
                </div>

                {/* Email (Optional) */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Student Email Address <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      placeholder="student@university.edu or student@school.org"
                      value={email}
                      aria-invalid={Boolean(errors.email)}
                      onChange={(e) => { setEmail(e.target.value); setErrors((prev) => ({ ...prev, email: '' })); }}
                      className="w-full pl-9 pr-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
                    />
                  </div>
                  {errors.email && <p role="alert" className="mt-1 text-xs font-semibold text-rose-600">{errors.email}</p>}
                </div>
              </div>

              {/* CONDITIONAL SECTION: IF UNIVERSITY */}
              {educationLevel === 'university' && (
                <div className="bg-indigo-50/40 rounded-2xl p-4 sm:p-5 border border-indigo-100 space-y-4 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-indigo-600" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-indigo-900">
                      University Academic Details
                    </h4>
                  </div>

                  {/* University Year Selector */}
                  <div>
                    <label className="text-xs font-bold text-slate-800 block mb-2">
                      What year of university are you in? <span className="text-rose-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {UNIVERSITY_YEARS.map((yr) => (
                        <button
                          key={yr}
                          type="button"
                          onClick={() => setUniversityYear(yr)}
                          className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer text-left flex items-center justify-between ${
                            universityYear === yr
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300'
                          }`}
                        >
                          <span className="truncate">{yr}</span>
                          {universityYear === yr && <Check className="w-3.5 h-3.5 shrink-0" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    {/* University Name */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        University / College Name
                      </label>
                      <div className="relative">
                        <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="e.g. Jimma University"
                          value={universityName}
                          onChange={(e) => setUniversityName(e.target.value)}
                          className="w-full pl-9 pr-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
                        />
                      </div>
                    </div>

                    {/* Major / Faculty */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        Major / Faculty / Department
                      </label>
                      <div className="relative">
                        <BookOpen className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="e.g. Computer Science / Pre-Med"
                          value={majorFaculty}
                          onChange={(e) => setMajorFaculty(e.target.value)}
                          className="w-full pl-9 pr-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* CONDITIONAL SECTION: IF HIGH SCHOOL */}
              {educationLevel === 'high_school' && (
                <div className="bg-amber-50/40 rounded-2xl p-4 sm:p-5 border border-amber-100 space-y-4 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2">
                    <School className="w-4 h-4 text-amber-600" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-amber-900">
                      High School Academic Details
                    </h4>
                  </div>

                  {/* High School Grade Selector */}
                  <div>
                    <label className="text-xs font-bold text-slate-800 block mb-2">
                      What grade are you in? <span className="text-rose-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {HIGH_SCHOOL_GRADES.map((grd) => (
                        <button
                          key={grd}
                          type="button"
                          onClick={() => setHighSchoolGrade(grd)}
                          className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer text-left flex items-center justify-between ${
                            highSchoolGrade === grd
                              ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-amber-300'
                          }`}
                        >
                          <span className="truncate">
                            <span className="sm:hidden">{grd.split(' (')[0]}</span>
                            <span className="hidden sm:inline">{grd}</span>
                          </span>
                          {highSchoolGrade === grd && <Check className="w-3.5 h-3.5 shrink-0" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    {/* High School Name */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        High School Name
                      </label>
                      <div className="relative">
                        <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="e.g. Fechatu Secondary School"
                          value={highSchoolName}
                          onChange={(e) => setHighSchoolName(e.target.value)}
                          className="w-full pl-9 pr-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
                        />
                      </div>
                    </div>

                    {/* Academic Stream / Track */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        Academic Stream / Track
                      </label>
                      <div className="relative">
                        <BookOpen className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <select
                          value={academicStream}
                          onChange={(e) => setAcademicStream(e.target.value)}
                          className="w-full pl-9 pr-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
                        >
                          <option value="">Choose a stream (optional)</option>
                          <option value="Natural Science">Natural Science</option>
                          <option value="Social Science">Social Science</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      {academicStream === 'Other' && <input type="text" value={customStream} onChange={(e) => setCustomStream(e.target.value)} placeholder="Enter your stream" className="mt-2 w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all" />}
                      <p className="mt-1 text-[11px] text-slate-500">Choose the stream used by your school, or select Other.</p>
                    </div>
                  </div>
                </div>
              )}

              {saveError && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{saveError}</p>}

              {/* Primary Study Focus / Favorite Subjects */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 block">
                  Primary Study Focus &amp; Subjects
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTED_SUBJECTS.map((sub) => {
                    const isSelected = selectedSubjects.includes(sub);
                    return (
                      <button
                        key={sub}
                        type="button"
                        onClick={() => toggleSubject(sub)}
                        className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow-2xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '}
                        {sub}
                      </button>
                    );
                  })}
                </div>

                <div className="flex min-w-0 gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Add other subject (press Enter)..."
                    value={customSubjectInput}
                    onChange={(e) => setCustomSubjectInput(e.target.value)}
                    onKeyDown={handleAddCustomSubject}
                    className="min-w-0 flex-1 px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomSubject}
                    aria-label="Add subject"
                    title="Add subject"
                    className="flex h-10 w-10 shrink-0 items-center justify-center whitespace-nowrap bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer sm:h-auto sm:w-auto sm:px-3 sm:py-2"
                  >
                    <Plus className="h-4 w-4 sm:hidden" />
                    <span className="hidden sm:inline">Add</span>
                  </button>
                </div>
              </div>

              {/* Live Preview Card */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/90 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                  <span>Live Student ID Preview</span>
                  <span className="text-indigo-600 font-bold">FacheeBook Profile</span>
                </div>
                <div className="bg-white rounded-xl p-3 border border-slate-200 flex flex-col items-start gap-2 shadow-2xs sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                  <div className="flex min-w-0 w-full items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-black text-sm flex items-center justify-center">
                      {(firstName[0] || 'S')}{(lastName[0] || 'T')}
                    </div>
                    <div className="min-w-0">
                      <h5 className="break-words font-extrabold text-sm text-slate-900 leading-tight">
                        {firstName.trim() || 'Student'} {lastName.trim() || 'Name'}
                      </h5>
                      <p className="break-words text-[11px] text-slate-500 font-medium">
                        {activeLevelLabel} • {institutionDisplayName}
                      </p>
                    </div>
                  </div>
                  <span className="max-w-full break-words text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-1 rounded-md sm:self-start">
                    {focusDisplayName}
                  </span>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                {currentProfile ? (
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    <span className="sm:hidden">Cancel</span>
                    <span className="hidden sm:inline">Cancel Editing</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-slate-500 hover:text-slate-800 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Skip for Now
                  </button>
                )}

                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-wait text-white rounded-xl text-xs font-extrabold shadow-sm shadow-indigo-600/20 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="sm:hidden">{saving ? 'Saving…' : currentProfile ? 'Save' : 'Register'}</span>
                  <span className="hidden sm:inline">{saving ? 'Saving to cloud…' : currentProfile ? 'Save Changes' : 'Complete Registration'}</span>
                </button>
              </div>
            </form>
          )}

        </div>

      </div>
    </div>
  );
};
