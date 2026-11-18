/**
 * SHARED CONTRACT – engine output consumed by store, visuals, audio, reveal.
 * Do not change shapes without updating all consumers.
 */

export const REELS = 5;
export const ROWS = 3;

/** L* = low (crystals), H* = high (planet, comet, rocket, gold star). */
export type SymbolId =
  | 'L1' // ruby crystal
  | 'L2' // emerald crystal
  | 'L3' // sapphire crystal
  | 'L4' // amethyst crystal
  | 'H1' // ringed planet
  | 'H2' // comet
  | 'H3' // rocket
  | 'H4' // gold star (top regular symbol)
  | 'WILD' // black hole – substitutes all except SCATTER/COIN/COLLECT
  | 'SCATTER' // supernova – 3+ anywhere triggers free spins
  | 'COIN' // star coin – carries coinValue (multiplier of bet)
  | 'COLLECT'; // collector – collects all COIN values on screen

export const ALL_SYMBOLS: SymbolId[] = [
  'L1', 'L2', 'L3', 'L4', 'H1', 'H2', 'H3', 'H4', 'WILD', 'SCATTER', 'COIN', 'COLLECT',
];

export interface Cell {
  symbol: SymbolId;
  /** Only for COIN: multiplier of total bet (e.g. 2 = 2x bet). */
  coinValue?: number;
}

/** grid[reel][row], reel 0..4 left→right, row 0..2 top→bottom. */
export type Grid = Cell[][];

/** [reel, row] */
export type Pos = [number, number];

export interface LineWin {
  lineIndex: number; // index into PAYLINES
  symbol: SymbolId; // paying symbol (never WILD unless pure wild line)
  count: number; // 3..5
  positions: Pos[]; // cells forming the win
  payout: number; // credits
}

export interface CoinCollect {
  coinPositions: Pos[];
  collectPositions: Pos[];
  /** credits paid by the collect feature */
  total: number;
}

export type NearMissKind =
  | 'scatter' // 2 scatters landed, 3rd missed (classic bonus near-miss)
  | 'coin' // coins on screen but no collector (teaser)
  | 'line'; // 4 of a high symbol / high symbol stopping just above/below payline

export interface NearMissInfo {
  kind: NearMissKind;
  /** human-readable fact used by the reveal mode (German) */
  detail: string;
  /** e.g. reel that "missed" */
  reel?: number;
  /** probability info for reveal, e.g. scatter count on that reel strip */
  stripFact?: { reel: number; symbol: SymbolId; countOnStrip: number; stripLength: number };
}

export type WinTier = 'none' | 'small' | 'big' | 'mega' | 'epic';

/** Tier thresholds as multiples of bet (totalWin / bet). */
export const WIN_TIER_THRESHOLDS = { big: 10, mega: 25, epic: 50 } as const;

export type SpinMode = 'base' | 'free';

export interface SpinResult {
  mode: SpinMode;
  bet: number;
  grid: Grid;
  /** Strip stop index per reel (for visuals, optional use). */
  stops: number[];
  lineWins: LineWin[];
  scatterPositions: Pos[];
  coinCollect: CoinCollect | null;
  /** Sum of line wins + coin collect, in credits. */
  totalWin: number;
  /** Free spins awarded by this spin (trigger or retrigger), 0 if none. */
  freeSpinsAwarded: number;
  /**
   * If set, reels with index >= this value should spin longer/slower
   * (anticipation) because 2 scatters already landed on earlier reels.
   */
  anticipationFromReel: number | null;
  nearMiss: NearMissInfo | null;
  /** Loss disguised as win: 0 < totalWin < bet in base game. */
  isLDW: boolean;
  winTier: WinTier;
}

export type ForceOutcome = 'bigwin' | 'freespins' | 'nearmiss' | 'ldw' | 'coins';

export interface Rng {
  /** float in [0,1) */
  next(): number;
  /** integer in [0, n) */
  int(n: number): number;
}

export interface SpinOptions {
  bet: number;
  mode: SpinMode;
  rng?: Rng;
  force?: ForceOutcome;
}

/** Bet ladder in credits (1 credit = 1 CHF in reveal mode). */
export const BET_STEPS = [0.2, 0.4, 0.6, 1, 2, 3, 5, 10] as const;
/** Dark pattern (default effect): preselected bet is higher than minimum. */
export const DEFAULT_BET = 2;
export const START_BALANCE = 1000;
export const FREE_SPINS_AWARD = 10;
/** "Bonus kaufen" price as multiple of bet. */
export const BONUS_BUY_COST_X = 100;
