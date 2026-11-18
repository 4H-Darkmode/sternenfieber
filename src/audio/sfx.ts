/**
 * One function per sound. Key: C major / C major pentatonic, so every
 * reward sound is consonant, bright and "happy" (that is the hook).
 * Every function is a silent no-op when audio is unavailable or muted.
 */
import {
  Engine,
  N,
  Ticker,
  Voice,
  bell,
  boom,
  brass,
  clamp,
  cymbal,
  duckMusic,
  getEngine,
  live,
  mtof,
  noiseHit,
  now,
  partials,
  rand,
  tone,
  whoosh,
} from './synth';

type BigTier = 'big' | 'mega' | 'epic';

const PENTA = [0, 2, 4, 7, 9];
/** C-major-pentatonic step → Hz (step 0 = baseMidi) */
export function penta(step: number, baseMidi = 84): number {
  const oct = Math.floor(step / 5);
  const deg = ((step % 5) + 5) % 5;
  return mtof(baseMidi + oct * 12 + PENTA[deg]);
}

const reelPan = (reel: number) => clamp((reel - 2) * 0.2, -0.6, 0.6);

// ───────────────────────────────────────────────────────── building blocks

const COIN_PARTS: Array<[number, number, number]> = [
  [1, 1, 0.32],
  [2.41, 0.55, 0.2],
  [3.93, 0.3, 0.1],
  [5.47, 0.18, 0.06],
];

/** metallic coin "ching" (strike + tiny bounce) */
function coin(e: Engine, t: number, freq: number, gain: number, pan = 0, rev = 0.25): void {
  partials(e, { t, freq, parts: COIN_PARTS, gain, pan, rev, click: gain * 0.5 });
  partials(e, { t: t + rand(0.045, 0.07), freq: freq * 1.335, parts: COIN_PARTS, gain: gain * 0.55, pan, rev });
}

function sparkle(e: Engine, t: number, count: number, spacing: number, gain: number, startStep = 5): void {
  for (let i = 0; i < count; i++) {
    bell(e, {
      t: t + i * spacing + rand(0, spacing * 0.3),
      // cycle within ~1.5 octaves so long cascades never get shrill
      freq: penta(Math.min(startStep, 7) + ((i + Math.floor(rand(0, 2))) % 5)),
      dur: 0.35,
      gain: gain * rand(0.6, 1),
      ratio: 3.5,
      index: 1.6,
      pan: rand(-0.7, 0.7),
      rev: 0.5,
    });
  }
}

function shimmer(e: Engine, t: number, dur: number, gain: number): void {
  noiseHit(e, { t, a: dur * 0.3, dur: dur * 0.7, type: 'highpass', freq: 7500, q: 0.5, gain, rev: 0.6 });
}

function timpani(e: Engine, t: number, freq: number, gain: number): void {
  boom(e, { t, freq, dur: 0.9, drop: 1.6, gain, body: 0.8, rev: 0.35 });
}

function impact(e: Engine, t: number, gain: number): void {
  boom(e, { t, freq: 46, dur: 1.1, drop: 3.5, gain, body: 1, rev: 0.3 });
  noiseHit(e, { t, dur: 0.35, type: 'lowpass', freq: 2200, freqTo: 200, gain: gain * 0.5, rev: 0.3 });
}

function chordBells(e: Engine, t: number, notes: string[], gain: number, dur = 1.4, spread = 0): void {
  notes.forEach((n, i) =>
    bell(e, { t: t + i * spread, freq: N(n), dur, gain, ratio: 3.5, index: 1.8, shimmer: 0.3, rev: 0.55, pan: (i - (notes.length - 1) / 2) * 0.2 }),
  );
}

// ───────────────────────────────────────────────────────── UI

export function uiClick(kind: 'spin' | 'bet' | 'menu' | 'toggle' | 'generic'): void {
  const e = live();
  if (!e) return;
  const t = now(e);
  if (kind === 'spin') {
    tone(e, { t, type: 'triangle', freq: 240, glideTo: 85, glideTime: 0.09, dur: 0.14, gain: 0.34 });
    noiseHit(e, { t, dur: 0.04, type: 'bandpass', freq: 2600, q: 1.3, gain: 0.2 });
    tone(e, { t, freq: 1568, dur: 0.07, gain: 0.07 });
    return;
  }
  const f = kind === 'toggle' ? 1180 : kind === 'menu' ? 920 : kind === 'bet' ? 1400 : 1600;
  tone(e, { t, freq: f, glideTo: f * 0.78, glideTime: 0.04, dur: 0.05, gain: kind === 'bet' ? 0.07 : 0.1 });
  noiseHit(e, { t, dur: 0.012, type: 'highpass', freq: 4500, gain: 0.05 });
}

