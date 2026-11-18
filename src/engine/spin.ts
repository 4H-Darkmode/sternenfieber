/**
 * spin(opts) – one paid (base) or free spin.
 *
 * Normal spins: one uniform random stop per reel on the mode's strips, coin
 * values drawn from the weighted coin table, then pure evaluation.
 *
 * Forced spins (presentation/debug): rejection sampling on the REAL strips, with
 * constrained stop selection (still real strip positions) and a constructive
 * fallback. The returned result is always the honest evaluation of its grid.
 */
import { evaluateGrid } from './evaluate';
import { COIN_VALUE_WEIGHTS } from './paytable';
import { STRIPS, windowAt } from './reels';
import { createRng } from './rng';
import {
  REELS,
  ROWS,
  type Cell,
  type ForceOutcome,
  type Grid,
  type Rng,
  type SpinMode,
  type SpinOptions,
  type SpinResult,
  type SymbolId,
} from './types';

/** Max rejection-sampling attempts for forced outcomes. */
export const FORCE_MAX_ITERATIONS = 200_000;

const COIN_TABLES = (() => {
  const out = {} as Record<SpinMode, { values: number[]; cum: number[]; total: number }>;
  for (const mode of ['base', 'free'] as SpinMode[]) {
    const values: number[] = [];
    const cum: number[] = [];
    let total = 0;
    for (const [v, w] of COIN_VALUE_WEIGHTS[mode]) {
      total += w;
      values.push(v);
      cum.push(total);
    }
    out[mode] = { values, cum, total };
  }
  return out;
})();

export function drawCoinValue(mode: SpinMode, rng: Rng): number {
  const t = COIN_TABLES[mode];
  const x = rng.next() * t.total;
  for (let i = 0; i < t.cum.length; i++) if (x < t.cum[i]) return t.values[i];
  return t.values[t.values.length - 1];
}

/** Build the visible grid for given stops; COIN cells get a random value. */
export function buildGrid(mode: SpinMode, stops: number[], rng: Rng): Grid {
  const grid: Grid = [];
  for (let r = 0; r < REELS; r++) {
    const strip = STRIPS[mode][r];
    const n = strip.length;
    const col: Cell[] = [];
    for (let row = 0; row < ROWS; row++) {
      const symbol = strip[(stops[r] + row) % n];
      col.push(symbol === 'COIN' ? { symbol, coinValue: drawCoinValue(mode, rng) } : { symbol });
    }
    grid.push(col);
  }
  return grid;
}

export function randomStops(mode: SpinMode, rng: Rng): number[] {
  const stops: number[] = [];
  for (let r = 0; r < REELS; r++) stops.push(rng.int(STRIPS[mode][r].length));
  return stops;
}

/** Spin with explicit stops (tests / replays). */
export function spinAtStops(mode: SpinMode, bet: number, stops: number[], rng: Rng = createRng(0)): SpinResult {
  return evaluateGrid(buildGrid(mode, stops, rng), mode, bet, [...stops]);
}

// ── constrained stop selection (real strip positions only) ──────────────────
type WindowPred = (w: SymbolId[]) => boolean;
const stopCache = new Map<string, number[]>();

function stopsWhere(mode: SpinMode, reel: number, key: string, pred: WindowPred): number[] {
  const k = `${mode}|${reel}|${key}`;
  let list = stopCache.get(k);
  if (!list) {
    list = [];
    const n = STRIPS[mode][reel].length;
    for (let s = 0; s < n; s++) if (pred(windowAt(mode, reel, s))) list.push(s);
    stopCache.set(k, list);
  }
  return list;
}

const has = (sym: SymbolId) => (w: SymbolId[]) => w.includes(sym);
const hasNot = (sym: SymbolId) => (w: SymbolId[]) => !w.includes(sym);

function pick(rng: Rng, list: number[], fallback: number): number {
  return list.length ? list[rng.int(list.length)] : fallback;
}

