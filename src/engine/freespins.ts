import { MAX_FREE_SPINS_PER_ROUND, roundCredits } from './paytable';
import { spin } from './spin';
import { FREE_SPINS_AWARD, type Rng, type SpinResult } from './types';

export interface FreeSpinsRound {
  /** Sum of all free-spin wins (credits). */
  totalWin: number;
  spinsPlayed: number;
  retriggers: number;
  /** Per-spin results (omitted when keepResults = false, e.g. in simulation). */
  results: SpinResult[];
}

/**
 * Play a complete free-spins round (10 spins, +5 per retrigger, capped).
 * Used for simulation and for the bonus-buy EV. No bet is deducted.
 */
export function playFreeSpinsRound(
  bet: number,
  rng: Rng,
  opts: { initialSpins?: number; keepResults?: boolean } = {},
): FreeSpinsRound {
  const keep = opts.keepResults ?? true;
  let remaining = opts.initialSpins ?? FREE_SPINS_AWARD;
  let played = 0;
  let retriggers = 0;
  let total = 0;
  const results: SpinResult[] = [];
  while (remaining > 0 && played < MAX_FREE_SPINS_PER_ROUND) {
    remaining--;
    played++;
    const res = spin({ bet, mode: 'free', rng });
    total += res.totalWin;
    if (res.freeSpinsAwarded > 0) {
      retriggers++;
      remaining += res.freeSpinsAwarded;
    }
    if (keep) results.push(res);
  }
  return { totalWin: roundCredits(total), spinsPlayed: played, retriggers, results };
}
