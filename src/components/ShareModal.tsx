import React, { useState, useRef } from 'react';
import { 
  X, Share2, Copy, Check, Download, Upload, 
  FileText, CheckCircle2, BookOpen, AlertCircle
} from 'lucide-react';
import { ReadingMaterial, StudyTip } from '../types';
import confetti from 'canvas-confetti';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  materialToShare?: ReadingMaterial | null;
  allMaterials: ReadingMaterial[];
  allTips: StudyTip[];
  onImportData: (materials: ReadingMaterial[], tips?: StudyTip[]) => { materialsAdded: number; tipsAdded: number };
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  materialToShare,
  allMaterials,
  allTips,
  onImportData,
}) => {
  const [activeTab, setActiveTab] = useState<'card' | 'export' | 'import'>(
    materialToShare ? 'card' : 'export'
  );
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<{ kind: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(materialToShare ? 'card' : 'export');
      setImportStatus(null);
      setIsImporting(false);
    }
  }, [isOpen, materialToShare?.id]);

  if (!isOpen) return null;

  const MAX_BACKUP_BYTES = 100 * 1024 * 1024;
  const isRecord = (value: unknown): value is Record<string, unknown> =>
    Boolean(value && typeof value === 'object' && !Array.isArray(value));
  const isString = (value: unknown) => typeof value === 'string';
  const isAttachmentArray = (value: unknown) => Array.isArray(value) && value.every((item) =>
    isRecord(item) && isString(item.id) && isString(item.name) && isString(item.type) &&
    isString(item.format) && typeof item.sizeBytes === 'number' && Number.isFinite(item.sizeBytes) &&
    isString(item.createdAt) && (item.dataUrl === undefined || isString(item.dataUrl)) &&
    (item.textContent === undefined || isString(item.textContent))
  );
  const isValidMaterial = (value: unknown): value is ReadingMaterial => {
    if (!isRecord(value)) return false;
    return isString(value.id) && value.id.trim().length > 0 && isString(value.title) && value.title.trim().length > 0 && isString(value.subject) &&
      isString(value.author) && isString(value.description) &&
      ['to_read', 'reading', 'under_review', 'completed'].includes(String(value.status)) &&
      ['low', 'medium', 'high'].includes(String(value.priority)) &&
      typeof value.rating === 'number' && Number.isFinite(value.rating) && value.rating >= 1 && value.rating <= 5 &&
      typeof value.totalPages === 'number' && Number.isFinite(value.totalPages) && value.totalPages >= 0 &&
      typeof value.pagesRead === 'number' && Number.isFinite(value.pagesRead) && value.pagesRead >= 0 && value.pagesRead <= value.totalPages &&
      Array.isArray(value.tags) && value.tags.every(isString) &&
      Array.isArray(value.keyTakeaways) && value.keyTakeaways.every(isString) &&
      (value.keyDefinitions === undefined || (Array.isArray(value.keyDefinitions) && value.keyDefinitions.every((item) =>
        isRecord(item) && isString(item.term) && isString(item.definition)))) &&
      isAttachmentArray(value.photos) && Array.isArray(value.videoLinks) && value.videoLinks.every((v) =>
        isRecord(v) && isString(v.id) && isString(v.title) && isString(v.url) && isString(v.platform)) &&
      isAttachmentArray(value.shortVideos) && isAttachmentArray(value.documents) &&
      isString(value.createdAt) && isString(value.updatedAt);
  };
  const isValidTip = (value: unknown): value is StudyTip => Boolean(isRecord(value) &&
    isString(value.id) && isString(value.title) && isString(value.authorName) &&
    (value.ownerId === undefined || isString(value.ownerId)) &&
    isString(value.category) && isString(value.content) && Array.isArray(value.tags) &&
    value.tags.every(isString) && typeof value.likes === 'number' && Number.isFinite(value.likes) &&
    isString(value.createdAt));

  // Generate formatted text for sharing
  const generateShareText = (m: ReadingMaterial) => {
    return `📚 [FacheeBook] Reading Material Share:
Title: ${m.title}
Course/Subject: ${m.subject} ${m.semester ? `(${m.semester})` : ''}
Author: ${m.author}
Status: ${m.status.toUpperCase()} • Progress: ${m.pagesRead}/${m.totalPages} pages

${m.description ? `Overview: ${m.description}\n` : ''}
Key Exam Takeaways:
${m.keyTakeaways.map((t, i) => `${i + 1}. ${t}`).join('\n')}
${m.keyDefinitions?.length ? `\nKey Definitions:\n${m.keyDefinitions.map(({ term, definition }) => `• ${term}: ${definition}`).join('\n')}` : ''}

Media Attached:
• Photos: ${m.photos.length}
• Video Links: ${m.videoLinks.length}
• Short Videos: ${m.shortVideos.length}
• Documents: ${m.documents.length} (${m.documents.map(d => d.name).join(', ')})

Shared from FacheeBook Study Space`;
  };

  const shareText = materialToShare ? generateShareText(materialToShare) : '';

  const handleCopy = () => {
    void navigator.clipboard.writeText(shareText).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    }).catch(() => {
      setImportStatus({ kind: 'error', message: 'Clipboard access was blocked. Select and copy the study card text manually.' });
    });
  };

  // Export full JSON packet
  const handleExportJSON = () => {
    const bundle = {
      app: 'FacheeBook',
      format: 'facheebook-backup',
      version: 2,
      exportDate: new Date().toISOString(),
      materials: allMaterials,
      tips: allTips,
    };

    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FacheeBook_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Browsers need time to begin reading the blob before its object URL is revoked.
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
    setImportStatus({ kind: 'success', message: `Backup created with ${allMaterials.length} materials and ${allTips.length} study tips.` });
    confetti({ particleCount: 50, spread: 60 });
  };

  // Import JSON packet: validate the complete payload before changing any app state.
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Allow choosing the same file again after a failed or successful attempt.
    e.target.value = '';
    if (!file) return;
    if (file.size <= 0) {
      setImportStatus({ kind: 'error', message: 'The selected file is empty.' });
      return;
    }
    if (file.size > MAX_BACKUP_BYTES) {
      setImportStatus({ kind: 'error', message: 'This backup is larger than 100 MB. Choose a smaller backup file.' });
      return;
    }
    setIsImporting(true);
    setImportStatus({ kind: 'info', message: 'Reading and validating your backup…' });
    const reader = new FileReader();
    reader.onerror = () => {
      setIsImporting(false);
      setImportStatus({ kind: 'error', message: 'The file could not be read. Try another copy of the backup.' });
    };
    reader.onload = () => {
      try {
        const parsed: unknown = JSON.parse(String(reader.result ?? ''));
        let rawMaterials: unknown;
        let rawTips: unknown = [];
        if (Array.isArray(parsed)) {
          // Legacy format supported: an array of reading materials.
          rawMaterials = parsed;
        } else if (isRecord(parsed) && Array.isArray(parsed.materials)) {
          rawMaterials = parsed.materials;
          rawTips = parsed.tips === undefined ? [] : parsed.tips;

          const declaredFormat = typeof parsed.format === 'string' ? parsed.format : undefined;
          const declaredApp = typeof parsed.app === 'string' ? parsed.app : undefined;

          if (declaredFormat && declaredFormat !== 'facheebook-backup') {
            throw new Error('This file does not appear to be a FacheeBook backup.');
          }

          if (declaredApp && declaredApp !== 'FacheeBook' && declaredApp !== 'Fachee United') {
            throw new Error('This file does not appear to be a FacheeBook backup.');
          }
        } else {
          throw new Error('Unsupported backup format. Choose a FacheeBook JSON backup.');
        }
        const materials = rawMaterials as unknown[];
        const tips = rawTips as unknown[];
        if (materials.length > 10000 || tips.length > 10000) {
          throw new Error('The backup contains too many entries to import safely.');
        }
        const invalidMaterials = materials.findIndex((item) => !isValidMaterial(item));
        if (invalidMaterials !== -1) {
          throw new Error(`Material ${invalidMaterials + 1} is incomplete or invalid. No data was imported.`);
        }
        if (!Array.isArray(tips) || tips.some((tip) => !isValidTip(tip))) {
          throw new Error('One or more study tips are invalid. No data was imported.');
        }
        const validMaterials = materials as ReadingMaterial[];
        const validTips = tips as StudyTip[];
        const result = onImportData(validMaterials, validTips);
        const skippedMaterials = validMaterials.length - result.materialsAdded;
        const skippedTips = validTips.length - result.tipsAdded;
        setImportStatus({
          kind: 'success',
          message: `Import complete: ${result.materialsAdded} materials and ${result.tipsAdded} study tips added${skippedMaterials + skippedTips ? `. ${skippedMaterials + skippedTips} duplicate entries skipped` : ''}.`,
        });
        if (result.materialsAdded + result.tipsAdded > 0) confetti({ particleCount: 55, spread: 65 });
      } catch (err) {
        setImportStatus({ kind: 'error', message: err instanceof Error ? err.message : 'Could not import this backup. Check that the JSON file is valid.' });
      } finally {
        setIsImporting(false);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#111619] rounded-3xl shadow-2xl border border-slate-700 max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-300 flex items-center justify-center font-bold">
              <Share2 className="w-4 h-4" />
            </div>
            <h3 className="font-extrabold text-base text-white">
              Share & Exchange Study Materials
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Controls */}
        <div className="flex bg-slate-800 p-1 rounded-2xl text-xs font-bold">
          {materialToShare && (
            <button
              onClick={() => setActiveTab('card')}
              className={`flex-1 py-1.5 rounded-xl transition-all ${
                activeTab === 'card' ? 'bg-slate-700 text-indigo-300 shadow-xs' : 'text-slate-300'
              }`}
            >
              Study Card
            </button>
          )}
          <button
            onClick={() => setActiveTab('export')}
            className={`flex-1 py-1.5 rounded-xl transition-all ${
              activeTab === 'export' ? 'bg-slate-700 text-indigo-300 shadow-xs' : 'text-slate-300'
            }`}
          >
            Export All Library
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`flex-1 py-1.5 rounded-xl transition-all ${
              activeTab === 'import' ? 'bg-slate-700 text-indigo-300 shadow-xs' : 'text-slate-300'
            }`}
          >
            Import Classmate Packet
          </button>
        </div>

        {/* Tab 1: Share Single Material Card */}
        {activeTab === 'card' && materialToShare && (
          <div className="space-y-3">
            <p className="text-xs text-slate-600">
              Copy a formatted summary of <span className="font-bold text-slate-900">{materialToShare.title}</span> to share in your study group chat (WhatsApp, Discord, Teams, or Email):
            </p>

            <pre className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-xs font-mono text-slate-800 max-h-56 overflow-y-auto whitespace-pre-wrap leading-relaxed">
              {shareText}
            </pre>

            <button
              onClick={handleCopy}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied to Clipboard!' : 'Copy Study Card to Clipboard'}</span>
            </button>
          </div>
        )}

        {/* Tab 2: Export All Library */}
        {activeTab === 'export' && (
          <div className="space-y-4 text-center py-2">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center mx-auto">
              <Download className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-slate-900">
                Export Full FacheeBook Backup
              </h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
                Downloads your entire reading materials collection, attached documents, photos, video links, notes, and study tips as a standalone `.json` backup file.
              </p>
            </div>

            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs text-slate-600 flex justify-around">
              <div>
                <span className="font-black text-indigo-700 font-mono text-sm">{allMaterials.length}</span>
                <p className="text-[10px] text-slate-400">Materials</p>
              </div>
              <div>
                <span className="font-black text-amber-700 font-mono text-sm">{allTips.length}</span>
                <p className="text-[10px] text-slate-400">Study Tips</p>
              </div>
            </div>

            <button
              onClick={handleExportJSON}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download Fachee Study Packet (.json)</span>
            </button>
          </div>
        )}

        {/* Tab 3: Import Classmate Packet */}
        {activeTab === 'import' && (
          <div className="space-y-4 text-center py-2">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-slate-900">
                Import Study Packet from Classmate
              </h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
                Load a FacheeBook JSON backup exported by a friend or professor to merge new reading materials into your library.
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImportFile}
              disabled={isImporting}
              className="hidden"
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              className="w-full flex items-center justify-center gap-2 py-3 min-h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-wait text-white text-sm font-bold shadow-xs transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200"
            >
              <Upload className="w-4 h-4" />
              <span>{isImporting ? 'Validating backup…' : 'Choose JSON File to Import'}</span>
            </button>

            <p className="text-[11px] leading-relaxed text-slate-500">JSON backups only · Maximum 100 MB · Existing entries are preserved and duplicate IDs are skipped. Invalid backups are rejected before any changes are made.</p>
            {importStatus && (
              <div role="status" aria-live="polite" className={`p-3 border rounded-xl text-xs font-semibold text-left ${importStatus.kind === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800' : importStatus.kind === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-sky-50 border-sky-200 text-sky-800'}`}>
                {importStatus.message}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
