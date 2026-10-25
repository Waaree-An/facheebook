import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { AlertCircle, BookOpen, Check, Clock3, ExternalLink, FileText, Flag, Image as ImageIcon, Link2, LoaderCircle, MessageCircle, Plus, Send, ShieldCheck, ThumbsUp, Trash2, Video, X } from 'lucide-react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import {
  deletePendingCommunityMaterial,
  loadCommunityMaterials,
  makeCommunityVideoLink,
  loadOpenCommunityMaterialReports,
  moderateCommunityMaterial,
  reportCommunityMaterial,
  reviewCommunityMaterialReport,
  submitCommunityMaterial,
  submitCommunityMaterialComment,
  toggleCommunityMaterialLike,
  type CommunityMaterial,
  type CommunityMaterialMediaKind,
  type CommunityMaterialReport,
} from '../utils/communityMaterials';
import { isCommunityModerator } from '../utils/communityTips';
import type { FileAttachment, ReadingMaterial, VideoLink } from '../types';

interface CommunityMaterialsHubProps {
  userId: string | null;
  isLocalDemoUser: boolean;
  libraryMaterials: ReadingMaterial[];
}

const reportReasons = [
  { value: 'spam', label: 'Spam' },
  { value: 'harmful', label: 'Harmful content' },
  { value: 'copyright', label: 'Copyright concern' },
  { value: 'inappropriate', label: 'Inappropriate content' },
  { value: 'other', label: 'Other' },
];

const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024;
const MAX_VIDEO_BYTES = 30 * 1024 * 1024;
const MAX_POST_ATTACHMENT_BYTES = 80 * 1024 * 1024;
const MAX_POST_ATTACHMENT_COUNT = 20;

const documentMimeTypes: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  txt: 'text/plain',
  md: 'text/markdown',
  csv: 'text/csv',
};

