/**
 * Low-level Web Audio engine: lazily created AudioContext, master chain,
 * reverb sends, voice management (auto cleanup + voice cap), a lookahead
 * scheduler (Ticker) and a few reusable instruments.
 *
 * Signal flow:
 *   voice → (pan) → bus.input ─────────────→ bus.vol ─┐
 *                └→ revSend → bus.send → convolver ─┘  │
 *   sfx.vol ────────────────────────────────────────────→ comp → limiter → master(mute) → out
 *   music.vol → duck ───────────────────────────────────→
 *
 * Everything is a no-op when AudioContext is unavailable (SSR / tests).
 */

export type BusName = 'sfx' | 'music';

/** where a voice sends its dry / reverb signal */
export interface Route {
  dry: AudioNode;
  wet: AudioNode;
}

export interface Engine {
  ctx: AudioContext;
  master: GainNode;
  sfx: { vol: GainNode; route: Route };
  music: { vol: GainNode; duck: GainNode; route: Route };
  noise: AudioBuffer;
}

const MASTER_LEVEL = 0.9;

let engine: Engine | null = null;
let unavailable = false;
let unlocked = false;
let suspendedByMute = false;

const state = { muted: false, sfxVolume: 0.8, musicVolume: 0.6 };

// ───────────────────────────────────────────────────────── utils

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
export const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);
export const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
/** perceptual volume curve */
const curve = (v: number) => {
  const c = clamp(v, 0, 1);
  return c * c;
};

const NOTE_OFFSETS: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const noteCache = new Map<string, number>();
/** 'C5' / 'F#4' / 'Bb3' → Hz */
export function N(name: string): number {
  const hit = noteCache.get(name);
  if (hit !== undefined) return hit;
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(name);
  if (!m) return 440;
  const midi = NOTE_OFFSETS[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (Number(m[3]) + 1) * 12;
  const f = mtof(midi);
  noteCache.set(name, f);
  return f;
}

// ───────────────────────────────────────────────────────── engine

function getCtor(): (new (opts?: AudioContextOptions) => AudioContext) | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    AudioContext?: new (opts?: AudioContextOptions) => AudioContext;
    webkitAudioContext?: new (opts?: AudioContextOptions) => AudioContext;
  };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

function makeNoise(ctx: AudioContext): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * 2);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

/** generated stereo impulse: pre-delay + exponentially decaying, darkening noise */
function makeImpulse(ctx: AudioContext, seconds: number, decay: number): AudioBuffer {
  const rate = ctx.sampleRate;
  const len = Math.floor(rate * seconds);
  const pre = Math.floor(rate * 0.015);
  const buf = ctx.createBuffer(2, len, rate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let lp = 0;
    for (let i = 0; i < len; i++) {
      if (i < pre) {
        d[i] = 0;
        continue;
      }
      const x = (i - pre) / (len - pre);
      const env = Math.pow(1 - x, decay);
      const fadeIn = Math.min(1, (i - pre) / (rate * 0.004));
      // one-pole lowpass that gets darker over time (air absorption)
      const k = 0.08 + 0.85 * x;
      lp += (Math.random() * 2 - 1 - lp) * (1 - k);
      d[i] = lp * env * fadeIn * 0.6;
    }
  }
  return buf;
}

