import React, { useState, useRef } from 'react';
import {
  X, Plus, Trash2, Image, Video, FileText, Link2, Sparkles,
  Camera, Check, AlertCircle, BookOpen, Star, UploadCloud
} from 'lucide-react';
import { ReadingMaterial, FileAttachment, VideoLink, ReadingStatus } from '../types';
import { formatBytes } from '../utils/storage';
import { getApiUrl } from '../utils/api';

interface MaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (material: ReadingMaterial) => void;
  initialData?: ReadingMaterial | null;
}

export const MaterialModal: React.FC<MaterialModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
}) => {
  // The parent mounts this component only while the modal is open. This keeps
  // hook order stable and guarantees a fresh form when switching Add/Edit.
  if (!isOpen) return null;

  // Form State
  const [title, setTitle] = useState(initialData?.title || '');
  const [subject, setSubject] = useState(initialData?.subject || 'Computer Science');
  const [author, setAuthor] = useState(initialData?.author || '');
  const [professor, setProfessor] = useState(initialData?.professor || '');
  const [semester, setSemester] = useState(initialData?.semester || 'Fall 2026');
  const [description, setDescription] = useState(initialData?.description || '');
  const [status, setStatus] = useState<ReadingStatus>(initialData?.status || 'reading');
  const [priority, setPriority] = useState<ReadingMaterial['priority']>(initialData?.priority || 'medium');
  const [rating, setRating] = useState<number>(initialData?.rating || 4);
  const [totalPages, setTotalPages] = useState<number>(initialData?.totalPages || 30);
  const [pagesRead, setPagesRead] = useState<number>(initialData?.pagesRead || 0);
  const [tagsInput, setTagsInput] = useState<string>(initialData?.tags?.join(', ') || '');
  const [notesMarkdown, setNotesMarkdown] = useState<string>(initialData?.notesMarkdown || '');
  const [keyTakeaways, setKeyTakeaways] = useState<string[]>(
    initialData?.keyTakeaways || [
      'Core definitions and main mechanism',
      'Exam-critical practice problem takeaways'
    ]
  );
  const [newTakeawayInput, setNewTakeawayInput] = useState('');
  const [keyDefinitions, setKeyDefinitions] = useState<NonNullable<ReadingMaterial['keyDefinitions']>>(
    initialData?.keyDefinitions || []
  );
  const [newDefinitionTerm, setNewDefinitionTerm] = useState('');
  const [newDefinitionText, setNewDefinitionText] = useState('');

  // Media attachments
  const [photos, setPhotos] = useState<FileAttachment[]>(initialData?.photos || []);
  const [videoLinks, setVideoLinks] = useState<VideoLink[]>(initialData?.videoLinks || []);
  const [shortVideos, setShortVideos] = useState<FileAttachment[]>(initialData?.shortVideos || []);
  const [documents, setDocuments] = useState<FileAttachment[]>(initialData?.documents || []);

  // Video Link input helper
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [newVideoTitle, setNewVideoTitle] = useState('');

  // Camera / Webcam State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraMode, setCameraMode] = useState<'photo' | 'short_video'>('photo');
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const mountedRef = useRef(true);

  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      const recorder = mediaRecorderRef.current;
      if (recorder?.state === 'recording') recorder.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, []);

  // AI Generation State
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [aiNotice, setAiNotice] = useState<string | null>(null);
  const [attachmentNotice, setAttachmentNotice] = useState<string | null>(null);
  const [isProcessingAttachments, setIsProcessingAttachments] = useState(false);

  // File Inputs Refs
  const photoInputRef = useRef<HTMLInputElement>(null);
  const shortVideoInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  // Handle Key Takeaways
  const handleAddTakeaway = () => {
    const takeaway = newTakeawayInput.trim();
    if (!takeaway || keyTakeaways.some((item) => item.toLowerCase() === takeaway.toLowerCase())) return;
    setKeyTakeaways((current) => [...current, takeaway]);
    setNewTakeawayInput('');
  };

  const handleRemoveTakeaway = (idx: number) => {
    setKeyTakeaways(keyTakeaways.filter((_, i) => i !== idx));
  };

  const handleAddDefinition = () => {
    const term = newDefinitionTerm.trim();
    const definition = newDefinitionText.trim();
    if (!term || !definition || keyDefinitions.some((item) => item.term.toLowerCase() === term.toLowerCase())) return;
    setKeyDefinitions((current) => [...current, { term, definition }]);
    setNewDefinitionTerm('');
    setNewDefinitionText('');
  };

  // Attachments are stored in IndexedDB as data URLs. Keep uploads bounded so
  // one large video cannot exhaust browser storage or make the app unresponsive.
  const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
  const MAX_VIDEO_BYTES = 30 * 1024 * 1024;
  const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024;
  const MAX_TOTAL_ATTACHMENT_BYTES = 80 * 1024 * 1024;

  const attachmentBytes = () => [...photos, ...shortVideos, ...documents]
    .reduce((sum, item) => sum + (item.sizeBytes || 0), 0);

  const readAsDataUrl = (file: Blob): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Could not read this file.'));
    reader.onerror = () => reject(new Error('The file could not be read. Try selecting it again.'));
    reader.onabort = () => reject(new Error('File reading was cancelled.'));
    reader.readAsDataURL(file);
  });

  const makeAttachment = async (file: File, type: FileAttachment['type']): Promise<FileAttachment> => {
    const dataUrl = await readAsDataUrl(file);
    const extension = file.name.split('.').pop()?.toLowerCase() || 'file';
    const attachment: FileAttachment = {
      id: `${type}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      name: file.name,
      type,
      format: extension,
      sizeBytes: file.size,
      dataUrl,
      createdAt: new Date().toISOString(),
    };

    if (type === 'document' && ['txt', 'md', 'py', 'js', 'jsx', 'html', 'css', 'json', 'csv', 'ts', 'tsx', 'sql', 'xml', 'yml', 'yaml', 'log'].includes(extension)) {
      try {
        attachment.textContent = await file.text();
      } catch {
        // The original data URL is still available for download if text preview fails.
      }
    }
    return attachment;
  };

  const validateAndReadFiles = async (
    fileList: FileList,
    kind: 'photo' | 'short_video' | 'document',
    setItems: React.Dispatch<React.SetStateAction<FileAttachment[]>>,
    maxBytes: number,
  ) => {
    const files = Array.from(fileList);
    if (!files.length) return;
    setAttachmentNotice(null);
    setIsProcessingAttachments(true);
    let runningTotal = attachmentBytes();
    const accepted: FileAttachment[] = [];
    const rejected: string[] = [];

    try {
      for (const file of files) {
        if (file.size === 0) {
          rejected.push(`${file.name}: file is empty`);
          continue;
        }
        if (file.size > maxBytes) {
          rejected.push(`${file.name}: exceeds the ${formatBytes(maxBytes)} per-file limit`);
          continue;
        }
        if (kind === 'photo' && !file.type.startsWith('image/')) {
          rejected.push(`${file.name}: choose an image file`);
          continue;
        }
        if (kind === 'short_video' && !file.type.startsWith('video/')) {
          rejected.push(`${file.name}: choose a video file`);
          continue;
        }
        if (runningTotal + file.size > MAX_TOTAL_ATTACHMENT_BYTES) {
          rejected.push(`${file.name}: total attachments would exceed ${formatBytes(MAX_TOTAL_ATTACHMENT_BYTES)}`);
          continue;
        }
        try {
          accepted.push(await makeAttachment(file, kind));
          runningTotal += file.size;
        } catch (error) {
          rejected.push(`${file.name}: ${error instanceof Error ? error.message : 'read failed'}`);
        }
      }
      if (accepted.length) setItems(current => [...current, ...accepted]);
      if (rejected.length) {
        const shown = rejected.slice(0, 3).join(' · ');
        const extra = rejected.length > 3 ? ` · and ${rejected.length - 3} more` : '';
        setAttachmentNotice(`${accepted.length ? `Added ${accepted.length} file(s). ` : ''}${rejected.length} file(s) skipped: ${shown}${extra}.`);
      } else if (accepted.length) {
        setAttachmentNotice(`Successfully added ${accepted.length} file${accepted.length === 1 ? '' : 's'}.`);
      }
    } finally {
      setIsProcessingAttachments(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) void validateAndReadFiles(files, 'photo', setPhotos, MAX_PHOTO_BYTES);
    e.target.value = '';
  };

  const handleShortVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) void validateAndReadFiles(files, 'short_video', setShortVideos, MAX_VIDEO_BYTES);
    e.target.value = '';
  };

  const handleDocUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) void validateAndReadFiles(files, 'document', setDocuments, MAX_DOCUMENT_BYTES);
    e.target.value = '';
  };

  // Handle Video Link Add
  const handleAddVideoLink = () => {
    const url = newVideoUrl.trim();
    if (!url) return;

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      setAiNotice('Enter a complete video URL beginning with https:// or http://.');
      return;
    }
    if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
      setAiNotice('Only HTTP and HTTPS video links are supported.');
      return;
    }
    if (videoLinks.some((link) => link.url === url)) {
      setAiNotice('That video link has already been added.');
      return;
    }
    setAiNotice(null);
    let platform: VideoLink['platform'] = 'other';

    if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'].includes(parsedUrl.hostname.toLowerCase())) {
      platform = 'youtube';
    } else if (parsedUrl.hostname.toLowerCase() === 'vimeo.com' || parsedUrl.hostname.toLowerCase() === 'www.vimeo.com') {
      platform = 'vimeo';
    } else if (url.match(/\.(mp4|webm|ogg|mov)/i)) {
      platform = 'direct';
    }

    const newLink: VideoLink = {
      id: 'vl_' + Date.now(),
      title: newVideoTitle.trim() || 'Video Reference',
      url,
      platform,
    };

    setVideoLinks([...videoLinks, newLink]);
    setNewVideoUrl('');
    setNewVideoTitle('');
  };

  // Camera & Webcam Controls
  const startCamera = async (mode: 'photo' | 'short_video') => {
    try {
      setCameraMode(mode);
      setIsCameraActive(true);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: mode === 'short_video',
      });

      if (!mountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        void videoRef.current.play().catch((error: unknown) => {
          console.warn('Camera preview could not start:', error);
          if (!mountedRef.current) return;
          setAttachmentNotice('Camera is available, but its preview could not start. Try another browser or upload a file.');
        });
      }
    } catch (err) {
      if (!mountedRef.current) return;
      alert('Unable to access camera or microphone. Please ensure device permissions are granted.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    setIsCameraActive(false);
    setIsRecordingVideo(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 1280;
    canvas.height = videoRef.current.videoHeight || 720;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(
      videoRef.current,
      0,
      0,
      canvas.width,
      canvas.height
    );

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    const estimatedBytes = Math.round(dataUrl.length * 0.75);
    if (estimatedBytes > MAX_PHOTO_BYTES || attachmentBytes() + estimatedBytes > MAX_TOTAL_ATTACHMENT_BYTES) {
      setAttachmentNotice('Snapshot was not saved because it would exceed the photo or total attachment limit.');
      stopCamera();
      return;
    }

    const newPhoto: FileAttachment = {
      id: 'photo_snap_' + Date.now(),
      name: `Snapshot_${new Date().toLocaleTimeString().replace(/:/g, '-')}.jpg`,
      type: 'photo',
      format: 'jpg',
      sizeBytes: estimatedBytes,
      dataUrl,
      createdAt: new Date().toISOString(),
    };

    setPhotos([...photos, newPhoto]);
    stopCamera();
  };

  const startVideoRecording = () => {
    if (!streamRef.current) return;

    if (typeof MediaRecorder === 'undefined') {
      setAttachmentNotice('Video recording is not supported by this browser. You can still upload a video file.');
      return;
    }
    const supportedMime = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']
      .find((mime) => MediaRecorder.isTypeSupported(mime));
    if (!supportedMime) {
      setAttachmentNotice('This device does not support a compatible in-browser video format. Please upload a clip instead.');
      return;
    }

    recordedChunksRef.current = [];

    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(streamRef.current, { mimeType: supportedMime });
    } catch {
      setAttachmentNotice('Could not start recording on this device. Try uploading a video file instead.');
      return;
    }

    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
      }
    };

    recorder.onstop = () => {
      if (!mountedRef.current) return;
      const blob = new Blob(recordedChunksRef.current, { type: recorder.mimeType || supportedMime });
      if (blob.size === 0) {
        setAttachmentNotice('No video data was recorded. Please try again.');
        stopCamera();
        return;
      }
      if (blob.size > MAX_VIDEO_BYTES || attachmentBytes() + blob.size > MAX_TOTAL_ATTACHMENT_BYTES) {
        setAttachmentNotice('Recording was too large to save. Keep clips under 30 MB and total attachments under 80 MB.');
        stopCamera();
        return;
      }

      const reader = new FileReader();
      reader.onerror = () => {
        if (mountedRef.current) setAttachmentNotice('The recorded video could not be saved. Please try again.');
      };

      reader.onload = () => {
        if (!mountedRef.current || typeof reader.result !== 'string') return;
        const dataUrl = reader.result;
        const newClip: FileAttachment = {
          id: 'sv_clip_' + Date.now(),
          name: `Short_Video_Note_${new Date().toLocaleTimeString().replace(/:/g, '-')}.${(blob.type.split('/')[1] || 'webm').split(';')[0]}`,
          type: 'short_video',
          format: (blob.type.split('/')[1] || 'webm').split(';')[0],
          sizeBytes: blob.size,
          dataUrl,
          createdAt: new Date().toISOString(),
        };
        setShortVideos((prev) => [...prev, newClip]);
        setAttachmentNotice('Video recording saved successfully.');
      };
      reader.readAsDataURL(blob);
      stopCamera();
    };

    recorder.start();
    setIsRecordingVideo(true);
  };

  const stopVideoRecording = () => {
    if (mediaRecorderRef.current && isRecordingVideo) {
      mediaRecorderRef.current.stop();
      setIsRecordingVideo(false);
    }
  };

  // AI Study Assistant: Summarize and extract takeaways
  const handleAISummarize = async () => {
    if (!title.trim()) {
      alert('Please enter at least a title for the material before generating takeaways.');
      return;
    }

    setIsSummarizing(true);
    setAiNotice('Analyzing reading notes & structuring takeaways...');

    try {
      const res = await fetch(getApiUrl('/api/study-summary'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          subject,
          description,
          notes: notesMarkdown,
        }),
      });

      if (!res.ok) throw new Error(`Study summary request failed (${res.status})`);
      const data: unknown = await res.json();
      if (
        !data ||
        typeof data !== 'object' ||
        !('keyTakeaways' in data) ||
        !Array.isArray(data.keyTakeaways) ||
        !data.keyTakeaways.every((item): item is string => typeof item === 'string')
      ) {
        throw new Error('Study summary response was invalid');
      }

      setKeyTakeaways(data.keyTakeaways);
      if ('summary' in data && typeof data.summary === 'string' && data.summary && !description) {
        setDescription(data.summary);
      }

      // The server falls back to a canned answer when Gemini is unreachable.
      // Say so explicitly instead of implying the AI actually produced this.
      if ('source' in data && data.source === 'fallback') {
        setAiNotice('Generated offline sample takeaways (AI unavailable).');
      } else {
        setAiNotice('✨ Key takeaways generated!');
      }

      setTimeout(() => setAiNotice(null), 3000);
    } catch (err) {
      console.warn('AI Summary error:', err);
      setAiNotice('Study summary is unavailable right now. Please try again later.');

      setTimeout(() => setAiNotice(null), 2500);
    } finally {
      setIsSummarizing(false);
    }
  };

  // Submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || isProcessingAttachments || isRecordingVideo) return;
    const safeTotalPages = Math.max(1, Math.floor(Number(totalPages) || 1));
    const safePagesRead = Math.min(safeTotalPages, Math.max(0, Math.floor(Number(pagesRead) || 0)));

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const updatedMaterial: ReadingMaterial = {
      id: initialData?.id || 'mat_' + Date.now(),
      title: title.trim(),
      subject: subject.trim() || 'General Studies',
      author: author.trim() || 'Academic Reference',
      professor: professor.trim() || undefined,
      semester: semester.trim() || undefined,
      description: description.trim(),
      status,
      priority,
      rating,
      totalPages: safeTotalPages,
      pagesRead: safePagesRead,
      tags,
      keyTakeaways,
      keyDefinitions,
      notesMarkdown,
      photos,
      videoLinks,
      shortVideos,
      documents,
      createdAt: initialData?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(updatedMaterial);
    onClose();
  };

  const handleClose = () => {
    if (isProcessingAttachments) return;
    stopCamera();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[92dvh] flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">

        {/* Modal Header */}
        <div className="flex items-center justify-between gap-2 px-4 py-3 sm:px-6 sm:py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
              <BookOpen className="w-4 h-4" />
            </div>

            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                {initialData ? 'Edit study material' : 'Add study material'}
              </h2>

              <p className="text-[11px] sm:text-xs text-slate-500 font-medium leading-snug">
                Start with a title and subject. Add notes or files only when you need them.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={isProcessingAttachments}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Scrollable Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 sm:space-y-6">

          {/* Section 1: Core Material Info */}
          <div className="space-y-4">
            <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-xs font-black tracking-wider text-indigo-900 uppercase">
                1. Material Information & Course Details
              </h3>

              {/* AI assist button */}
              <button
                type="button"
                onClick={handleAISummarize}
                disabled={isSummarizing || !title.trim()}
                className="flex w-full items-center justify-center gap-1.5 px-3 py-2 sm:w-auto sm:py-1 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-xs font-bold transition-all border border-indigo-200/60 cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>
                  {isSummarizing ? 'Analyzing...' : 'AI Takeaways & Summary'}
                </span>
              </button>
            </div>

            {aiNotice && (
              <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-800 font-medium flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                <span>{aiNotice}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Title <span className="text-rose-500">*</span>
                </label>

                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Molecular Biology Chapter 4: DNA Repair Mechanisms"
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Subject
                </label>

                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Computer Science, Organic Chemistry, History"
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                />
              </div>

              <details className="sm:col-span-2 rounded-xl border border-slate-200/80 bg-slate-50/50 p-3" open={Boolean(initialData && (initialData.author || initialData.professor || initialData.semester))}>
                <summary className="cursor-pointer select-none text-xs font-bold text-slate-700 marker:text-amber-500">
                  Add course details <span className="font-medium text-slate-500">(optional: author, instructor, semester)</span>
                </summary>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Author(s)
                </label>

                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="e.g. Thomas H. Cormen, Charles E. Leiserson"
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Professor / Instructor
                </label>

                <input
                  type="text"
                  value={professor}
                  onChange={(e) => setProfessor(e.target.value)}
                  placeholder="e.g. Dr. Rivera"
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Semester / Term
                </label>

                <input
                  type="text"
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                  placeholder="e.g. Fall 2026"
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                />
              </div>
                </div>
              </details>
            </div>

            {/* The only workflow choice kept in the primary form. */}
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3">
              <label className="block text-xs font-bold text-slate-700 mb-1" htmlFor="material-status">
                Status
              </label>
              <select
                id="material-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as ReadingStatus)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl font-semibold outline-none focus:border-amber-400"
              >
                <option value="to_read">📌 To Read</option>
                <option value="reading">📖 In Progress</option>
                <option value="under_review">🔍 Under Review</option>
                <option value="completed">✅ Completed</option>
              </select>
            </div>

            <details
              className="rounded-2xl border border-slate-200/80 bg-slate-50/40 p-3"
              open={Boolean(initialData && (initialData.priority || initialData.pagesRead || initialData.description || initialData.tags?.length || initialData.notesMarkdown || initialData.keyTakeaways?.length || initialData.keyDefinitions?.length))}
            >
              <summary className="cursor-pointer select-none text-xs font-bold text-slate-700 marker:text-amber-500">
                Add more details <span className="font-medium text-slate-500">(optional: priority, pages, notes, tags, recall points)</span>
              </summary>
              <div className="mt-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-xl border border-slate-200/80 bg-slate-50/60 p-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1" htmlFor="material-priority">Priority</label>
                <select id="material-priority" value={priority} onChange={(e) => setPriority(e.target.value as ReadingMaterial['priority'])} className="w-full px-2.5 py-2 text-sm bg-white border border-slate-200 rounded-xl font-semibold outline-none">
                  <option value="low">Normal</option>
                  <option value="medium">Important</option>
                  <option value="high">Exam prep</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1" htmlFor="material-pages-read">Pages read</label>
                <input id="material-pages-read" type="number" min="0" value={pagesRead} onChange={(e) => setPagesRead(Number(e.target.value))} className="w-full px-2.5 py-2 text-sm bg-white border border-slate-200 rounded-xl font-semibold outline-none" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1" htmlFor="material-total-pages">Total pages</label>
                <input id="material-total-pages" type="number" min="1" value={totalPages} onChange={(e) => setTotalPages(Number(e.target.value))} className="w-full px-2.5 py-2 text-sm bg-white border border-slate-200 rounded-xl font-semibold outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Overview & Description
              </label>

              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief summary of what this chapter/paper is about..."
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
              />
            </div>

            {/* Key Takeaways */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Key Takeaways & Recall Points
              </label>

              <div className="space-y-2 mb-2">
                {keyTakeaways.map((takeaway, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 bg-indigo-50/50 px-3 py-1.5 rounded-xl border border-indigo-100 text-xs text-slate-800"
                  >
                    <span className="font-bold text-indigo-600">•</span>
                    <span className="flex-1">{takeaway}</span>

                    <button
                      type="button"
                      onClick={() => handleRemoveTakeaway(idx)}
                      className="text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-2">
                <input
                  type="text"
                  value={newTakeawayInput}
                  onChange={(e) => setNewTakeawayInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTakeaway();
                    }
                  }}
                  placeholder="Add a key takeaway or exam note..."
                  className="min-w-0 w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl outline-none"
                />

                <button
                  type="button"
                  onClick={handleAddTakeaway}
                  className="inline-flex min-h-10 shrink-0 items-center justify-center whitespace-nowrap px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                >
                  Add
                </button>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-4">
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Key Definitions
              </label>
              <div className="space-y-2 mb-3">
                {keyDefinitions.map((item, idx) => (
                  <div key={`${item.term}-${idx}`} className="flex items-start gap-2 rounded-xl border border-amber-200/70 bg-amber-50/50 p-3 text-xs">
                    <BookOpen className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-900">{item.term}</p>
                      <p className="mt-0.5 leading-relaxed text-slate-600">{item.definition}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setKeyDefinitions((current) => current.filter((_, index) => index !== idx))}
                      aria-label={`Remove definition for ${item.term}`}
                      className="shrink-0 rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)_auto]">
                <input
                  type="text"
                  value={newDefinitionTerm}
                  onChange={(event) => setNewDefinitionTerm(event.target.value)}
                  placeholder="Term or concept"
                  aria-label="Definition term"
                  className="min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-amber-400"
                />
                <input
                  type="text"
                  value={newDefinitionText}
                  onChange={(event) => setNewDefinitionText(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      handleAddDefinition();
                    }
                  }}
                  placeholder="Concise definition"
                  aria-label="Definition text"
                  className="min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-amber-400"
                />
                <button
                  type="button"
                  onClick={handleAddDefinition}
                  disabled={!newDefinitionTerm.trim() || !newDefinitionText.trim()}
                  className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-amber-100 px-3 py-2 text-xs font-bold text-amber-900 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add definition
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tags (comma separated)
              </label>

              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="e.g. Midterm, Chapter 4, Diagrams, High-Yield"
                className="w-full px-3.5 py-1.5 text-xs bg-white border border-slate-200 rounded-xl outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Study Notes (Markdown supported)
              </label>

              <textarea
                rows={3}
                value={notesMarkdown}
                onChange={(e) => setNotesMarkdown(e.target.value)}
                placeholder={`# Notes
- Formula: E = mc^2
- Important question: Check page 42`}
                className="w-full font-mono text-xs px-3.5 py-2 bg-white border border-slate-200 rounded-xl focus:border-indigo-500 outline-none"
              />
            </div>
              </div>
            </details>
          </div>

          <hr className="border-slate-200" />

          {/* Camera Viewport if Active */}
          {isCameraActive && (
            <div className="bg-slate-950 p-4 rounded-3xl text-white space-y-3">

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />

                  <span>
                    {cameraMode === 'photo'
                      ? 'Camera: Snap Reading / Whiteboard'
                      : 'Camera: Record Short Study Video'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={stopCamera}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
              </div>

              <div className="relative rounded-2xl overflow-hidden bg-black aspect-video max-h-64 flex items-center justify-center">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex justify-center gap-3">
                {cameraMode === 'photo' ? (
                  <button
                    type="button"
                    onClick={capturePhoto}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-400 text-slate-950 font-bold text-xs shadow-md active:scale-95 transition-all"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Take Snapshot</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={
                      isRecordingVideo
                        ? stopVideoRecording
                        : startVideoRecording
                    }
                    className={`flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-xs shadow-md active:scale-95 transition-all ${
                      isRecordingVideo
                        ? 'bg-rose-600 text-white'
                        : 'bg-emerald-500 text-white'
                    }`}
                  >
                    <Video className="w-4 h-4" />

                    <span>
                      {isRecordingVideo
                        ? 'Stop & Save Video'
                        : 'Start Recording'}
                    </span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Media upload feedback and current storage budget */}
          {(attachmentNotice || isProcessingAttachments) && (
            <div role="status" aria-live="polite" className={`p-3 rounded-xl border text-xs font-semibold flex items-start gap-2 ${attachmentNotice?.includes('skipped') ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-indigo-50 border-indigo-200 text-indigo-800'}`}>
              {isProcessingAttachments ? <UploadCloud className="w-4 h-4 shrink-0 animate-pulse" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              <span>{isProcessingAttachments ? 'Processing files… keep this window open until upload finishes.' : attachmentNotice}</span>
            </div>
          )}
          <p className="text-[11px] text-slate-500">Attachment limits: photos up to 10 MB each, videos up to 30 MB, documents up to 20 MB; 80 MB total per material. {formatBytes(attachmentBytes())} currently attached.</p>

          {/* Section 2: Photos & Book Diagrams */}
          <div className="space-y-3">

            <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start justify-start gap-2 text-left">
                <Image className="w-4 h-4 text-indigo-600" />

                <h3 className="min-w-0 text-left text-xs font-black tracking-wider text-slate-800 uppercase">
                  2. Photos & Textbook Diagrams ({photos.length})
                </h3>
              </div>

              <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:flex sm:items-center">
                <button
                  type="button"
                  onClick={() => startCamera('photo')}
                  className="flex min-w-0 items-center justify-center gap-1 px-2 py-2 sm:px-2.5 sm:py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-[10px] sm:text-xs font-semibold"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Snap Photo</span>
                </button>

                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  disabled={isProcessingAttachments}
                  className="flex min-w-0 items-center justify-center gap-1 px-2 py-2 sm:px-2.5 sm:py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-[10px] sm:text-xs font-semibold disabled:opacity-50"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Upload Photos</span>
                </button>

                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </div>
            </div>

            {/* Photo List */}
            {photos.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {photos.map((p) => (
                  <div
                    key={p.id}
                    className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-50 aspect-video"
                  >
                    <img
                      src={p.dataUrl}
                      alt={p.name}
                      className="w-full h-full object-cover"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setPhotos(
                          photos.filter((item) => item.id !== p.id)
                        )
                      }
                      className="absolute top-1 right-1 p-1 rounded-lg bg-rose-600 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span className="sr-only">Remove {p.name}</span>
                    </button>

                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-1">
                      <p className="text-[10px] text-white truncate">
                        {p.name}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div
                onClick={() => photoInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 hover:border-indigo-400 p-4 rounded-2xl text-center cursor-pointer transition-colors"
              >
                <Image className="w-6 h-6 text-slate-400 mx-auto mb-1" />

                <p className="text-xs font-bold text-slate-600">
                  Drop or upload diagrams, textbook pages, whiteboards
                </p>

                <p className="text-[11px] text-slate-400">
                  Supports PNG, JPG, WEBP, GIF, SVG
                </p>
              </div>
            )}
          </div>

          <hr className="border-slate-200" />

          {/* Section 3: Video Links & Lectures */}
          <div className="space-y-3">

            <div className="flex items-center gap-2">
              <Link2 className="w-4 h-4 text-blue-600" />

              <h3 className="text-xs font-black tracking-wider text-slate-800 uppercase">
                3. Video Links & Lectures ({videoLinks.length})
              </h3>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={newVideoTitle}
                onChange={(e) => setNewVideoTitle(e.target.value)}
                placeholder="Video title (e.g. MIT OpenCourseWare Lec 4)"
                className="sm:w-1/3 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl outline-none"
              />

              <input
                type="url"
                value={newVideoUrl}
                onChange={(e) => setNewVideoUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=... or Vimeo / direct mp4 link"
                className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl outline-none"
              />

              <button
                type="button"
                onClick={handleAddVideoLink}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all"
              >
                Add Link
              </button>
            </div>

            {videoLinks.length > 0 && (
              <div className="space-y-1.5">
                {videoLinks.map((vl) => (
                  <div
                    key={vl.id}
                    className="flex items-center justify-between p-2 rounded-xl bg-blue-50/60 border border-blue-100 text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md uppercase">
                        {vl.platform}
                      </span>

                      <span className="font-semibold text-slate-800 truncate">
                        {vl.title}
                      </span>

                      <span className="text-slate-400 text-[11px] truncate hidden sm:inline">
                        {vl.url}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setVideoLinks(
                          videoLinks.filter((item) => item.id !== vl.id)
                        )
                      }
                      className="text-slate-400 hover:text-rose-600 ml-2"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <hr className="border-slate-200" />

          {/* Section 4: Short Videos */}
          <div className="space-y-3">

            <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start justify-start gap-2 text-left">
                <Video className="w-4 h-4 text-emerald-600" />

                <h3 className="min-w-0 text-left text-xs font-black tracking-wider text-slate-800 uppercase">
                  4. Short Videos ({shortVideos.length})
                </h3>
              </div>

              <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:flex sm:items-center">
                <button
                  type="button"
                  onClick={() => startCamera('short_video')}
                  className="flex min-w-0 items-center justify-center gap-1 px-2 py-2 sm:px-2.5 sm:py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-[10px] sm:text-xs font-semibold"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Record Short Clip</span>
                </button>

                <button
                  type="button"
                  onClick={() => shortVideoInputRef.current?.click()}
                  disabled={isProcessingAttachments}
                  className="flex min-w-0 items-center justify-center gap-1 px-2 py-2 sm:px-2.5 sm:py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-[10px] sm:text-xs font-semibold disabled:opacity-50"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Upload Short Video</span>
                </button>

                <input
                  ref={shortVideoInputRef}
                  type="file"
                  accept="video/*"
                  multiple
                  onChange={handleShortVideoUpload}
                  className="hidden"
                />
              </div>
            </div>

            {shortVideos.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {shortVideos.map((sv) => (
                  <div
                    key={sv.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-100 text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                        <Video className="w-4 h-4" />
                      </div>

                      <div className="truncate">
                        <p className="font-semibold text-slate-900 truncate">
                          {sv.name}
                        </p>

                        <p className="text-[10px] text-slate-500 font-mono">
                          {formatBytes(sv.sizeBytes)} • {sv.format.toUpperCase()}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setShortVideos(
                          shortVideos.filter((item) => item.id !== sv.id)
                        )
                      }
                      className="text-slate-400 hover:text-rose-600 ml-2"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div
                onClick={() => shortVideoInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 hover:border-emerald-400 p-4 rounded-2xl text-center cursor-pointer transition-colors"
              >
                <Video className="w-6 h-6 text-slate-400 mx-auto mb-1" />

                <p className="text-xs font-bold text-slate-600">
                  Store short video clips (MP4, WebM, MOV)
                </p>

                <p className="text-[11px] text-slate-400">
                  Quick concept recaps, lab recordings, study explanations
                </p>
              </div>
            )}
          </div>

          <hr className="border-slate-200" />

          {/* Section 5: Document Files of ANY format */}
          <div className="space-y-3">

            <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-600" />

                <h3 className="text-xs font-black tracking-wider text-slate-800 uppercase">
                  5. Document Files of Any Format ({documents.length})
                </h3>
              </div>

              <button
                type="button"
                onClick={() => docInputRef.current?.click()}
                disabled={isProcessingAttachments}
                className="flex w-full items-center justify-center gap-1 px-3 py-2 sm:w-auto sm:py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-xs font-semibold disabled:opacity-50"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Upload Any Documents</span>
              </button>

              <input
                ref={docInputRef}
                type="file"
                multiple
                onChange={handleDocUpload}
                className="hidden"
              />
            </div>

            {documents.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-purple-50/50 border border-purple-100 text-xs"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <span className="w-8 h-8 rounded-lg bg-purple-200/80 text-purple-900 font-extrabold flex items-center justify-center text-[10px] uppercase">
                        {doc.format.slice(0, 4)}
                      </span>

                      <div className="truncate">
                        <p className="font-semibold text-slate-900 truncate">
                          {doc.name}
                        </p>

                        <p className="text-[10px] text-slate-500 font-mono">
                          {formatBytes(doc.sizeBytes)} • {doc.format.toUpperCase()}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setDocuments(
                          documents.filter((item) => item.id !== doc.id)
                        )
                      }
                      className="text-slate-400 hover:text-rose-600 ml-2"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div
                onClick={() => docInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 hover:border-purple-400 p-4 rounded-2xl text-center cursor-pointer transition-colors"
              >
                <FileText className="w-6 h-6 text-slate-400 mx-auto mb-1" />

                <p className="text-xs font-bold text-slate-600">
                  Store document files of ANY format
                </p>

                <p className="text-[11px] text-slate-400">
                  PDF, DOCX, PPTX, XLSX, TXT, EPUB, ZIP, CSV, Code files & more
                </p>
              </div>
            )}
          </div>

          {/* Modal Footer Buttons */}
          <div className="pt-4 border-t border-slate-200 flex flex-col-reverse items-stretch justify-end gap-2 sm:flex-row sm:items-center sm:gap-3">

            <button
              type="button"
              onClick={handleClose}
              disabled={isProcessingAttachments}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50 sm:w-auto"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isProcessingAttachments || isRecordingVideo}
              className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed sm:w-auto"
            >
              <Check className="w-4 h-4" />

              <span>
                {initialData
                  ? 'Save Changes'
                  : 'Save Reading Material'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