const formatBytes = (bytes: number): string => {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

function getVideoEmbedUrl(link: VideoLink): string | null {
  let url: URL;
  try {
    url = new URL(link.url);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  if (link.platform === 'youtube' && ['youtube.com', 'm.youtube.com', 'youtu.be'].includes(host)) {
    const videoId = host === 'youtu.be'
      ? url.pathname.split('/').filter(Boolean)[0]
      : url.searchParams.get('v') ?? url.pathname.match(/^\/(?:embed|shorts)\/([^/?]+)/)?.[1];
    return videoId && /^[A-Za-z0-9_-]{11}$/.test(videoId)
      ? `https://www.youtube-nocookie.com/embed/${videoId}`
      : null;
  }
  if (link.platform === 'vimeo' && ['vimeo.com', 'player.vimeo.com'].includes(host)) {
    const videoId = url.pathname.split('/').filter(Boolean).pop();
    return videoId && /^\d+$/.test(videoId) ? `https://player.vimeo.com/video/${videoId}` : null;
  }
  return null;
}

export const CommunityMaterialsHub: React.FC<CommunityMaterialsHubProps> = ({ userId, isLocalDemoUser, libraryMaterials }) => {
  const [materials, setMaterials] = useState<CommunityMaterial[]>([]);
  const [openCommentMaterialId, setOpenCommentMaterialId] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState('');
  const [reports, setReports] = useState<CommunityMaterialReport[]>([]);
  const [isModerator, setIsModerator] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [summary, setSummary] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [tags, setTags] = useState('');
  const [videoLinks, setVideoLinks] = useState<VideoLink[]>([]);
  const [newVideoTitle, setNewVideoTitle] = useState('');
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [uploads, setUploads] = useState<Array<{ file: File; mediaKind: CommunityMaterialMediaKind }>>([]);
  const [attachmentError, setAttachmentError] = useState('');
  const [selectedLibraryMaterialId, setSelectedLibraryMaterialId] = useState('');
  const [isCopyingLibrary, setIsCopyingLibrary] = useState(false);
  const [reportingId, setReportingId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState('other');
  const [reportDetails, setReportDetails] = useState('');
  const requestId = useRef(0);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const available = isSupabaseConfigured && !!supabase && !!userId && !isLocalDemoUser;

  useEffect(() => {
    if (isComposerOpen) titleInputRef.current?.focus();
  }, [isComposerOpen]);

  const refresh = useCallback(async () => {
    const currentRequest = ++requestId.current;
    if (!available || !supabase || !userId) {
      setIsLoading(false);
      return false;
    }
    setError('');
    try {
      const [items, moderator] = await Promise.all([
        loadCommunityMaterials(supabase, userId),
        isCommunityModerator(supabase),
      ]);
      if (currentRequest !== requestId.current) return false;
      setMaterials(items);
      setIsModerator(moderator);
      const openReports = moderator ? await loadOpenCommunityMaterialReports(supabase) : [];
      if (currentRequest !== requestId.current) return false;
      setReports(openReports);
      setIsReady(true);
      return true;
    } catch (loadError) {
      if (currentRequest === requestId.current) {
        setIsReady(false);
        const details = loadError instanceof Error ? loadError.message : 'Unknown error';
        setError(`Could not load community materials. Apply the community materials migration and verify your connection. Details: ${details}`);
      }
      return false;
    } finally {
      if (currentRequest === requestId.current) setIsLoading(false);
    }
  }, [available, userId]);

  useEffect(() => {
    setIsLoading(true);
    setIsReady(false);
    setMaterials([]);
    setReports([]);
    setIsModerator(false);
    void refresh();
  }, [refresh]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase || !userId) return;
    if (!title.trim() || !subject.trim() || !summary.trim()) {
      setError('Enter a title, subject, and summary before submitting.');
      return;
    }
    setError('');
    setNotice('');
    setIsSubmitting(true);
    try {
      const item = await submitCommunityMaterial(supabase, userId, {
        title,
        subject,
        summary,
        sourceUrl,
        videoLinks,
        tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean).slice(0, 10),
      }, uploads);
      setMaterials((current) => [item, ...current]);
      setTitle('');
      setSubject('');
      setSummary('');
      setSourceUrl('');
      setTags('');
      setVideoLinks([]);
      setNewVideoTitle('');
      setNewVideoUrl('');
      setUploads([]);
      setAttachmentError('');
      setIsComposerOpen(false);
      setNotice('Your study resource was submitted and is waiting for moderator approval.');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not submit this summary.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLike = async (item: CommunityMaterial) => {
    if (!supabase || !userId) return;
    setError('');
    setBusyId(item.id);
    try {
      await toggleCommunityMaterialLike(supabase, userId, item.id, item.userLiked);
      setMaterials((current) => current.map((material) => material.id === item.id
        ? {
          ...material,
          userLiked: !item.userLiked,
          likes: Math.max(0, material.likes + (item.userLiked ? -1 : 1)),
        }
        : material));
    } catch (likeError) {
      setError(likeError instanceof Error ? likeError.message : 'Could not update your reaction.');
    } finally {
      setBusyId(null);
    }
  };

  const handleComment = async (event: FormEvent<HTMLFormElement>, materialId: string) => {
    event.preventDefault();
    if (!supabase || !userId) return;
    const content = commentDraft.trim();
    if (!content) {
      setError('Write a comment before submitting.');
      return;
    }
    setError('');
    setBusyId(materialId);
    try {
      const comment = await submitCommunityMaterialComment(supabase, userId, materialId, content);
      setMaterials((current) => current.map((material) => material.id === materialId
        ? { ...material, comments: [...material.comments, comment] }
        : material));
      setCommentDraft('');
    } catch (commentError) {
      setError(commentError instanceof Error ? commentError.message : 'Could not add your comment.');
    } finally {
      setBusyId(null);
    }
  };

  const handleAddVideoLink = () => {
    setError('');
    if (videoLinks.length >= 20) {
      setError('A community post can include up to 20 video links.');
      return;
    }
    try {
      const newLink = makeCommunityVideoLink(newVideoTitle, newVideoUrl);
      if (videoLinks.some((link) => link.url === newLink.url)) {
        setError('That video link is already included.');
        return;
      }
      setVideoLinks((current) => [...current, newLink]);
      setNewVideoTitle('');
      setNewVideoUrl('');
    } catch (linkError) {
      setError(linkError instanceof Error ? linkError.message : 'Could not add this video link.');
    }
  };

  const addUploadCandidates = (candidates: Array<{ file: File; mediaKind: CommunityMaterialMediaKind }>) => {
    const accepted: Array<{ file: File; mediaKind: CommunityMaterialMediaKind }> = [];
    const rejected: string[] = [];
    let totalBytes = uploads.reduce((total, item) => total + item.file.size, 0);
    for (const candidate of candidates) {
      const { file, mediaKind } = candidate;
      const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
      const mimeType = file.type || documentMimeTypes[extension] || (
        mediaKind === 'photo' ? `image/${extension === 'jpg' ? 'jpeg' : extension}` :
          mediaKind === 'short_video' ? `video/${extension}` : ''
      );
      const validType = mediaKind === 'photo'
        ? ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(mimeType)
        : mediaKind === 'short_video'
          ? ['video/mp4', 'video/webm'].includes(mimeType)
          : Object.values(documentMimeTypes).includes(mimeType);
      const maxBytes = mediaKind === 'photo' ? MAX_PHOTO_BYTES : mediaKind === 'short_video' ? MAX_VIDEO_BYTES : MAX_DOCUMENT_BYTES;
      if (!validType) {
        rejected.push(`${file.name}: unsupported file type`);
      } else if (!file.size) {
        rejected.push(`${file.name}: file is empty`);
      } else if (file.size > maxBytes) {
        rejected.push(`${file.name}: exceeds the ${formatBytes(maxBytes)} per-file limit`);
      } else if (totalBytes + file.size > MAX_POST_ATTACHMENT_BYTES) {
        rejected.push(`${file.name}: total attachments would exceed ${formatBytes(MAX_POST_ATTACHMENT_BYTES)}`);
      } else if (uploads.length + accepted.length >= MAX_POST_ATTACHMENT_COUNT) {
        rejected.push(`${file.name}: a post can include at most ${MAX_POST_ATTACHMENT_COUNT} files`);
      } else if (uploads.some((item) => item.file.name === file.name && item.file.size === file.size)
        || accepted.some((item) => item.file.name === file.name && item.file.size === file.size)) {
        rejected.push(`${file.name}: already selected`);
      } else {
        const normalizedFile = file.type ? file : new File([file], file.name, { type: mimeType, lastModified: file.lastModified });
        accepted.push({ file: normalizedFile, mediaKind });
        totalBytes += file.size;
      }
    }
    setUploads((current) => [...current, ...accepted]);
    setAttachmentError(rejected.join(' · '));
  };

  const handleFileSelection = (fileList: FileList | null, mediaKind: CommunityMaterialMediaKind) => {
    if (!fileList) return;
    addUploadCandidates(Array.from(fileList).map((file) => ({ file, mediaKind })));
  };

  const handleCopyLibraryMaterial = async () => {
    const selected = libraryMaterials.find((item) => item.id === selectedLibraryMaterialId);
    if (!selected) return;
    setIsCopyingLibrary(true);
    setAttachmentError('');
    const copiedSummary = [selected.description.trim(), ...selected.keyTakeaways.map((takeaway) => `- ${takeaway.trim()}`)]
      .filter(Boolean)
      .join('\n\n');
    setTitle(selected.title);
    setSubject(selected.subject);
    setSummary(copiedSummary);
    setTags(selected.tags.join(', '));
    setVideoLinks((current) => {
      const existingUrls = new Set(current.map((link) => link.url));
      return [...current, ...selected.videoLinks.filter((link) => !existingUrls.has(link.url))];
    });

    const sourceAttachments: Array<{ attachment: FileAttachment; mediaKind: CommunityMaterialMediaKind }> = [
      ...selected.photos.map((attachment) => ({ attachment, mediaKind: 'photo' as const })),
      ...selected.documents.map((attachment) => ({ attachment, mediaKind: 'document' as const })),
      ...selected.shortVideos.map((attachment) => ({ attachment, mediaKind: 'short_video' as const })),
    ];
    const candidates: Array<{ file: File; mediaKind: CommunityMaterialMediaKind }> = [];
    const failed: string[] = [];
    for (const { attachment, mediaKind } of sourceAttachments) {
      if (!attachment.dataUrl) {
        failed.push(`${attachment.name}: no local file data`);
        continue;
      }
      try {
        const response = await fetch(attachment.dataUrl);
        if (!response.ok) throw new Error('file data could not be read');
        const blob = await response.blob();
        const extension = attachment.format.toLowerCase();
        const mimeType = blob.type || documentMimeTypes[extension] || (
          mediaKind === 'photo' ? `image/${extension === 'jpg' ? 'jpeg' : extension}` :
            mediaKind === 'short_video' ? `video/${extension}` : ''
        );
        candidates.push({
          file: new File([blob], attachment.name, { type: mimeType }),
          mediaKind,
        });
      } catch (copyError) {
        failed.push(`${attachment.name}: ${copyError instanceof Error ? copyError.message : 'copy failed'}`);
      }
    }
    addUploadCandidates(candidates);
    if (failed.length) {
      setAttachmentError((current) => [current, ...failed].filter(Boolean).join(' · '));
    }
    setIsCopyingLibrary(false);
  };

  const removeUpload = (index: number) => {
    setUploads((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const handleModerate = async (materialId: string, decision: 'approved' | 'rejected') => {
    if (!supabase) return;
    setError('');
    setBusyId(materialId);
    try {
      await moderateCommunityMaterial(supabase, materialId, decision);
      if (await refresh()) {
        setNotice(decision === 'approved' ? 'Resource approved and published.' : 'Resource rejected.');
      }
    } catch (moderateError) {
      setError(moderateError instanceof Error ? moderateError.message : 'Could not review this summary.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (materialId: string) => {
    if (!supabase) return;
    setError('');
    setBusyId(materialId);
    try {
      await deletePendingCommunityMaterial(supabase, materialId);
      setMaterials((current) => current.filter((item) => item.id !== materialId));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Could not remove this pending resource.');
    } finally {
      setBusyId(null);
    }
  };

  const handleReport = async (event: FormEvent<HTMLFormElement>, materialId: string) => {
    event.preventDefault();
    if (!supabase || !userId) return;
    setError('');
    try {
      await reportCommunityMaterial(supabase, userId, materialId, reportReason, reportDetails);
      setReportingId(null);
      setReportDetails('');
      setNotice('Thanks. Your report was sent to the moderation team.');
    } catch (reportError) {
      setError(reportError instanceof Error ? reportError.message : 'Could not report this material.');
    }
  };

  const handleReviewReport = async (reportId: string, decision: 'resolved' | 'dismissed') => {
    if (!supabase) return;
    setError('');
    try {
      await reviewCommunityMaterialReport(supabase, reportId, decision);
      setReports((current) => current.filter((report) => report.id !== reportId));
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : 'Could not update this report.');
    }
  };

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <header className="flex flex-col gap-3 border-b border-slate-100 bg-gradient-to-br from-amber-50 to-white p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-300 text-slate-950">
            <BookOpen className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-amber-800">Student community</p>
            <h2 className="mt-1 text-xl font-black text-slate-900">Shared study materials</h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              Share summaries, selected Library copies, documents, photos, short videos, and YouTube links. Posts are reviewed before publication.
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
            <p>Community sharing requires a signed-in cloud account. Your private library is unchanged.</p>
          </div>
        ) : isReady ? (
          isComposerOpen ? (
          <form onSubmit={(event) => void handleSubmit(event)} className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-900">Share a study resource</h3>
                <p className="mt-1 text-xs leading-5 text-slate-600">
                  Add your own summary, links, and selected files. Your private Library stays separate; selected files are copied into this community post for review.
                </p>
              </div>
              <button
                type="button"
                disabled={isSubmitting || isCopyingLibrary}
                onClick={() => setIsComposerOpen(false)}
                aria-label="Close post composer"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-200 hover:text-slate-900 disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {libraryMaterials.length > 0 && (
              <section className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
                <label className="block text-xs font-bold text-slate-700" htmlFor="community-library-material">
                  Copy a material from your personal Library
                </label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <select
                    id="community-library-material"
                    value={selectedLibraryMaterialId}
                    onChange={(event) => setSelectedLibraryMaterialId(event.target.value)}
                    className="min-h-11 min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900"
                  >
                    <option value="">Choose a material…</option>
                    {libraryMaterials.map((material) => <option key={material.id} value={material.id}>{material.title} · {material.subject}</option>)}
                  </select>
                  <button
                    type="button"
                    disabled={!selectedLibraryMaterialId || isCopyingLibrary}
                    onClick={() => void handleCopyLibraryMaterial()}
                    className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isCopyingLibrary ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <BookOpen className="h-4 w-4" />}
                    Copy into post
                  </button>
                </div>
                <p className="text-[11px] leading-5 text-slate-600">Only the details and files shown in this post will be shared. Reading progress, private notes, and the original Library record are not copied.</p>
              </section>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-bold text-slate-700">
                Title
                <input ref={titleInputRef} required maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200" placeholder="What is this resource about?" />
              </label>
              <label className="block text-xs font-bold text-slate-700">
                Subject
                <input required maxLength={100} value={subject} onChange={(event) => setSubject(event.target.value)} className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200" placeholder="e.g. Biology" />
              </label>
            </div>
            <label className="block text-xs font-bold text-slate-700">
              Original summary
              <textarea required maxLength={10000} rows={4} value={summary} onChange={(event) => setSummary(event.target.value)} className="mt-1.5 w-full resize-y rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal leading-6 text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200" placeholder="Share key concepts or your own notes in your own words." />
            </label>
            <label className="block text-xs font-bold text-slate-700">
              Reference link <span className="font-normal text-slate-500">(optional, http or https)</span>
              <input type="url" maxLength={2048} value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200" placeholder="https://…" />
            </label>
            <section aria-labelledby="community-video-links-title" className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
              <div className="flex items-center gap-2">
                <Video className="h-4 w-4 text-amber-700" />
                <h4 id="community-video-links-title" className="text-xs font-extrabold text-slate-800">YouTube, Vimeo & video links</h4>
              </div>
              <div className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
                <input value={newVideoTitle} onChange={(event) => setNewVideoTitle(event.target.value)} maxLength={200} className="min-h-10 min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900" placeholder="Video title" aria-label="Video title" />
                <input type="url" value={newVideoUrl} onChange={(event) => setNewVideoUrl(event.target.value)} maxLength={2048} className="min-h-10 min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900" placeholder="https://youtube.com/watch?v=…" aria-label="Video URL" />
                <button type="button" onClick={handleAddVideoLink} className="inline-flex min-h-10 items-center justify-center gap-1 rounded-lg bg-slate-900 px-3 text-xs font-bold text-white">
                  <Plus className="h-4 w-4" /> Add link
                </button>
              </div>
              {!!videoLinks.length && (
                <ul className="space-y-1.5">
                  {videoLinks.map((link) => (
                    <li key={link.id} className="flex min-w-0 items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
                      <span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-700">{link.title} <span className="font-normal text-slate-500">({link.platform})</span></span>
                      <button type="button" onClick={() => setVideoLinks((current) => current.filter((item) => item.id !== link.id))} aria-label={`Remove ${link.title}`} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-700">
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section aria-labelledby="community-attachments-title" className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 id="community-attachments-title" className="text-xs font-extrabold text-slate-800">Add files to this post</h4>
                <p className="text-[11px] text-slate-500">{formatBytes(uploads.reduce((total, item) => total + item.file.size, 0))} / 80 MB selected</p>
              </div>
              <input ref={photoInputRef} type="file" multiple accept=".jpg,.jpeg,.png,.webp,.gif,image/jpeg,image/png,image/webp,image/gif" className="sr-only" onChange={(event) => { handleFileSelection(event.target.files, 'photo'); event.target.value = ''; }} />
              <input ref={documentInputRef} type="file" multiple accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.md,.csv,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain,text/markdown,text/csv" className="sr-only" onChange={(event) => { handleFileSelection(event.target.files, 'document'); event.target.value = ''; }} />
              <input ref={videoInputRef} type="file" multiple accept=".mp4,.webm,video/mp4,video/webm" className="sr-only" onChange={(event) => { handleFileSelection(event.target.files, 'short_video'); event.target.value = ''; }} />
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => photoInputRef.current?.click()} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-slate-300 px-3 text-xs font-bold text-slate-700 hover:bg-slate-50"><ImageIcon className="h-4 w-4" /> Add photo</button>
                <button type="button" onClick={() => documentInputRef.current?.click()} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-slate-300 px-3 text-xs font-bold text-slate-700 hover:bg-slate-50"><FileText className="h-4 w-4" /> Add document</button>
                <button type="button" onClick={() => videoInputRef.current?.click()} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-slate-300 px-3 text-xs font-bold text-slate-700 hover:bg-slate-50"><Video className="h-4 w-4" /> Add short video</button>
              </div>
              <p className="text-[11px] leading-5 text-slate-500">Per post: up to 20 files and 80 MB total; photos up to 10 MB each, documents 20 MB each, MP4/WebM videos 30 MB each. Supported documents: PDF, Word, PowerPoint, Excel, TXT, Markdown, CSV.</p>
              {attachmentError && <p role="alert" className="text-xs font-semibold text-rose-700">{attachmentError}</p>}
              {!!uploads.length && (
                <ul className="space-y-1.5">
                  {uploads.map(({ file, mediaKind }, index) => (
                    <li key={`${file.name}-${file.size}-${index}`} className="flex min-w-0 items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
                      <FileText className="h-4 w-4 shrink-0 text-slate-500" />
                      <span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-700">{file.name}<span className="ml-1.5 font-normal text-slate-500">{formatBytes(file.size)} · {mediaKind.replace('_', ' ')}</span></span>
                      <button type="button" onClick={() => removeUpload(index)} aria-label={`Remove ${file.name}`} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-700"><X className="h-4 w-4" /></button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <label className="block text-xs font-bold text-slate-700">
              Tags <span className="font-normal text-slate-500">(comma separated)</span>
              <input value={tags} onChange={(event) => setTags(event.target.value)} className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200" placeholder="lecture notes, revision" />
            </label>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-slate-500">Content and files become visible to signed-in students only after approval.</p>
              <button type="submit" disabled={isSubmitting || isCopyingLibrary} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-amber-300 px-4 py-2 text-sm font-extrabold text-slate-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60">
                {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {isSubmitting ? 'Submitting…' : 'Submit for review'}
              </button>
            </div>
          </form>
          ) : (
            <button
              type="button"
              onClick={() => setIsComposerOpen(true)}
              className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-left transition hover:border-amber-300 hover:bg-amber-50 sm:p-4"
              aria-label="Open post composer"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-300 text-slate-950">
                <Plus className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-slate-900">Share a study resource</span>
                <span className="mt-0.5 block truncate text-xs text-slate-500">Write a summary, add files, or share a video link…</span>
              </span>
            </button>
          )
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <span>{isLoading ? 'Checking the community materials service…' : 'Community materials are not ready yet.'}</span>
            {!isLoading && <button type="button" onClick={() => { setIsLoading(true); void refresh(); }} className="min-h-9 rounded-lg bg-slate-900 px-3 text-xs font-bold text-white">Retry</button>}
          </div>
        )}

        {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>}
        {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</p>}

        {available && (
          <section aria-labelledby="community-materials-title">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 id="community-materials-title" className="font-extrabold text-slate-900">Reviewed resources</h3>
              <button type="button" onClick={() => { setIsLoading(true); void refresh(); }} className="rounded-lg px-3 py-2 text-xs font-bold text-amber-800 hover:bg-amber-50">Refresh</button>
            </div>
            {isLoading ? (
              <div role="status" className="flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-5 text-sm text-slate-600"><LoaderCircle className="h-4 w-4 animate-spin" /> Loading shared materials…</div>
            ) : materials.length === 0 ? (
              <p className="rounded-xl bg-slate-50 px-4 py-5 text-sm text-slate-600">No shared summaries have been approved yet.</p>
            ) : (
              <div className="grid gap-3">
                {materials.map((item) => (
                  <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          {item.status === 'pending' ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-900"><Clock3 className="h-3 w-3" /> Awaiting review</span>
                          ) : item.status === 'rejected' ? (
                            <span className="rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-bold text-rose-800">Not approved</span>
                          ) : (
                            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-800">{item.subject}</span>
                          )}
                        </div>
                        <h4 className="break-words text-base font-extrabold text-slate-900">{item.title}</h4>
                      </div>
                      {item.status === 'pending' && item.ownerId === userId && (
                        <button type="button" disabled={busyId === item.id} onClick={() => void handleDelete(item.id)} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-50">
                          <Trash2 className="h-4 w-4" /> Remove
                        </button>
                      )}
                    </div>
                    <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{item.summary}</p>
                    {item.sourceUrl && (item.status === 'approved' || item.ownerId === userId) && (
                      <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex max-w-full items-center gap-1.5 break-all text-sm font-bold text-amber-800 underline underline-offset-2">
                        <ExternalLink className="h-4 w-4 shrink-0" /> Open reference link
                      </a>
                    )}
                    {!!item.videoLinks.length && (item.status === 'approved' || item.ownerId === userId) && (
                      <section aria-label="Video links" className="mt-4 grid gap-3 sm:grid-cols-2">
                        {item.videoLinks.map((link) => {
                          const embedUrl = getVideoEmbedUrl(link);
                          return (
                            <div key={link.id} className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                              {embedUrl ? (
                                <iframe
                                  src={embedUrl}
                                  title={link.title}
                                  className="aspect-video w-full border-0"
                                  loading="lazy"
                                  referrerPolicy="strict-origin-when-cross-origin"
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                  allowFullScreen
                                />
                              ) : (
                                <div className="flex aspect-video items-center justify-center">
                                  <Video className="h-8 w-8 text-slate-400" />
                                </div>
                              )}
                              <a href={link.url} target="_blank" rel="noopener noreferrer" className="flex min-h-10 items-center gap-2 px-3 py-2 text-xs font-bold text-slate-800 hover:text-amber-800">
                                <Link2 className="h-4 w-4 shrink-0" />
                                <span className="min-w-0 flex-1 truncate">{link.title}</span>
                                <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                              </a>
                            </div>
                          );
                        })}
                      </section>
                    )}
                    {!!item.attachments.length && (
                      <section aria-label="Attached files" className="mt-4 space-y-2">
                        <h5 className="text-xs font-extrabold text-slate-700">Attachments ({item.attachments.length})</h5>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {item.attachments.map((attachment) => (
                            <div key={attachment.id} className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                              {attachment.mediaKind === 'photo' ? (
                                <a href={attachment.signedUrl} target="_blank" rel="noopener noreferrer" aria-label={`Open image ${attachment.name}`}>
                                  <img src={attachment.signedUrl} alt={attachment.name} loading="lazy" className="max-h-72 w-full bg-slate-100 object-contain" />
                                </a>
                              ) : attachment.mediaKind === 'short_video' ? (
                                <video src={attachment.signedUrl} controls preload="metadata" className="aspect-video w-full bg-slate-950" aria-label={attachment.name}>
                                  Your browser cannot play this video.
                                </video>
                              ) : null}
                              <a href={attachment.signedUrl} target="_blank" rel="noopener noreferrer" className="flex min-h-10 min-w-0 items-center gap-2 px-3 py-2 text-xs font-bold text-slate-800 hover:text-amber-800">
                                <FileText className="h-4 w-4 shrink-0" />
                                <span className="min-w-0 flex-1 truncate">{attachment.name}</span>
                                <span className="shrink-0 font-normal text-slate-500">{formatBytes(attachment.sizeBytes)}</span>
                                <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                              </a>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}
                    {!!item.tags.length && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {item.tags.map((tag, index) => <span key={`${tag}-${index}`} className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">#{tag}</span>)}
                      </div>
                    )}
                    {item.status === 'rejected' && item.moderationNote && (
                      <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs leading-5 text-rose-800">Moderator note: {item.moderationNote}</p>
                    )}
                    {item.status === 'approved' && (
                      <>
                        <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
                          <button
                            type="button"
                            disabled={busyId === item.id}
                            onClick={() => void handleLike(item)}
                            aria-pressed={item.userLiked}
                            className={`inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-bold transition disabled:opacity-50 ${
                              item.userLiked ? 'bg-amber-100 text-amber-900' : 'text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            <ThumbsUp className="h-4 w-4" /> Like · {item.likes}
                          </button>
                          <button
                            type="button"
                            onClick={() => { setOpenCommentMaterialId(openCommentMaterialId === item.id ? null : item.id); setCommentDraft(''); setError(''); }}
                            aria-expanded={openCommentMaterialId === item.id}
                            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-bold text-slate-600 transition hover:bg-slate-100"
                          >
                            <MessageCircle className="h-4 w-4" /> Comment · {item.comments.length}
                          </button>
                        </div>
                        {openCommentMaterialId === item.id && (
                          <section aria-label={`Comments on ${item.title}`} className="mt-2 space-y-3 rounded-xl bg-slate-50 p-3">
                            {item.comments.length > 0 ? (
                              <ul className="space-y-2">
                                {item.comments.map((comment) => (
                                  <li key={comment.id} className="rounded-lg bg-white px-3 py-2">
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="text-xs font-bold text-slate-700">{comment.ownerId === userId ? 'You' : 'Student'}</span>
                                      <time className="text-[11px] text-slate-500">{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(comment.createdAt))}</time>
                                    </div>
                                    <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-5 text-slate-700">{comment.content}</p>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-xs text-slate-500">No comments yet. Start the conversation.</p>
                            )}
                            <form onSubmit={(event) => void handleComment(event, item.id)} className="flex items-end gap-2">
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
                              <button type="submit" disabled={busyId === item.id} aria-label="Send comment" className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 text-xs font-bold text-white disabled:opacity-50">
                                {busyId === item.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                <span className="hidden sm:inline">Send</span>
                              </button>
                            </form>
                          </section>
                        )}
                      </>
                    )}
                    <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                      {item.status === 'approved' && item.ownerId !== userId && (
                        <button type="button" onClick={() => { setReportingId(reportingId === item.id ? null : item.id); setError(''); }} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-bold text-slate-600 hover:bg-slate-100">
                          <Flag className="h-4 w-4" /> Report
                        </button>
                      )}
                      {reportingId === item.id && (
                        <form onSubmit={(event) => void handleReport(event, item.id)} className="basis-full space-y-2 rounded-xl bg-slate-50 p-3">
                          <label className="block text-xs font-bold text-slate-700">
                            Report reason
                            <select value={reportReason} onChange={(event) => setReportReason(event.target.value)} className="mt-1.5 min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900">
                              {reportReasons.map((reason) => <option key={reason.value} value={reason.value}>{reason.label}</option>)}
                            </select>
                          </label>
                          <textarea maxLength={1000} value={reportDetails} onChange={(event) => setReportDetails(event.target.value)} rows={2} placeholder="Optional details" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900" />
                          <button type="submit" className="min-h-9 rounded-lg bg-slate-900 px-3 text-xs font-bold text-white">Send report</button>
                        </form>
                      )}
                      {isModerator && item.status === 'pending' && (
                        <>
                          <button type="button" disabled={busyId === item.id} onClick={() => void handleModerate(item.id, 'approved')} className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-emerald-100 px-3 text-xs font-bold text-emerald-800 hover:bg-emerald-200 disabled:opacity-50"><Check className="h-4 w-4" /> Approve</button>
                          <button type="button" disabled={busyId === item.id} onClick={() => void handleModerate(item.id, 'rejected')} className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-rose-100 px-3 text-xs font-bold text-rose-800 hover:bg-rose-200 disabled:opacity-50"><AlertCircle className="h-4 w-4" /> Reject</button>
                        </>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {available && isModerator && reports.length > 0 && (
          <section aria-labelledby="community-material-reports-title" className="border-t border-slate-200 pt-5">
            <h3 id="community-material-reports-title" className="mb-3 font-extrabold text-slate-900">Open reports ({reports.length})</h3>
            <div className="space-y-2">
              {reports.map((report) => (
                <article key={report.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-3">
                  <div className="min-w-0 text-sm">
                    <p className="font-bold text-slate-800">{report.reason} · {report.materialTitle ?? `resource ${report.materialId.slice(0, 8)}`}</p>
                    {report.details && <p className="mt-1 break-words text-xs text-slate-600">{report.details}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => void handleReviewReport(report.id, 'resolved')} className="min-h-9 rounded-lg bg-emerald-100 px-3 text-xs font-bold text-emerald-800">Resolve</button>
                    <button type="button" onClick={() => void handleReviewReport(report.id, 'dismissed')} className="min-h-9 rounded-lg bg-slate-200 px-3 text-xs font-bold text-slate-700">Dismiss</button>
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