export function betChange(direction: 'up' | 'down'): void {
  const e = live();
  if (!e) return;
  const t = now(e);
  const [a, b] = direction === 'up' ? [N('G5'), N('C6')] : [N('C6'), N('G5')];
  tone(e, { t, type: 'triangle', freq: a, dur: 0.06, gain: 0.12 });
  tone(e, { t: t + 0.055, type: 'triangle', freq: b, glideTo: direction === 'up' ? b * 1.03 : b * 0.97, dur: 0.12, gain: 0.13, rev: 0.15 });
}

// ───────────────────────────────────────────────────────── spin

class SpinLoop {
  private readonly v: Voice;
  private readonly hum: GainNode;
  private readonly ticker: Ticker;
  private remaining = 5;
  private readonly level: number;
  private readonly safety: ReturnType<typeof setTimeout>;
  stopped = false;

  constructor(e: Engine, turbo: boolean) {
    const t = now(e);
    this.level = turbo ? 0.05 : 0.065;
    this.v = new Voice(e, { persistent: true });
    const v = this.v;
    const lp = v.filter('lowpass', 420, 0.9);
    v.osc('sawtooth', 49, t).connect(lp);
    v.osc('sawtooth', 73.5, t, undefined, 6).connect(lp);
    // airy whirr
    const n = v.noise(t);
    const bp = v.filter('bandpass', 1100, 0.7);
    const ng = v.gain(0.45);
    n.connect(bp);
    bp.connect(ng);
    // tremolo = reels rushing past
    const trem = v.gain(0.65);
    const lfo = v.osc('sine', turbo ? 15 : 10, t);
    const lg = v.gain(0.35);
    lfo.connect(lg);
    lg.connect(trem.gain);
    lp.connect(trem);
    ng.connect(trem);
    this.hum = v.gain(0);
    trem.connect(this.hum);
    this.hum.connect(v.out);
    this.hum.gain.setValueAtTime(0.0001, t);
    this.hum.gain.exponentialRampToValueAtTime(this.level, t + 0.25);

    // subtle mechanical ticking
    this.ticker = new Ticker(
      () => 1 / (turbo ? 24 : 15),
      (time, i) => {
        const ee = live();
        if (!ee) return;
        noiseHit(ee, { t: time, dur: 0.018, type: 'bandpass', freq: i % 2 ? 2300 : 1800, q: 3, gain: 0.03 * (this.remaining / 5) + 0.006 });
      },
    ).start(0.12);
    this.safety = setTimeout(() => this.stop(0.3), 15000);
  }

  reelStopped(): void {
    if (this.stopped) return;
    this.remaining = Math.max(0, this.remaining - 1);
    if (this.remaining === 0) return this.stop(0.1);
    const e = getEngine();
    if (!e) return;
    this.hum.gain.setTargetAtTime(Math.max(0.0001, (this.level * this.remaining) / 5), e.ctx.currentTime, 0.04);
  }

  stop(fade = 0.12): void {
    if (this.stopped) return;
    this.stopped = true;
    clearTimeout(this.safety);
    this.ticker.stop();
    this.v.kill(fade);
  }
}

let spinLoop: SpinLoop | null = null;

export function spinStart(turbo: boolean): void {
  spinLoop?.stop(0.05);
  spinLoop = null;
  const e = live();
  if (!e) return;
  const t = now(e);
  const d = turbo ? 0.22 : 0.4;
  whoosh(e, { t, dur: d, from: 350, to: 3200, q: 1.2, gain: 0.22, peakAt: 0.35, rev: 0.2 });
  // reel motor kick-in
  tone(e, { t, type: 'sawtooth', freq: 38, glideTo: 82, glideTime: d, dur: d, a: 0.03, gain: 0.14, lp: 260, lpTo: 600 });
  // release latch
  noiseHit(e, { t, dur: 0.03, type: 'bandpass', freq: 3400, q: 2, gain: 0.12 });
  spinLoop = new SpinLoop(e, turbo);
}

let lastReelStop = 0;

