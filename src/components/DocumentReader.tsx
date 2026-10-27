import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { ArrowDown, ChevronLeft, ChevronRight, Expand, FileText, Minus, Plus, Shrink, X } from 'lucide-react';
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist';
import type { FileAttachment } from '../types';
import { formatBytes } from '../utils/storage';
import { getAttachmentFormat, isTextAttachment } from '../utils/documentFiles';

const PptxPreview = lazy(() => import('./PptxPreview').then((module) => ({ default: module.PptxPreview })));

interface DocumentReaderProps {
  file: FileAttachment;
  onDownload: (file: FileAttachment) => void;
}

async function readAttachmentBytes(file: FileAttachment): Promise<Uint8Array> {
  if (!file.dataUrl) throw new Error('The original file is not available in this browser.');
  const response = await fetch(file.dataUrl);
  if (!response.ok) throw new Error('Could not read the original file. Try downloading it instead.');
  return new Uint8Array(await response.arrayBuffer());
}

function isImage(file: FileAttachment): boolean {
  return file.dataUrl?.startsWith('data:image/') === true
    || /^(png|jpe?g|gif|webp|bmp|avif|svg)$/i.test(getAttachmentFormat(file));
}

function isPdf(file: FileAttachment): boolean {
  return getAttachmentFormat(file) === 'pdf' || file.dataUrl?.startsWith('data:application/pdf') === true;
}

function isDocx(file: FileAttachment): boolean {
  return getAttachmentFormat(file) === 'docx';
}

function isPptx(file: FileAttachment): boolean {
  return getAttachmentFormat(file) === 'pptx';
}

