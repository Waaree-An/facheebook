import React, { useEffect, useRef, useState } from 'react';
import { 
  Lightbulb, Sparkles, ThumbsUp, Share2, Plus, Search, 
  Tag, BookOpen, Clock, Heart, Award, Copy, Check, MessageSquare,
  Mic, MicOff, Volume2, Radio, Headphones, Trash2, Pencil,
  Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, ChevronDown
} from 'lucide-react';
import ReactMarkdown, { type Components } from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import { StudyTip, VoiceMessage } from '../types';
import { getApiUrl } from '../utils/api';
import { VoiceTipRecorder } from './VoiceTipRecorder';
import { VoiceMessagePlayer } from './VoiceMessagePlayer';
import { VoiceMessageRecorder } from './VoiceMessageRecorder';
import confetti from 'canvas-confetti';

const tipSanitizeSchema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), 'u'],
  attributes: { ...defaultSchema.attributes, u: [] },
};

const tipMarkdownComponents: Components = {
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>,
  ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>,
  li: ({ children }) => <li className="pl-0.5">{children}</li>,
  blockquote: ({ children }) => <blockquote className="my-2 border-l-2 border-amber-400/70 pl-3 italic">{children}</blockquote>,
  u: ({ children }) => <u className="underline decoration-amber-400 underline-offset-2">{children}</u>,
};

const TipContent: React.FC<{ content: string; className?: string }> = ({ content, className = '' }) => (
  <div className={className}>
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkBreaks]}
      rehypePlugins={[rehypeRaw, [rehypeSanitize, tipSanitizeSchema]]}
      components={tipMarkdownComponents}
    >
      {content}
    </ReactMarkdown>
  </div>
);

interface StudyTipsHubProps {
  tips: StudyTip[];
  currentUserId: string;
  onAddTip: (newTip: StudyTip) => void;
  onUpdateTip: (updatedTip: StudyTip) => void;
  onLikeTip: (id: string) => void;
  onDeleteTip: (id: string) => void;
}