export function reelStop(reel: number, turbo: boolean): void {
  spinLoop?.reelStopped();
  const e = live();
  if (!e) return;
  const t = now(e);
  // in turbo several reels can land within a few ms – merge into one hit
  if (turbo && t - lastReelStop < 0.06) return;
  lastReelStop = t;
  const k = 1 + reel * 0.055 + rand(-0.015, 0.015);
  const pan = reelPan(reel);
  const g = turbo ? 0.85 : 1;
  tone(e, { t, freq: 150 * k, glideTo: 50 * k, glideTime: 0.09, dur: 0.17, gain: 0.5 * g, pan });
  tone(e, { t, type: 'triangle', freq: 440 * k, glideTo: 250 * k, glideTime: 0.035, dur: 0.05, gain: 0.15 * g, pan });
  noiseHit(e, { t, dur: 0.035, type: 'bandpass', freq: 3200 * k, q: 1, gain: 0.2 * g, pan });
  noiseHit(e, { t, dur: 0.1, type: 'lowpass', freq: 520, gain: 0.2 * g, pan, rev: 0.08 });
}

export function allReelsStopped(): void {
  spinLoop?.stop(0.1);
  spinLoop = null;
  anticipation?.end(false, true);
  anticipation = null;
}

// ───────────────────────────────────────────────────────── feature symbols

export function scatterLand(reel: number, nth: number): void {
  const e = live();
  if (!e) return;
  const t = now(e);
  const n = clamp(Math.round(nth), 1, 3);
  const pan = reelPan(reel) * 0.6;
  const root = [N('E6'), N('G6'), N('C7')][n - 1];
  bell(e, { t, freq: root, dur: 1.2 + n * 0.3, gain: 0.2, ratio: 3.5, index: 2.4, shimmer: 0.45, pan, rev: 0.55 });
  bell(e, { t, freq: root / 2, dur: 1 + n * 0.3, gain: 0.12, ratio: 2, index: 1.2, pan, rev: 0.5 });
  shimmer(e, t, 0.5 + n * 0.25, 0.04 + n * 0.015);
  sparkle(e, t + 0.04, 3 + n * 2, 0.045, 0.06, 5 + n * 2);
  if (n >= 2) {
    boom(e, { t, freq: 62, dur: 0.7, gain: 0.32, drop: 2.5, body: 0.4, rev: 0.25 });
    bell(e, { t: t + 0.01, freq: root * 1.5, dur: 1.2, gain: 0.11, ratio: 3.5, index: 1.6, pan: -pan, rev: 0.6 });
    whoosh(e, { t: t - 0.005, dur: 0.35, from: 2000, to: 9000, gain: 0.05, peakAt: 0.1, rev: 0.3 });
  }
  if (n >= 3) {
    impact(e, t, 0.6);
    cymbal(e, { t, dur: 2.4, gain: 0.13, rev: 0.6 });
    chordBells(e, t + 0.02, ['C6', 'E6', 'G6', 'C7', 'E7'], 0.1, 2.2, 0.03);
    brass(e, { t, freqs: [N('C4'), N('E4'), N('G4'), N('C5')], hold: 0.35, gain: 0.22, bright: 0.85 });
    sparkle(e, t + 0.25, 10, 0.05, 0.05, 8);
    duckMusic(0.35, 2.2);
  }
}

export function coinLand(reel: number, value: number): void {
  const e = live();
  if (!e) return;
  const t = now(e);
  const b = clamp(Math.log2(1 + Math.max(0, value)) / Math.log2(51), 0, 1);
  const f = 1450 + 1500 * b;
  coin(e, t, f, 0.15 + 0.08 * b, reelPan(reel));
  tone(e, { t, freq: 120, glideTo: 70, glideTime: 0.06, dur: 0.1, gain: 0.15, pan: reelPan(reel) });
  if (b > 0.35) sparkle(e, t + 0.05, 2 + Math.round(b * 4), 0.04, 0.05, 6 + Math.round(b * 4));
}

export function collectLand(reel: number): void {
  const e = live();
  if (!e) return;
  const t = now(e);
  const pan = reelPan(reel);
  // magnetic pull: noise + sine sweeping up with wobble
  whoosh(e, { t, dur: 0.55, from: 250, to: 5000, q: 2.5, gain: 0.16, peakAt: 0.75, pan, rev: 0.3 });
  tone(e, { t, type: 'sine', freq: 180, glideTo: 1400, glideTime: 0.5, a: 0.3, dur: 0.25, gain: 0.08, vibrato: { rate: 18, depth: 60 }, pan });
  tone(e, { t, type: 'sawtooth', freq: 90, glideTo: 360, glideTime: 0.5, a: 0.3, dur: 0.25, gain: 0.06, lp: 400, lpTo: 2400, pan });
  const hit = t + 0.48;
  boom(e, { t: hit, freq: 58, dur: 0.6, gain: 0.35, body: 0.4 });
  chordBells(e, hit, ['C6', 'E6', 'G6', 'D7'], 0.11, 1.5, 0.025);
  brass(e, { t: hit, freqs: [N('C4'), N('G4'), N('E5')], hold: 0.2, gain: 0.14, bright: 0.7 });
}