function build(): Engine | null {
  if (engine) return engine;
  if (unavailable) return null;
  const Ctor = getCtor();
  if (!Ctor) {
    unavailable = true;
    return null;
  }
  try {
    const ctx = new Ctor({ latencyHint: 'interactive' });
    const gain = (v: number) => {
      const g = ctx.createGain();
      g.gain.value = v;
      return g;
    };

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.knee.value = 10;
    comp.ratio.value = 3.5;
    comp.attack.value = 0.004;
    comp.release.value = 0.2;

    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -2;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.001;
    limiter.release.value = 0.12;

    const master = gain(state.muted ? 0 : MASTER_LEVEL);
    comp.connect(limiter);
    limiter.connect(master);
    master.connect(ctx.destination);

    const impulse = makeImpulse(ctx, 2.6, 3.4);

    const sfxVol = gain(curve(state.sfxVolume));
    const sfxIn = gain(1);
    const sfxSend = gain(1);
    const sfxVerb = ctx.createConvolver();
    sfxVerb.buffer = impulse;
    sfxIn.connect(sfxVol);
    sfxSend.connect(sfxVerb);
    sfxVerb.connect(sfxVol);
    sfxVol.connect(comp);

    const musicVol = gain(curve(state.musicVolume));
    const duck = gain(1);
    const musicIn = gain(1);
    const musicSend = gain(1);
    const musicVerb = ctx.createConvolver();
    musicVerb.buffer = impulse;
    musicIn.connect(musicVol);
    musicSend.connect(musicVerb);
    musicVerb.connect(musicVol);
    musicVol.connect(duck);
    duck.connect(comp);

    engine = {
      ctx,
      master,
      sfx: { vol: sfxVol, route: { dry: sfxIn, wet: sfxSend } },
      music: { vol: musicVol, duck, route: { dry: musicIn, wet: musicSend } },
      noise: makeNoise(ctx),
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden && unlocked && !state.muted && ctx.state !== 'running') {
          void ctx.resume().catch(() => undefined);
        }
      });
    }
    return engine;
  } catch {
    unavailable = true;
    return null;
  }
}

/**
 * Create (if needed) and resume the context. Must be called from a user
 * gesture at least once (iOS / Chrome autoplay policy). Idempotent.
 */
export function unlockAudio(): Engine | null {
  const e = build();
  if (!e) return null;
  const { ctx } = e;
  if (!unlocked) {
    // iOS: playing a buffer inside the gesture unlocks output
    try {
      const src = ctx.createBufferSource();
      src.buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
      src.connect(ctx.destination);
      src.start(0);
      src.onended = () => src.disconnect();
    } catch {
      /* ignore */
    }
  }
  unlocked = true;
  if (ctx.state !== 'running') {
    const p = ctx.resume();
    if (state.muted) {
      void p.then(() => {
        if (state.muted) {
          suspendedByMute = true;
          void ctx.suspend().catch(() => undefined);
        }
      }, () => undefined);
    } else {
      void p.catch(() => undefined);
    }
  }
  return e;
}

/** engine if it exists (does not create one) */
export function getEngine(): Engine | null {
  return engine;
}

/** engine only if sounds can actually be heard right now */
export function live(): Engine | null {
  const e = engine;
  if (!e || state.muted || e.ctx.state !== 'running') return null;
  return e;
}

export function isRunning(): boolean {
  return !!engine && engine.ctx.state === 'running';
}

export function now(e: Engine, dt = 0): number {
  return e.ctx.currentTime + 0.008 + dt;
}

// ───────────────────────────────────────────────────────── settings

export function setMasterMuted(muted: boolean): void {
  state.muted = muted;
  const e = engine;
  if (!e) return;
  const t = e.ctx.currentTime;
  e.master.gain.cancelScheduledValues(t);
  e.master.gain.setTargetAtTime(muted ? 0 : MASTER_LEVEL, t, 0.03);
  if (muted) {
    // suspend after the fade so the audio thread is idle while muted
    setTimeout(() => {
      if (state.muted && e.ctx.state === 'running') {
        suspendedByMute = true;
        void e.ctx.suspend().catch(() => undefined);
      }
    }, 200);
  } else if (unlocked && (suspendedByMute || e.ctx.state !== 'running')) {
    suspendedByMute = false;
    void e.ctx.resume().catch(() => undefined);
  }
}

export function getMasterMuted(): boolean {
  return state.muted;
}

export function setBusVolume(bus: BusName, v: number): void {
  if (bus === 'sfx') state.sfxVolume = clamp(v, 0, 1);
  else state.musicVolume = clamp(v, 0, 1);
  const e = engine;
  if (!e) return;
  const node = bus === 'sfx' ? e.sfx.vol : e.music.vol;
  node.gain.setTargetAtTime(curve(bus === 'sfx' ? state.sfxVolume : state.musicVolume), e.ctx.currentTime, 0.05);
}

