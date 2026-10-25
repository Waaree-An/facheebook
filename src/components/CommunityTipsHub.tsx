import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { AlertCircle, Check, Clock3, Flag, Lightbulb, LoaderCircle, MessageCircle, Send, ShieldCheck, Trash2, ThumbsUp } from 'lucide-react';
import type { StudyTip } from '../types';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import {
  deletePendingCommunityTip,
  isCommunityModerator,
  loadCommunityTips,
  loadOpenCommunityTipReports,
  moderateCommunityTip,
  reportCommunityTip,
  reviewCommunityTipReport,
  submitCommunityTip,
  submitCommunityTipComment,
  toggleCommunityTipLike,
  type CommunityTipComment,
  type CommunityTipReport,
} from '../utils/communityTips';

interface CommunityTipsHubProps {
  userId: string | null;
  isLocalDemoUser: boolean;
}

const categories: Array<{ value: StudyTip['category']; label: string }> = [
  { value: 'active_recall', label: 'Active recall & retention' },
  { value: 'time_management', label: 'Focus & time management' },
  { value: 'note_taking', label: 'Note taking' },
  { value: 'exam_prep', label: 'Exam preparation' },
  { value: 'wellness', label: 'Student wellness' },
  { value: 'resource_sharing', label: 'Study groups & resources' },
];

const reportReasons = [
  { value: 'spam', label: 'Spam' },
  { value: 'harmful', label: 'Harmful content' },
  { value: 'copyright', label: 'Copyright concern' },
  { value: 'inappropriate', label: 'Inappropriate content' },
  { value: 'other', label: 'Other' },
];

function formatDate(date: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(date));
}

