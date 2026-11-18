/**
 * Pure evaluation of a visible grid → SpinResult. No randomness in here.
 */
import { PAYLINES } from './paylines';
import {
  FREE_SPINS_RETRIGGER,
  PAYTABLE,
  SCATTER_PAYS,
  isLineSymbol,
  roundCredits,
  type LineSymbol,
} from './paytable';
import { countOnStrip, stripLength } from './reels';
import {
  FREE_SPINS_AWARD,
  REELS,
  ROWS,
  WIN_TIER_THRESHOLDS,
  type CoinCollect,
  type Grid,
  type LineWin,
  type NearMissInfo,
  type Pos,
  type SpinMode,
  type SpinResult,
  type SymbolId,
  type WinTier,
} from './types';

/** Number of paylines; lineBet = bet / LINES. */
export const LINES = PAYLINES.length;

/** Evaluate one payline. Returns the best-paying combination or null. */
export function evaluateLine(grid: Grid, lineIndex: number, bet: number): LineWin | null {
  const line = PAYLINES[lineIndex];
  const syms: SymbolId[] = line.map((row, reel) => grid[reel][row].symbol);
  if (!isLineSymbol(syms[0])) return null;

  // Leading wild run
  let wildRun = 0;
  while (wildRun < REELS && syms[wildRun] === 'WILD') wildRun++;

  // Best regular-symbol combination (leading wilds substitute)
  let best: { symbol: LineSymbol; count: number; mult: number } | null = null;
  if (wildRun < REELS && isLineSymbol(syms[wildRun])) {
    const base = syms[wildRun] as LineSymbol;
    let count = wildRun;
    while (count < REELS && (syms[count] === base || syms[count] === 'WILD')) count++;
    if (count >= 3) best = { symbol: base, count, mult: PAYTABLE[base][count as 3 | 4 | 5] };
  }
  // Pure wild line pays its own row (= H4 row); chosen only if strictly better.
  if (wildRun >= 3) {
    const mult = PAYTABLE.WILD[wildRun as 3 | 4 | 5];
    if (!best || mult > best.mult) best = { symbol: 'WILD', count: wildRun, mult };
  }
  if (!best) return null;
  const positions: Pos[] = [];
  for (let r = 0; r < best.count; r++) positions.push([r, line[r]]);
  return {
    lineIndex,
    symbol: best.symbol,
    count: best.count,
    positions,
    payout: roundCredits((best.mult * bet) / LINES),
  };
}

export function evaluateLines(grid: Grid, bet: number): LineWin[] {
  const wins: LineWin[] = [];
  for (let i = 0; i < LINES; i++) {
    const w = evaluateLine(grid, i, bet);
    if (w) wins.push(w);
  }
  return wins;
}

export function findSymbol(grid: Grid, symbol: SymbolId): Pos[] {
  const out: Pos[] = [];
  for (let r = 0; r < REELS; r++) for (let row = 0; row < ROWS; row++) if (grid[r][row].symbol === symbol) out.push([r, row]);
  return out;
}

export function scatterPayout(count: number, bet: number): number {
  if (count < 3) return 0;
  return roundCredits(SCATTER_PAYS[Math.min(count, 5) as 3 | 4 | 5] * bet);
}

/**
 * Scatter win contained in a result's totalWin (there is no dedicated field in
 * SpinResult): totalWin = Σ lineWins + scatter pay + coinCollect.total.
 */
export function getScatterWin(result: SpinResult): number {
  return scatterPayout(result.scatterPositions.length, result.bet);
}

export function evaluateCoins(grid: Grid, bet: number): CoinCollect | null {
  const collectPositions = findSymbol(grid, 'COLLECT');
  if (collectPositions.length === 0) return null;
  const coinPositions = findSymbol(grid, 'COIN');
  if (coinPositions.length === 0) return null;
  const sum = coinPositions.reduce((a, [r, row]) => a + (grid[r][row].coinValue ?? 0), 0);
  return { coinPositions, collectPositions, total: roundCredits(sum * bet * collectPositions.length) };
}

/** First reel index (≤4) after the 2nd scatter landed walking left→right, else null. */
export function computeAnticipation(grid: Grid): number | null {
  let seen = 0;
  for (let r = 0; r < REELS; r++) {
    if (grid[r].some((c) => c.symbol === 'SCATTER')) seen++;
    if (seen >= 2) return r + 1 <= REELS - 1 ? r + 1 : null;
  }
  return null;
}

export function computeWinTier(totalWin: number, bet: number): WinTier {
  if (totalWin <= 0) return 'none';
  const x = totalWin / bet;
  if (x >= WIN_TIER_THRESHOLDS.epic) return 'epic';
  if (x >= WIN_TIER_THRESHOLDS.mega) return 'mega';
  if (x >= WIN_TIER_THRESHOLDS.big) return 'big';
  return 'small';
}

