// Audio 100 % procédural (WebAudio) : effets sonores et ambiance musicale générative.
import { settings } from './settings';

export type Sfx =
  | 'click' | 'build' | 'coin' | 'sell' | 'reroll' | 'evolve' | 'hit' | 'crit' | 'cast' | 'heal'
  | 'death' | 'victory' | 'defeat' | 'turn' | 'event' | 'horn' | 'error';

type Mood = 'world' | 'arena' | 'title' | 'none';

const PREF_KEY = 'hexaria.muted';

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private sfxBus!: GainNode;
  private musicBus!: GainNode;
  private reverb!: ConvolverNode;
  private noiseBuf!: AudioBuffer;
  private muted = false;
  private mood: Mood = 'none';
  private musicTimer: number | null = null;
  private step = 0;
  private last: Partial<Record<Sfx, number>> = {};

  constructor() {
    try {
      this.muted = localStorage.getItem(PREF_KEY) === '1';
    } catch {
      this.muted = false;
    }
    const unlock = () => {
      this.init();
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
  }

  get isMuted() {
    return this.muted;
  }

  private init() {
    if (this.ctx) return;
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.8;
    this.master.connect(ctx.destination);
    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.value = 0.55 * settings.sfx;
    this.sfxBus.connect(this.master);
    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = 0.32 * settings.music;
    this.musicBus.connect(this.master);
    // Réverbération synthétique (bruit à décroissance exponentielle).
    this.reverb = ctx.createConvolver();
    const len = ctx.sampleRate * 2.8;
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    this.reverb.buffer = ir;
    const wet = ctx.createGain();
    wet.gain.value = 0.35;
    this.reverb.connect(wet);
    wet.connect(this.master);
    this.noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const nd = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    if (this.mood !== 'none') this.startMusic();
  }

  // Appelé quand les volumes des réglages changent.
  applyVolumes() {
    if (!this.ctx) return;
    this.sfxBus.gain.setTargetAtTime(0.55 * settings.sfx, this.ctx.currentTime, 0.03);
    this.musicBus.gain.setTargetAtTime(0.32 * settings.music, this.ctx.currentTime, 0.03);
  }

  private listeners: (() => void)[] = [];

  onMuteChange(cb: () => void) {
    this.listeners.push(cb);
  }

  toggleMute() {
    this.muted = !this.muted;
    queueMicrotask(() => this.listeners.forEach((l) => l()));
    try {
      localStorage.setItem(PREF_KEY, this.muted ? '1' : '0');
    } catch {
      /* rien */
    }
    if (this.ctx) this.master.gain.setTargetAtTime(this.muted ? 0 : 0.8, this.ctx.currentTime, 0.05);
    return this.muted;
  }

  // ——— Briques de synthèse ———
  private tone(freq: number, dur: number, opts: { type?: OscillatorType; vol?: number; at?: number; slide?: number; attack?: number; bus?: AudioNode; rev?: number } = {}) {
    const ctx = this.ctx!;
    const t0 = ctx.currentTime + (opts.at ?? 0);
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = opts.type ?? 'sine';
    o.frequency.setValueAtTime(freq, t0);
    if (opts.slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * opts.slide), t0 + dur);
    const vol = opts.vol ?? 0.3;
    const att = opts.attack ?? 0.005;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + att);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(opts.bus ?? this.sfxBus);
    if (opts.rev) {
      const r = ctx.createGain();
      r.gain.value = opts.rev;
      g.connect(r);
      r.connect(this.reverb);
    }
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }

  private noise(dur: number, opts: { vol?: number; at?: number; freq?: number; q?: number; type?: BiquadFilterType; bus?: AudioNode; sweep?: number } = {}) {
    const ctx = this.ctx!;
    const t0 = ctx.currentTime + (opts.at ?? 0);
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = opts.type ?? 'bandpass';
    f.frequency.setValueAtTime(opts.freq ?? 1200, t0);
    if (opts.sweep) f.frequency.exponentialRampToValueAtTime(opts.sweep, t0 + dur);
    f.Q.value = opts.q ?? 1;
    const g = ctx.createGain();
    g.gain.setValueAtTime(opts.vol ?? 0.3, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f);
    f.connect(g);
    g.connect(opts.bus ?? this.sfxBus);
    src.start(t0, Math.random() * 0.5);
    src.stop(t0 + dur + 0.05);
  }

  play(name: Sfx) {
    if (!this.ctx || this.muted) return;
    const now = performance.now();
    const minGap = name === 'hit' ? 55 : name === 'heal' ? 160 : name === 'crit' || name === 'cast' ? 80 : 20;
    if (now - (this.last[name] ?? 0) < minGap) return;
    this.last[name] = now;
    const n = (semi: number) => 220 * Math.pow(2, semi / 12);
    switch (name) {
      case 'click':
        this.tone(1400, 0.05, { type: 'triangle', vol: 0.08 });
        break;
      case 'error':
        this.tone(180, 0.18, { type: 'square', vol: 0.06, slide: 0.7 });
        break;
      case 'build':
        this.noise(0.08, { freq: 900, vol: 0.4, q: 2 });
        this.tone(140, 0.18, { type: 'triangle', vol: 0.3, slide: 0.6 });
        this.noise(0.08, { freq: 1100, vol: 0.3, q: 2, at: 0.14 });
        this.tone(160, 0.15, { type: 'triangle', vol: 0.22, slide: 0.6, at: 0.14 });
        break;
      case 'coin':
        this.tone(n(19), 0.09, { type: 'square', vol: 0.06 });
        this.tone(n(26), 0.25, { type: 'square', vol: 0.06, at: 0.06, rev: 0.3 });
        break;
      case 'sell':
        this.tone(n(26), 0.08, { type: 'square', vol: 0.05 });
        this.tone(n(19), 0.2, { type: 'square', vol: 0.05, at: 0.06 });
        break;
      case 'reroll':
        for (let i = 0; i < 4; i++) this.tone(n(12 + i * 4), 0.08, { type: 'triangle', vol: 0.09, at: i * 0.035 });
        this.noise(0.2, { freq: 3000, vol: 0.08, sweep: 800 });
        break;
      case 'evolve':
        [0, 4, 7, 12, 16, 19, 24].forEach((s, i) => this.tone(n(12 + s), 0.5, { type: 'triangle', vol: 0.12, at: i * 0.06, rev: 0.6 }));
        this.noise(0.8, { freq: 6000, vol: 0.06, type: 'highpass', at: 0.2 });
        break;
      case 'hit':
        this.noise(0.07, { freq: 700 + Math.random() * 600, vol: 0.22, q: 1.5 });
        this.tone(110 + Math.random() * 40, 0.09, { type: 'sine', vol: 0.18, slide: 0.5 });
        break;
      case 'crit':
        this.noise(0.12, { freq: 1800, vol: 0.3, q: 2 });
        this.tone(320, 0.16, { type: 'sawtooth', vol: 0.08, slide: 0.4 });
        break;
      case 'cast':
        this.noise(0.45, { freq: 400, vol: 0.18, sweep: 4000, q: 3 });
        this.tone(n(7), 0.4, { type: 'sine', vol: 0.08, slide: 2, rev: 0.5 });
        break;
      case 'heal':
        this.tone(n(24), 0.3, { type: 'sine', vol: 0.06, rev: 0.6 });
        this.tone(n(31), 0.3, { type: 'sine', vol: 0.05, at: 0.05, rev: 0.6 });
        break;
      case 'death':
        this.tone(200, 0.5, { type: 'sawtooth', vol: 0.08, slide: 0.25 });
        this.noise(0.4, { freq: 500, vol: 0.18, sweep: 120 });
        break;
      case 'horn':
        this.tone(n(-5), 0.9, { type: 'sawtooth', vol: 0.07, attack: 0.08, rev: 0.6 });
        this.tone(n(2), 0.9, { type: 'sawtooth', vol: 0.05, attack: 0.08, rev: 0.6 });
        this.noise(0.3, { freq: 120, vol: 0.4, type: 'lowpass' });
        break;
      case 'victory':
        [0, 4, 7, 12].forEach((s, i) => this.tone(n(12 + s), 0.4, { type: 'square', vol: 0.06, at: i * 0.13, rev: 0.5 }));
        [12, 16, 19, 24].forEach((s) => this.tone(n(12 + s), 1.4, { type: 'triangle', vol: 0.07, at: 0.6, rev: 0.7 }));
        break;
      case 'defeat':
        [7, 6, 5, 0].forEach((s, i) => this.tone(n(s), 0.5, { type: 'triangle', vol: 0.09, at: i * 0.22, rev: 0.6 }));
        break;
      case 'turn':
        this.tone(n(7), 0.25, { type: 'triangle', vol: 0.07, rev: 0.4 });
        this.tone(n(12), 0.35, { type: 'triangle', vol: 0.06, at: 0.08, rev: 0.4 });
        break;
      case 'event':
        [0, 3, 7, 10].forEach((s, i) => this.tone(n(s + 12), 1.2, { type: 'sine', vol: 0.06, at: i * 0.09, rev: 0.8 }));
        break;
    }
  }

  // ——— Musique générative ———
  setMood(m: Mood) {
    if (m === this.mood) return;
    this.mood = m;
    this.stopMusic();
    if (this.ctx && m !== 'none') this.startMusic();
  }

  private stopMusic() {
    if (this.musicTimer !== null) clearInterval(this.musicTimer);
    this.musicTimer = null;
  }

  private startMusic() {
    this.stopMusic();
    const arena = this.mood === 'arena';
    const beat = arena ? 0.32 : 0.55;
    this.step = 0;
    this.musicTimer = window.setInterval(() => this.musicStep(arena), beat * 1000);
  }

  private musicStep(arena: boolean) {
    if (!this.ctx || this.muted) {
      this.step++;
      return;
    }
    // Ré dorien sombre : Dm – C – Bb – C
    const chords = [[2, 5, 9], [0, 4, 7], [-2, 2, 5], [0, 4, 7]];
    const scale = [2, 4, 5, 7, 9, 11, 12, 14, 17];
    const bar = Math.floor(this.step / 8) % chords.length;
    const chord = chords[bar];
    const f = (semi: number, oct = 0) => 146.83 * Math.pow(2, (semi - 2) / 12 + oct);
    const bus = this.musicBus;
    if (this.step % 8 === 0) {
      for (const s of chord) this.tone(f(s, -1), (arena ? 2.6 : 4.4), { type: 'triangle', vol: 0.05, attack: 0.6, bus, rev: 0.6 });
      this.tone(f(chord[0], -2), arena ? 2.6 : 4.4, { type: 'sine', vol: 0.09, attack: 0.3, bus });
    }
    if (arena) {
      if (this.step % 4 === 0) this.noise(0.25, { freq: 90, vol: 0.5, type: 'lowpass', bus });
      if (this.step % 4 === 2) this.noise(0.12, { freq: 1600, vol: 0.12, q: 0.8, bus });
      if (this.step % 2 === 1 && Math.random() < 0.7) this.tone(f(scale[Math.floor(Math.random() * scale.length)], 1), 0.25, { type: 'square', vol: 0.025, bus, rev: 0.3 });
    } else if (Math.random() < 0.55) {
      const s = scale[Math.floor(Math.random() * scale.length)];
      this.tone(f(s, 1), 1.8, { type: 'sine', vol: 0.045, bus, rev: 0.9 });
      if (Math.random() < 0.3) this.tone(f(s + 7, 1), 1.6, { type: 'sine', vol: 0.025, at: 0.2, bus, rev: 0.9 });
    }
    this.step++;
  }
}

export const audio = new AudioEngine();
