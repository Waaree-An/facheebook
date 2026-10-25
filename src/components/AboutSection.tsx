import React, { useState } from 'react';
import { 
  Heart, Youtube, Facebook, ExternalLink, Sparkles, GraduationCap, 
  CheckCircle2, BookOpen, Clock, Layers, Copy, Check, Share2, Award, Route
} from 'lucide-react';

export const AboutSection: React.FC = () => {
  const [copiedFb, setCopiedFb] = useState(false);
  const [copiedYt, setCopiedYt] = useState(false);

  const fbLink = 'https://www.facebook.com/Waareetube';
  const fbName = 'Waaree J Bakar';

  const ytLink = 'https://www.youtube.com/@Waareetube';
  const ytName = 'Waaree Tube💥';

  const copyToClipboard = (text: string, type: 'fb' | 'yt') => {
    navigator.clipboard.writeText(text);
    if (type === 'fb') {
      setCopiedFb(true);
      setTimeout(() => setCopiedFb(false), 2000);
    } else {
      setCopiedYt(true);
      setTimeout(() => setCopiedYt(false), 2000);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Hero Creator Header */}
      <div className="fb-themed-hero relative overflow-hidden bg-gradient-to-br from-[#111619] via-[#1B242A] to-[#080A0B] text-white rounded-3xl p-6 sm:p-10 shadow-lg border border-indigo-900/50">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-rose-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="bg-rose-500/20 border border-rose-400/40 text-rose-300 text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full flex items-center gap-1.5 shadow-2xs">
              <Heart className="w-3.5 h-3.5 fill-rose-400 text-rose-400 animate-pulse" />
              <span>Created with Love</span>
            </span>
            <span className="bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold px-3 py-1 rounded-full">
              FacheeBook Study Space
            </span>
          </div>

          <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-white leading-tight">
            About FacheeBook &amp; Creator
          </h2>

          {/* User's Exact Requested Text Callout */}
          <div className="fb-themed-hero-callout bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 sm:p-5 mt-4">
            <p className="text-sm sm:text-base font-bold text-rose-100 leading-relaxed flex items-start gap-2.5">
              <span className="text-xl shrink-0">💖</span>
              <span>
                This Useful app provided to you by your LOVER -<strong>Waaree Jabboo Bakar</strong>
              </span>
            </p>
          </div>

          <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
            Designed to elevate your student journey: easily organize and review lecture reading materials, 
            diagram photos, video links, short study clips, and documents of all formats—with spaced repetition 
            inactivity reminders and active recall flashcards.
          </p>
        </div>
      </div>

      {/* Social Media & Channels Card Grid */}
      <div>
        <div className="mb-4">
          <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <span>Connect with Waaree Jabboo Bakar</span>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </h3>
          <p className="text-xs text-slate-500 font-medium">
            Follow official channels for updates, educational tutorials, and study content.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* YouTube Channel Card */}
          <div className="bg-white rounded-3xl p-6 border-2 border-red-100 hover:border-red-300 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-red-600 text-white flex items-center justify-center shadow-md shadow-red-600/30 group-hover:scale-105 transition-transform">
                  <Youtube className="w-7 h-7" />
                </div>
                <span className="text-[11px] font-black uppercase tracking-wider text-red-600 bg-red-50 border border-red-200 px-2.5 py-1 rounded-full">
                  Official YouTube
                </span>
              </div>

              <div>
                <h4 className="text-lg font-black text-slate-900 group-hover:text-red-600 transition-colors">
                  {ytName}
                </h4>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  @Waareetube
                </p>
                <p className="text-xs text-slate-600 mt-2.5 leading-relaxed">
                  Subscribe to <strong>Waaree Tube💥</strong> on YouTube for student tutorials, lectures, 
                  and inspiring study sessions.
                </p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2.5">
              <a
                href={ytLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm shadow-red-600/20 active:scale-95 transition-all"
              >
                <Youtube className="w-4 h-4" />
                <span>Visit Waaree Tube💥</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-80" />
              </a>

              <button
                onClick={() => copyToClipboard(ytLink, 'yt')}
                className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
                title="Copy YouTube Link"
              >
                {copiedYt ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Facebook Page Card */}
          <div className="bg-white rounded-3xl p-6 border-2 border-blue-100 hover:border-blue-300 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-[#1877F2] text-white flex items-center justify-center shadow-md shadow-blue-600/30 group-hover:scale-105 transition-transform">
                  <Facebook className="w-7 h-7" />
                </div>
                <span className="text-[11px] font-black uppercase tracking-wider text-[#1877F2] bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full">
                  Official Facebook
                </span>
              </div>

              <div>
                <h4 className="text-lg font-black text-slate-900 group-hover:text-[#1877F2] transition-colors">
                  {fbName}
                </h4>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  fb.com/Waareetube
                </p>
                <p className="text-xs text-slate-600 mt-2.5 leading-relaxed">
                  Follow <strong>Waaree J Bakar</strong> on Facebook for announcements, peer study groups, 
                  and learning community discussions.
                </p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2.5">
              <a
                href={fbLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2.5 px-4 rounded-xl bg-[#1877F2] hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm shadow-blue-600/20 active:scale-95 transition-all"
              >
                <Facebook className="w-4 h-4" />
                <span>Visit Facebook Page</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-80" />
              </a>

              <button
                onClick={() => copyToClipboard(fbLink, 'fb')}
                className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
                title="Copy Facebook Page Link"
              >
                {copiedFb ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* App Highlights & Academic Purpose */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xs">
        <h3 className="text-base sm:text-lg font-black text-slate-900 mb-1 flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-indigo-600" />
          <span>FacheeBook Key Highlights</span>
        </h3>
        <p className="text-xs text-slate-500 mb-6">
          Everything built into this study station to support your daily academic success:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center mb-3">
              <BookOpen className="w-4 h-4" />
            </div>
            <h5 className="font-extrabold text-sm text-slate-900 mb-1">Universal Documents</h5>
            <p className="text-xs text-slate-600 leading-relaxed">
              Store and preview files of any extension—PDF, DOCX, Code, TXT, PPTX—with seamless in-browser reading.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-100">
            <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center mb-3">
              <Clock className="w-4 h-4" />
            </div>
            <h5 className="font-extrabold text-sm text-slate-900 mb-1">Inactivity Review Reminders</h5>
            <p className="text-xs text-slate-600 leading-relaxed">
              Spaced repetition alerts flag materials marked "To Read" or "Under Review" when untouched for 5+ days.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center mb-3">
              <Layers className="w-4 h-4" />
            </div>
            <h5 className="font-extrabold text-sm text-slate-900 mb-1">Active Recall Flashcards</h5>
            <p className="text-xs text-slate-600 leading-relaxed">
              Generate 3D flipping flashcards from your key takeaways and chapter notes to test your retention.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-100 sm:col-span-2 lg:col-span-3">
            <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center mb-3">
              <Route className="w-4 h-4" />
            </div>
            <h5 className="font-extrabold text-sm text-slate-900 mb-1">Visual Study Roadmaps &amp; Progression Tracks</h5>
            <p className="text-xs text-slate-600 leading-relaxed">
              Group and order reading materials into a multi-step sequence based on subject. Reorder steps to match syllabus progression and launch Pomodoro study sessions step-by-step.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
