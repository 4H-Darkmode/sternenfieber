// PLACEHOLDER – Agent A (engine) replaces this with the real math.
// Contract: export function spin(opts: SpinOptions): SpinResult
import type { Cell, SpinOptions, SpinResult, SymbolId } from './types';
import { createRng } from './rng';

const POOL: SymbolId[] = ['L1', 'L2', 'L3', 'L4', 'H1', 'H2', 'H3', 'H4', 'WILD', 'SCATTER', 'COIN'];

export function spin(opts: SpinOptions): SpinResult {
  const rng = opts.rng ?? createRng();
  const grid: Cell[][] = Array.from({ length: 5 }, () =>
    Array.from({ length: 3 }, () => {
      const symbol = POOL[rng.int(POOL.length)];
      return symbol === 'COIN' ? { symbol, coinValue: 2 } : { symbol };
    }),
  );
  return {
    mode: opts.mode, bet: opts.bet, grid, stops: [0, 0, 0, 0, 0], lineWins: [], scatterPositions: [],
    coinCollect: null, totalWin: 0, freeSpinsAwarded: 0, anticipationFromReel: null, nearMiss: null,
    isLDW: false, winTier: 'none',
  };
}
