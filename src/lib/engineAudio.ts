/**
 * CARVERSE demo engine-sound synthesizer.
 *
 * ⚠️ Placeholder audio: procedurally generated with the Web Audio API to
 * approximate engine character. Replace `engineSound` assets in the vehicle
 * database with real licensed recordings and route them through `playSample()`
 * for authentic audio. Demo output is clearly labelled in the UI.
 */

type Character = 'flat' | 'smooth' | 'growl' | 'scream' | 'buzz' | 'silence';

interface CharProfile {
  harmonics: number[]; // harmonic multipliers
  detune: number; // pitch wobble depth (Hz)
  noise: number; // intake/exhaust noise level
  rough: number; // LFO graininess
}

const CHAR: Record<Character, CharProfile> = {
  flat: { harmonics: [1, 2, 3], detune: 1.2, noise: 0.08, rough: 8 },
  smooth: { harmonics: [1, 2, 3, 4], detune: 1.5, noise: 0.1, rough: 10 },
  growl: { harmonics: [0.5, 1, 2, 3, 4.5], detune: 3, noise: 0.16, rough: 16 },
  scream: { harmonics: [1, 2, 3, 4, 5, 6], detune: 2, noise: 0.12, rough: 12 },
  buzz: { harmonics: [1, 2, 3, 4, 5], detune: 4, noise: 0.2, rough: 22 },
  silence: { harmonics: [1], detune: 0.4, noise: 0.02, rough: 4 },
};

class EngineSynth {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private oscillators: OscillatorNode[] = [];
  private oscGains: GainNode[] = [];
  private noiseSrc: AudioBufferSourceNode | null = null;
  private noiseFilter: BiquadFilterNode | null = null;
  private lfo: OscillatorNode | null = null;
  private lfoGain: GainNode | null = null;
  private profile: CharProfile = CHAR.smooth;
  private baseFreq = 60;

  playing = false;
  private rpmNorm = 0; // 0..1
  private rpmTarget = 0;
  private raf = 0;

  /** Current normalized rpm (0..1) for visual reactions. */
  get rpm(): number {
    return this.rpmNorm;
  }

  private ensureCtx(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  /** Start the engine for a vehicle profile. */
  start(profile: { base: number; character: Character; electric: boolean }, volume = 0.5) {
    const ctx = this.ensureCtx();
    if (!ctx || !this.master) return;
    this.stopNodes();

    this.profile = CHAR[profile.character] ?? CHAR.smooth;
    this.baseFreq = profile.electric ? profile.base * 2 : profile.base;

    // harmonic oscillators
    this.oscillators = [];
    this.oscGains = [];
    for (let i = 0; i < this.profile.harmonics.length; i++) {
      const mult = this.profile.harmonics[i];
      const osc = ctx.createOscillator();
      osc.type = mult < 1 ? 'sawtooth' : i % 2 === 0 ? 'sawtooth' : 'square';
      osc.frequency.value = this.baseFreq * mult;
      const g = ctx.createGain();
      g.gain.value = 1 / (i + 1.5);
      osc.connect(g);
      g.connect(this.master);
      osc.start();
      this.oscillators.push(osc);
      this.oscGains.push(g);
    }

    // noise (intake/exhaust texture)
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; this.profile.noise > 0.03 && i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = this.baseFreq * 8;
    filter.Q.value = 0.8;
    const ng = ctx.createGain();
    ng.gain.value = this.profile.noise * 0.5;
    noise.connect(filter);
    filter.connect(ng);
    ng.connect(this.master);
    noise.start();
    this.noiseSrc = noise;
    this.noiseFilter = filter;

    // roughness LFO -> master gain wobble
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = this.profile.rough;
    const lg = ctx.createGain();
    lg.gain.value = 0.08;
    lfo.connect(lg);
    lg.connect(this.master.gain);
    lfo.start();
    this.lfo = lfo;
    this.lfoGain = lg;

    this.playing = true;
    this.setVolume(volume);
    this.rpmNorm = 0.18;
    this.rpmTarget = 0.18;
    this.tick();
  }

  /** Set normalized rpm 0..1 (idle ~0.15, redline 1). */
  setRpm(norm: number) {
    this.rpmTarget = Math.max(0.05, Math.min(1, norm));
  }

  setVolume(v: number) {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    const t = ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setTargetAtTime(Math.max(0, Math.min(1, v)) * 0.22, t, 0.08);
  }

  /** Audible kick when the starter fires. */
  blip() {
    const ctx = this.ensureCtx();
    if (!ctx || !this.master) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(30, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.4);
    g.gain.setValueAtTime(0.5, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.55);
  }

  private tick = () => {
    if (!this.playing) return;
    this.rpmNorm += (this.rpmTarget - this.rpmNorm) * 0.12;
    const f = this.baseFreq * (0.55 + this.rpmNorm * 2.1);
    const ctx = this.ctx;
    if (ctx) {
      const t = ctx.currentTime;
      this.oscillators.forEach((osc, i) => {
        const mult = this.profile.harmonics[i];
        osc.frequency.setTargetAtTime(f * mult, t, 0.03);
      });
      if (this.noiseFilter) {
        this.noiseFilter.frequency.setTargetAtTime(f * 6 * (1 + this.rpmNorm), t, 0.05);
      }
    }
    this.raf = requestAnimationFrame(this.tick);
  };

  /** Stop everything. */
  stop() {
    this.playing = false;
    cancelAnimationFrame(this.raf);
    if (this.ctx && this.master) {
      const t = this.ctx.currentTime;
      this.master.gain.setTargetAtTime(0, t, 0.1);
    }
    window.setTimeout(() => this.stopNodes(), 400);
  }

  private stopNodes() {
    this.oscillators.forEach((o) => {
      try { o.stop(); } catch { /* already stopped */ }
    });
    this.oscillators = [];
    this.oscGains = [];
    try { this.noiseSrc?.stop(); } catch { /* noop */ }
    this.noiseSrc = null;
    try { this.lfo?.stop(); } catch { /* noop */ }
    this.lfo = null;
    this.lfoGain = null;
  }
}

export const engineSynth = new EngineSynth();