let duckTimer: ReturnType<typeof setTimeout> | null = null;
/** lower the music for `holdSec`, then restore (later calls override) */
export function duckMusic(level: number, holdSec: number, attack = 0.08): void {
  const e = engine;
  if (!e) return;
  const g = e.music.duck.gain;
  const t = e.ctx.currentTime;
  g.cancelScheduledValues(t);
  g.setTargetAtTime(clamp(level, 0, 1), t, attack / 3);
  if (duckTimer) clearTimeout(duckTimer);
  duckTimer = setTimeout(() => {
    duckTimer = null;
    const tt = e.ctx.currentTime;
    g.cancelScheduledValues(tt);
    g.setTargetAtTime(1, tt, 0.4);
  }, holdSec * 1000);
}

// ───────────────────────────────────────────────────────── envelopes

const EPS = 0.0001;

/** exponential attack → exponential decay. returns end time */
export function perc(p: AudioParam, t: number, peak: number, attack: number, decay: number): number {
  p.setValueAtTime(EPS, t);
  p.exponentialRampToValueAtTime(Math.max(peak, EPS * 2), t + Math.max(attack, 0.001));
  p.exponentialRampToValueAtTime(EPS, t + attack + decay);
  return t + attack + decay;
}

/** attack → hold at peak*sustain → release. returns end time */
export function adsr(
  p: AudioParam,
  t: number,
  peak: number,
  a: number,
  d: number,
  sustain: number,
  hold: number,
  r: number,
): number {
  const pk = Math.max(peak, EPS * 2);
  const s = Math.max(pk * sustain, EPS * 2);
  p.setValueAtTime(EPS, t);
  p.exponentialRampToValueAtTime(pk, t + a);
  p.exponentialRampToValueAtTime(s, t + a + d);
  p.setValueAtTime(s, t + a + d + hold);
  p.exponentialRampToValueAtTime(EPS, t + a + d + hold + r);
  return t + a + d + hold + r;
}

// ───────────────────────────────────────────────────────── voices

export interface VoiceOpts {
  bus?: BusName;
  /** custom destination (music layers); defaults to the bus route */
  route?: Route;
  gain?: number;
  pan?: number;
  /** reverb send amount 0..1 */
  rev?: number;
  /** long-lived loop: excluded from voice stealing, caller must kill() */
  persistent?: boolean;
}

// generous: fanfares pre-schedule many future voices; the cap only guards against runaway buildup
const VOICE_CAP: Record<BusName, number> = { sfx: 110, music: 32 };
const voices: Record<BusName, Voice[]> = { sfx: [], music: [] };

/**
 * A short-lived group of nodes. Build the sound into `out`, then call
 * `end(t)`; every node is stopped + disconnected after t.
 */