// ───────────────────────────────────────────────────────── anticipation

class Anticipation {
  private readonly v: Voice;
  private readonly heart: Ticker;
  private readonly safety: ReturnType<typeof setTimeout>;
  private done = false;

  constructor(e: Engine) {
    const t = now(e);
    const R = 4.5; // riser length; holds at the top afterwards
    const v = (this.v = new Voice(e, { persistent: true, rev: 0.35 }));
    // filtered-noise riser
    const n = v.noise(t);
    const bp = v.filter('bandpass', 300, 2.2);
    bp.frequency.setValueAtTime(300, t);
    bp.frequency.exponentialRampToValueAtTime(6000, t + R);
    const ng = v.gain(0);
    ng.gain.setValueAtTime(0.0001, t);
    ng.gain.exponentialRampToValueAtTime(0.09, t + R);
    n.connect(bp);
    bp.connect(ng);
    // rising tone (root + fifth)
    const lp = v.filter('lowpass', 500, 2);
    lp.frequency.setValueAtTime(500, t);
    lp.frequency.exponentialRampToValueAtTime(3500, t + R);
    for (const [ratio, d] of [[1, -7], [1.5, 7], [2, 0]] as const) {
      const o = v.osc('sawtooth', 110 * ratio, t, undefined, d);
      o.frequency.setValueAtTime(110 * ratio, t);
      o.frequency.exponentialRampToValueAtTime(440 * ratio, t + R);
      o.connect(lp);
    }
    const tg = v.gain(0);
    tg.gain.setValueAtTime(0.0001, t);
    tg.gain.exponentialRampToValueAtTime(0.055, t + R);
    lp.connect(tg);
    // accelerating tremolo
    const trem = v.gain(0.7);
    const lfo = v.osc('sine', 5, t);
    lfo.frequency.setValueAtTime(5, t);
    lfo.frequency.linearRampToValueAtTime(16, t + R);
    const lg = v.gain(0.3);
    lfo.connect(lg);
    lg.connect(trem.gain);
    ng.connect(trem);
    tg.connect(trem);
    trem.connect(v.out);

    // heartbeat that speeds up (lub-dub)
    this.heart = new Ticker(
      (i) => Math.max(0.4, 0.78 - i * 0.04),
      (time, i) => {
        const ee = live();
        if (!ee) return;
        const g = Math.min(0.5, 0.3 + i * 0.02);
        boom(ee, { t: time, freq: 52, dur: 0.18, drop: 1.8, gain: g, body: 0.2 });
        boom(ee, { t: time + 0.15, freq: 48, dur: 0.22, drop: 1.6, gain: g * 0.65, body: 0.15 });
      },
    ).start(0.05);
    duckMusic(0.4, 12);
    this.safety = setTimeout(() => this.end(false, true), 12000);
  }

  end(success: boolean, silent = false): void {
    if (this.done) return;
    this.done = true;
    clearTimeout(this.safety);
    this.heart.stop();
    this.v.kill(success ? 0.04 : silent ? 0.2 : 0.3);
    if (success) duckMusic(0.35, 2.2);
    else duckMusic(1, 0.01);
  }
}

let anticipation: Anticipation | null = null;

export function anticipationStart(): void {
  if (anticipation) return; // already building
  const e = live();
  if (!e) return;
  anticipation = new Anticipation(e);
}

export function anticipationEnd(success: boolean): void {
  const had = !!anticipation;
  anticipation?.end(success);
  anticipation = null;
  const e = live();
  if (!e) return;
  const t = now(e);
  if (success) {
    impact(e, t, 0.7);
    cymbal(e, { t, dur: 2, gain: 0.14 });
    chordBells(e, t, ['C6', 'G6', 'C7', 'E7'], 0.11, 1.8, 0.02);
    brass(e, { t, freqs: [N('C4'), N('G4'), N('C5'), N('E5')], hold: 0.4, gain: 0.22, bright: 0.9 });
  } else if (had) {
    // deflating "aww": falling, closing, wobbling
    tone(e, { t, type: 'sawtooth', freq: 520, glideTo: 150, glideTime: 0.75, a: 0.02, dur: 0.75, gain: 0.1, lp: 1900, lpTo: 300, q: 2, vibrato: { rate: 5.5, depth: 30 }, rev: 0.25 });
    tone(e, { t, type: 'triangle', freq: 390, glideTo: 112, glideTime: 0.8, a: 0.02, dur: 0.8, gain: 0.08, rev: 0.25 });
    noiseHit(e, { t, dur: 0.6, type: 'bandpass', freq: 3000, freqTo: 250, q: 1.5, gain: 0.05 });
  }
}

