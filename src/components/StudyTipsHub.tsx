import React, { useState } from 'react';
import { 
  Lightbulb, Sparkles, ThumbsUp, Share2, Plus, Search, 
  Tag, BookOpen, Clock, Heart, Award, Copy, Check, MessageSquare,
  Mic, MicOff, Volume2, Radio, Headphones
} from 'lucide-react';
import { StudyTip, VoiceMessage } from '../types';
import { VoiceTipRecorder } from './VoiceTipRecorder';
import { VoiceMessagePlayer } from './VoiceMessagePlayer';
import { VoiceMessageRecorder } from './VoiceMessageRecorder';
import confetti from 'canvas-confetti';

interface StudyTipsHubProps {
  tips: StudyTip[];
  onAddTip: (newTip: StudyTip) => void;
  onLikeTip: (id: string) => void;
}

export const StudyTipsHub: React.FC<StudyTipsHubProps> = ({
  tips,
  onAddTip,
  onLikeTip,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterHasVoice, setFilterHasVoice] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // New tip form state
  const [title, setTitle] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [category, setCategory] = useState<StudyTip['category']>('active_recall');
  const [content, setContent] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [isSparkingAi, setIsSparkingAi] = useState(false);
  // Set when the server served canned content instead of real Gemini output.
  const [usedFallback, setUsedFallback] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [voiceMessage, setVoiceMessage] = useState<VoiceMessage | null>(null);

  // Handle transcript received from microphone voice recording
  const handleVoiceTranscript = (text: string, mode: 'append' | 'replace', targetField: 'content' | 'title') => {
    if (targetField === 'content') {
      setContent((prev) => {
        if (mode === 'replace' || !prev.trim()) return text;
        const cleanPrev = prev.trim();
        return `${cleanPrev} ${text}`;
      });
    } else {
      setTitle((prev) => {
        if (mode === 'replace' || !prev.trim()) return text;
        const cleanPrev = prev.trim();
        return `${cleanPrev} ${text}`;
      });
    }
  };

  // Categories list
  const categories = [
    { id: 'all', label: '🌟 All Study Tips' },
    { id: 'active_recall', label: '🧠 Active Recall & Retention' },
    { id: 'time_management', label: '⏱️ Focus & Time Hacks' },
    { id: 'note_taking', label: '📝 Note Taking & Annotations' },
    { id: 'exam_prep', label: '🎯 Exam Strategy' },
    { id: 'wellness', label: '🧘 Student Wellness' },
    { id: 'resource_sharing', label: '🤝 Study Group Sharing' },
  ];

  // Filter tips
  const filteredTips = tips.filter((tip) => {
    const matchesCat = selectedCategory === 'all' || tip.category === selectedCategory;
    const matchesVoice = !filterHasVoice || !!tip.voiceMessage;
    const matchesSearch = 
      tip.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tip.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tip.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())) ||
      tip.authorName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesVoice && matchesSearch;
  });

  // Tip of the day (highest liked tip)
  const tipOfTheDay = [...tips].sort((a, b) => b.likes - a.likes)[0] || tips[0];

  // Copy tip to clipboard
  const handleCopyTip = async (tip: StudyTip) => {
    const text = `💡 "${tip.title}" by ${tip.authorName} [FacheeBook Study Tip]\n${tip.content}\nTags: ${tip.tags.map(t => '#' + t).join(' ')}`;
    setCopyError(null);
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(text);
      setCopiedId(tip.id);
      window.setTimeout(() => setCopiedId((current) => current === tip.id ? null : current), 2000);
    } catch {
      setCopyError('Could not copy automatically. Please select and copy the tip text manually.');
    }
  };

  // Spark AI Tip
  const handleSparkAITip = async () => {
    setIsSparkingAi(true);
    setUsedFallback(false);
    try {
      const res = await fetch('/api/ai-study-tip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: title || 'Deep Reading', category }),
      });
      if (!res.ok) throw new Error(`AI request failed (${res.status})`);
      const data = await res.json();
      if (!data || typeof data !== 'object') throw new Error('Invalid AI response');
      if (data.title) setTitle(data.title);
      if (data.content) setContent(data.content);
      if (data.tags) setTagsInput(data.tags.join(', '));
      if (!authorName) setAuthorName('Fachee Scholar');
      // The server falls back to a canned tip when Gemini is unreachable.
      setUsedFallback(data.source === 'fallback');
    } catch (err) {
      setFormError('AI suggestions are unavailable right now. You can keep writing your own tip or try again later.');
    } finally {
      setIsSparkingAi(false);
    }
  };

  // Submit new tip
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setFormError('Add both a title and the tip instructions before posting.');
      return;
    }
    setFormError(null);
    const normalizedTags: string[] = Array.from(new Set<string>(tagsInput.split(',').map((tag) => tag.trim().replace(/^#/, '')).filter(Boolean)));

    const newTip: StudyTip = {
      id: 'tip_' + Date.now(),
      title: title.trim(),
      authorName: authorName.trim() || 'Anonymous Student',
      category,
      content: content.trim(),
      tags: normalizedTags,
      likes: 1,
      userLiked: true,
      createdAt: new Date().toISOString().split('T')[0],
      voiceMessage: voiceMessage || undefined,
    };

    onAddTip(newTip);
    confetti({ particleCount: 50, spread: 60 });
    setIsShareModalOpen(false);
    setTitle('');
    setAuthorName('');
    setCategory('active_recall');
    setContent('');
    setTagsInput('');
    setVoiceMessage(null);
    setShowVoiceRecorder(false);
    setFormError(null);
  };

  return (
    <div className="space-y-6">
      
      {/* Spotlight Header Banner */}
      <div className="bg-gradient-to-br from-[#111619] via-[#1B242A] to-[#080A0B] border border-amber-300/20 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-amber-400 text-slate-950 text-xs font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 fill-current" />
              FacheeBook Community
            </span>
            <span className="text-indigo-200 text-xs font-semibold">
              • Student Knowledge & Strategy Exchange
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black tracking-tight mb-2">
            Study Tips & Wisdom Hub
          </h2>
          <p className="text-xs sm:text-sm text-indigo-100 font-normal leading-relaxed mb-6">
            Proven study habits, active recall techniques, and exam retention strategies shared by students across universities. Share your own tips to help fellow students excel!
          </p>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => {
                setShowVoiceRecorder(false);
                setIsShareModalOpen(true);
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-extrabold shadow-lg shadow-amber-400/20 active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Share a Study Tip</span>
            </button>

            <button
              onClick={() => {
                setShowVoiceRecorder(false);
                setIsShareModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-extrabold shadow-lg shadow-rose-500/20 active:scale-95 transition-all cursor-pointer border border-rose-400/40"
            >
              <Mic className="w-4 h-4 animate-pulse" />
              <span>Post Voice Message Tip</span>
            </button>
          </div>
        </div>
      </div>

      {copyError && (
        <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900">{copyError}</div>
      )}

      {/* Tip of the Day Featured Card */}
      {tipOfTheDay && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/90 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black flex-shrink-0 shadow-md shadow-amber-400/30">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 bg-amber-200/70 px-2 py-0.5 rounded-md">
                  Community Favorite Tip
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  By {tipOfTheDay.authorName}
                </span>
              </div>
              <h3 className="text-base font-extrabold text-slate-900 mb-1">
                {tipOfTheDay.title}
              </h3>
              <p className="text-xs text-slate-700 leading-relaxed max-w-2xl">
                {tipOfTheDay.content}
              </p>

              {tipOfTheDay.voiceMessage && (
                <div className="mt-3 max-w-xl">
                  <VoiceMessagePlayer
                    voiceMessage={tipOfTheDay.voiceMessage}
                    authorName={tipOfTheDay.authorName}
                    variant="featured"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
            <button
              onClick={() => onLikeTip(tipOfTheDay.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                tipOfTheDay.userLiked
                  ? 'bg-amber-400 text-slate-950'
                  : 'bg-white text-slate-700 border border-amber-200 hover:bg-amber-100'
              }`}
            >
              <ThumbsUp className="w-3.5 h-3.5" />
              <span>{tipOfTheDay.likes}</span>
            </button>
            <button
              onClick={() => handleCopyTip(tipOfTheDay)}
              className="p-2 bg-white hover:bg-amber-100 border border-amber-200 rounded-xl text-slate-600 transition-colors"
              title="Copy Tip"
            >
              {copiedId === tipOfTheDay.id ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}

      {/* Category Pills & Search */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Category selector */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {/* Voice Notes Only filter */}
          <button
            onClick={() => setFilterHasVoice((prev) => !prev)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              filterHasVoice
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-rose-50 hover:border-rose-200'
            }`}
          >
            <Mic className={`w-3.5 h-3.5 ${filterHasVoice ? 'animate-pulse' : 'text-rose-500'}`} />
            <span>🎙️ Voice Notes</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              filterHasVoice ? 'bg-rose-700 text-white' : 'bg-slate-100 text-slate-600'
            }`}>
              {tips.filter(t => !!t.voiceMessage).length}
            </span>
          </button>

          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                selectedCategory === cat.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search study tips or tags..."
            className="w-full pl-9 pr-3.5 py-1.5 text-xs bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-400 transition-all font-medium"
          />
        </div>
      </div>

      {/* Tips Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredTips.map((tip) => (
          <div
            key={tip.id}
            className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs hover:shadow-md hover:border-indigo-200 transition-all flex flex-col justify-between"
          >
            <div>
              {/* Header */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="bg-indigo-50 text-indigo-700 text-[10px] font-extrabold px-2.5 py-0.5 rounded-lg border border-indigo-100 uppercase tracking-wider">
                  {tip.category.replace('_', ' ')}
                </span>
                <span className="text-[11px] text-slate-400 font-medium">
                  {tip.createdAt}
                </span>
              </div>

              <h4 className="font-extrabold text-base text-slate-900 mb-2">
                {tip.title}
              </h4>

              <p className="text-xs text-slate-600 leading-relaxed mb-3.5">
                {tip.content}
              </p>

              {/* Attached Voice Message Player */}
              {tip.voiceMessage && (
                <div className="mb-4">
                  <VoiceMessagePlayer
                    voiceMessage={tip.voiceMessage}
                    authorName={tip.authorName}
                    variant="card"
                  />
                </div>
              )}

              {/* Tags */}
              {tip.tags.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap mb-4">
                  {tip.tags.map((tag, idx) => (
                    <span key={idx} className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <span className="text-[11px] text-slate-500 font-semibold truncate">
                Shared by <span className="text-slate-900 font-bold">{tip.authorName}</span>
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopyTip(tip)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                  title="Copy tip text"
                >
                  {copiedId === tip.id ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>

                <button
                  onClick={() => onLikeTip(tip.id)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                    tip.userLiked
                      ? 'bg-indigo-100 text-indigo-800'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                  <span>{tip.likes}</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredTips.length === 0 && (
        <div className="text-center py-12 bg-white rounded-3xl border border-slate-200">
          <Lightbulb className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-700">No study tips match your search</p>
          <p className="text-xs text-slate-400 mt-1">Be the first to share a tip for this category!</p>
          <button
            onClick={() => setIsShareModalOpen(true)}
            className="mt-3 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl"
          >
            Share a Study Tip
          </button>
        </div>
      )}

      {/* Share a Tip Modal */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) setIsShareModalOpen(false); }}>
          <div role="dialog" aria-modal="true" aria-labelledby="share-tip-title" className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                  <Lightbulb className="w-4 h-4" />
                </div>
                <h3 id="share-tip-title" className="font-extrabold text-base text-slate-900">
                  Share a Study Tip to FacheeBook
                </h3>
              </div>
              <button
                onClick={() => setIsShareModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-3.5">
              {formError && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800">{formError}</p>}
              {usedFallback && (
                <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                  This is an offline sample tip — the AI service was unavailable.
                </p>
              )}
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700">
                  Tip Title <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowVoiceRecorder((prev) => !prev)}
                    className="flex items-center gap-1 text-xs text-indigo-600 font-bold hover:underline cursor-pointer"
                    title="Toggle voice dictation"
                  >
                    <Mic className="w-3.5 h-3.5" />
                    <span>Voice Input</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSparkAITip}
                    disabled={isSparkingAi}
                    className="flex items-center gap-1 text-xs text-amber-700 font-bold hover:underline cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{isSparkingAi ? 'Sparking Idea...' : 'Spark with AI'}</span>
                  </button>
                </div>
              </div>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => { setTitle(e.target.value); setFormError(null); }}
                placeholder="e.g. The 10-Minute Pre-Lecture Scan"
                className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-400"
              />

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Your Nickname</label>
                  <input
                    type="text"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    placeholder="e.g. Maya (Bio Major)"
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl outline-none font-semibold"
                  >
                    <option value="active_recall">Active Recall</option>
                    <option value="time_management">Time & Focus</option>
                    <option value="note_taking">Note Taking</option>
                    <option value="exam_prep">Exam Strategy</option>
                    <option value="wellness">Wellness</option>
                    <option value="resource_sharing">Group Sharing</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Tip Advice & Instructions <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowVoiceRecorder((prev) => !prev)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      showVoiceRecorder
                        ? 'bg-rose-100 text-rose-800 border border-rose-200 shadow-2xs'
                        : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200/60'
                    }`}
                    title="Record tip using microphone"
                  >
                    <Mic className={`w-3.5 h-3.5 ${showVoiceRecorder ? 'text-rose-600 animate-pulse' : 'text-indigo-600'}`} />
                    <span>{showVoiceRecorder ? 'Hide Voice Panel' : 'Voice-to-Text Input'}</span>
                  </button>
                </div>

                {showVoiceRecorder && (
                  <div className="mb-2.5 animate-in fade-in slide-in-from-top-2 duration-150">
                    <VoiceTipRecorder
                      onTranscriptChange={handleVoiceTranscript}
                      currentContent={content}
                      currentTitle={title}
                      defaultTargetField="content"
                    />
                  </div>
                )}

                <textarea
                  required
                  rows={showVoiceRecorder ? 3 : 4}
                  value={content}
                  onChange={(e) => { setContent(e.target.value); setFormError(null); }}
                  placeholder={showVoiceRecorder ? "Your spoken words will be transcribed here automatically in real-time (you can also edit or type)..." : "Explain exactly how to execute this study technique and why it works (or click Voice-to-Text to record with your microphone)..."}
                  className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-400"
                />
              </div>

              {/* Attach Voice Message / Audio Note */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Mic className="w-3.5 h-3.5 text-rose-500" />
                    <span>Voice Message / Audio Note (Optional)</span>
                  </label>
                  {voiceMessage && (
                    <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                      ✓ Audio Attached
                    </span>
                  )}
                </div>
                <VoiceMessageRecorder
                  voiceMessage={voiceMessage}
                  onVoiceMessageChange={setVoiceMessage}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tags (comma separated)</label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="e.g. Focus, Exams, Biology, Memory"
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsShareModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  Post Study Tip
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
