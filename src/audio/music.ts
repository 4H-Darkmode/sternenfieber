/**
 * Generative background music.
 *  base: slow, soft space pad + sparse bell arpeggio (vi–IV–I–V in C major)
 *  free: faster, brighter: 16th arp, pulse bass, soft kick + hats (I–V–vi–IV)
 * Each mode is a "layer" with its own gain so modes crossfade.
 */
import { Engine, Route, Ticker, Voice, adsr, getEngine, mtof, perc, rand, boom, noiseHit } from './synth';

export type MusicMode = 'off' | 'base' | 'free';

interface Chord {
  bass: number; // midi
  pad: number[]; // midi
  arp: number[]; // midi, ascending
}

const AM9: Chord = { bass: 45, pad: [57, 60, 64, 67, 71], arp: [69, 72, 76, 79, 83] };
const FMAJ9: Chord = { bass: 41, pad: [57, 60, 64, 67], arp: [65, 69, 72, 76, 79] };
const CADD9: Chord = { bass: 48, pad: [55, 60, 62, 64], arp: [72, 74, 76, 79, 84] };
const G6: Chord = { bass: 43, pad: [55, 59, 62, 64], arp: [71, 74, 76, 79, 81] };

interface Spec {
  /** seconds per 16th step */
  step: number;
  /** steps per chord */
  chordSteps: number;
  prog: Chord[];
  fadeIn: number;
  play: (e: Engine, route: Route, t: number, step: number, s: Spec) => void;
}

const BASE_ARP_PATTERN = [0, 2, 1, 3, 2, 4, 3, 1];
const FREE_ARP_PATTERN = [0, 1, 2, 3, 4, 3, 2, 1, 0, 2, 4, 2, 1, 3, 4, 3];

// ───────────────────────────────────────────────────────── instruments

function pad(e: Engine, route: Route, t: number, notes: number[], dur: number, cutoff: number, gain: number): void {
  const v = new Voice(e, { bus: 'music', route, rev: 0.85 });
  const a = Math.min(1.6, dur * 0.35);
  const r = 2.2;
  const tEnd = t + a + dur + r;
  const lp = v.filter('lowpass', cutoff * 0.6, 0.6);
  lp.frequency.setValueAtTime(cutoff * 0.6, t);
  lp.frequency.linearRampToValueAtTime(cutoff, t + dur * 0.55);
  lp.frequency.linearRampToValueAtTime(cutoff * 0.5, tEnd);
  const mix = v.gain(1 / Math.sqrt(notes.length * 2));
  for (const m of notes) {
    const f = mtof(m);
    v.osc('sawtooth', f, t, tEnd + 0.05, rand(-9, -4)).connect(mix);
    v.osc('triangle', f, t, tEnd + 0.05, rand(4, 9)).connect(mix);
  }
  // slow "breathing" tremolo
  const trem = v.gain(0.85);
  const lfo = v.osc('sine', rand(0.12, 0.22), t, tEnd + 0.05);
  const lg = v.gain(0.15);
  lfo.connect(lg);
  lg.connect(trem.gain);
  mix.connect(lp);
  lp.connect(trem);
  const env = v.gain(0);
  trem.connect(env);
  env.connect(v.out);
  adsr(env.gain, t, gain, a, 0.01, 1, dur, r);
  v.end(tEnd);
}

function subBass(e: Engine, route: Route, t: number, midi: number, dur: number, gain: number): void {
  const v = new Voice(e, { bus: 'music', route });
  const tEnd = t + 0.8 + dur + 1.2;
  const o = v.osc('sine', mtof(midi), t, tEnd + 0.05);
  const env = v.gain(0);
  o.connect(env);
  env.connect(v.out);
  adsr(env.gain, t, gain, 0.8, 0.01, 1, dur, 1.2);
  v.end(tEnd);
}

