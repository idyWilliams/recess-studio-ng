'use client';

import { useEffect, useState } from 'react';
import { lofiAudioEngine } from '@/lib/audio/lofi-engine';

export function AudioBus() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    if (lofiAudioEngine) {
      setIsPlaying(lofiAudioEngine.getIsPlaying());
    }
  }, []);

  const handleToggle = async () => {
    if (!lofiAudioEngine) return;

    if (isPlaying) {
      if (!isMuted) {
        lofiAudioEngine.pause();
        setIsPlaying(false);
      } else {
        lofiAudioEngine.setMuted(false);
        setIsMuted(false);
      }
    } else {
      const started = await lofiAudioEngine.start();
      if (started) {
        lofiAudioEngine.setMuted(false);
        setIsPlaying(true);
        setIsMuted(false);
      }
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      title={isPlaying ? 'Pause Audio' : 'Play Audio Lounge'}
      className="group flex items-center gap-2 rounded-full border border-white/[0.07] bg-[#121214] hover:bg-[#18181B] px-3 py-1.5 text-xs text-[#8E8E93] hover:text-[#F4F4F0] transition-all active:scale-95"
      aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
    >
      {/* Minimalist Waveform Equalizer */}
      <div className="flex h-3 items-end gap-[2px] px-0.5" aria-hidden="true">
        <span
          className={`w-[2px] rounded-full bg-[#C8B28A] transition-all ${
            isPlaying ? 'h-3 animate-pulse' : 'h-1 opacity-30'
          }`}
          style={{ animationDuration: '600ms' }}
        />
        <span
          className={`w-[2px] rounded-full bg-[#C8B28A] transition-all ${
            isPlaying ? 'h-3.5 animate-pulse' : 'h-1.5 opacity-30'
          }`}
          style={{ animationDuration: '450ms', animationDelay: '150ms' }}
        />
        <span
          className={`w-[2px] rounded-full bg-[#C8B28A] transition-all ${
            isPlaying ? 'h-2 animate-pulse' : 'h-1 opacity-30'
          }`}
          style={{ animationDuration: '700ms', animationDelay: '300ms' }}
        />
      </div>

      <span className="hidden text-[11px] font-medium tracking-tight text-[#8E8E93] group-hover:text-[#F4F4F0] sm:inline">
        Audio
      </span>
    </button>
  );
}
