import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, MicOff, AlertCircle, Sparkles, Volume2, 
  RotateCcw, Check, Radio, HelpCircle
} from 'lucide-react';
import { 
  getSpeechRecognitionConstructor, 
  isSpeechRecognitionSupported, 
  ISpeechRecognition 
} from '../utils/speechRecognition';

interface VoiceTipRecorderProps {
  onTranscriptChange: (text: string, mode: 'append' | 'replace', targetField: 'content' | 'title') => void;
  currentContent: string;
  currentTitle: string;
  className?: string;
  defaultTargetField?: 'content' | 'title';
}

export const VoiceTipRecorder: React.FC<VoiceTipRecorderProps> = ({
  onTranscriptChange,
  currentContent,
  currentTitle,
  className = '',
  defaultTargetField = 'content',
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [duration, setDuration] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [targetField, setTargetField] = useState<'content' | 'title'>(defaultTargetField);
  const [writeMode, setWriteMode] = useState<'append' | 'replace'>('append');
  const [hasRecordedAny, setHasRecordedAny] = useState(false);

  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const timerRef = useRef<number | null>(null);
  const isSupported = isSpeechRecognitionSupported();

  // Clean up recognition and timer on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
    };
  }, []);

  const startRecording = () => {
    setErrorMsg(null);
    const SpeechRecognitionClass = getSpeechRecognitionConstructor();

    if (!SpeechRecognitionClass) {
      setErrorMsg("Voice-to-text is not supported by this browser. Please try Google Chrome, MS Edge, or Apple Safari.");
      return;
    }

    try {
      const recognition = new SpeechRecognitionClass();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsRecording(true);
        setDuration(0);
        setInterimText('');
        setErrorMsg(null);

        // Start duration counter
        if (timerRef.current) window.clearInterval(timerRef.current);
        timerRef.current = window.setInterval(() => {
          setDuration((prev) => prev + 1);
        }, 1000);
      };

      recognition.onresult = (event) => {
        let finalChunk = '';
        let interimChunk = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const result = event.results[i];
          const text = result[0]?.transcript || '';
          if (result.isFinal) {
            finalChunk += text;
          } else {
            interimChunk += text;
          }
        }

        setInterimText(interimChunk);

        if (finalChunk.trim()) {
          setHasRecordedAny(true);
          onTranscriptChange(finalChunk.trim(), writeMode, targetField);
        }
      };

      recognition.onerror = (event) => {
        console.warn('Speech recognition error event:', event.error);
        if (event.error === 'not-allowed') {
          setErrorMsg("Microphone permission was denied. Please allow microphone access in your browser settings to record your tip.");
        } else if (event.error === 'no-speech') {
          // No speech detected, ignore or keep listening
        } else if (event.error === 'network') {
          setErrorMsg("Network connection error for voice service. Please check your internet connection.");
        } else {
          setErrorMsg(`Voice recognition issue (${event.error}). Try again.`);
        }
      };

      recognition.onend = () => {
        setIsRecording(false);
        setInterimText('');
        if (timerRef.current) {
          window.clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error('Failed to start speech recognition:', err);
      setErrorMsg(err?.message || "Could not start microphone voice recording.");
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    setIsRecording(false);
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className={`rounded-2xl border transition-all ${
      isRecording 
        ? 'bg-rose-50/70 border-rose-300 shadow-sm' 
        : 'bg-slate-50/90 border-slate-200/80'
    } p-3.5 space-y-3 ${className}`}>
      
      {/* Top Controls Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
            isRecording 
              ? 'bg-rose-600 text-white animate-pulse shadow-xs' 
              : 'bg-indigo-100 text-indigo-700'
          }`}>
            {isRecording ? <Mic className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-800 tracking-tight">
                Voice-to-Text Recorder
              </span>
              {isRecording && (
                <span className="px-2 py-0.2 rounded-full bg-rose-100 text-rose-800 font-mono text-[10px] font-extrabold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping" />
                  REC {formatDuration(duration)}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              {isRecording 
                ? "Listening... Speak clearly into your microphone." 
                : "Dictate your study tip instead of typing it out."}
            </p>
          </div>
        </div>

        {/* Start / Stop Primary Button */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {isRecording ? (
            <button
              type="button"
              onClick={stopRecording}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold transition-all shadow-xs active:scale-95 cursor-pointer"
            >
              <MicOff className="w-3.5 h-3.5" />
              <span>Stop Recording</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={startRecording}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold transition-all shadow-xs active:scale-95 cursor-pointer"
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Record with Microphone</span>
            </button>
          )}
        </div>
      </div>

      {/* Target & Options Configuration Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/70 text-[11px]">
        {/* Dictation Target Selector */}
        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 font-semibold">Dictate into:</span>
          <div className="flex items-center rounded-lg bg-white border border-slate-200 p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={() => setTargetField('content')}
              className={`px-2 py-0.5 rounded-md font-bold transition-colors cursor-pointer ${
                targetField === 'content'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tip Advice
            </button>
            <button
              type="button"
              onClick={() => setTargetField('title')}
              className={`px-2 py-0.5 rounded-md font-bold transition-colors cursor-pointer ${
                targetField === 'title'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tip Title
            </button>
          </div>
        </div>

        {/* Append vs Replace Mode */}
        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 font-semibold">Input mode:</span>
          <div className="flex items-center rounded-lg bg-white border border-slate-200 p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={() => setWriteMode('append')}
              className={`px-2 py-0.5 rounded-md font-bold transition-colors cursor-pointer ${
                writeMode === 'append'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Add spoken words to existing text"
            >
              Append
            </button>
            <button
              type="button"
              onClick={() => setWriteMode('replace')}
              className={`px-2 py-0.5 rounded-md font-bold transition-colors cursor-pointer ${
                writeMode === 'replace'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Replace field with new spoken words"
            >
              Replace
            </button>
          </div>
        </div>
      </div>

      {/* Active Audio Waves & Live Interim Transcription */}
      {isRecording && (
        <div className="bg-white p-3 rounded-xl border border-rose-200 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              <span className="text-[11px] font-bold text-rose-800">
                Capturing Speech ({targetField === 'content' ? 'Advice text' : 'Title'})
              </span>
            </div>

            {/* Simulated Animated Equalizer bars */}
            <div className="flex items-end gap-1 h-3.5">
              <span className="w-1 bg-rose-400 rounded-full animate-pulse h-2" />
              <span className="w-1 bg-rose-600 rounded-full animate-bounce h-3.5" />
              <span className="w-1 bg-rose-500 rounded-full animate-pulse h-2.5" />
              <span className="w-1 bg-rose-700 rounded-full animate-bounce h-3" />
              <span className="w-1 bg-rose-400 rounded-full animate-pulse h-2" />
            </div>
          </div>

          <div className="text-xs text-slate-700 italic bg-rose-50/50 p-2 rounded-lg border border-rose-100 min-h-[36px]">
            {interimText ? (
              <span>"{interimText}"</span>
            ) : (
              <span className="text-slate-400">Say your tip out loud (e.g. "To memorize anatomy, draw each system from memory...")</span>
            )}
          </div>
        </div>
      )}

      {/* Error Message if any */}
      {errorMsg && (
        <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">{errorMsg}</p>
            {!isSupported && (
              <p className="text-[10px] text-amber-700 mt-0.5">
                Note: Standard Web Speech API is supported in Google Chrome, Microsoft Edge, and Apple Safari.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
