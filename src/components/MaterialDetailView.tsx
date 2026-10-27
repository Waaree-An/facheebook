import React, { lazy, Suspense, useState } from 'react';
import { 
  ArrowLeft, BookOpen, Image, Video, FileText, Link2, 
  Download, Eye, CheckCircle2, Star, Edit3, Trash2, 
  Layers, Sparkles, Copy, Check, ExternalLink, Play, Clock, Share2
} from 'lucide-react';
import { ReadingMaterial, FileAttachment, VideoLink, ReadingStatus } from '../types';
import { formatBytes, getEmbedVideoUrl } from '../utils/storage';
import { isPdfDocument } from '../utils/pdfHelper';
import { getAttachmentFormat, isTextAttachment } from '../utils/documentFiles';
import confetti from 'canvas-confetti';

const DocumentReader = lazy(() => import('./DocumentReader').then((module) => ({ default: module.DocumentReader })));

interface MaterialDetailViewProps {
  material: ReadingMaterial;
  onBack: () => void;
  onEdit: (material: ReadingMaterial) => void;
  onDelete: (id: string) => void;
  onShare: (material: ReadingMaterial) => void;
  onUpdateMaterial: (updated: ReadingMaterial) => void;
}

export const MaterialDetailView: React.FC<MaterialDetailViewProps> = ({
  material,
  onBack,
  onEdit,
  onDelete,
  onShare,
  onUpdateMaterial,
}) => {
  const [activeTab, setActiveTab] = useState<'docs' | 'photos' | 'videos' | 'short_videos' | 'notes' | 'quiz'>('docs');
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<FileAttachment | null>(null);
  const [selectedDocPreview, setSelectedDocPreview] = useState<FileAttachment | null>(
    material.documents.length > 0 ? material.documents[0] : null
  );
  const [activeVideoLink, setActiveVideoLink] = useState<VideoLink | null>(
    material.videoLinks.length > 0 ? material.videoLinks[0] : null
  );
  const [activeShortVideo, setActiveShortVideo] = useState<FileAttachment | null>(
    material.shortVideos.length > 0 ? material.shortVideos[0] : null
  );

  // Quiz state for this material
  const [quizIndex, setQuizIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [masteredTakeaways, setMasteredTakeaways] = useState<number[]>([]);
  const [copiedCode, setCopiedCode] = useState(false);
  const [downloadError, setDownloadError] = useState('');

  // Toggle mastered takeaway
  const toggleMastered = (idx: number) => {
    if (masteredTakeaways.includes(idx)) {
      setMasteredTakeaways(masteredTakeaways.filter((i) => i !== idx));
    } else {
      setMasteredTakeaways([...masteredTakeaways, idx]);
      confetti({ particleCount: 35, spread: 50, origin: { y: 0.8 } });
    }
  };

  // Download attachment
  const handleDownload = async (file: FileAttachment) => {
    setDownloadError('');
    let objectUrl: string | null = null;
    try {
      let downloadUrl = file.dataUrl;
      if (downloadUrl?.startsWith('data:')) {
        const response = await fetch(downloadUrl);
        if (!response.ok) throw new Error('The original file could not be prepared for download.');
        objectUrl = URL.createObjectURL(await response.blob());
        downloadUrl = objectUrl;
      } else if (!downloadUrl && file.textContent && isTextAttachment(file)) {
        objectUrl = URL.createObjectURL(new Blob([file.textContent], { type: 'text/plain' }));
        downloadUrl = objectUrl;
      }

      if (!downloadUrl) {
        setDownloadError(`The original file "${file.name}" is not available on this device.`);
        return;
      }

      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = file.name;
      link.rel = 'noopener';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      if (objectUrl) window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch (error) {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setDownloadError(error instanceof Error ? error.message : 'The file could not be downloaded.');
    }
  };

  // Quick progress update
  const handleStatusChange = (newStatus: ReadingStatus) => {
    const updated = {
      ...material,
      status: newStatus,
      pagesRead: newStatus === 'completed' ? material.totalPages : material.pagesRead,
      updatedAt: new Date().toISOString(),
    };
    onUpdateMaterial(updated);
    if (newStatus === 'completed') {
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
    }
  };

  const percent = material.totalPages > 0 
    ? Math.min(100, Math.round((material.pagesRead / material.totalPages) * 100)) 
    : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Top Navigation & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-slate-200/90 shadow-xs">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-indigo-600 transition-colors w-fit px-3 py-1.5 rounded-xl hover:bg-slate-100"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Materials</span>
        </button>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Status selector */}
          <select
            value={material.status}
            onChange={(e) => handleStatusChange(e.target.value as ReadingStatus)}
            className="px-3 py-1.5 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl outline-none"
          >
            <option value="to_read">📌 To Read</option>
            <option value="reading">📖 Reading</option>
            <option value="under_review">🔍 Under Review</option>
            <option value="completed">✅ Completed</option>
          </select>

          <button
            onClick={() => onShare(material)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Share</span>
          </button>

          <button
            onClick={() => onEdit(material)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-all"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit</span>
          </button>

          <button
            onClick={() => {
              if (confirm(`Delete "${material.title}"?`)) {
                onDelete(material.id);
                onBack();
              }
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            title="Delete Material"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Hero Header Card */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-8">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="bg-indigo-100 text-indigo-800 text-xs font-black px-3 py-1 rounded-lg">
                {material.subject}
              </span>
              {material.semester && (
                <span className="text-xs text-slate-500 font-semibold">
                  • {material.semester}
                </span>
              )}
              {material.professor && (
                <span className="text-xs text-slate-500 font-semibold">
                  • Instructor: {material.professor}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-2">
              {material.title}
            </h1>

            <p className="text-sm text-slate-600 font-medium mb-4">
              Written by <span className="text-slate-900 font-bold">{material.author}</span>
            </p>

            {material.description && (
              <div className="mb-4 max-w-3xl">
                <p className={`text-xs sm:text-sm text-slate-700 leading-relaxed ${isDescriptionExpanded ? '' : 'max-sm:line-clamp-4'}`}>
                  {material.description}
                </p>
                {material.description.length > 280 && (
                  <button
                    type="button"
                    onClick={() => setIsDescriptionExpanded((expanded) => !expanded)}
                    aria-expanded={isDescriptionExpanded}
                    className="mt-1 text-xs font-bold text-amber-500 hover:text-amber-400 sm:hidden"
                  >
                    {isDescriptionExpanded ? 'Show less' : 'Show more'}
                  </button>
                )}
              </div>
            )}

            {/* Tags */}
            {material.tags.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                {material.tags.map((tag, idx) => (
                  <span key={idx} className="bg-slate-100 text-slate-600 text-[11px] font-bold px-2.5 py-0.5 rounded-md">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Reading Gauge Widget */}
          <div className="bg-indigo-50/60 border border-indigo-100 p-5 rounded-3xl min-w-[220px] text-center">
            <div className="text-xs font-bold text-indigo-900 uppercase tracking-wider mb-1">
              Reading Progress
            </div>
            <div className="text-3xl font-black text-indigo-700 font-mono mb-1">
              {percent}%
            </div>
            <p className="text-xs text-slate-500 font-medium mb-3">
              {material.pagesRead} of {material.totalPages} pages finished
            </p>

            <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden mb-3">
              <div 
                className={`h-full transition-all duration-300 ${percent >= 100 ? 'bg-emerald-500' : 'bg-indigo-600'}`}
                style={{ width: `${percent}%` }}
              />
            </div>

            <button
              onClick={() => {
                const nextPages = Math.min(material.totalPages, material.pagesRead + 10);
                const newStatus = nextPages >= material.totalPages ? 'completed' : 'reading';
                onUpdateMaterial({ ...material, pagesRead: nextPages, status: newStatus });
                if (nextPages >= material.totalPages) {
                  confetti({ particleCount: 70, spread: 60 });
                }
              }}
              className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer"
            >
              +10 Pages Read
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Tabs Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('docs')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'docs'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Documents of Any Format ({material.documents.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('photos')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'photos'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Image className="w-4 h-4" />
          <span>Photos & Diagrams ({material.photos.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('videos')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'videos'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Link2 className="w-4 h-4" />
          <span>Video Links ({material.videoLinks.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('short_videos')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'short_videos'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Video className="w-4 h-4" />
          <span>Short Videos ({material.shortVideos.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('notes')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'notes'
              ? 'bg-amber-500 text-slate-950 shadow-xs'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Notes & Takeaways ({material.keyTakeaways.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('quiz')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'quiz'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Active Recall Quiz</span>
        </button>
      </div>

      {/* Tab 1: Documents of Any Format */}
      {activeTab === 'docs' && (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-black text-slate-900 text-base">
                Stored Documents ({material.documents.length})
              </h3>
              <p className="text-xs text-slate-500">
                PDFs, Word docs, code files, presentations, spreadsheets, and archives of any format
              </p>
            </div>
          </div>

          {material.documents.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl">
              <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-600">No documents attached yet</p>
              <button
                onClick={() => onEdit(material)}
                className="mt-2 text-xs font-bold text-indigo-600 hover:underline"
              >
                + Add Documents to this Reading Material
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Document List Selector */}
              <div className="flex gap-2 overflow-x-auto pb-1 lg:col-span-1 lg:flex-col lg:overflow-visible">
                {material.documents.map((doc) => {
                  const isDocPdf = isPdfDocument(doc);
                  const documentFormat = getAttachmentFormat(doc);
                  const hasPreview = isDocPdf
                    || documentFormat === 'docx'
                    || documentFormat === 'pptx'
                    || isTextAttachment(doc)
                    || doc.dataUrl?.startsWith('data:image/') === true;
                  const isSelected = selectedDocPreview?.id === doc.id;
                  return (
                    <div
                      key={doc.id}
                      onClick={() => {
                        setSelectedDocPreview(doc);
                      }}
                      className={`min-w-[15rem] rounded-2xl border p-3 cursor-pointer transition-all flex items-center justify-between lg:min-w-0 ${
                        isSelected
                          ? isDocPdf
                            ? 'bg-rose-50/80 border-rose-300 shadow-xs'
                            : 'bg-purple-50 border-purple-300 shadow-xs'
                          : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3 truncate">
                        <span
                          className={`w-9 h-9 rounded-xl font-black text-xs flex items-center justify-center uppercase shrink-0 ${
                            isDocPdf
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-purple-100 text-purple-800'
                          }`}
                        >
                          {isDocPdf ? 'PDF' : doc.format.slice(0, 4)}
                        </span>
                        <div className="truncate">
                          <p className="font-bold text-xs text-slate-900 truncate">{doc.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{formatBytes(doc.sizeBytes)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {hasPreview && (
                          <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700">
                            Preview
                          </span>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownload(doc);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                          disabled={!doc.dataUrl && !(doc.textContent && isTextAttachment(doc))}
                          title={`Download ${doc.name}`}
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Document Reader / Preview Area */}
              <div className="min-w-0 lg:col-span-2">
                {selectedDocPreview ? (
                  <Suspense fallback={<div role="status" className="flex h-[60vh] items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-600">Loading document reader...</div>}>
                    <DocumentReader file={selectedDocPreview} onDownload={handleDownload} />
                  </Suspense>
                ) : (
                  <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-sm text-slate-500">
                    Select a document to preview.
                  </div>
                )}
                {downloadError && <p role="alert" className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800">{downloadError}</p>}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Photos & Textbook Diagrams */}
      {activeTab === 'photos' && (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-black text-slate-900 text-base">
                Textbook Diagrams & Photos ({material.photos.length})
              </h3>
              <p className="text-xs text-slate-500">
                Click any image to enlarge in full-resolution lightbox
              </p>
            </div>
          </div>

          {material.photos.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl">
              <Image className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-600">No photos or diagrams stored yet</p>
              <button
                onClick={() => onEdit(material)}
                className="mt-2 text-xs font-bold text-indigo-600 hover:underline"
              >
                + Add Photos & Diagrams
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {material.photos.map((photo) => (
                <div
                  key={photo.id}
                  onClick={() => setSelectedPhoto(photo)}
                  className="group relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 aspect-video cursor-pointer hover:shadow-md transition-all"
                >
                  <img
                    src={photo.dataUrl}
                    alt={photo.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                    <p className="text-xs font-bold text-white truncate">{photo.name}</p>
                    <p className="text-[10px] text-slate-300 font-mono">{formatBytes(photo.sizeBytes)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Photo Lightbox Modal */}
          {selectedPhoto && (
            <div 
              onClick={() => setSelectedPhoto(null)}
              className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
            >
              <div 
                onClick={(e) => e.stopPropagation()}
                className="max-w-4xl w-full bg-slate-950 rounded-3xl overflow-hidden border border-slate-800 flex flex-col"
              >
                <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 text-white">
                  <span className="text-xs font-bold truncate">{selectedPhoto.name}</span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleDownload(selectedPhoto)}
                      className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download</span>
                    </button>
                    <button
                      onClick={() => setSelectedPhoto(null)}
                      className="text-xs text-slate-400 hover:text-white"
                    >
                      Close
                    </button>
                  </div>
                </div>
                <div className="p-4 flex items-center justify-center max-h-[75vh] overflow-auto">
                  <img
                    src={selectedPhoto.dataUrl}
                    alt={selectedPhoto.name}
                    className="max-w-full max-h-[70vh] object-contain rounded-xl"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Video Links & Lectures */}
      {activeTab === 'videos' && (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 space-y-6">
          <div>
            <h3 className="font-black text-slate-900 text-base">
              Lecture Videos & Web Links ({material.videoLinks.length})
            </h3>
            <p className="text-xs text-slate-500">
              Watch embedded video lectures and course references directly
            </p>
          </div>

          {material.videoLinks.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl">
              <Link2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-600">No video links attached yet</p>
              <button
                onClick={() => onEdit(material)}
                className="mt-2 text-xs font-bold text-indigo-600 hover:underline"
              >
                + Add YouTube / Vimeo Video Links
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Links Selector */}
              <div className="space-y-2 lg:col-span-1">
                {material.videoLinks.map((vl) => (
                  <div
                    key={vl.id}
                    onClick={() => setActiveVideoLink(vl)}
                    className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                      activeVideoLink?.id === vl.id
                        ? 'bg-blue-50 border-blue-300 shadow-xs'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="truncate">
                      <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-md uppercase">
                        {vl.platform}
                      </span>
                      <h4 className="font-bold text-xs text-slate-900 truncate mt-1">{vl.title}</h4>
                      {vl.notes && <p className="text-[11px] text-slate-500 truncate">{vl.notes}</p>}
                    </div>
                    <a
                      href={vl.url}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-1.5 text-slate-400 hover:text-blue-600"
                      title="Open in new tab"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                ))}
              </div>

              {/* Embedded Player */}
              <div className="lg:col-span-2 bg-slate-950 rounded-2xl overflow-hidden aspect-video flex items-center justify-center">
                {activeVideoLink ? (
                  (() => {
                    const { embedUrl, platform } = getEmbedVideoUrl(activeVideoLink.url);
                    if (embedUrl) {
                      return (
                        <iframe
                          src={embedUrl}
                          title={activeVideoLink.title}
                          className="w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      );
                    }
                    return (
                      <div className="text-center p-6 text-white">
                        <Play className="w-12 h-12 text-blue-400 mx-auto mb-2" />
                        <p className="text-sm font-bold">{activeVideoLink.title}</p>
                        <p className="text-xs text-slate-400 mb-4">{activeVideoLink.url}</p>
                        <a
                          href={activeVideoLink.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold"
                        >
                          <ExternalLink className="w-4 h-4" />
                          <span>Open External Lecture</span>
                        </a>
                      </div>
                    );
                  })()
                ) : (
                  <p className="text-xs text-slate-400">Select a video link above</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Short Videos */}
      {activeTab === 'short_videos' && (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 space-y-6">
          <div>
            <h3 className="font-black text-slate-900 text-base">
              Short Video Clips ({material.shortVideos.length})
            </h3>
            <p className="text-xs text-slate-500">
              Quick concept recaps, student explanation clips, and lab walkthroughs
            </p>
          </div>

          {material.shortVideos.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl">
              <Video className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-600">No short video clips stored yet</p>
              <button
                onClick={() => onEdit(material)}
                className="mt-2 text-xs font-bold text-indigo-600 hover:underline"
              >
                + Record or Upload Short Video
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Short video clips list */}
              <div className="space-y-2 lg:col-span-1">
                {material.shortVideos.map((sv) => (
                  <div
                    key={sv.id}
                    onClick={() => setActiveShortVideo(sv)}
                    className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                      activeShortVideo?.id === sv.id
                        ? 'bg-emerald-50 border-emerald-300 shadow-xs'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                        <Video className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <p className="font-bold text-xs text-slate-900 truncate">{sv.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{formatBytes(sv.sizeBytes)} • {sv.format.toUpperCase()}</p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(sv);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-emerald-100"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Short Video Player */}
              <div className="lg:col-span-2 bg-slate-950 rounded-3xl p-4 flex flex-col items-center justify-center">
                {activeShortVideo && activeShortVideo.dataUrl ? (
                  <div className="w-full max-w-md flex flex-col items-center space-y-3">
                    <div className="text-white text-xs font-bold truncate w-full text-center">
                      {activeShortVideo.name}
                    </div>
                    <video
                      src={activeShortVideo.dataUrl}
                      controls
                      autoPlay
                      loop
                      playsInline
                      className="w-full max-h-[500px] rounded-2xl bg-black object-contain shadow-xl"
                    />
                    <div className="flex items-center justify-between w-full text-slate-400 text-xs px-2">
                      <span>Format: {activeShortVideo.format.toUpperCase()}</span>
                      <button
                        onClick={() => handleDownload(activeShortVideo)}
                        className="text-emerald-400 hover:underline flex items-center gap-1"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download Video</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">Select a short video to play</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Notes & Key Takeaways */}
      {activeTab === 'notes' && (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 space-y-6">
          {material.keyDefinitions?.length ? (
            <section aria-labelledby="material-definitions-title">
              <div className="mb-3 flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-amber-500" />
                <h3 id="material-definitions-title" className="font-black text-base text-slate-900">
                  Key Definitions
                </h3>
              </div>
              <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {material.keyDefinitions.map(({ term, definition }, index) => (
                  <div key={`${term}-${index}`} className="rounded-xl border border-amber-200/70 bg-amber-50/40 p-3">
                    <dt className="text-xs font-extrabold text-slate-900">{term}</dt>
                    <dd className="mt-1 text-xs leading-relaxed text-slate-600">{definition}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}

          {/* Key Takeaways Interactive Checklist */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <h3 className="font-black text-slate-900 text-base">
                  Interactive Key Takeaways Checklist
                </h3>
              </div>
              <span className="text-xs text-slate-500 font-semibold">
                {masteredTakeaways.length} of {material.keyTakeaways.length} mastered
              </span>
            </div>

            <div className="space-y-2">
              {material.keyTakeaways.map((takeaway, idx) => {
                const isChecked = masteredTakeaways.includes(idx);
                return (
                  <div
                    key={idx}
                    onClick={() => toggleMastered(idx)}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 ${
                      isChecked
                        ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                        : 'bg-slate-50/80 border-slate-200 text-slate-800 hover:bg-slate-100'
                    }`}
                  >
                    <div className={`mt-0.5 w-5 h-5 rounded-lg flex items-center justify-center border transition-colors ${
                      isChecked ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 bg-white'
                    }`}>
                      {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                    <p className={`text-xs sm:text-sm font-medium leading-relaxed ${isChecked ? 'line-through text-slate-500' : ''}`}>
                      {takeaway}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <hr className="border-slate-200" />

          {/* Markdown Notes */}
          <div>
            <h3 className="font-black text-slate-900 text-base mb-3">
              Detailed Study Notes
            </h3>
            {material.notesMarkdown ? (
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 font-mono text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                {material.notesMarkdown}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No notes written yet. Click Edit to write notes.</p>
            )}
          </div>
        </div>
      )}

      {/* Tab 6: Active Recall Quiz Mode */}
      {activeTab === 'quiz' && (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 space-y-6">
          <div>
            <h3 className="font-black text-slate-900 text-base">
              Active Recall Flashcards for {material.title}
            </h3>
            <p className="text-xs text-slate-500">
              Test your knowledge from key takeaways without looking at notes
            </p>
          </div>

          {material.keyTakeaways.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-8">
              Add key takeaways to this material to automatically generate active recall cards!
            </p>
          ) : (
            <div className="max-w-xl mx-auto space-y-4">
              {/* Flashcard Box */}
              <div
                onClick={() => setIsFlipped(!isFlipped)}
                className="w-full min-h-[220px] p-8 rounded-3xl border-2 border-indigo-200 bg-gradient-to-br from-[#111619] to-[#1B242A] shadow-sm flex flex-col justify-between items-center text-center cursor-pointer transition-all hover:border-indigo-400 group"
              >
                <span className="text-[11px] font-black tracking-wider uppercase text-indigo-500">
                  {isFlipped ? 'Answer & Core Takeaway' : `Recall Question #${quizIndex + 1}`}
                </span>

                <div className="my-auto py-4">
                  {isFlipped ? (
                    <p className="text-base sm:text-lg font-bold text-slate-900 leading-relaxed">
                      {material.keyTakeaways[quizIndex]}
                    </p>
                  ) : (
                    <p className="text-base sm:text-lg font-bold text-indigo-950 leading-relaxed">
                      What is the core rule or takeaway regarding takeaway #{quizIndex + 1}?
                    </p>
                  )}
                </div>

                <span className="text-[11px] font-semibold text-slate-400 group-hover:text-indigo-600">
                  (Click card to {isFlipped ? 'hide answer' : 'reveal answer'})
                </span>
              </div>

              {/* Navigation Controls */}
              <div className="flex items-center justify-between">
                <button
                  disabled={quizIndex === 0}
                  onClick={() => {
                    setQuizIndex(quizIndex - 1);
                    setIsFlipped(false);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-xs font-bold text-slate-700"
                >
                  Previous Card
                </button>

                <span className="text-xs font-mono font-bold text-slate-500">
                  {quizIndex + 1} of {material.keyTakeaways.length}
                </span>

                <button
                  disabled={quizIndex >= material.keyTakeaways.length - 1}
                  onClick={() => {
                    setQuizIndex(quizIndex + 1);
                    setIsFlipped(false);
                  }}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-xs font-bold text-white shadow-xs"
                >
                  Next Card
                </button>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
};