// ───────────────────────────────────────────────────────── wins

/** small win (and LDW – deliberately identical): sparkly arpeggio */
export function winSmall(): void {
  const e = live();
  if (!e) return;
  const t = now(e);
  ['C6', 'E6', 'G6', 'C7'].forEach((n, i) =>
    bell(e, { t: t + i * 0.065, freq: N(n), dur: 0.7, gain: 0.16, ratio: 3.5, index: 2, shimmer: 0.35, pan: (i - 1.5) * 0.25, rev: 0.45 }),
  );
  bell(e, { t: t + 0.27, freq: N('E7'), dur: 1, gain: 0.08, ratio: 3.5, index: 1.4, rev: 0.6 });
  coin(e, t + 0.05, 2600, 0.08, 0.3);
  shimmer(e, t, 0.6, 0.035);
}

export function lineWin(index: number): void {
  const e = live();
  if (!e) return;
  const t = now(e);
  const step = 2 + clamp(index, 0, 10);
  const f = penta(step);
  bell(e, { t, freq: f, dur: 0.6, gain: 0.15, ratio: 3.5, index: 2.2, shimmer: 0.4, pan: rand(-0.3, 0.3), rev: 0.45 });
  bell(e, { t: t + 0.06, freq: penta(step + 2), dur: 0.45, gain: 0.07, ratio: 3.5, index: 1.4, rev: 0.5 });
  noiseHit(e, { t, dur: 0.18, type: 'highpass', freq: 8000, gain: 0.025 });
}

export function coinCascade(coinCount: number): void {
  const e = live();
  if (!e) return;
  const t = now(e);
  const n = clamp(Math.round(coinCount * 2.5), 8, 24);
  for (let i = 0; i < n; i++) {
    const p = i / n;
    coin(e, t + i * 0.045 + rand(0, 0.015), 1500 * Math.pow(2, p) * rand(0.97, 1.03), 0.09, rand(-0.6, 0.6));
  }
  const end = t + n * 0.045;
  chordBells(e, end, ['C7', 'G7'], 0.1, 1.2);
  shimmer(e, end, 0.8, 0.04);
}

// rollup ──────────────────────────────────────────

let rollup: { ticker: Ticker; timer: ReturnType<typeof setTimeout> } | null = null;

function stopRollup(): void {
  if (!rollup) return;
  rollup.ticker.stop();
  clearTimeout(rollup.timer);
  rollup = null;
}

export function rollupStart(durationMs: number): void {
  stopRollup();
  const e = live();
  if (!e) return;
  const dur = clamp(durationMs / 1000, 0.1, 60);
  const t0 = now(e);
  const rate = 26;
  const ticker = new Ticker(
    () => 1 / rate,
    (time, i) => {
      const ee = live();
      if (!ee) return;
      const p = clamp((time - t0) / dur, 0, 1);
      const f = 1900 * Math.pow(2, (p * 5) / 12) * (i % 2 ? 1.12 : 1) * rand(0.995, 1.005);
      partials(ee, {
        t: time,
        freq: f,
        parts: [
          [1, 1, 0.045],
          [2.7, 0.4, 0.025],
        ],
        gain: 0.06 + 0.02 * p,
        pan: i % 2 ? 0.15 : -0.15,
        click: 0.02,
      });
    },
    0.08,
  ).start(0);
  rollup = { ticker, timer: setTimeout(stopRollup, dur * 1000) };
}

export function rollupEnd(): void {
  stopRollup();
  const e = live();
  if (!e) return;
  const t = now(e);
  bell(e, { t, freq: N('C7'), dur: 1.3, gain: 0.2, ratio: 3.5, index: 2.4, shimmer: 0.5, rev: 0.5 });
  bell(e, { t: t + 0.01, freq: N('G7'), dur: 1, gain: 0.08, ratio: 3.5, index: 1.5, rev: 0.6 });
  coin(e, t, 2400, 0.08);
}

// big win ─────────────────────────────────────────

