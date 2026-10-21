import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, Pause, Volume2, VolumeX, RotateCcw, 
  Download, Mic, Radio, FastForward
} from 'lucide-react';
import { VoiceMessage } from '../types';
import { formatAudioDuration, generateWaveformPattern } from '../utils/audioUtils';

interface VoiceMessagePlayerProps {
  voiceMessage: VoiceMessage;
  authorName?: string;
  variant?: 'card' | 'featured' | 'compact';
  className?: string;
}

export const VoiceMessagePlayer: React.FC<VoiceMessagePlayerProps> = ({
  voiceMessage,
  authorName,
  variant = 'card',
  className = '',
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(voiceMessage.durationSeconds || 0);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);

  // Waveform data or fallback pattern
  const waveform = voiceMessage.waveform && voiceMessage.waveform.length > 0
    ? voiceMessage.waveform
    : React.useMemo(() => generateWaveformPattern(28), []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(Math.round(audio.duration));
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handlePlay = () => {
      setIsPlaying(true);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('play', handlePlay);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('play', handlePlay);
    };
  }, [voiceMessage.audioUrl]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch((err) => {
        console.warn('Audio playback error:', err);
      });
    }
  };

  const handleSeek = (percentage: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const targetDuration = duration || audio.duration || voiceMessage.durationSeconds;
    const newTime = percentage * targetDuration;
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const cyclePlaybackRate = () => {
    const audio = audioRef.current;
    if (!audio) return;
    const rates = [1, 1.25, 1.5, 2];
    const nextIndex = (rates.indexOf(playbackRate) + 1) % rates.length;
    const newRate = rates[nextIndex];
    audio.playbackRate = newRate;
    setPlaybackRate(newRate);
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Visual Theme styles based on variant
  const isFeatured = variant === 'featured';

  return (
    <div 
      className={`rounded-2xl transition-all select-none ${
        isFeatured 
          ? 'bg-amber-100/70 border border-amber-300/80 p-3.5 shadow-xs' 
          : 'bg-indigo-50/70 border border-indigo-200/80 p-3 shadow-2xs'
      } ${className}`}
    >
      <audio 
        ref={audioRef} 
        src={voiceMessage.audioUrl} 
        preload="metadata" 
      />

      {/* Header Info: Voice Note label & duration */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          <span className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
            isFeatured 
              ? 'bg-amber-200 text-amber-900' 
              : 'bg-indigo-100 text-indigo-900'
          }`}>
            <Mic className="w-3 h-3" />
            <span>Voice Note</span>
          </span>
          {authorName && (
            <span className="text-[11px] text-slate-500 font-medium truncate">
              from {authorName}
            </span>
          )}
        </div>

        {/* Speed and Download Action Controls */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={cyclePlaybackRate}
            className={`px-1.5 py-0.5 rounded-md text-[10px] font-extrabold transition-colors cursor-pointer ${
              isFeatured 
                ? 'bg-amber-200/70 hover:bg-amber-200 text-amber-900' 
                : 'bg-indigo-100/80 hover:bg-indigo-200 text-indigo-800'
            }`}
            title="Cycle playback speed"
          >
            {playbackRate}x
          </button>

          <button
            type="button"
            onClick={toggleMute}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-500" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>

          {voiceMessage.audioUrl && (
            <a
              href={voiceMessage.audioUrl}
              download={`fachee-voice-tip-${voiceMessage.id || 'audio'}.webm`}
              className="p-1 rounded-md text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
              title="Download voice note"
            >
              <Download className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>

      {/* Main Player Row: Play/Pause Button + Interactive Waveform */}
      <div className="flex items-center gap-3">
        {/* Play / Pause Circular Button */}
        <button
          type="button"
          onClick={togglePlay}
          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all shadow-xs shrink-0 cursor-pointer active:scale-95 ${
            isPlaying
              ? isFeatured 
                ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-300' 
                : 'bg-indigo-600 text-white ring-2 ring-indigo-300 animate-pulse'
              : isFeatured
                ? 'bg-slate-900 text-amber-400 hover:bg-slate-800'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
          }`}
          title={isPlaying ? 'Pause voice message' : 'Play voice message'}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 fill-current" />
          ) : (
            <Play className="w-4 h-4 fill-current ml-0.5" />
          )}
        </button>

        {/* Interactive Waveform Display */}
        <div className="flex-1 flex flex-col justify-center">
          <div 
            className="flex items-end gap-[2px] sm:gap-1 h-7 cursor-pointer py-1 group"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const clickX = e.clientX - rect.left;
              const ratio = Math.max(0, Math.min(1, clickX / rect.width));
              handleSeek(ratio);
            }}
          >
            {waveform.map((barHeight, idx) => {
              const barPercent = (idx / waveform.length) * 100;
              const isPlayed = barPercent <= progressPercent;
              const isHovered = hoveredBarIndex !== null && idx <= hoveredBarIndex;

              return (
                <span
                  key={idx}
                  onMouseEnter={() => setHoveredBarIndex(idx)}
                  onMouseLeave={() => setHoveredBarIndex(null)}
                  style={{ height: `${Math.max(16, barHeight * 100)}%` }}
                  className={`flex-1 min-w-[2px] rounded-full transition-all duration-75 ${
                    isPlayed
                      ? isFeatured 
                        ? 'bg-amber-600' 
                        : 'bg-indigo-600'
                      : isHovered
                        ? isFeatured ? 'bg-amber-400' : 'bg-indigo-400'
                        : isFeatured ? 'bg-amber-200/80' : 'bg-indigo-200/70'
                  } ${isPlaying && isPlayed ? 'scale-y-105' : ''}`}
                />
              );
            })}
          </div>

          {/* Time Counter: Current / Duration */}
          <div className="flex items-center justify-between text-[10px] font-mono font-bold text-slate-500 mt-0.5">
            <span className={isPlaying ? (isFeatured ? 'text-amber-800' : 'text-indigo-700 font-extrabold') : ''}>
              {formatAudioDuration(currentTime)}
            </span>
            <span>{formatAudioDuration(duration || voiceMessage.durationSeconds)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
