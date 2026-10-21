/**
 * Audio utilities for voice notes and voice messages in Fachee United Hub
 */

// Format seconds to mm:ss format
export function formatAudioDuration(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

// Generate realistic waveform bars (24 to 32 points)
export function generateWaveformPattern(count = 28): number[] {
  const bars: number[] = [];
  for (let i = 0; i < count; i++) {
    // Generate organic sounding bell-curve speech pattern
    const positionFactor = Math.sin((i / (count - 1)) * Math.PI);
    const noise = 0.2 + 0.8 * Math.random();
    const height = Math.max(0.18, Math.min(1.0, positionFactor * noise + 0.15));
    bars.push(Number(height.toFixed(2)));
  }
  return bars;
}

// Convert audio blob to base64 Data URL
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert audio blob to Data URL'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Format file size bytes into KB/MB
export function formatAudioBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Creates a pleasant synthetic audio WAV data URI for demo voice tips.
 * Generates an organic multi-tone melodic voice-note chime (e.g. 5 seconds).
 */
export function generateSampleVoiceNoteWav(durationSec = 5): string {
  const sampleRate = 22050;
  const numSamples = durationSec * sampleRate;
  const numChannels = 1;
  const bytesPerSample = 2; // 16-bit PCM
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;

  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // Write WAV Header
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true); // ChunkSize
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true);  // AudioFormat (1 for PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bytesPerSample * 8, true); // BitsPerSample (16)
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  // Write audio samples - melodious speaking-cadence tone modulation
  let offset = 44;
  const baseFreqs = [261.63, 329.63, 392.0, 440.0, 523.25]; // C4, E4, G4, A4, C5

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const noteIndex = Math.min(baseFreqs.length - 1, Math.floor((t / durationSec) * baseFreqs.length));
    const freq = baseFreqs[noteIndex];
    
    // Slight vibrato and speech envelope
    const vibrato = Math.sin(2 * Math.PI * 5.0 * t) * 8.0;
    const envelope = Math.sin(Math.PI * ((t % 1) / 1)); // swell on each beat
    const sampleVal = Math.sin(2 * Math.PI * (freq + vibrato) * t) * 0.35 * envelope;
    
    // Clamp to 16-bit signed integer range
    const intVal = Math.max(-32768, Math.min(32767, Math.floor(sampleVal * 32767)));
    view.setInt16(offset, intVal, true);
    offset += 2;
  }

  // Convert buffer to base64
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return `data:audio/wav;base64,${btoa(binary)}`;
}