class CoinShower {
  private readonly ticker: Ticker;
  private readonly safety: ReturnType<typeof setTimeout>;
  constructor(density: number) {
    this.ticker = new Ticker(
      () => rand(0.5, 1.5) / density,
      (time, i) => {
        const ee = live();
        if (!ee) return;
        coin(ee, time, penta(Math.floor(rand(3, 10)), 84) * rand(0.99, 1.01), rand(0.04, 0.085), rand(-0.8, 0.8), 0.35);
        if (i % 9 === 0) bell(ee, { t: time, freq: penta(Math.floor(rand(5, 10))), dur: 0.5, gain: 0.04, rev: 0.6, pan: rand(-0.8, 0.8) });
      },
    ).start(0.15);
    this.safety = setTimeout(() => this.stop(), 45000);
  }
  stop(): void {
    clearTimeout(this.safety);
    this.ticker.stop();
  }
}

let shower: CoinShower | null = null;

function fanfare(e: Engine, t: number, tier: BigTier): void {
  if (tier === 'big') {
    ['C4', 'E4', 'G4'].forEach((n, i) => {
      brass(e, { t: t + i * 0.13, freqs: [N(n), N(n) * 2], hold: 0.04, gain: 0.2, bright: 0.7 });
      timpani(e, t + i * 0.13, 70, 0.3);
    });
    const c = t + 0.39;
    brass(e, { t: c, freqs: [N('C4'), N('E4'), N('G4'), N('C5')], hold: 1.1, gain: 0.27, bright: 0.85, r: 0.6 });
    impact(e, c, 0.55);
    cymbal(e, { t: c, dur: 2, gain: 0.12 });
    sparkle(e, c, 8, 0.06, 0.06, 5);
    shimmer(e, c, 1.5, 0.05);
    return;
  }
  if (tier === 'mega') {
    ['G3', 'C4', 'E4', 'G4'].forEach((n, i) => {
      brass(e, { t: t + i * 0.11, freqs: [N(n), N(n) * 2], hold: 0.03, gain: 0.2, bright: 0.75 });
      timpani(e, t + i * 0.11, 65 + i * 4, 0.3);
    });
    const a = t + 0.46;
    brass(e, { t: a, freqs: [N('F3'), N('A3'), N('C4'), N('F4')], hold: 0.25, gain: 0.24, bright: 0.8 });
    timpani(e, a, 58, 0.4);
    const c = a + 0.42;
    brass(e, { t: c, freqs: [N('C4'), N('E4'), N('G4'), N('C5'), N('E5')], hold: 1.5, gain: 0.29, bright: 0.95, r: 0.7 });
    impact(e, c, 0.65);
    cymbal(e, { t: c, dur: 2.6, gain: 0.14 });
    chordBells(e, c, ['C6', 'E6', 'G6', 'C7'], 0.09, 1.8, 0.04);
    sparkle(e, c + 0.1, 12, 0.05, 0.06, 6);
    shimmer(e, c, 2, 0.06);
    return;
  }
  // epic: timpani roll → bVI – bVII – I victory cadence
  for (let i = 0; i < 14; i++) timpani(e, t + i * 0.05, 62, 0.12 + i * 0.02);
  cymbal(e, { t, swell: 0.7, dur: 0.3, gain: 0.1 });
  const s = t + 0.72;
  brass(e, { t: s, freqs: [N('Ab3'), N('C4'), N('Eb4'), N('Ab4')], hold: 0.28, gain: 0.25, bright: 0.8 });
  timpani(e, s, 52, 0.45);
  brass(e, { t: s + 0.42, freqs: [N('Bb3'), N('D4'), N('F4'), N('Bb4')], hold: 0.28, gain: 0.26, bright: 0.85 });
  timpani(e, s + 0.42, 58, 0.45);
  const c = s + 0.84;
  brass(e, { t: c, freqs: [N('C3'), N('C4'), N('E4'), N('G4'), N('C5'), N('E5')], hold: 2, gain: 0.31, bright: 1, r: 0.9 });
  impact(e, c, 0.75);
  cymbal(e, { t: c, dur: 3.2, gain: 0.16 });
  chordBells(e, c, ['C6', 'E6', 'G6', 'C7', 'E7', 'G7'], 0.085, 2.4, 0.04);
  sparkle(e, c + 0.15, 16, 0.045, 0.06, 6);
  shimmer(e, c, 2.6, 0.07);
}

export function bigWinStart(tier: BigTier): void {
  shower?.stop();
  shower = null;
  const e = live();
  if (!e) return;
  duckMusic(0.25, 60);
  fanfare(e, now(e), tier);
  shower = new CoinShower(tier === 'big' ? 10 : tier === 'mega' ? 15 : 22);
}

