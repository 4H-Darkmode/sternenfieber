import type { SpinMode, SymbolId } from './types';

/** Symbols that can form line wins (WILD only pays on a pure-wild line). */
export type LineSymbol = 'L1' | 'L2' | 'L3' | 'L4' | 'H1' | 'H2' | 'H3' | 'H4' | 'WILD';

export const LINE_SYMBOLS: readonly LineSymbol[] = ['L1', 'L2', 'L3', 'L4', 'H1', 'H2', 'H3', 'H4', 'WILD'];

export const isLineSymbol = (s: SymbolId): s is LineSymbol =>
  s !== 'SCATTER' && s !== 'COIN' && s !== 'COLLECT';

/**
 * Line pays as multiples of the LINE bet (lineBet = totalBet / 25, i.e. bet / PAYLINES.length).
 * payout = PAYTABLE[symbol][count] * lineBet.
 * A pure line of WILDs (3+ wilds from reel 0, not extended by a regular symbol)
 * pays with its own row, which equals the H4 (gold star) row.
 */
export const PAYTABLE: Record<LineSymbol, Record<3 | 4 | 5, number>> = {
  L1: { 3: 5, 4: 25, 5: 40 },
  L2: { 3: 5, 4: 25, 5: 45 },
  L3: { 3: 5, 4: 25, 5: 50 },
  L4: { 3: 5, 4: 25, 5: 60 },
  H1: { 3: 10, 4: 40, 5: 125 },
  H2: { 3: 15, 4: 50, 5: 175 },
  H3: { 3: 20, 4: 75, 5: 300 },
  H4: { 3: 30, 4: 125, 5: 600 },
  WILD: { 3: 30, 4: 125, 5: 600 },
};

/** Scatter pays as multiples of the TOTAL bet, by number of scatters anywhere. */
export const SCATTER_PAYS: Record<3 | 4 | 5, number> = { 3: 2, 4: 10, 5: 50 };

/** Free spins awarded by a retrigger (3+ scatters during free spins). */
export const FREE_SPINS_RETRIGGER = 5;

/** Hard cap on free spins played in one round (safety net). */
export const MAX_FREE_SPINS_PER_ROUND = 100;

/** Coin values (multiples of TOTAL bet) with weights, per mode. */
export const COIN_VALUE_WEIGHTS: Record<SpinMode, readonly (readonly [value: number, weight: number])[]> = {
  base: [
    [0.5, 38],
    [1, 30],
    [2, 19],
    [5, 9],
    [10, 3],
    [25, 0.8],
    [50, 0.2],
  ],
  free: [
    [0.5, 23],
    [1, 28],
    [2, 22],
    [5, 15],
    [10, 8],
    [25, 3],
    [50, 1],
  ],
};

/** Expected coin value (x bet) for a mode – handy for docs/tests. */
export function expectedCoinValue(mode: SpinMode): number {
  const t = COIN_VALUE_WEIGHTS[mode];
  const w = t.reduce((a, [, wt]) => a + wt, 0);
  return t.reduce((a, [v, wt]) => a + v * wt, 0) / w;
}

/** Credits are rounded to 1/100 (Rappen) to avoid float noise. */
export const roundCredits = (x: number) => Math.round(x * 100) / 100;