/** Candidate generator per force kind. Returns stops (always real positions). */
function candidateStops(force: ForceOutcome, mode: SpinMode, rng: Rng): number[] {
  const stops = randomStops(mode, rng);
  const withSc = (r: number) => pick(rng, stopsWhere(mode, r, 'sc+', has('SCATTER')), stops[r]);
  const noSc = (r: number) => pick(rng, stopsWhere(mode, r, 'sc-', hasNot('SCATTER')), stops[r]);
  switch (force) {
    case 'freespins': {
      // exactly 3 scatters: reels 1–3 show one, reels 4–5 none
      for (let r = 0; r < REELS; r++) stops[r] = r < 3 ? withSc(r) : noSc(r);
      return stops;
    }
    case 'nearmiss': {
      // exactly 2 scatters on reels 1–3, none elsewhere → anticipation, no trigger
      const skip = rng.int(3);
      for (let r = 0; r < REELS; r++) stops[r] = r < 3 && r !== skip ? withSc(r) : noSc(r);
      return stops;
    }
    case 'coins': {
      // collector on reel 5, at least one coin on a random reel 1–4, no bonus trigger
      stops[REELS - 1] = pick(rng, stopsWhere(mode, REELS - 1, 'col+', has('COLLECT')), stops[REELS - 1]);
      const cr = rng.int(REELS - 1);
      stops[cr] = pick(rng, stopsWhere(mode, cr, 'coin+', has('COIN')), stops[cr]);
      return stops;
    }
    default:
      return stops; // 'bigwin' / 'ldw': pure rejection sampling
  }
}

function satisfies(force: ForceOutcome, res: SpinResult): boolean {
  const x = res.totalWin / res.bet;
  switch (force) {
    case 'bigwin':
      return x >= 15 && res.freeSpinsAwarded === 0;
    case 'freespins':
      return res.scatterPositions.length === 3 && res.freeSpinsAwarded > 0;
    case 'nearmiss':
      return (
        res.scatterPositions.length === 2 &&
        res.scatterPositions.every(([r]) => r < 3) &&
        res.anticipationFromReel !== null &&
        res.freeSpinsAwarded === 0 &&
        res.nearMiss?.kind === 'scatter'
      );
    case 'ldw':
      return res.totalWin > 0 && res.totalWin < res.bet && res.freeSpinsAwarded === 0;
    case 'coins':
      return res.coinCollect !== null && res.freeSpinsAwarded === 0;
  }
}

/** Constructive fallback for 'bigwin': gold stars / wilds across the middle row (line 1). */
function bigWinFallback(mode: SpinMode, bet: number, rng: Rng): SpinResult {
  const stops: number[] = [];
  for (let r = 0; r < REELS; r++) {
    const strip = STRIPS[mode][r];
    const n = strip.length;
    const ok: number[] = [];
    for (let s = 0; s < n; s++) {
      const mid = strip[(s + 1) % n];
      if (mid === 'H4' || (r > 0 && mid === 'WILD')) ok.push((s + n) % n);
    }
    stops.push(pick(rng, ok, 0));
  }
  return spinAtStops(mode, bet, stops, rng);
}

function forcedSpin(force: ForceOutcome, mode: SpinMode, bet: number, rng: Rng): SpinResult {
  let last: SpinResult | null = null;
  for (let i = 0; i < FORCE_MAX_ITERATIONS; i++) {
    const stops = candidateStops(force, mode, rng);
    const res = evaluateGrid(buildGrid(mode, stops, rng), mode, bet, stops);
    if (satisfies(force, res)) return res;
    last = res;
  }
  if (force === 'bigwin') return bigWinFallback(mode, bet, rng);
  return last as SpinResult; // honest result of a real spin (practically unreachable)
}

export function spin(opts: SpinOptions): SpinResult {
  const rng = opts.rng ?? createRng();
  const { mode, bet } = opts;
  if (opts.force) return forcedSpin(opts.force, mode, bet, rng);
  const stops = randomStops(mode, rng);
  return evaluateGrid(buildGrid(mode, stops, rng), mode, bet, stops);
}
