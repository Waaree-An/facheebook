import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PresentationViewer } from 'pptx-wasm/react';
import type { PresentationInfo } from 'pptx-wasm';
import type { FileAttachment } from '../types';

interface PptxPreviewProps {
  file: FileAttachment;
}

export function PptxPreview({ file }: PptxPreviewProps) {
  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  const [loadError, setLoadError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [slideCount, setSlideCount] = useState(0);
  const [slideNumber, setSlideNumber] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setBytes(null);
    setLoadError('');
    setIsLoading(true);
    setSlideCount(0);
    setSlideNumber(0);

    const load = async () => {
      try {
        if (!file.dataUrl) throw new Error('The original presentation is not available in this browser.');
        const response = await fetch(file.dataUrl);
        if (!response.ok) throw new Error('Could not read the original presentation. Try downloading it instead.');
        const presentationBytes = new Uint8Array(await response.arrayBuffer());
        if (!cancelled) setBytes(presentationBytes);
      } catch (error) {
        if (!cancelled) setLoadError(error instanceof Error ? error.message : 'This presentation could not be opened.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void load();

    return () => { cancelled = true; };
  }, [file]);

  const handleLoad = (info: PresentationInfo) => {
    if (!info.slideCount) {
      setLoadError('This presentation does not contain any slides that can be previewed.');
      return;
    }
    setSlideCount(info.slideCount);
    setSlideNumber(0);
  };

  return (
    <div className="flex min-h-full flex-col">
      {slideCount > 0 && (
        <div className="mb-3 flex shrink-0 items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
          <button
            type="button"
            onClick={() => setSlideNumber((slide) => Math.max(0, slide - 1))}
            disabled={slideNumber <= 0}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40"
            aria-label="Previous slide"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span aria-live="polite" className="min-w-24 text-center text-xs font-semibold text-slate-700">
            Slide {slideNumber + 1} of {slideCount}
          </span>
          <button
            type="button"
            onClick={() => setSlideNumber((slide) => Math.min(slideCount - 1, slide + 1))}
            disabled={slideNumber >= slideCount - 1}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40"
            aria-label="Next slide"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="flex min-h-[16rem] flex-1 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white p-2 shadow-sm sm:p-4">
        {(isLoading || (bytes && !slideCount && !loadError)) && (
          <div role="status" className="flex items-center text-sm font-semibold text-slate-600">
            <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-700" />
            {isLoading ? 'Preparing presentation…' : 'Rendering slides…'}
          </div>
        )}
        {loadError && (
          <div role="alert" className="mx-auto my-4 max-w-xl rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            <p className="font-bold">Preview unavailable</p>
            <p className="mt-1">{loadError}</p>
            <p className="mt-1">Your original file is unchanged. Use Download original to open it with another app.</p>
          </div>
        )}
        {bytes && !loadError && (
          <PresentationViewer
            src={bytes}
            slide={slideNumber}
            width="100%"
            height="100%"
            fit="contain"
            keyboard={false}
            className="h-full w-full"
            style={{ maxHeight: '100%', maxWidth: '100%' }}
            onLoad={handleLoad}
            onError={(error) => setLoadError(error.message)}
            renderError={(error) => (
              <div role="alert" className="p-4 text-sm text-amber-950">
                <p className="font-bold">Preview unavailable</p>
                <p className="mt-1">{error.message}</p>
              </div>
            )}
          />
        )}
      </div>
      <p className="mt-2 shrink-0 text-center text-[11px] text-slate-500">
        Animations and slide transitions are not shown in this preview.
      </p>
    </div>
  );
}