export class Voice {
  readonly ctx: AudioContext;
  readonly out: GainNode;
  private readonly e: Engine;
  private readonly bus: BusName;
  private readonly persistent: boolean;
  private nodes: AudioNode[] = [];
  private srcs: AudioScheduledSourceNode[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;
  private dead = false;

  constructor(e: Engine, o: VoiceOpts = {}) {
    this.e = e;
    this.ctx = e.ctx;
    this.bus = o.bus ?? 'sfx';
    this.persistent = !!o.persistent;
    const route = o.route ?? (this.bus === 'music' ? e.music.route : e.sfx.route);
    this.out = this.gain(o.gain ?? 1);
    let tail: AudioNode = this.out;
    if (o.pan && typeof e.ctx.createStereoPanner === 'function') {
      const p = this.add(e.ctx.createStereoPanner());
      p.pan.value = clamp(o.pan, -1, 1);
      tail.connect(p);
      tail = p;
    }
    tail.connect(route.dry);
    if (o.rev && o.rev > 0) {
      const s = this.gain(o.rev);
      tail.connect(s);
      s.connect(route.wet);
    }
    if (!this.persistent) {
      const list = voices[this.bus];
      while (list.length >= VOICE_CAP[this.bus]) list[0].kill(0.025);
      list.push(this);
    }
  }

  add<T extends AudioNode>(n: T): T {
    this.nodes.push(n);
    return n;
  }

  gain(v = 1): GainNode {
    const g = this.add(this.ctx.createGain());
    g.gain.value = v;
    return g;
  }

  filter(type: BiquadFilterType, freq: number, q = 0.707): BiquadFilterNode {
    const f = this.add(this.ctx.createBiquadFilter());
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    return f;
  }

  osc(type: OscillatorType, freq: number, t0: number, t1?: number, detune = 0): OscillatorNode {
    const o = this.add(this.ctx.createOscillator());
    o.type = type;
    o.frequency.value = freq;
    o.detune.value = detune;
    o.start(t0);
    if (t1 !== undefined) o.stop(t1);
    this.srcs.push(o);
    return o;
  }

  noise(t0: number, t1?: number, rate = 1): AudioBufferSourceNode {
    const s = this.add(this.ctx.createBufferSource());
    s.buffer = this.e.noise;
    s.loop = true;
    s.playbackRate.value = rate;
    s.start(t0, Math.random() * 1.5);
    if (t1 !== undefined) s.stop(t1);
    this.srcs.push(s);
    return s;
  }

  /** schedule cleanup after time t (context time) */
  end(t: number): void {
    if (this.dead) return;
    if (this.timer) clearTimeout(this.timer);
    const ms = Math.max(0, t - this.ctx.currentTime) * 1000 + 250;
    this.timer = setTimeout(() => this.dispose(), ms);
  }

  /** fade out quickly and dispose */
  kill(fade = 0.05): void {
    if (this.dead) return;
    const t = this.ctx.currentTime;
    const g = this.out.gain;
    try {
      g.cancelScheduledValues(t);
      g.setValueAtTime(g.value, t);
      g.linearRampToValueAtTime(0, t + fade);
      this.srcs.forEach((s) => {
        try {
          s.stop(t + fade + 0.02);
        } catch {
          /* already stopped */
        }
      });
    } catch {
      /* ignore */
    }
    this.unlist();
    this.end(t + fade + 0.05);
  }

  private unlist(): void {
    if (this.persistent) return;
    const list = voices[this.bus];
    const i = list.indexOf(this);
    if (i >= 0) list.splice(i, 1);
  }

  private dispose(): void {
    if (this.dead) return;
    this.dead = true;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.srcs.forEach((s) => {
      try {
        s.stop();
      } catch {
        /* already stopped */
      }
    });
    this.nodes.forEach((n) => {
      try {
        n.disconnect();
      } catch {
        /* ignore */
      }
    });
    this.nodes = [];
    this.srcs = [];
    this.unlist();
  }
}

/** kill every non-persistent voice on a bus (e.g. on detach) */
export function killAllVoices(bus: BusName, fade = 0.1): void {
  [...voices[bus]].forEach((v) => v.kill(fade));
}

// ───────────────────────────────────────────────────────── scheduler

/**
 * Lookahead scheduler: setInterval wakes up every 25ms and schedules every
 * event that falls inside the lookahead window on the audio clock.
 * Paused (cheap) while muted / suspended; never bursts after a throttled tab.
 */
export class Ticker {
  private id: ReturnType<typeof setInterval> | null = null;
  private next = 0;
  private i = 0;

  constructor(
    private readonly interval: (i: number) => number,
    private readonly cb: (time: number, i: number) => void,
    private readonly lookahead = 0.12,
  ) {}

  start(delay = 0): this {
    const e = engine;
    if (!e || this.id !== null) return this;
    this.next = e.ctx.currentTime + 0.02 + delay;
    this.i = 0;
    this.id = setInterval(() => this.tick(), 25);
    this.tick();
    return this;
  }

  stop(): void {
    if (this.id !== null) clearInterval(this.id);
    this.id = null;
  }

  get running(): boolean {
    return this.id !== null;
  }

