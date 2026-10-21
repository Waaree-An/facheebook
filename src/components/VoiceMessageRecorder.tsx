import React, { useState, useRef, useEffect } from 'react';
import { 
  Mic, MicOff, Square, Play, Pause, Trash2, 
  Upload, AlertCircle, CheckCircle2, RotateCcw, Volume2
} from 'lucide-react';
import { VoiceMessage } from '../types';
import { 
  blobToDataUrl, 
  formatAudioDuration, 
  generateWaveformPattern, 
  formatAudioBytes 
} from '../utils/audioUtils';

interface VoiceMessageRecorderProps {
  voiceMessage: VoiceMessage | null;
  onVoiceMessageChange: (vm: VoiceMessage | null) => void;
  maxDurationSeconds?: number;
}

export const VoiceMessageRecorder: React.FC<VoiceMessageRecorderProps> = ({
  voiceMessage,
  onVoiceMessageChange,
  maxDurationSeconds = 180, // 3 minutes max
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [volumeLevel, setVolumeLevel] = useState(0);

  // Preview state
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [previewCurrentTime, setPreviewCurrentTime] = useState(0);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  // Recording internals
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const durationTimerRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopInternalRecording(false);
    };
  }, []);

  // Set up preview audio listeners
  useEffect(() => {
    const audio = previewAudioRef.current;
    if (!audio) return;

    const onTime = () => setPreviewCurrentTime(audio.currentTime);
    const onEnd = () => {
      setIsPreviewPlaying(false);
      setPreviewCurrentTime(0);
    };
    const onPause = () => setIsPreviewPlaying(false);
    const onPlay = () => setIsPreviewPlaying(true);

    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('ended', onEnd);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('play', onPlay);

    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('ended', onEnd);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('play', onPlay);
    };
  }, [voiceMessage?.audioUrl]);

  const startRecording = async () => {
    setErrorMsg(null);
    audioChunksRef.current = [];

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErrorMsg("Audio recording is not supported in this browser. Please use Chrome, Edge, or Safari, or upload an audio file below.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      streamRef.current = stream;

      // Audio analysis for real-time visualizer
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const audioCtx = new AudioCtx();
          audioContextRef.current = audioCtx;
          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 64;
          source.connect(analyser);
          analyserRef.current = analyser;

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const updateVolume = () => {
            if (!analyserRef.current) return;
            analyserRef.current.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const avg = sum / dataArray.length;
            setVolumeLevel(Math.min(100, Math.round((avg / 128) * 100)));
            animationFrameRef.current = requestAnimationFrame(updateVolume);
          };
          updateVolume();
        }
      } catch (e) {
        console.warn('AudioContext visualization not available:', e);
      }

      // Determine best supported mimeType
      let options: MediaRecorderOptions = {};
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        options = { mimeType: 'audio/webm;codecs=opus' };
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        options = { mimeType: 'audio/webm' };
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        options = { mimeType: 'audio/mp4' };
      } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
        options = { mimeType: 'audio/ogg' };
      }

      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const mimeType = recorder.mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        if (blob.size === 0) return;

        try {
          const dataUrl = await blobToDataUrl(blob);
          const finalDuration = recordDuration > 0 ? recordDuration : 1;
          const newVoiceMessage: VoiceMessage = {
            id: 'vm_' + Date.now(),
            audioUrl: dataUrl,
            durationSeconds: finalDuration,
            recordedAt: new Date().toISOString(),
            fileSizeFormatted: formatAudioBytes(blob.size),
            waveform: generateWaveformPattern(28),
          };
          onVoiceMessageChange(newVoiceMessage);
        } catch (err: any) {
          setErrorMsg("Failed to process recorded audio. Please try again.");
        }
      };

      recorder.start(250); // Slice chunks every 250ms
      setIsRecording(true);
      setRecordDuration(0);

      // Start elapsed duration interval
      durationTimerRef.current = window.setInterval(() => {
        setRecordDuration((prev) => {
          if (prev + 1 >= maxDurationSeconds) {
            stopInternalRecording(true);
            return maxDurationSeconds;
          }
          return prev + 1;
        });
      }, 1000);

    } catch (err: any) {
      console.error('Microphone access error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMsg("Microphone permission was denied. Please allow microphone access in your browser settings to record voice notes.");
      } else {
        setErrorMsg(err?.message || "Could not access microphone.");
      }
      setIsRecording(false);
    }
  };

  const stopInternalRecording = (save = true) => {
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      if (!save) {
        audioChunksRef.current = [];
      }
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // ignore
      }
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    setIsRecording(false);
    setVolumeLevel(0);
  };

  const cancelRecording = () => {
    stopInternalRecording(false);
    setRecordDuration(0);
  };

  const finishRecording = () => {
    stopInternalRecording(true);
  };

  // Upload an audio file directly
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
      setErrorMsg("Please select an audio file (MP3, WAV, M4A, OGG, WebM).");
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setErrorMsg("Audio file size should be less than 20MB.");
      return;
    }

    try {
      const dataUrl = await blobToDataUrl(file);

      // Create a temporary audio element to detect duration
      const tempAudio = new Audio(dataUrl);
      tempAudio.onloadedmetadata = () => {
        const audioDuration = Math.round(tempAudio.duration) || 10;
        const newVoiceMessage: VoiceMessage = {
          id: 'vm_' + Date.now(),
          audioUrl: dataUrl,
          durationSeconds: audioDuration,
          recordedAt: new Date().toISOString(),
          fileSizeFormatted: formatAudioBytes(file.size),
          waveform: generateWaveformPattern(28),
        };
        onVoiceMessageChange(newVoiceMessage);
      };
      tempAudio.onerror = () => {
        // Fallback if metadata fails
        const newVoiceMessage: VoiceMessage = {
          id: 'vm_' + Date.now(),
          audioUrl: dataUrl,
          durationSeconds: 15,
          recordedAt: new Date().toISOString(),
          fileSizeFormatted: formatAudioBytes(file.size),
          waveform: generateWaveformPattern(28),
        };
        onVoiceMessageChange(newVoiceMessage);
      };
    } catch (err: any) {
      setErrorMsg("Failed to upload audio file. Please try again.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const togglePreviewPlay = () => {
    const audio = previewAudioRef.current;
    if (!audio) return;
    if (isPreviewPlaying) {
      audio.pause();
    } else {
      audio.play().catch(() => {});
    }
  };

  const handleRemoveVoiceNote = () => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
    }
    setIsPreviewPlaying(false);
    onVoiceMessageChange(null);
  };

  return (
    <div className="space-y-3">
      {/* Hidden file input for audio upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.webm"
        className="hidden"
      />

      {/* STATE 1: Currently Recording */}
      {isRecording && (
        <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-400 shadow-sm space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-600"></span>
              </span>
              <span className="text-xs font-black text-rose-900 uppercase tracking-wider">
                Recording Voice Note
              </span>
            </div>

            <div className="flex items-center gap-1.5 font-mono text-xs font-black text-rose-700 bg-rose-100/80 px-2.5 py-1 rounded-lg">
              <span>{formatAudioDuration(recordDuration)}</span>
              <span className="text-rose-400">/</span>
              <span className="text-rose-500">{formatAudioDuration(maxDurationSeconds)}</span>
            </div>
          </div>

          {/* Dynamic Frequency Volume Bars */}
          <div className="bg-white/80 rounded-xl p-3 border border-rose-200 flex items-center justify-center gap-1.5 h-14">
            {Array.from({ length: 24 }).map((_, i) => {
              // Simulated reactive bars based on live volumeLevel
              const distFromCenter = Math.abs(i - 11.5) / 11.5;
              const barHeight = Math.max(
                15, 
                Math.min(100, (volumeLevel * (1 - distFromCenter * 0.5) * (0.6 + 0.4 * Math.random())))
              );
              return (
                <span
                  key={i}
                  style={{ height: `${barHeight}%` }}
                  className="w-1 sm:w-1.5 rounded-full bg-gradient-to-t from-rose-500 to-rose-400 transition-all duration-75"
                />
              );
            })}
          </div>

          <p className="text-[11px] text-rose-700 text-center font-medium">
            Speak into your microphone. Explain the study concept, mnemonic, or study tip clearly.
          </p>

          {/* Controls: Finish Recording & Cancel */}
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={cancelRecording}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Discard</span>
            </button>

            <button
              type="button"
              onClick={finishRecording}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-md shadow-rose-600/30 active:scale-95 transition-all cursor-pointer"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Finish & Attach Voice Note</span>
            </button>
          </div>
        </div>
      )}

      {/* STATE 2: Has Voice Note Attached (Preview & Re-record) */}
      {!isRecording && voiceMessage && (
        <div className="p-3.5 rounded-2xl bg-indigo-50/80 border border-indigo-200 shadow-2xs space-y-2.5">
          {voiceMessage.audioUrl && (
            <audio 
              ref={previewAudioRef} 
              src={voiceMessage.audioUrl} 
              preload="metadata" 
            />
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 block">
                  Voice Message Attached
                </span>
                <span className="text-[10px] text-slate-500 font-medium">
                  Duration: {formatAudioDuration(voiceMessage.durationSeconds)}
                  {voiceMessage.fileSizeFormatted && ` • ${voiceMessage.fileSizeFormatted}`}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleRemoveVoiceNote}
              className="flex items-center gap-1 text-[11px] text-rose-600 hover:text-rose-800 font-bold px-2 py-1 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
              title="Remove voice note"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Remove</span>
            </button>
          </div>

          {/* Mini Playback Preview Bar */}
          <div className="bg-white p-2.5 rounded-xl border border-indigo-100 flex items-center gap-3">
            <button
              type="button"
              onClick={togglePreviewPlay}
              className="w-8 h-8 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shrink-0 cursor-pointer shadow-xs active:scale-95 transition-all"
            >
              {isPreviewPlaying ? (
                <Pause className="w-3.5 h-3.5 fill-current" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
              )}
            </button>

            {/* Waveform visualizer */}
            <div className="flex-1 flex items-end gap-1 h-6">
              {(voiceMessage.waveform || generateWaveformPattern(20)).map((bar, i) => {
                const percent = (i / 20) * 100;
                const currentPercent = (previewCurrentTime / (voiceMessage.durationSeconds || 1)) * 100;
                const isPlayed = percent <= currentPercent;
                return (
                  <span
                    key={i}
                    style={{ height: `${Math.max(20, bar * 100)}%` }}
                    className={`flex-1 rounded-full transition-colors ${
                      isPlayed ? 'bg-indigo-600' : 'bg-indigo-200'
                    }`}
                  />
                );
              })}
            </div>

            <span className="font-mono text-[10px] text-slate-500 font-bold shrink-0">
              {formatAudioDuration(previewCurrentTime)} / {formatAudioDuration(voiceMessage.durationSeconds)}
            </span>
          </div>
        </div>
      )}

      {/* STATE 3: Idle (Offer Record or Upload Options) */}
      {!isRecording && !voiceMessage && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-3.5 text-center space-y-2.5 hover:bg-slate-50 transition-colors">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5">
            {/* Record With Microphone Button */}
            <button
              type="button"
              onClick={startRecording}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold shadow-sm active:scale-95 transition-all cursor-pointer"
            >
              <Mic className="w-4 h-4" />
              <span>Record Voice Note (Mic)</span>
            </button>

            <span className="text-slate-400 text-xs font-bold hidden sm:inline">or</span>

            {/* Upload Audio File Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold active:scale-95 transition-all cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-indigo-600" />
              <span>Upload Voice Memo</span>
            </button>
          </div>

          <p className="text-[11px] text-slate-500">
            Share voice explanations, mnemonic pronunciations, or audio walkthroughs so other students can listen on the go.
          </p>
        </div>
      )}

      {/* Error message */}
      {errorMsg && (
        <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="font-semibold flex-1">{errorMsg}</p>
        </div>
      )}
    </div>
  );
};