export const StudyTipsHub: React.FC<StudyTipsHubProps> = ({
  tips,
  currentUserId,
  onAddTip,
  onUpdateTip,
  onLikeTip,
  onDeleteTip,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const [categoryMenuOpensAbove, setCategoryMenuOpensAbove] = useState(false);
  const [categoryMenuMaxHeight, setCategoryMenuMaxHeight] = useState(320);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterHasVoice, setFilterHasVoice] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [editingTipId, setEditingTipId] = useState<string | null>(null);
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
  const [expandedFeaturedTipId, setExpandedFeaturedTipId] = useState<string | null>(null);
  const tipContentRef = useRef<HTMLTextAreaElement | null>(null);
  const categoryMenuRef = useRef<HTMLDivElement | null>(null);
  const builtInTipIds = new Set(['tip_1', 'tip_2', 'tip_3', 'tip_4', 'tip_5']);
  const canDeleteTip = (tip: StudyTip) => tip.ownerId
    ? tip.ownerId === currentUserId
    : !builtInTipIds.has(tip.id);

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
    { id: 'all', label: '🌟 All Study Tips', mobileLabel: 'All tips' },
    { id: 'active_recall', label: '🧠 Active Recall & Retention', mobileLabel: 'Active recall' },
    { id: 'time_management', label: '⏱️ Focus & Time Hacks', mobileLabel: 'Focus & time' },
    { id: 'note_taking', label: '📝 Note Taking & Annotations', mobileLabel: 'Note taking' },
    { id: 'exam_prep', label: '🎯 Exam Strategy', mobileLabel: 'Exam prep' },
    { id: 'wellness', label: '🧘 Student Wellness', mobileLabel: 'Wellness' },
    { id: 'resource_sharing', label: '🤝 Study Group Sharing', mobileLabel: 'Study groups' },
  ];
  const selectedCategoryLabel = categories.find((item) => item.id === selectedCategory)?.mobileLabel ?? 'All tips';

  useEffect(() => {
    if (!isCategoryMenuOpen) return;

    const closeMenu = (event: PointerEvent) => {
      if (!categoryMenuRef.current?.contains(event.target as Node)) setIsCategoryMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsCategoryMenuOpen(false);
    };

    document.addEventListener('pointerdown', closeMenu);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeMenu);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isCategoryMenuOpen]);

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
      const res = await fetch(getApiUrl('/api/ai-study-tip'), {
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

  // Create a tip or save edits without resetting its identity or reactions.
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setFormError('Add both a title and the tip instructions before posting.');
      return;
    }
    setFormError(null);
    const normalizedTags: string[] = Array.from(new Set<string>(tagsInput.split(',').map((tag) => tag.trim().replace(/^#/, '')).filter(Boolean)));
    const existingTip = editingTipId ? tips.find((tip) => tip.id === editingTipId) : undefined;

    const updatedTip: StudyTip = {
      ...existingTip,
      id: existingTip?.id || 'tip_' + Date.now(),
      ownerId: existingTip?.ownerId || currentUserId,
      title: title.trim(),
      authorName: authorName.trim() || 'Anonymous Student',
      category,
      content: content.trim(),
      tags: normalizedTags,
      likes: existingTip?.likes ?? 1,
      userLiked: existingTip?.userLiked ?? true,
      createdAt: existingTip?.createdAt || new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString(),
      voiceMessage: voiceMessage || undefined,
    };

    if (existingTip) onUpdateTip(updatedTip);
    else {
      onAddTip(updatedTip);
      confetti({ particleCount: 50, spread: 60 });
    }
    setIsShareModalOpen(false);
    setEditingTipId(null);
    setTitle('');
    setAuthorName('');
    setCategory('active_recall');
    setContent('');
    setTagsInput('');
    setVoiceMessage(null);
    setShowVoiceRecorder(false);
    setFormError(null);
  };

  const handleDeleteTip = (tip: StudyTip) => {
    if (!window.confirm(`Delete "${tip.title}" and its attached voice recording? This cannot be undone.`)) return;
    onDeleteTip(tip.id);
  };

  const openNewTipForm = () => {
    setEditingTipId(null);
    setTitle('');
    setAuthorName('');
    setCategory('active_recall');
    setContent('');
    setTagsInput('');
    setVoiceMessage(null);
    setShowVoiceRecorder(false);
    setFormError(null);
    setUsedFallback(false);
    setIsShareModalOpen(true);
  };

  const openEditTipForm = (tip: StudyTip) => {
    setEditingTipId(tip.id);
    setTitle(tip.title);
    setAuthorName(tip.authorName);
    setCategory(tip.category);
    setContent(tip.content);
    setTagsInput(tip.tags.join(', '));
    setVoiceMessage(tip.voiceMessage ?? null);
    setShowVoiceRecorder(false);
    setFormError(null);
    setUsedFallback(false);
    setIsShareModalOpen(true);
  };

  const wrapTipSelection = (prefix: string, suffix = prefix) => {
    const textarea = tipContentRef.current;
    const start = textarea?.selectionStart ?? content.length;
    const end = textarea?.selectionEnd ?? content.length;
    const selected = content.slice(start, end) || 'text';
    setContent(`${content.slice(0, start)}${prefix}${selected}${suffix}${content.slice(end)}`);
    setFormError(null);
    requestAnimationFrame(() => {
      textarea?.focus();
      textarea?.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    });
  };

  const prefixTipLines = (prefix: '- ' | '1. ') => {
    const textarea = tipContentRef.current;
    const start = textarea?.selectionStart ?? content.length;
    const end = textarea?.selectionEnd ?? content.length;
    const lineStart = content.lastIndexOf('\n', Math.max(0, start - 1)) + 1;
    const nextLineBreak = content.indexOf('\n', end);
    const lineEnd = nextLineBreak < 0 ? content.length : nextLineBreak;
    const selectedLines = content.slice(lineStart, lineEnd) || 'List item';
    const formattedLines = selectedLines.split('\n').map((line) => `${prefix}${line}`).join('\n');
    setContent(`${content.slice(0, lineStart)}${formattedLines}${content.slice(lineEnd)}`);
    setFormError(null);
    requestAnimationFrame(() => {
      textarea?.focus();
      textarea?.setSelectionRange(lineStart, lineStart + formattedLines.length);
    });
  };

  return (
    <div className="space-y-6">
      
      {/* Spotlight Header Banner */}
      <div className="fb-themed-hero bg-gradient-to-br from-[#111619] via-[#1B242A] to-[#080A0B] border border-amber-300/20 rounded-3xl p-4 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl">
          <div className="mb-3 flex flex-col items-start gap-1.5 sm:mb-2 sm:flex-row sm:items-center sm:gap-2">
            <span className="flex items-center gap-1 whitespace-nowrap rounded-full bg-amber-400 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-950 sm:text-xs sm:py-0.5">
              <Sparkles className="w-3.5 h-3.5 fill-current" />
              Personal collection
            </span>
            <span className="text-[11px] font-semibold text-indigo-200 sm:text-xs">
              Tips saved to your account
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black tracking-tight mb-2">
            My Study Tips
          </h2>
          <p className="mb-4 text-xs font-normal leading-relaxed text-indigo-100 sm:mb-6 sm:text-sm">
            Keep your own strategies, memory techniques, and exam advice here. Use Community Study Tips above to share publicly for review.
          </p>

          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:flex-wrap">
            <button
              onClick={openNewTipForm}
              className="flex w-full items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-[11px] sm:text-xs font-extrabold shadow-lg shadow-amber-400/20 active:scale-95 transition-all cursor-pointer sm:w-auto"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Add a Personal Tip</span>
            </button>

            <button
              onClick={openNewTipForm}
              className="flex w-full items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white text-[11px] sm:text-xs font-extrabold shadow-lg shadow-rose-500/20 active:scale-95 transition-all cursor-pointer border border-rose-400/40 sm:w-auto"
            >
              <Mic className="w-4 h-4 animate-pulse" />
              <span>Record Personal Voice Tip</span>
            </button>
          </div>
        </div>
      </div>

      {copyError && (
        <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900">{copyError}</div>
      )}

      {/* Tip of the Day Featured Card */}
      {tipOfTheDay && (
        <div className="min-w-0 overflow-hidden bg-gradient-to-r from-[#1B242A] to-[#111619] border border-amber-300/20 rounded-3xl p-4 sm:p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex min-w-0 w-full items-start gap-3 sm:gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black flex-shrink-0 shadow-md shadow-amber-400/30">
              <Award className="w-6 h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex min-w-0 flex-wrap items-center gap-1.5 sm:gap-2">
                <span className="max-w-full text-[10px] font-black uppercase tracking-wider text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded-md">
                  Personal Favorite Tip
                </span>
                <span className="min-w-0 max-w-full break-words text-[11px] sm:text-xs text-slate-400 font-medium">
                  By {tipOfTheDay.authorName}
                </span>
              </div>
              <h3 className="break-words text-base font-extrabold text-white mb-1">
                {tipOfTheDay.title}
              </h3>
              <TipContent
                content={tipOfTheDay.content}
                className={`text-xs text-slate-300 leading-relaxed max-w-2xl break-words ${expandedFeaturedTipId === tipOfTheDay.id ? '' : 'max-sm:max-h-24 max-sm:overflow-hidden'}`}
              />
              {tipOfTheDay.content.length > 220 && (
                <button
                  type="button"
                  onClick={() => setExpandedFeaturedTipId((current) => current === tipOfTheDay.id ? null : tipOfTheDay.id)}
                  aria-expanded={expandedFeaturedTipId === tipOfTheDay.id}
                  className="mt-1 text-[11px] font-bold text-amber-300 hover:text-amber-200 sm:hidden"
                >
                  {expandedFeaturedTipId === tipOfTheDay.id ? 'Show less' : 'Read full tip'}
                </button>
              )}

              {tipOfTheDay.voiceMessage && (
                <div className="mt-3 min-w-0 w-full max-w-xl">
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
                  : 'bg-slate-900 text-slate-200 border border-amber-300/20 hover:bg-slate-800'
              }`}
            >
              <ThumbsUp className="w-3.5 h-3.5" />
              <span>{tipOfTheDay.likes}</span>
            </button>
            <button
              onClick={() => handleCopyTip(tipOfTheDay)}
              className="p-2 bg-slate-900 hover:bg-slate-800 border border-amber-300/20 rounded-xl text-slate-200 transition-colors"
              title="Copy Tip"
            >
              {copiedId === tipOfTheDay.id ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </button>
            {canDeleteTip(tipOfTheDay) && (
              <>
                <button type="button" onClick={() => openEditTipForm(tipOfTheDay)} aria-label="Edit community favorite tip" title="Edit tip" className="p-2 rounded-xl border border-amber-300/20 bg-slate-900 text-amber-300 transition-colors hover:bg-slate-800">
                  <Pencil className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => handleDeleteTip(tipOfTheDay)} aria-label="Delete community favorite tip" title="Delete tip" className="p-2 rounded-xl border border-rose-300/30 bg-slate-900 text-rose-300 transition-colors hover:bg-rose-950/50 hover:text-rose-200">
                  <Trash2 className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Category Pills & Search */}
      <div className="min-w-0 flex w-full flex-col gap-3 md:flex-row md:items-center md:justify-between">
        {/* Category selector */}
        <div className="flex min-w-0 w-full flex-wrap items-center gap-1.5 pb-1">
          {/* Voice Notes Only filter */}
          <button
            onClick={() => setFilterHasVoice((prev) => !prev)}
            className={`px-2 py-1.5 sm:px-2.5 rounded-xl text-[10px] sm:text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1 cursor-pointer ${
              filterHasVoice
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-rose-50 hover:border-rose-200'
            }`}
          >
            <Mic className={`w-3.5 h-3.5 ${filterHasVoice ? 'animate-pulse' : 'text-rose-500'}`} />
            <span className="sm:hidden">Voice</span>
            <span className="hidden sm:inline">🎙️ Voice Notes</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              filterHasVoice ? 'bg-rose-700 text-white' : 'bg-slate-100 text-slate-600'
            }`}>
              {tips.filter(t => !!t.voiceMessage).length}
            </span>
          </button>

          <div className="fb-tip-category-select relative min-w-0 flex-1 md:hidden" ref={categoryMenuRef}>
            <button
              type="button"
              aria-label="Filter study tips by category"
              aria-haspopup="listbox"
              aria-expanded={isCategoryMenuOpen}
              aria-controls="study-tip-category-options"
              onClick={(event) => {
                if (isCategoryMenuOpen) {
                  setIsCategoryMenuOpen(false);
                  return;
                }
                const triggerBounds = event.currentTarget.getBoundingClientRect();
                const spaceAbove = triggerBounds.top - 12;
                const spaceBelow = window.innerHeight - triggerBounds.bottom - 12;
                const opensAbove = spaceBelow < Math.min(320, categories.length * 44 + 8)
                  && spaceAbove > spaceBelow;
                setCategoryMenuOpensAbove(opensAbove);
                setCategoryMenuMaxHeight(Math.max(0, Math.min(320, (opensAbove ? spaceAbove : spaceBelow) - 4)));
                setIsCategoryMenuOpen(true);
              }}
              className="flex h-10 w-full min-w-0 items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 text-left text-sm font-semibold text-slate-700"
            >
              <span className="min-w-0 truncate">{selectedCategoryLabel}</span>
              <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${isCategoryMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            {isCategoryMenuOpen && (
              <div
                id="study-tip-category-options"
                role="listbox"
                aria-label="Study tip categories"
                className={`fb-tip-category-menu${categoryMenuOpensAbove ? ' fb-tip-category-menu--above' : ''}`}
                style={{ maxHeight: `${categoryMenuMaxHeight}px` }}
              >
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    role="option"
                    aria-selected={selectedCategory === cat.id}
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      setIsCategoryMenuOpen(false);
                    }}
                    className={`block min-h-11 w-full rounded-lg px-3 py-2 text-left text-sm font-medium ${
                      selectedCategory === cat.id
                        ? 'bg-indigo-50 text-indigo-800'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {cat.mobileLabel}
                  </button>
                ))}
              </div>
            )}
          </div>

          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`hidden md:inline-flex px-2.5 py-1.5 rounded-xl text-[10px] sm:text-xs font-bold transition-all whitespace-nowrap ${
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
        <div className="relative min-w-0 w-full md:min-w-[240px] md:w-auto">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search study tips or tags..."
            className="block box-border w-full min-w-0 pl-9 pr-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-400 transition-all font-medium"
          />
        </div>
      </div>

      {/* Tips Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredTips.map((tip) => (
          <div
            key={tip.id}
            className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-xs hover:shadow-md hover:border-indigo-200 transition-all flex flex-col justify-between"
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

              <TipContent content={tip.content} className="mb-3.5 text-xs text-slate-600 leading-relaxed break-words" />

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
                By <span className="text-slate-900 font-bold">{tip.authorName}</span>
              </span>

              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  onClick={() => handleCopyTip(tip)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                  title="Copy tip text"
                >
                  {copiedId === tip.id ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>

                <button
                  onClick={() => onLikeTip(tip.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all ${
                    tip.userLiked
                      ? 'bg-indigo-100 text-indigo-800'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                  <span>{tip.likes}</span>
                </button>
                {canDeleteTip(tip) && (
                  <>
                    <button type="button" onClick={() => openEditTipForm(tip)} aria-label={`Edit tip: ${tip.title}`} title="Edit tip" className="p-2 rounded-lg text-amber-500 transition-colors hover:bg-amber-50 hover:text-amber-700">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => handleDeleteTip(tip)} aria-label={`Delete tip: ${tip.title}`} title="Delete tip" className="p-2 rounded-lg text-rose-400 transition-colors hover:bg-rose-50 hover:text-rose-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredTips.length === 0 && (
        <div className="text-center py-12 bg-white rounded-3xl border border-slate-200">
          <Lightbulb className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-700">
            {tips.length > 0 ? 'No tips match these filters' : 'Your personal tips will appear here'}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {tips.length > 0 ? 'Try another category or clear the search and voice filter.' : 'Add a tip or voice note to build your collection.'}
          </p>
          <button
            onClick={() => {
              if (tips.length > 0) {
                setSelectedCategory('all');
                setFilterHasVoice(false);
                setSearchQuery('');
              } else {
                openNewTipForm();
              }
            }}
            className="mt-3 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl"
          >
            {tips.length > 0 ? 'Show all tips' : 'Add a Personal Tip'}
          </button>
        </div>
      )}

      {/* Share a Tip Modal */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) setIsShareModalOpen(false); }}>
          <div role="dialog" aria-modal="true" aria-labelledby="share-tip-title" className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full p-4 sm:p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[calc(100dvh-1.5rem)] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                  <Lightbulb className="w-4 h-4" />
                </div>
                <h3 id="share-tip-title" className="font-extrabold text-sm sm:text-base text-slate-900">
                  {editingTipId ? 'Edit your personal tip' : 'Add a personal tip'}
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
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="block text-xs font-bold text-slate-700">
                  Tip Title <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center gap-2">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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

                <div role="toolbar" aria-label="Tip text formatting" className="mb-2 flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
                  <button type="button" onClick={() => wrapTipSelection('**')} title="Bold" aria-label="Bold" className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-700 transition-colors hover:bg-white hover:text-amber-700">
                    <Bold className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => wrapTipSelection('*')} title="Italic" aria-label="Italic" className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-700 transition-colors hover:bg-white hover:text-amber-700">
                    <Italic className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => wrapTipSelection('<u>', '</u>')} title="Underline" aria-label="Underline" className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-700 transition-colors hover:bg-white hover:text-amber-700">
                    <UnderlineIcon className="h-4 w-4" />
                  </button>
                  <span aria-hidden="true" className="mx-1 h-5 w-px bg-slate-300" />
                  <button type="button" onClick={() => prefixTipLines('- ')} title="Bulleted list" aria-label="Bulleted list" className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-700 transition-colors hover:bg-white hover:text-amber-700">
                    <List className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => prefixTipLines('1. ')} title="Numbered list" aria-label="Numbered list" className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-700 transition-colors hover:bg-white hover:text-amber-700">
                    <ListOrdered className="h-4 w-4" />
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
                  ref={tipContentRef}
                  required
                  rows={showVoiceRecorder ? 3 : 4}
                  value={content}
                  onChange={(e) => { setContent(e.target.value); setFormError(null); }}
                  placeholder={showVoiceRecorder ? "Your spoken words will be transcribed here automatically in real-time (you can also edit or type)..." : "Explain the study technique and why it works. Use blank lines to separate steps."}
                  className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-400"
                />
              </div>

              {/* Attach Voice Message / Audio Note */}
              <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Mic className="w-3.5 h-3.5 text-rose-500" />
                    <span>Voice Message / Audio Note (Optional)</span>
                  </label>
                  {voiceMessage && (
                      <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-1 rounded-md whitespace-nowrap">
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

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsShareModalOpen(false)}
                  className="px-4 py-2.5 sm:py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 sm:py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  {editingTipId ? 'Save changes' : 'Post study tip'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