/** soft glassy FM pluck for the base arp */
function glassPluck(e: Engine, route: Route, t: number, midi: number, gain: number, pan: number): void {
  const f = mtof(midi);
  const v = new Voice(e, { bus: 'music', route, rev: 0.7, pan });
  const dur = 1.4;
  const car = v.osc('sine', f, t, t + dur + 0.05);
  const mod = v.osc('sine', f * 2, t, t + dur + 0.05);
  const mg = v.gain(0);
  mg.gain.setValueAtTime(f * 1.2, t);
  mg.gain.exponentialRampToValueAtTime(f * 0.05, t + 0.5);
  mod.connect(mg);
  mg.connect(car.frequency);
  const env = v.gain(0);
  car.connect(env);
  env.connect(v.out);
  perc(env.gain, t, gain, 0.006, dur);
  v.end(t + dur);
}

/** bright saw pluck for the free-spins arp */
function sawPluck(e: Engine, route: Route, t: number, midi: number, gain: number, pan: number, bright: number): void {
  const f = mtof(midi);
  const v = new Voice(e, { bus: 'music', route, rev: 0.4, pan });
  const dur = 0.32;
  const lp = v.filter('lowpass', 400, 4);
  lp.frequency.setValueAtTime(600 + bright * 4000, t);
  lp.frequency.exponentialRampToValueAtTime(500, t + dur);
  const o1 = v.osc('sawtooth', f, t, t + dur + 0.05, -6);
  const o2 = v.osc('square', f, t, t + dur + 0.05, 6);
  const mix = v.gain(0.5);
  o1.connect(mix);
  o2.connect(mix);
  mix.connect(lp);
  const env = v.gain(0);
  lp.connect(env);
  env.connect(v.out);
  perc(env.gain, t, gain, 0.003, dur);
  v.end(t + dur);
}

function pulseBass(e: Engine, route: Route, t: number, midi: number, gain: number, len: number): void {
  const f = mtof(midi);
  const v = new Voice(e, { bus: 'music', route });
  const dur = len * 0.9;
  const lp = v.filter('lowpass', 300, 3);
  lp.frequency.setValueAtTime(1100, t);
  lp.frequency.exponentialRampToValueAtTime(180, t + dur);
  const o = v.osc('sawtooth', f, t, t + dur + 0.05);
  const sub = v.osc('sine', f, t, t + dur + 0.05);
  const env = v.gain(0);
  o.connect(lp);
  lp.connect(env);
  sub.connect(env);
  env.connect(v.out);
  perc(env.gain, t, gain, 0.004, dur);
  v.end(t + dur);
}

// ───────────────────────────────────────────────────────── modes

const SPECS: Record<'base' | 'free', Spec> = {
  base: {
    step: 60 / 76 / 4,
    chordSteps: 32,
    prog: [AM9, FMAJ9, CADD9, G6],
    fadeIn: 2.5,
    play(e, route, t, step, s) {
      const chord = s.prog[Math.floor(step / s.chordSteps) % s.prog.length];
      const chordLen = s.step * s.chordSteps;
      if (step % s.chordSteps === 0) {
        pad(e, route, t, chord.pad, chordLen - 0.6, 1100, 0.11);
        subBass(e, route, t, chord.bass, chordLen - 1.5, 0.08);
      }
      // sparse 8th-note arp, slightly humanised
      if (step % 2 === 0 && Math.random() < 0.68) {
        const idx = BASE_ARP_PATTERN[(step / 2) % BASE_ARP_PATTERN.length];
        let m = chord.arp[idx];
        if (Math.random() < 0.12) m += 12;
        const pan = Math.sin(step * 0.37) * 0.5;
        glassPluck(e, route, t + rand(0, 0.012), m, rand(0.035, 0.055), pan);
      }
      // occasional high twinkle
      if (step % 16 === 10 && Math.random() < 0.15) {
        glassPluck(e, route, t, chord.arp[Math.floor(rand(0, chord.arp.length))] + 24, 0.02, rand(-0.7, 0.7));
      }
    },
  },
  free: {
    step: 60 / 122 / 4,
    chordSteps: 16,
    prog: [CADD9, G6, AM9, FMAJ9],
    fadeIn: 1.2,
    play(e, route, t, step, s) {
      const bar = Math.floor(step / s.chordSteps);
      const chord = s.prog[bar % s.prog.length];
      const chordLen = s.step * s.chordSteps;
      const pos = step % s.chordSteps;
      if (pos === 0) {
        pad(e, route, t, chord.pad.map((m) => m + 12), chordLen - 0.3, 2600, 0.07);
      }
      // pulse bass on 8ths, octave pop on the off-beat
      if (step % 2 === 0) {
        const m = chord.bass - 12 + (step % 4 === 2 ? 12 : 0);
        pulseBass(e, route, t, m, 0.12, s.step * 2);
      }
      // soft four-on-the-floor + hats
      if (step % 4 === 0) boom(e, { t, freq: 48, dur: 0.28, drop: 2.6, gain: 0.2, body: 0.15, route, bus: 'music' });
      if (step % 4 === 2) noiseHit(e, { t, dur: 0.05, gain: 0.035, type: 'highpass', freq: 8000, route, bus: 'music' });
      else if (Math.random() < 0.6) noiseHit(e, { t, dur: 0.025, gain: 0.014, type: 'highpass', freq: 9000, route, bus: 'music' });
      // driving 16th arp, alternating sides; octave up every other bar
      if (Math.random() < 0.92) {
        const idx = FREE_ARP_PATTERN[pos % FREE_ARP_PATTERN.length];
        const m = chord.arp[idx] + (bar % 2 === 1 ? 12 : 0);
        const accent = pos % 4 === 0 ? 1 : 0.7;
        sawPluck(e, route, t, m, 0.045 * accent, step % 2 === 0 ? -0.35 : 0.35, 0.4 + 0.6 * ((bar % 4) / 3));
      }
    },
  },
};