export const DocumentReader: React.FC<DocumentReaderProps> = ({ file, onDownload }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [previewNotice, setPreviewNotice] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pageCount, setPageCount] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [text, setText] = useState('');
  const [availableWidth, setAvailableWidth] = useState(0);
  const [renderError, setRenderError] = useState('');
  const pdfDocumentRef = useRef<PDFDocumentProxy | null>(null);
  const renderTaskRef = useRef<RenderTask | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const docxBodyRef = useRef<HTMLDivElement>(null);
  const docxStylesRef = useRef<HTMLDivElement>(null);

  const format = getAttachmentFormat(file);
  const pdf = isPdf(file);
  const docx = isDocx(file);
  const pptx = isPptx(file);
  const image = isImage(file);
  const plainText = isTextAttachment(file);

  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => setAvailableWidth(container.clientWidth));
    observer.observe(container);
    setAvailableWidth(container.clientWidth);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const pdfDocument = pdfDocumentRef.current;
    pdfDocumentRef.current = null;
    renderTaskRef.current?.cancel();
    renderTaskRef.current = null;
    setLoadError('');
    setPreviewNotice('');
    setRenderError('');
    setPageCount(0);
    setPageNumber(1);
    setZoom(1);
    setText('');

    if (!pdf && !docx && !pptx && !plainText) {
      if (image && !file.dataUrl) setLoadError('The original image is not available in this browser.');
      setIsLoading(false);
      return () => { cancelled = true; void pdfDocument?.destroy(); };
    }
    if (pptx) {
      setIsLoading(false);
      return () => { cancelled = true; void pdfDocument?.destroy(); };
    }

    setIsLoading(true);
    const load = async () => {
      try {
        if ((pdf || docx) && !file.dataUrl && typeof file.textContent === 'string') {
          setText(file.textContent);
          setPreviewNotice('Only saved text is available here; the original document file is not stored on this device.');
        } else if (plainText) {
          if (typeof file.textContent === 'string') {
            if (!cancelled) setText(file.textContent);
          } else {
            const bytes = await readAttachmentBytes(file);
            if (!cancelled) setText(new TextDecoder().decode(bytes));
          }
        } else {
          const bytes = await readAttachmentBytes(file);
          if (cancelled) return;
          if (pdf) {
            const [pdfjs, worker] = await Promise.all([
              import('pdfjs-dist'),
              import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
            ]);
            if (cancelled) return;
            pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
            const task = pdfjs.getDocument({ data: bytes });
            const document = await task.promise;
            if (cancelled) {
              await document.destroy();
              return;
            }
            pdfDocumentRef.current = document;
            setPageCount(document.numPages);
          } else if (docx && docxBodyRef.current && docxStylesRef.current) {
            const { renderAsync } = await import('docx-preview');
            if (cancelled) return;
            docxBodyRef.current.replaceChildren();
            docxStylesRef.current.replaceChildren();
            await renderAsync(bytes, docxBodyRef.current, docxStylesRef.current, {
              inWrapper: false,
              breakPages: true,
              renderHeaders: true,
              renderFooters: true,
            });
          }
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : 'This file could not be previewed.');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void load();

    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel();
      renderTaskRef.current = null;
      const document = pdfDocumentRef.current;
      pdfDocumentRef.current = null;
      void document?.destroy();
    };
  }, [docx, file, image, pdf, plainText, pptx]);

  useEffect(() => {
    let cancelled = false;
    const document = pdfDocumentRef.current;
    const canvas = canvasRef.current;
    if (!pdf || !document || !canvas || !availableWidth || !pageCount) return;
    renderTaskRef.current?.cancel();
    setRenderError('');
    const render = async () => {
      try {
        const page = await document.getPage(pageNumber);
        if (cancelled) return;
        const baseViewport = page.getViewport({ scale: 1 });
        const fitScale = Math.max(0.1, (availableWidth - 24) / baseViewport.width);
        const cssScale = fitScale * zoom;
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        const viewport = page.getViewport({ scale: cssScale * pixelRatio });
        const context = canvas.getContext('2d');
        if (!context) throw new Error('This browser could not create a document canvas.');
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        canvas.style.width = `${Math.ceil(viewport.width / pixelRatio)}px`;
        canvas.style.height = `${Math.ceil(viewport.height / pixelRatio)}px`;
        const task = page.render({ canvasContext: context, viewport });
        renderTaskRef.current = task;
        await task.promise;
      } catch (error) {
        if (!cancelled && !(error instanceof Error && error.name === 'RenderingCancelledException')) {
          setRenderError(error instanceof Error ? error.message : 'This PDF page could not be rendered.');
        }
      }
    };
    void render();
    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel();
      renderTaskRef.current = null;
    };
  }, [availableWidth, pageCount, pageNumber, pdf, zoom]);

  useEffect(() => {
    if (!isFullscreen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsFullscreen(false);
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [isFullscreen]);

  const readerClass = isFullscreen
    ? 'fixed inset-0 z-[70] flex h-[100dvh] flex-col bg-slate-100 p-2 pt-[max(0.5rem,env(safe-area-inset-top))] sm:p-4'
    : 'flex h-[72vh] min-h-[24rem] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-slate-100';

  return (
    <section className={`${readerClass} ${pdf ? '' : 'fb-document-reader--light'}`} aria-label={`Document reader: ${file.name}`}>
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 py-2 sm:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
            <FileText className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-bold text-slate-900 sm:text-sm">{file.name}</p>
            <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
              {format || 'File'} · {formatBytes(file.sizeBytes)}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => onDownload(file)}
            disabled={!file.dataUrl && !(plainText && typeof file.textContent === 'string')}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-emerald-700 px-3 text-xs font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={`Download original file ${file.name}`}
          >
            <ArrowDown className="h-4 w-4" /><span className="hidden sm:inline">Download original</span><span className="sm:hidden">Download</span>
          </button>
          <button
            type="button"
            onClick={() => setIsFullscreen((value) => !value)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100"
            aria-label={isFullscreen ? 'Exit full screen reader' : 'Expand reader'}
            title={isFullscreen ? 'Exit expanded reader' : 'Expand reader'}
          >
            {isFullscreen ? <Shrink className="h-4 w-4" /> : <Expand className="h-4 w-4" />}
          </button>
          {isFullscreen && (
            <button
              type="button"
              onClick={() => setIsFullscreen(false)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100"
              aria-label="Close expanded reader"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </header>

      {pdf && file.dataUrl && (
        <div className="flex shrink-0 flex-wrap items-center justify-center gap-2 border-b border-slate-200 bg-white px-2 py-2 sm:justify-between sm:px-4">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPageNumber((page) => Math.max(1, page - 1))}
              disabled={pageNumber <= 1 || isLoading}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <label className="flex items-center gap-1 text-xs font-semibold text-slate-700">
              <input
                aria-label="PDF page number"
                type="number"
                min={1}
                max={pageCount || 1}
                value={pageNumber}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  if (Number.isInteger(value) && value >= 1 && value <= pageCount) setPageNumber(value);
                }}
                className="h-9 w-14 rounded-md border border-slate-200 text-center text-sm"
              />
              <span>of {pageCount || '—'}</span>
            </label>
            <button
              type="button"
              onClick={() => setPageNumber((page) => Math.min(pageCount, page + 1))}
              disabled={pageNumber >= pageCount || isLoading}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40"
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setZoom((value) => Math.max(0.5, Math.round((value - 0.15) * 100) / 100))}
              disabled={zoom <= 0.5}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40"
              aria-label="Zoom out"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="min-w-12 text-center text-xs font-semibold text-slate-600">{Math.round(zoom * 100)}%</span>
            <button
              type="button"
              onClick={() => setZoom((value) => Math.min(2.5, Math.round((value + 0.15) * 100) / 100))}
              disabled={zoom >= 2.5}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40"
              aria-label="Zoom in"
            >
              <Plus className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setZoom(1)}
              className="min-h-10 rounded-lg px-2 text-xs font-bold text-emerald-800 hover:bg-emerald-50"
            >
              Fit width
            </button>
          </div>
        </div>
      )}

      <div className="fb-document-reader-content min-h-0 flex-1 overflow-auto p-2 sm:p-4">
        {isLoading && (
          <div role="status" className="flex min-h-40 items-center justify-center text-sm font-semibold text-slate-600">
            <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-700" />
            Preparing preview…
          </div>
        )}
        {loadError && (
          <div role="alert" className="mx-auto my-4 max-w-xl rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            <p className="font-bold">Preview unavailable</p>
            <p className="mt-1">{loadError}</p>
            <p className="mt-1">{file.dataUrl ? 'Your original file is unchanged. Use Download original to open it with another app.' : 'The original file is not stored on this device.'}</p>
          </div>
        )}
        {previewNotice && (
          <p role="status" className="mx-auto my-3 max-w-xl rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
            {previewNotice}
          </p>
        )}
        {renderError && (
          <div role="alert" className="mx-auto my-4 max-w-xl rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            <p className="font-bold">This PDF page could not be displayed.</p>
            <p className="mt-1">{renderError} You can still download the original file.</p>
          </div>
        )}
        {pdf && file.dataUrl && !loadError && (
          <div ref={canvasContainerRef} className="flex min-h-full justify-center overflow-auto">
            <canvas
              ref={canvasRef}
              aria-label={`Page ${pageNumber} of ${pageCount}`}
              className={`h-fit max-w-none bg-white shadow-md ${isLoading ? 'hidden' : ''}`}
            />
          </div>
        )}
        {docx && file.dataUrl && !loadError && (
          <div className={`fb-docx-preview fb-preview-paper mx-auto max-w-5xl rounded-md p-3 shadow-sm sm:p-6 ${isLoading ? 'hidden' : ''}`}>
            <div ref={docxStylesRef} />
            <div ref={docxBodyRef} />
          </div>
        )}
        {pptx && (
          <Suspense fallback={
            <div role="status" className="flex min-h-40 items-center justify-center text-sm font-semibold text-slate-600">
              <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-700" />
              Loading presentation reader…
            </div>
          }>
            <PptxPreview file={file} />
          </Suspense>
        )}
        {(plainText || ((pdf || docx) && !file.dataUrl && typeof file.textContent === 'string')) && !loadError && !isLoading && (
          <pre className="fb-preview-paper mx-auto max-w-5xl whitespace-pre-wrap break-words rounded-xl p-4 font-mono text-sm leading-7 shadow-sm sm:p-6">
            {text}
          </pre>
        )}
        {image && !loadError && file.dataUrl && (
          <div className="flex min-h-full items-center justify-center">
            <img
              src={file.dataUrl}
              alt={file.name}
              className={`max-w-full object-contain ${isFullscreen ? 'max-h-[calc(100dvh-8rem)]' : 'max-h-[65vh]'}`}
            />
          </div>
        )}
        {!pdf && !docx && !pptx && !plainText && !image && (
          <div className="mx-auto my-8 max-w-lg rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
            <FileText className="mx-auto h-10 w-10 text-emerald-700" />
            <h3 className="mt-3 font-bold text-slate-900">Preview not available for {format.toUpperCase() || 'this file'}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              This format is not rendered in FacheeBook yet. Download the original and open it in a compatible app such as Microsoft Office or LibreOffice.
            </p>
            {!file.dataUrl && (
              <p className="mt-3 text-xs font-semibold text-rose-700">The original file is not available on this device.</p>
            )}
          </div>
        )}
      </div>
    </section>
  );
};
