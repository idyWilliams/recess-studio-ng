'use client';

/**
 * Recess Lo-Fi African Jazz Audio Engine (Web Audio API)
 *
 * Generates an authentic, relaxing instrumental Lo-Fi African Jazz vibe
 * with zero external audio assets or network downloads:
 * - Electric Rhodes 9th/13th African jazz chords
 * - Resonant Kalimba / thumb piano melodic accents
 * - Warm sub-bass foundation
 * - Ambient vinyl dust & tape warmth texture
 * - Relaxed 72 BPM groove
 */

class LoFiEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isRunning = false;
  private timerId: number | null = null;
  private step = 0;
  private vinylNode: AudioNode | null = null;

  // Chord progression: EbMaj9 -> Cm9 -> Fm9 -> Bb13 (frequencies in Hz)
  private readonly chords: readonly number[][] = [
    // EbMaj9: Eb3 (155.56), G3 (196.00), Bb3 (233.08), D4 (293.66), F4 (349.23)
    [155.56, 196.0, 233.08, 293.66, 349.23],
    // Cm9: C3 (130.81), Eb3 (155.56), G3 (196.00), Bb3 (233.08), D4 (293.66)
    [130.81, 155.56, 196.0, 233.08, 293.66],
    // Fm9: F3 (174.61), Ab3 (207.65), C4 (261.63), Eb4 (311.13), G4 (392.00)
    [174.61, 207.65, 261.63, 311.13, 392.0],
    // Bb13: Bb2 (116.54), Ab3 (207.65), C4 (261.63), D4 (293.66), G4 (392.00)
    [116.54, 207.65, 261.63, 293.66, 392.0],
  ];

  // Bass notes corresponding to chords
  private readonly bassNotes: readonly number[] = [77.78, 65.41, 87.31, 58.27]; // Eb2, C2, F2, Bb1

  // Pentatonic Kalimba melody notes: G5, Bb5, C6, Eb6, F6
  private readonly kalimbaNotes: readonly number[] = [783.99, 932.33, 1046.5, 1244.51, 1396.91];

  private getAudioContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtxClass();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.24, this.ctx.currentTime);

      // Warm low-pass filter on master for that vintage tape warmth
      const masterFilter = this.ctx.createBiquadFilter();
      masterFilter.type = 'lowpass';
      masterFilter.frequency.setValueAtTime(3200, this.ctx.currentTime);
      masterFilter.Q.setValueAtTime(0.7, this.ctx.currentTime);

      this.masterGain.connect(masterFilter);
      masterFilter.connect(this.ctx.destination);
    }
    return this.ctx;
  }

  /**
   * Generates a warm vinyl crackle / tape hiss bed
   */
  private startVinylNoise(ctx: AudioContext, destination: AudioNode) {
    if (this.vinylNode) return;

    const bufferSize = ctx.sampleRate * 2;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      // Pink/brown filtered noise with occasional crackle pops
      const white = Math.random() * 2 - 1;
      const isPop = Math.random() < 0.0004;
      output[i] = (white * 0.008) + (isPop ? (Math.random() * 0.08 - 0.04) : 0);
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(1400, ctx.currentTime);
    noiseFilter.Q.setValueAtTime(1.2, ctx.currentTime);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.04, ctx.currentTime);

    whiteNoise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(destination);

    whiteNoise.start();
    this.vinylNode = whiteNoise;
  }

  /**
   * Plays a lush Rhodes chord
   */
  private playRhodesChord(ctx: AudioContext, chord: readonly number[], now: number) {
    const master = this.masterGain;
    if (!master) return;

    chord.forEach((freq, idx) => {
      // Gentle stagger for natural humanized strum feel
      const noteTime = now + idx * 0.024;

      const oscSine = ctx.createOscillator();
      const oscTriangle = ctx.createOscillator();
      const noteGain = ctx.createGain();

      oscSine.type = 'sine';
      oscSine.frequency.setValueAtTime(freq, noteTime);

      // Slight detune for chorus shimmer
      oscTriangle.type = 'triangle';
      oscTriangle.frequency.setValueAtTime(freq, noteTime);
      oscTriangle.detune.setValueAtTime(idx % 2 === 0 ? 4 : -4, noteTime);

      // Low pass to tame triangle harmonics
      const noteFilter = ctx.createBiquadFilter();
      noteFilter.type = 'lowpass';
      noteFilter.frequency.setValueAtTime(1200, noteTime);

      // Envelope: 40ms attack, 2.6s exponential decay
      noteGain.gain.setValueAtTime(0.0001, noteTime);
      noteGain.gain.linearRampToValueAtTime(0.12, noteTime + 0.04);
      noteGain.gain.exponentialRampToValueAtTime(0.001, noteTime + 2.8);

      oscSine.connect(noteFilter);
      oscTriangle.connect(noteFilter);
      noteFilter.connect(noteGain);
      noteGain.connect(master);

      oscSine.start(noteTime);
      oscTriangle.start(noteTime);

      oscSine.stop(noteTime + 3.0);
      oscTriangle.stop(noteTime + 3.0);
    });
  }

  /**
   * Plays a deep sub bass note
   */
  private playSubBass(ctx: AudioContext, freq: number, now: number) {
    const master = this.masterGain;
    if (!master) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 2.6);

    osc.connect(gain);
    gain.connect(master);

    osc.start(now);
    osc.stop(now + 2.8);
  }

  /**
   * Plays an African Kalimba / thumb piano pluck
   */
  private playKalimba(ctx: AudioContext, freq: number, now: number) {
    const master = this.masterGain;
    if (!master) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    // Kalimba tine resonance
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(freq * 1.5, now);
    filter.Q.setValueAtTime(4.0, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.09, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(master);

    osc.start(now);
    osc.stop(now + 0.7);
  }

  /**
   * Soft acoustic rim click / lo-fi percussion
   */
  private playRimClick(ctx: AudioContext, now: number) {
    const master = this.masterGain;
    if (!master) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(420, now);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1800, now);
    filter.Q.setValueAtTime(3.0, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.05, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(master);

    osc.start(now);
    osc.stop(now + 0.1);
  }

  /**
   * Scheduler tick: runs every beat (approx 750ms at 80 BPM)
   */
  private tick = () => {
    if (!this.isRunning || !this.ctx) return;

    const now = this.ctx.currentTime;
    const chordIdx = Math.floor(this.step / 4) % this.chords.length;
    const beatInChord = this.step % 4;

    const chord = this.chords[chordIdx];
    const bassNote = this.bassNotes[chordIdx];

    // Chord & Bass trigger on beat 0
    if (beatInChord === 0 && chord && bassNote !== undefined) {
      this.playRhodesChord(this.ctx, chord, now);
      this.playSubBass(this.ctx, bassNote, now);
    }

    // Soft rim click on beats 1 and 3
    if (beatInChord === 1 || beatInChord === 3) {
      this.playRimClick(this.ctx, now);
    }

    // Kalimba melodic plucks on syncopated sixteenths
    if (beatInChord === 2 || (this.step % 3 === 0 && Math.random() > 0.3)) {
      const randomNote =
        this.kalimbaNotes[Math.floor(Math.random() * this.kalimbaNotes.length)];
      if (randomNote !== undefined) {
        this.playKalimba(this.ctx, randomNote, now + 0.15);
      }
    }

    this.step++;
    // Next beat in 750ms (~80 BPM)
    this.timerId = window.setTimeout(this.tick, 750);
  };

  public async start(): Promise<boolean> {
    try {
      const ctx = this.getAudioContext();
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      if (!this.isRunning && this.masterGain) {
        this.isRunning = true;
        this.startVinylNoise(ctx, this.masterGain);
        this.tick();
      }
      return true;
    } catch {
      return false;
    }
  }

  public pause() {
    this.isRunning = false;
    if (this.timerId !== null) {
      window.clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  public setMuted(muted: boolean) {
    if (!this.masterGain || !this.ctx) return;
    this.masterGain.gain.setValueAtTime(muted ? 0 : 0.24, this.ctx.currentTime);
  }

  public getIsPlaying(): boolean {
    return this.isRunning;
  }
}

// Singleton audio engine instance for the application
export const lofiAudioEngine =
  typeof window !== 'undefined' ? new LoFiEngine() : null;
