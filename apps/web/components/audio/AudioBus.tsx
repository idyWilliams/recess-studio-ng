'use client';

import { useEffect, useState } from 'react';
import { lofiAudioEngine } from '@/lib/audio/lofi-engine';

export function AudioBus() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    // Check initial state
    if (lofiAudioEngine) {
      setIsPlaying(lofiAudioEngine.getIsPlaying());
    }
  }, []);

  const handleToggle = async () => {
    if (!lofiAudioEngine) return;

    if (isPlaying) {
      if (!isMuted) {
        // First tap while playing mutes/pauses
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
      title={isPlaying ? 'Pause Lo-Fi African Jazz' : 'Play Lo-Fi African Jazz Lounge'}
      className="group flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] hover:bg-white/[0.10] px-2.5 py-1 text-xs font-medium text-white/90 shadow-sm backdrop-blur-xl transition-all active:scale-95"
      aria-label={isPlaying ? 'Pause music' : 'Play music'}
    >
      {/* Animated Equalizer Visualizer */}
      <div className="flex h-3.5 items-end gap-[2px] px-0.5" aria-hidden="true">
        <span
          className={`w-[2.5px] rounded-full bg-gradient-to-t from-recess-purple to-pink-400 transition-all ${
            isPlaying ? 'h-3 animate-pulse' : 'h-1 opacity-40'
          }`}
          style={{ animationDuration: '600ms' }}
        />
        <span
          className={`w-[2.5px] rounded-full bg-gradient-to-t from-pink-400 to-amber-300 transition-all ${
            isPlaying ? 'h-3.5 animate-pulse' : 'h-1.5 opacity-40'
          }`}
          style={{ animationDuration: '450ms', animationDelay: '150ms' }}
        />
        <span
          className={`w-[2.5px] rounded-full bg-gradient-to-t from-amber-300 to-emerald-400 transition-all ${
            isPlaying ? 'h-2 animate-pulse' : 'h-1 opacity-40'
          }`}
          style={{ animationDuration: '700ms', animationDelay: '300ms' }}
        />
        <span
          className={`w-[2.5px] rounded-full bg-gradient-to-t from-emerald-400 to-recess-blue transition-all ${
            isPlaying ? 'h-3.5 animate-pulse' : 'h-2 opacity-40'
          }`}
          style={{ animationDuration: '500ms', animationDelay: '75ms' }}
        />
      </div>

      {/* Track info / status */}
      <div className="flex items-center gap-1.5">
        <span className="hidden text-[11px] font-semibold tracking-wide text-white/90 sm:inline">
          Lo-Fi Jazz
        </span>
        <span
          className={`inline-block h-1.5 w-1.5 rounded-full ${
            isPlaying ? 'bg-emerald-400 shadow-glow-green' : 'bg-white/30'
          }`}
        />
      </div>
    </button>
  );
}