// ───────────────────────────────────────────────────────── layers

interface Layer {
  mode: 'base' | 'free';
  dry: GainNode;
  wet: GainNode;
  ticker: Ticker;
  timers: ReturnType<typeof setTimeout>[];
}

let desired: MusicMode = 'off';
let current: Layer | null = null;
const retiring = new Set<Layer>();

function makeLayer(e: Engine, mode: 'base' | 'free'): Layer {
  const spec = SPECS[mode];
  const dry = e.ctx.createGain();
  const wet = e.ctx.createGain();
  const t = e.ctx.currentTime;
  for (const g of [dry, wet]) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(1, t + spec.fadeIn);
  }
  dry.connect(e.music.route.dry);
  wet.connect(e.music.route.wet);
  const route: Route = { dry, wet };
  const ticker = new Ticker(
    () => spec.step,
    (time, i) => spec.play(e, route, time, i, spec),
    0.15,
  ).start(0.05);
  return { mode, dry, wet, ticker, timers: [] };
}

function retire(e: Engine, layer: Layer, fade: number): void {
  retiring.add(layer);
  const t = e.ctx.currentTime;
  for (const g of [layer.dry, layer.wet]) {
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(Math.max(g.gain.value, 0.0001), t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + fade);
  }
  layer.timers.push(setTimeout(() => layer.ticker.stop(), fade * 1000));
  layer.timers.push(
    setTimeout(() => {
      layer.ticker.stop();
      try {
        layer.dry.disconnect();
        layer.wet.disconnect();
      } catch {
        /* ignore */
      }
      retiring.delete(layer);
    }, fade * 1000 + 3000),
  );
}

function apply(): void {
  const e = getEngine();
  if (!e) return;
  if ((current?.mode ?? 'off') === desired) return;
  if (current) retire(e, current, desired === 'off' ? 1.2 : 2);
  current = desired === 'off' ? null : makeLayer(e, desired);
}

/** switch background music with a crossfade. Safe before initAudio (applied on init). */
export function setMusicMode(mode: MusicMode): void {
  desired = mode;
  apply();
}

export function getMusicMode(): MusicMode {
  return desired;
}

/** called once the AudioContext exists (initAudio) */
export function musicEngineReady(): void {
  apply();
}

/** immediate hard stop (teardown) */
export function stopMusicNow(): void {
  desired = 'off';
  const e = getEngine();
  if (!e) return;
  if (current) retire(e, current, 0.3);
  current = null;
}