// ── German labels (Swiss spelling: never "ß") ───────────────────────────────
const NAME_SINGULAR: Record<SymbolId, string> = {
  L1: 'Rubin', L2: 'Smaragd', L3: 'Saphir', L4: 'Amethyst',
  H1: 'Ringplanet', H2: 'Komet', H3: 'Rakete', H4: 'Goldstern',
  WILD: 'Schwarzes Loch', SCATTER: 'Supernova', COIN: 'Sternmünze', COLLECT: 'Sammler',
};
const NAME_PLURAL: Record<SymbolId, string> = {
  L1: 'Rubine', L2: 'Smaragde', L3: 'Saphire', L4: 'Amethyste',
  H1: 'Ringplaneten', H2: 'Kometen', H3: 'Raketen', H4: 'Goldsterne',
  WILD: 'Schwarze Löcher', SCATTER: 'Supernovas', COIN: 'Sternmünzen', COLLECT: 'Sammler',
};
const NUM_WORD = ['Null', 'Ein', 'Zwei', 'Drei', 'Vier', 'Fünf', 'Sechs', 'Sieben', 'Acht'];
const fmt = (x: number) => (Number.isInteger(x) ? String(x) : String(Math.round(x * 100) / 100));
const symCount = (n: number, s: SymbolId) => `${n} ${n === 1 ? NAME_SINGULAR[s] : NAME_PLURAL[s]}`;

export function computeNearMiss(
  grid: Grid,
  mode: SpinMode,
  scatterCount: number,
  coinCollect: CoinCollect | null,
  lineWins: LineWin[],
): NearMissInfo | null {
  // 1) Scatter: exactly 2 supernovas → no trigger / retrigger.
  if (scatterCount === 2) {
    // The reel that "needed" the third one: last reel without a visible scatter
    // (with 2 early scatters that's the last anticipated reel, i.e. reel 5).
    let reel = REELS - 1;
    while (reel > 0 && grid[reel].some((c) => c.symbol === 'SCATTER')) reel--;
    const countOn = countOnStrip(mode, reel, 'SCATTER');
    const len = stripLength(mode, reel);
    return {
      kind: 'scatter',
      reel,
      detail:
        `Zwei Supernovas – die dritte fehlte knapp. Auf Walze ${reel + 1} gibt es nur ` +
        `${symCount(countOn, 'SCATTER')} auf ${len} Positionen.`,
      stripFact: { reel, symbol: 'SCATTER', countOnStrip: countOn, stripLength: len },
    };
  }

  // 2) Coin teaser: ≥2 coins on screen, but no collector.
  if (!coinCollect) {
    const coins = findSymbol(grid, 'COIN');
    if (coins.length >= 2) {
      const sum = coins.reduce((a, [r, row]) => a + (grid[r][row].coinValue ?? 0), 0);
      const reel = REELS - 1;
      const countOn = countOnStrip(mode, reel, 'COLLECT');
      const len = stripLength(mode, reel);
      return {
        kind: 'coin',
        reel,
        detail:
          `${NUM_WORD[coins.length] ?? coins.length} Sternmünzen im Wert von ${fmt(sum)}× Einsatz – ` +
          `aber kein Sammler. Auf Walze 5 steht der Sammler nur ${countOn}× auf ${len} Positionen.`,
        stripFact: { reel, symbol: 'COLLECT', countOnStrip: countOn, stripLength: len },
      };
    }
  }

  // 3) Line: 4 of a kind of a top symbol (H3, H4, pure WILD) – the 5th missed.
  const four = lineWins.find((w) => w.count === 4 && (w.symbol === 'H3' || w.symbol === 'H4' || w.symbol === 'WILD'));
  if (four && !lineWins.some((w) => w.count === 5)) {
    const s = four.symbol as LineSymbol;
    const p4 = PAYTABLE[s][4] / LINES;
    const p5 = PAYTABLE[s][5] / LINES;
    const reel = REELS - 1;
    const countOn = countOnStrip(mode, reel, s);
    const len = stripLength(mode, reel);
    return {
      kind: 'line',
      reel,
      detail:
        `Vier ${NAME_PLURAL[s]} auf Linie ${four.lineIndex + 1} – mit einem fünften wären es ${fmt(p5)}× ` +
        `statt ${fmt(p4)}× Einsatz gewesen. Auf Walze 5 gibt es ${symCount(countOn, s)} auf ${len} Positionen.`,
      stripFact: { reel, symbol: s, countOnStrip: countOn, stripLength: len },
    };
  }
  return null;
}

/** Evaluate a fully built grid (coin values already assigned). */
export function evaluateGrid(grid: Grid, mode: SpinMode, bet: number, stops: number[]): SpinResult {
  const lineWins = evaluateLines(grid, bet);
  const scatterPositions = findSymbol(grid, 'SCATTER');
  const scatterCount = scatterPositions.length;
  const coinCollect = evaluateCoins(grid, bet);
  const lineTotal = lineWins.reduce((a, w) => a + w.payout, 0);
  const totalWin = roundCredits(lineTotal + scatterPayout(scatterCount, bet) + (coinCollect?.total ?? 0));
  const freeSpinsAwarded = scatterCount >= 3 ? (mode === 'base' ? FREE_SPINS_AWARD : FREE_SPINS_RETRIGGER) : 0;
  return {
    mode,
    bet,
    grid,
    stops,
    lineWins,
    scatterPositions,
    coinCollect,
    totalWin,
    freeSpinsAwarded,
    anticipationFromReel: computeAnticipation(grid),
    nearMiss: computeNearMiss(grid, mode, scatterCount, coinCollect, lineWins),
    isLDW: mode === 'base' && totalWin > 0 && totalWin < bet,
    winTier: computeWinTier(totalWin, bet),
  };
}