  private tick(): void {
    const e = engine;
    if (!e) return this.stop();
    const t = e.ctx.currentTime;
    if (state.muted || e.ctx.state !== 'running') {
      this.next = Math.max(this.next, t + 0.05);
      return;
    }
    if (this.next < t - 0.15) this.next = t + 0.02; // woke up late: skip, don't burst
    const hidden = typeof document !== 'undefined' && document.hidden;
    const la = hidden ? 1.1 : this.lookahead;
    let guard = 0;
    while (this.next < t + la && guard++ < 64) {
      try {
        this.cb(this.next, this.i);
      } catch (err) {
        console.error('[audio] ticker callback failed', err);
      }
      this.next += Math.max(0.008, this.interval(this.i));
      this.i++;
    }
  }
}

// ───────────────────────────────────────────────────────── instruments

interface Common {
  t?: number;
  gain?: number;
  pan?: number;
  rev?: number;
  bus?: BusName;
  route?: Route;
}

export interface ToneOpts extends Common {
  freq: number;
  type?: OscillatorType;
  /** decay time after attack */
  dur?: number;
  a?: number;
  detune?: number;
  glideTo?: number;
  glideTime?: number;
  /** optional lowpass with sweep */
  lp?: number;
  lpTo?: number;
  q?: number;
  /** sustain-style: hold at peak for `hold` seconds, then release `dur` */
  hold?: number;
  vibrato?: { rate: number; depth: number };
}

export function tone(e: Engine, o: ToneOpts): number {
  const t = o.t ?? now(e);
  const a = o.a ?? 0.004;
  const dur = o.dur ?? 0.3;
  const v = new Voice(e, { pan: o.pan, rev: o.rev, bus: o.bus, route: o.route });
  const hold = o.hold ?? 0;
  const tEnd = t + a + hold + dur;
  const osc = v.osc(o.type ?? 'sine', o.freq, t, tEnd + 0.03, o.detune ?? 0);
  if (o.glideTo) {
    osc.frequency.setValueAtTime(o.freq, t);
    osc.frequency.exponentialRampToValueAtTime(o.glideTo, t + (o.glideTime ?? a + hold + dur));
  }
  if (o.vibrato) {
    const lfo = v.osc('sine', o.vibrato.rate, t, tEnd + 0.03);
    const lg = v.gain(o.vibrato.depth);
    lfo.connect(lg);
    lg.connect(osc.detune);
  }
  const env = v.gain(0);
  let head: AudioNode = osc;
  if (o.lp) {
    const f = v.filter('lowpass', o.lp, o.q ?? 0.8);
    if (o.lpTo) {
      f.frequency.setValueAtTime(o.lp, t);
      f.frequency.exponentialRampToValueAtTime(o.lpTo, tEnd);
    }
    osc.connect(f);
    head = f;
  }
  head.connect(env);
  env.connect(v.out);
  if (hold > 0) adsr(env.gain, t, o.gain ?? 0.2, a, 0.001, 1, hold, dur);
  else perc(env.gain, t, o.gain ?? 0.2, a, dur);
  v.end(tEnd);
  return tEnd;
}

export interface BellOpts extends Common {
  freq: number;
  dur?: number;
  /** modulator ratio – 3.5 = glassy bell, 1.4 = soft metal, 2 = warm */
  ratio?: number;
  /** modulation index at strike */
  index?: number;
  a?: number;
  /** extra octave partial level (sparkle) */
  shimmer?: number;
}

/** 2-op FM bell / chime */
export function bell(e: Engine, o: BellOpts): number {
  const t = o.t ?? now(e);
  const dur = o.dur ?? 0.8;
  const a = o.a ?? 0.002;
  const ratio = o.ratio ?? 3.5;
  const index = o.index ?? 2.2;
  const v = new Voice(e, { pan: o.pan, rev: o.rev, bus: o.bus, route: o.route });
  const tEnd = t + a + dur;
  const car = v.osc('sine', o.freq, t, tEnd + 0.03);
  const mod = v.osc('sine', o.freq * ratio, t, tEnd + 0.03);
  const mg = v.gain(0);
  mg.gain.setValueAtTime(o.freq * index, t);
  mg.gain.exponentialRampToValueAtTime(Math.max(1, o.freq * index * 0.04), t + dur * 0.5);
  mod.connect(mg);
  mg.connect(car.frequency);
  const env = v.gain(0);
  car.connect(env);
  env.connect(v.out);
  perc(env.gain, t, o.gain ?? 0.15, a, dur);
  if (o.shimmer) {
    const s = v.osc('sine', o.freq * 2.002, t, tEnd + 0.03);
    const sg = v.gain(0);
    s.connect(sg);
    sg.connect(v.out);
    perc(sg.gain, t, (o.gain ?? 0.15) * o.shimmer, a, dur * 0.45);
  }
  v.end(tEnd);
  return tEnd;
}

export interface PartialsOpts extends Common {
  freq: number;
  /** [ratio, relative gain, decay seconds] */
  parts: Array<[number, number, number]>;
  click?: number;
}

/** additive inharmonic partials – coins, metal, register bells */
export function partials(e: Engine, o: PartialsOpts): number {
  const t = o.t ?? now(e);
  const v = new Voice(e, { pan: o.pan, rev: o.rev, bus: o.bus, route: o.route });
  let tEnd = t;
  const g = o.gain ?? 0.15;
  for (const [ratio, rel, decay] of o.parts) {
    const f = o.freq * ratio;
    if (f > 18000) continue;
    const osc = v.osc('sine', f, t, t + decay + 0.03);
    const env = v.gain(0);
    osc.connect(env);
    env.connect(v.out);
    perc(env.gain, t, g * rel, 0.001, decay);
    tEnd = Math.max(tEnd, t + decay);
  }
  if (o.click) {
    const n = v.noise(t, t + 0.03);
    const hp = v.filter('highpass', 6000, 0.7);
    const ng = v.gain(0);
    n.connect(hp);
    hp.connect(ng);
    ng.connect(v.out);
    perc(ng.gain, t, o.click, 0.001, 0.015);
  }
  v.end(tEnd);
  return tEnd;
}

export interface NoiseOpts extends Common {
  dur: number;
  a?: number;
  type?: BiquadFilterType;
  freq: number;
  freqTo?: number;
  q?: number;
  rate?: number;
}

/** filtered noise burst / swell / sweep */
export function noiseHit(e: Engine, o: NoiseOpts): number {
  const t = o.t ?? now(e);
  const a = o.a ?? 0.002;
  const v = new Voice(e, { pan: o.pan, rev: o.rev, bus: o.bus, route: o.route });
  const tEnd = t + a + o.dur;
  const n = v.noise(t, tEnd + 0.03, o.rate ?? 1);
  const f = v.filter(o.type ?? 'bandpass', o.freq, o.q ?? 1);
  if (o.freqTo) {
    f.frequency.setValueAtTime(o.freq, t);
    f.frequency.exponentialRampToValueAtTime(o.freqTo, tEnd);
  }
  const env = v.gain(0);
  n.connect(f);
  f.connect(env);
  env.connect(v.out);
  perc(env.gain, t, o.gain ?? 0.1, a, o.dur);
  v.end(tEnd);
  return tEnd;
}

/** whoosh: band-passed noise swelling while sweeping */
export function whoosh(e: Engine, o: Common & { dur: number; from: number; to: number; q?: number; peakAt?: number }): number {
  return noiseHit(e, {
    ...o,
    a: o.dur * (o.peakAt ?? 0.6),
    dur: o.dur * (1 - (o.peakAt ?? 0.6)),
    type: 'bandpass',
    freq: o.from,
    freqTo: o.to,
    q: o.q ?? 1.4,
  });
}

/** pitched drum: kick / timpani / heartbeat / impact body */
export function boom(e: Engine, o: Common & { freq?: number; dur?: number; drop?: number; body?: number }): number {
  const t = o.t ?? now(e);
  const f = o.freq ?? 55;
  const dur = o.dur ?? 0.6;
  const v = new Voice(e, { pan: o.pan, rev: o.rev, bus: o.bus, route: o.route });
  const tEnd = t + dur;
  const osc = v.osc('sine', f * (o.drop ?? 3), t, tEnd + 0.03);
  osc.frequency.setValueAtTime(f * (o.drop ?? 3), t);
  osc.frequency.exponentialRampToValueAtTime(f, t + 0.07);
  osc.frequency.exponentialRampToValueAtTime(f * 0.85, tEnd);
  const env = v.gain(0);
  osc.connect(env);
  env.connect(v.out);
  perc(env.gain, t, o.gain ?? 0.4, 0.003, dur);
  // skin / mallet noise
  const body = o.body ?? 0.5;
  if (body > 0) {
    const n = v.noise(t, t + 0.25);
    const lp = v.filter('lowpass', 900, 0.8);
    const ng = v.gain(0);
    n.connect(lp);
    lp.connect(ng);
    ng.connect(v.out);
    perc(ng.gain, t, (o.gain ?? 0.4) * body * 0.6, 0.002, 0.18);
  }
  v.end(tEnd);
  return tEnd;
}

const CYMBAL_RATIOS = [2, 3, 4.16, 5.43, 6.79, 8.21];
/** crash cymbal; `swell` > 0 makes a reverse-style crescendo first */
export function cymbal(e: Engine, o: Common & { dur?: number; swell?: number }): number {
  const t = o.t ?? now(e);
  const dur = o.dur ?? 1.8;
  const a = o.swell ?? 0.002;
  const v = new Voice(e, { pan: o.pan, rev: o.rev ?? 0.4, bus: o.bus, route: o.route });
  const tEnd = t + a + dur;
  const hp = v.filter('highpass', 6500, 0.6);
  const bp = v.filter('peaking', 9500, 1);
  bp.gain.value = 5;
  const metal = v.gain(0.12);
  for (const r of CYMBAL_RATIOS) {
    const osc = v.osc('square', 205 * r, t, tEnd + 0.03);
    osc.connect(metal);
  }
  metal.connect(hp);
  const n = v.noise(t, tEnd + 0.03);
  const ng = v.gain(0.9);
  n.connect(ng);
  ng.connect(hp);
  hp.connect(bp);
  const env = v.gain(0);
  bp.connect(env);
  env.connect(v.out);
  perc(env.gain, t, o.gain ?? 0.15, a, dur);
  v.end(tEnd);
  return tEnd;
}

export interface BrassOpts extends Common {
  freqs: number[];
  /** sustain time at full level */
  hold: number;
  a?: number;
  r?: number;
  /** filter brightness 0..1 */
  bright?: number;
}

/** brass-like stab/chord: detuned saw stack, filter swell, pitch scoop */
export function brass(e: Engine, o: BrassOpts): number {
  const t = o.t ?? now(e);
  const a = o.a ?? 0.04;
  const r = o.r ?? 0.3;
  const bright = clamp(o.bright ?? 0.6, 0, 1);
  const v = new Voice(e, { pan: o.pan, rev: o.rev ?? 0.35, bus: o.bus, route: o.route });
  const tEnd = t + a + 0.12 + o.hold + r;
  const lp = v.filter('lowpass', 500, 1.6);
  const peakCut = 900 + bright * 4200;
  lp.frequency.setValueAtTime(400, t);
  lp.frequency.exponentialRampToValueAtTime(peakCut, t + a + 0.03);
  lp.frequency.exponentialRampToValueAtTime(peakCut * 0.55, t + a + 0.25);
  lp.frequency.setValueAtTime(peakCut * 0.55, t + a + 0.12 + o.hold);
  lp.frequency.exponentialRampToValueAtTime(300, tEnd);
  const mix = v.gain(1 / Math.sqrt(o.freqs.length * 3));
  for (const f of o.freqs) {
    for (const d of [-9, 0, 8]) {
      const osc = v.osc('sawtooth', f, t, tEnd + 0.03, d);
      osc.detune.setValueAtTime(d - 35, t);
      osc.detune.linearRampToValueAtTime(d, t + 0.06);
      osc.connect(mix);
    }
  }
  mix.connect(lp);
  const env = v.gain(0);
  lp.connect(env);
  env.connect(v.out);
  adsr(env.gain, t, o.gain ?? 0.25, a, 0.12, 0.75, o.hold, r);
  v.end(tEnd);
  return tEnd;
}