export function bigWinTierUp(tier: BigTier): void {
  const e = live();
  if (!e) return;
  const t = now(e);
  whoosh(e, { t, dur: 0.4, from: 400, to: 8000, gain: 0.12, peakAt: 0.85, rev: 0.3 });
  const hit = t + 0.34;
  impact(e, hit, 0.7);
  cymbal(e, { t: hit, dur: 2.2, gain: 0.15 });
  if (tier === 'epic') {
    brass(e, { t: hit, freqs: [N('Ab3'), N('C4'), N('Eb4')], hold: 0.12, gain: 0.24 });
    brass(e, { t: hit + 0.24, freqs: [N('Bb3'), N('D4'), N('F4')], hold: 0.12, gain: 0.25 });
    brass(e, { t: hit + 0.48, freqs: [N('C4'), N('E4'), N('G4'), N('C5'), N('E5')], hold: 0.9, gain: 0.3, bright: 1 });
    chordBells(e, hit + 0.48, ['C7', 'E7', 'G7'], 0.09, 1.8, 0.03);
  } else {
    brass(e, { t: hit, freqs: [N('Bb3'), N('D4'), N('F4')], hold: 0.12, gain: 0.24 });
    brass(e, { t: hit + 0.22, freqs: [N('C4'), N('E4'), N('G4'), N('C5')], hold: 0.7, gain: 0.28, bright: 0.95 });
    chordBells(e, hit + 0.22, ['C7', 'G7'], 0.09, 1.5);
  }
  sparkle(e, hit, 10, 0.04, 0.06, 7);
}

export function bigWinEnd(): void {
  shower?.stop();
  shower = null;
  const e = live();
  if (!e) return;
  const t = now(e);
  cymbal(e, { t, swell: 1.1, dur: 2.6, gain: 0.17, rev: 0.6 });
  const c = t + 1.1;
  brass(e, { t: c, freqs: [N('C4'), N('G4'), N('C5'), N('E5')], hold: 0.6, gain: 0.22, bright: 0.9, r: 1 });
  chordBells(e, c, ['C6', 'G6', 'C7', 'E7', 'G7'], 0.08, 2.2, 0.035);
  boom(e, { t: c, freq: 44, dur: 1.4, gain: 0.45, body: 0.6, rev: 0.4 });
  duckMusic(0.25, 2.6);
}

// ───────────────────────────────────────────────────────── free spins

/** bouncy lead note: square + FM bell layer */
function lead(e: Engine, t: number, freq: number, len: number, gain: number): void {
  tone(e, { t, type: 'square', freq, dur: len * 1.6, gain: gain * 0.4, lp: 3500, lpTo: 900, rev: 0.3 });
  bell(e, { t, freq, dur: len * 2.5, gain, ratio: 2, index: 1.5, rev: 0.4 });
}

export function freeSpinsTriggered(retrigger: boolean): void {
  const e = live();
  if (!e) return;
  const t = now(e);
  duckMusic(0.2, retrigger ? 2.2 : 3);
  const tune: Array<[string, number]> = retrigger
    ? [['G5', 0.1], ['C6', 0.1], ['E6', 0.1], ['G6', 0.3]]
    : [['C6', 0.1], ['G5', 0.1], ['C6', 0.1], ['E6', 0.1], ['G6', 0.2], ['E6', 0.1], ['G6', 0.1], ['C7', 0.4]];
  let tt = t;
  tune.forEach(([n, len], i) => {
    lead(e, tt, N(n), len, 0.17);
    if (i % 2 === 0) boom(e, { t: tt, freq: 55, dur: 0.25, gain: 0.25, body: 0.3 });
    else noiseHit(e, { t: tt, dur: 0.08, type: 'bandpass', freq: 2500, q: 0.8, gain: 0.1, rev: 0.2 });
    tt += len;
  });
  brass(e, { t: tt - 0.05, freqs: [N('C4'), N('E4'), N('G4'), N('C5')], hold: 0.7, gain: 0.25, bright: 0.9, r: 0.6 });
  impact(e, tt - 0.05, 0.55);
  cymbal(e, { t: tt - 0.05, dur: 2.2, gain: 0.13 });
  sparkle(e, tt, 12, 0.045, 0.06, 6);
}