export const CommunityTipsHub: React.FC<CommunityTipsHubProps> = ({ userId, isLocalDemoUser }) => {
  const [tips, setTips] = useState<StudyTip[]>([]);
  const [commentsByTip, setCommentsByTip] = useState<Record<string, CommunityTipComment[]>>({});
  const [openCommentTipId, setOpenCommentTipId] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState('');
  const [reports, setReports] = useState<CommunityTipReport[]>([]);
  const [isModerator, setIsModerator] = useState(false);
  const [isServiceReady, setIsServiceReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [busyTipId, setBusyTipId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [title, setTitle] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [category, setCategory] = useState<StudyTip['category']>('active_recall');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [reportingTipId, setReportingTipId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState('other');
  const [reportDetails, setReportDetails] = useState('');
  const available = isSupabaseConfigured && !!supabase && !!userId && !isLocalDemoUser;
  const loadRequestId = useRef(0);

  const refresh = useCallback(async () => {
    const requestId = ++loadRequestId.current;
    if (!available || !supabase || !userId) {
      setIsLoading(false);
      return false;
    }
    setError('');
    try {
      const [communityData, moderator] = await Promise.all([
        loadCommunityTips(supabase, userId),
        isCommunityModerator(supabase),
      ]);
      if (requestId !== loadRequestId.current) return false;
      setTips(communityData.tips);
      setCommentsByTip(communityData.commentsByTip);
      setIsModerator(moderator);
      const openReports = moderator ? await loadOpenCommunityTipReports(supabase) : [];
      if (requestId !== loadRequestId.current) return false;
      setReports(openReports);
      setIsServiceReady(true);
      return true;
    } catch (loadError) {
      if (requestId === loadRequestId.current) {
        setIsServiceReady(false);
        const details = loadError instanceof Error ? loadError.message : 'Unknown error';
        setError(`Could not load community tips. Verify the community migration is installed and check your connection. Details: ${details}`);
      }
      return false;
    } finally {
      if (requestId === loadRequestId.current) setIsLoading(false);
    }
  }, [available, userId]);

  useEffect(() => {
    setIsLoading(true);
    setTips([]);
    setCommentsByTip({});
    setOpenCommentTipId(null);
    setReports([]);
    setIsModerator(false);
    setIsServiceReady(false);
    void refresh();
  }, [refresh]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase || !userId) return;
    setError('');
    setNotice('');
    if (!title.trim() || !content.trim()) {
      setError('Enter a title and tip before submitting.');
      return;
    }
    setIsSubmitting(true);
    try {
      const newTip = await submitCommunityTip(supabase, userId, {
        title,
        authorName: authorName.trim() || 'Student',
        category,
        content,
        tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean).slice(0, 10),
      });
      setTips((current) => [newTip, ...current]);
      setTitle('');
      setContent('');
      setTags('');
      setNotice('Your tip was submitted and is waiting for moderator approval.');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not submit your tip.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLike = async (tip: StudyTip) => {
    if (!supabase || !userId) return;
    setError('');
    setBusyTipId(tip.id);
    try {
      await toggleCommunityTipLike(supabase, userId, tip.id, Boolean(tip.userLiked));
      setTips((current) => current.map((item) => item.id === tip.id
        ? {
          ...item,
          userLiked: !tip.userLiked,
          likes: Math.max(0, item.likes + (tip.userLiked ? -1 : 1)),
        }
        : item));
    } catch (likeError) {
      setError(likeError instanceof Error ? likeError.message : 'Could not update your reaction.');
    } finally {
      setBusyTipId(null);
    }
  };

  const handleComment = async (event: FormEvent<HTMLFormElement>, tipId: string) => {
    event.preventDefault();
    if (!supabase || !userId) return;
    const contentToSubmit = commentDraft.trim();
    if (!contentToSubmit) {
      setError('Write a comment before submitting.');
      return;
    }
    setError('');
    setBusyTipId(tipId);
    try {
      const comment = await submitCommunityTipComment(supabase, userId, tipId, contentToSubmit);
      setCommentsByTip((current) => ({
        ...current,
        [tipId]: [...(current[tipId] ?? []), comment],
      }));
      setCommentDraft('');
    } catch (commentError) {
      setError(commentError instanceof Error ? commentError.message : 'Could not add your comment.');
    } finally {
      setBusyTipId(null);
    }
  };

  const handleReport = async (event: FormEvent<HTMLFormElement>, tipId: string) => {
    event.preventDefault();
    if (!supabase || !userId) return;
    setError('');
    try {
      await reportCommunityTip(supabase, userId, tipId, reportReason, reportDetails);
      setReportingTipId(null);
      setReportDetails('');
      setNotice('Thanks. Your report was sent to the moderation team.');
    } catch (reportError) {
      setError(reportError instanceof Error ? reportError.message : 'Could not submit your report.');
    }
  };

  const handleModeration = async (tipId: string, decision: 'approved' | 'rejected') => {
    if (!supabase) return;
    setError('');
    setBusyTipId(tipId);
    try {
      await moderateCommunityTip(supabase, tipId, decision);
      if (await refresh()) {
        setNotice(decision === 'approved' ? 'Tip approved and published.' : 'Tip rejected.');
      }
    } catch (moderationError) {
      setError(moderationError instanceof Error ? moderationError.message : 'Could not review this tip.');
    } finally {
      setBusyTipId(null);
    }
  };

  const handleDelete = async (tipId: string) => {
    if (!supabase) return;
    setError('');
    setBusyTipId(tipId);
    try {
      await deletePendingCommunityTip(supabase, tipId);
      setTips((current) => current.filter((tip) => tip.id !== tipId));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Could not remove your pending tip.');
    } finally {
      setBusyTipId(null);
    }
  };

  const handleReportReview = async (reportId: string, decision: 'resolved' | 'dismissed') => {
    if (!supabase) return;
    setError('');
    try {
      await reviewCommunityTipReport(supabase, reportId, decision);
      setReports((current) => current.filter((report) => report.id !== reportId));
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : 'Could not update this report.');
    }
  };

  return (
    <section className="mb-8 overflow-hidden rounded-3xl border border-amber-200 bg-white shadow-sm">
      <header className="flex flex-col gap-3 border-b border-slate-100 bg-gradient-to-br from-amber-50 to-white p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-300 text-slate-950">
            <Lightbulb className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-amber-800">Student community</p>
            <h2 className="mt-1 text-xl font-black text-slate-900">Community study tips</h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              Share a text tip with other students. Every submission is reviewed before it appears publicly.
            </p>
          </div>
        </div>
        {isModerator && (
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-800">
            <ShieldCheck className="h-4 w-4" /> Moderator
          </span>
        )}
      </header>

      <div className="space-y-5 p-4 sm:p-6">
        {!available ? (
          <div className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <p>
              Community tips are available to signed-in cloud accounts once the community database migration is installed.
              Your existing personal tips remain private and unchanged.
            </p>
          </div>
        ) : isServiceReady ? (
            <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
              <div>
                <h3 className="font-bold text-slate-900">Share a study tip</h3>
                <p className="mt-1 text-xs leading-5 text-slate-600">
                  Use your own words and avoid personal information. Shared tips are separate from your private library.
                </p>
              </div>
              <label className="block text-xs font-bold text-slate-700">
                Tip title
                <input
                  required
                  maxLength={140}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                  placeholder="A clear, helpful title"
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-xs font-bold text-slate-700">
                  Display name
                  <input
                    maxLength={60}
                    value={authorName}
                    onChange={(event) => setAuthorName(event.target.value)}
                    className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                    placeholder="Student"
                  />
                </label>
                <label className="block text-xs font-bold text-slate-700">
                  Category
                  <select
                    value={category}
                    onChange={(event) => setCategory(event.target.value as StudyTip['category'])}
                    className="mt-1.5 min-h-11 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                  >
                    {categories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                </label>
              </div>
              <label className="block text-xs font-bold text-slate-700">
                Your tip
                <textarea
                  required
                  maxLength={10000}
                  rows={4}
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  className="mt-1.5 w-full resize-y rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal leading-6 text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                  placeholder="Explain a study strategy that has worked for you."
                />
              </label>
              <label className="block text-xs font-bold text-slate-700">
                Tags <span className="font-normal text-slate-500">(comma separated)</span>
                <input
                  value={tags}
                  onChange={(event) => setTags(event.target.value)}
                  className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                  placeholder="revision, focus"
                />
              </label>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-slate-500">Text tips only for now. Media sharing is not enabled.</p>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-amber-300 px-4 py-2 text-sm font-extrabold text-slate-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {isSubmitting ? 'Submitting…' : 'Submit for review'}
                </button>
              </div>
            </form>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <span>{isLoading ? 'Checking the community service…' : 'Community setup is not ready yet.'}</span>
            {!isLoading && (
              <button type="button" onClick={() => { setIsLoading(true); void refresh(); }} className="min-h-9 rounded-lg bg-slate-900 px-3 text-xs font-bold text-white">
                Retry
              </button>
            )}
          </div>
        )}

        {error && (
          <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {notice}
          </p>
        )}

        {available && (
          <section aria-labelledby="community-feed-title">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 id="community-feed-title" className="font-extrabold text-slate-900">Reviewed tips</h3>
              <button
                type="button"
                onClick={() => { setIsLoading(true); void refresh(); }}
                className="rounded-lg px-3 py-2 text-xs font-bold text-amber-800 hover:bg-amber-50"
              >
                Refresh
              </button>
            </div>
            {isLoading ? (
              <div role="status" className="flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-5 text-sm text-slate-600">
                <LoaderCircle className="h-4 w-4 animate-spin" /> Loading community tips…
              </div>
            ) : tips.length === 0 ? (
              <p className="rounded-xl bg-slate-50 px-4 py-5 text-sm text-slate-600">
                No community tips have been approved yet. Be the first to share one.
              </p>
            ) : (
              <div className="grid gap-3">
                {tips.map((tip) => (
                  <article key={tip.id} className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          {tip.communityStatus === 'pending' ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-900">
                              <Clock3 className="h-3 w-3" /> Awaiting review
                            </span>
                          ) : tip.communityStatus === 'rejected' ? (
                            <span className="rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-bold text-rose-800">Not approved</span>
                          ) : (
                            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-800">
                              {categories.find((item) => item.value === tip.category)?.label ?? 'Study tip'}
                            </span>
                          )}
                          <span className="text-xs text-slate-500">{formatDate(tip.createdAt)}</span>
                        </div>
                        <h4 className="break-words text-base font-extrabold text-slate-900">{tip.title}</h4>
                        <p className="mt-1 text-xs text-slate-500">Shared by {tip.authorName}</p>
                      </div>
                      {tip.communityStatus === 'pending' && tip.ownerId === userId && (
                        <button
                          type="button"
                          disabled={busyTipId === tip.id}
                          onClick={() => void handleDelete(tip.id)}
                          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                        >
                          <Trash2 className="h-4 w-4" /> Remove
                        </button>
                      )}
                    </div>
                    <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{tip.content}</p>
                    {!!tip.tags.length && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {tip.tags.map((tag, index) => <span key={`${tag}-${index}`} className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">#{tag}</span>)}
                      </div>
                    )}
                    {tip.communityStatus === 'rejected' && tip.moderationNote && (
                      <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs leading-5 text-rose-800">
                        Moderator note: {tip.moderationNote}
                      </p>
                    )}
                    {tip.communityStatus === 'approved' && (
                      <>
                        <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
                          <button
                            type="button"
                            disabled={busyTipId === tip.id}
                            onClick={() => void handleLike(tip)}
                            aria-pressed={Boolean(tip.userLiked)}
                            className={`inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-bold transition disabled:opacity-50 ${
                              tip.userLiked ? 'bg-amber-100 text-amber-900' : 'text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            <ThumbsUp className="h-4 w-4" /> Like · {tip.likes}
                          </button>
                          <button
                            type="button"
                            onClick={() => { setOpenCommentTipId(openCommentTipId === tip.id ? null : tip.id); setCommentDraft(''); setError(''); }}
                            aria-expanded={openCommentTipId === tip.id}
                            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-bold text-slate-600 transition hover:bg-slate-100"
                          >
                            <MessageCircle className="h-4 w-4" /> Comment · {commentsByTip[tip.id]?.length ?? 0}
                          </button>
                        </div>
                        {openCommentTipId === tip.id && (
                          <section aria-label={`Comments on ${tip.title}`} className="mt-2 space-y-3 rounded-xl bg-slate-50 p-3">
                            {(commentsByTip[tip.id] ?? []).length > 0 ? (
                              <ul className="space-y-2">
                                {(commentsByTip[tip.id] ?? []).map((comment) => (
                                  <li key={comment.id} className="rounded-lg bg-white px-3 py-2">
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="text-xs font-bold text-slate-700">{comment.ownerId === userId ? 'You' : 'Student'}</span>
                                      <time className="text-[11px] text-slate-500">{formatDate(comment.createdAt)}</time>
                                    </div>
                                    <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-5 text-slate-700">{comment.content}</p>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-xs text-slate-500">No comments yet. Start the conversation.</p>
                            )}
                            <form onSubmit={(event) => void handleComment(event, tip.id)} className="flex items-end gap-2">
                              <textarea
                                required
                                maxLength={2000}
                                rows={2}
                                value={commentDraft}
                                onChange={(event) => setCommentDraft(event.target.value)}
                                placeholder="Write a comment…"
                                aria-label="Write a comment"
                                className="min-w-0 flex-1 resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                              />
                              <button type="submit" disabled={busyTipId === tip.id} aria-label="Send comment" className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 text-xs font-bold text-white disabled:opacity-50">
                                {busyTipId === tip.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                <span className="hidden sm:inline">Send</span>
                              </button>
                            </form>
                          </section>
                        )}
                      </>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {tip.communityStatus === 'approved' && (
                        <>
                          {tip.ownerId !== userId && (
                            <button
                              type="button"
                              onClick={() => { setReportingTipId(reportingTipId === tip.id ? null : tip.id); setError(''); }}
                              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-bold text-slate-600 hover:bg-slate-100"
                            >
                              <Flag className="h-4 w-4" /> Report
                            </button>
                          )}
                          {reportingTipId === tip.id && (
                            <form onSubmit={(event) => void handleReport(event, tip.id)} className="basis-full space-y-2 rounded-xl bg-slate-50 p-3">
                              <label className="block text-xs font-bold text-slate-700">
                                Report reason
                                <select value={reportReason} onChange={(event) => setReportReason(event.target.value)} className="mt-1.5 min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900">
                                  {reportReasons.map((reason) => <option key={reason.value} value={reason.value}>{reason.label}</option>)}
                                </select>
                              </label>
                              <textarea
                                maxLength={1000}
                                value={reportDetails}
                                onChange={(event) => setReportDetails(event.target.value)}
                                rows={2}
                                placeholder="Optional details"
                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                              />
                              <button type="submit" className="min-h-9 rounded-lg bg-slate-900 px-3 text-xs font-bold text-white">Send report</button>
                            </form>
                          )}
                        </>
                      )}
                      {isModerator && tip.communityStatus === 'pending' && (
                        <div className="flex flex-wrap gap-2">
                          <button type="button" disabled={busyTipId === tip.id} onClick={() => void handleModeration(tip.id, 'approved')} className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-emerald-100 px-3 text-xs font-bold text-emerald-800 hover:bg-emerald-200 disabled:opacity-50">
                            <Check className="h-4 w-4" /> Approve
                          </button>
                          <button type="button" disabled={busyTipId === tip.id} onClick={() => void handleModeration(tip.id, 'rejected')} className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-rose-100 px-3 text-xs font-bold text-rose-800 hover:bg-rose-200 disabled:opacity-50">
                            <AlertCircle className="h-4 w-4" /> Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {available && isModerator && reports.length > 0 && (
          <section aria-labelledby="community-reports-title" className="border-t border-slate-200 pt-5">
            <h3 id="community-reports-title" className="mb-3 font-extrabold text-slate-900">Open reports ({reports.length})</h3>
            <div className="space-y-2">
              {reports.map((report) => (
                <article key={report.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-3">
                  <div className="min-w-0 text-sm">
                    <p className="font-bold text-slate-800">{report.reason} · {report.tipTitle ?? `tip ${report.tipId.slice(0, 8)}`}</p>
                    {report.details && <p className="mt-1 break-words text-xs text-slate-600">{report.details}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => void handleReportReview(report.id, 'resolved')} className="min-h-9 rounded-lg bg-emerald-100 px-3 text-xs font-bold text-emerald-800">Resolve</button>
                    <button type="button" onClick={() => void handleReportReview(report.id, 'dismissed')} className="min-h-9 rounded-lg bg-slate-200 px-3 text-xs font-bold text-slate-700">Dismiss</button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </section>
  );
};