export function freeSpinsIntro(): void {
  const e = live();
  if (!e) return;
  const t = now(e);
  const R = 1.8;
  duckMusic(0.1, R + 2.5);
  whoosh(e, { t, dur: R + 0.1, from: 200, to: 9000, q: 1.6, gain: 0.14, peakAt: 0.95, rev: 0.4 });
  tone(e, { t, type: 'sawtooth', freq: N('C3'), glideTo: N('C5'), glideTime: R, a: R, dur: 0.15, gain: 0.07, lp: 400, lpTo: 4000, vibrato: { rate: 7, depth: 15 } });
  tone(e, { t, type: 'sawtooth', freq: N('G3'), glideTo: N('G5'), glideTime: R, a: R, dur: 0.15, gain: 0.05, lp: 400, lpTo: 4000 });
  for (let i = 0; i < 18; i++) timpani(e, t + R * (1 - Math.pow(1 - i / 18, 1.6)), 60, 0.08 + i * 0.015);
  cymbal(e, { t: t + R - 1.2, swell: 1.2, dur: 0.2, gain: 0.1 });
  const c = t + R;
  impact(e, c, 0.8);
  cymbal(e, { t: c, dur: 3.5, gain: 0.16, rev: 0.7 });
  brass(e, { t: c, freqs: [N('C3'), N('G3'), N('C4'), N('E4'), N('G4'), N('D5')], hold: 1.6, gain: 0.3, bright: 0.9, r: 1.4, rev: 0.6 });
  chordBells(e, c, ['C6', 'D6', 'E6', 'G6', 'C7', 'E7'], 0.08, 3, 0.05);
  shimmer(e, c, 3, 0.07);
}

export function freeSpinsOutro(): void {
  const e = live();
  if (!e) return;
  const t = now(e);
  duckMusic(0.15, 2.4);
  const tune: Array<[string, number]> = [['G6', 0.12], ['E6', 0.12], ['C6', 0.12], ['D6', 0.24], ['G5', 0.12], ['C6', 0.5]];
  let tt = t;
  tune.forEach(([n, len]) => {
    lead(e, tt, N(n), len, 0.15);
    tt += len;
  });
  const c = tt - 0.5;
  brass(e, { t: t + 0.36, freqs: [N('F3'), N('A3'), N('D4')], hold: 0.25, gain: 0.16 });
  brass(e, { t: c, freqs: [N('C4'), N('E4'), N('G4'), N('C5')], hold: 0.9, gain: 0.24, bright: 0.85, r: 0.8 });
  timpani(e, c, 55, 0.45);
  cymbal(e, { t: c, dur: 2.2, gain: 0.12 });
  chordBells(e, c, ['C6', 'E6', 'G6', 'C7'], 0.08, 2, 0.05);
}

// ───────────────────────────────────────────────────────── dark patterns / protection

export function bonusBuy(): void {
  const e = live();
  if (!e) return;
  const t = now(e);
  // drawer "ka-"
  noiseHit(e, { t, dur: 0.07, type: 'bandpass', freq: 1300, q: 1.5, gain: 0.25 });
  boom(e, { t, freq: 90, dur: 0.18, gain: 0.3, body: 0.6 });
  // "-ching"
  const c = t + 0.08;
  partials(e, { t: c, freq: N('E7'), parts: [[1, 1, 0.9], [2.76, 0.5, 0.5], [5.4, 0.25, 0.25]], gain: 0.13, rev: 0.4, click: 0.08 });
  partials(e, { t: c + 0.09, freq: N('A7'), parts: [[1, 1, 1.1], [2.76, 0.45, 0.6], [5.4, 0.2, 0.3]], gain: 0.12, rev: 0.45 });
  whoosh(e, { t: c + 0.05, dur: 0.5, from: 500, to: 6000, gain: 0.12, peakAt: 0.7, rev: 0.3 });
  sparkle(e, c + 0.4, 6, 0.04, 0.05, 7);
}

/** intentionally dull and unrewarding */
export function cashoutBonk(): void {
  const e = live();
  if (!e) return;
  const t = now(e);
  tone(e, { t, freq: 196, glideTo: 140, glideTime: 0.12, dur: 0.2, gain: 0.25, lp: 600 });
  tone(e, { t, type: 'triangle', freq: 98, dur: 0.15, gain: 0.12, lp: 400 });
  noiseHit(e, { t, dur: 0.05, type: 'lowpass', freq: 500, gain: 0.12 });
}

/** calm, neutral, non-musical notification */
export function notify(): void {
  const e = live();
  if (!e) return;
  const t = now(e);
  for (const dt of [0, 0.32]) {
    tone(e, { t: t + dt, freq: 640, a: 0.05, hold: 0.08, dur: 0.25, gain: 0.08, rev: 0.15 });
  }
}

// ───────────────────────────────────────────────────────── housekeeping

export function stopAllLoops(): void {
  spinLoop?.stop(0.05);
  spinLoop = null;
  anticipation?.end(false, true);
  anticipation = null;
  stopRollup();
  shower?.stop();
  shower = null;
}
