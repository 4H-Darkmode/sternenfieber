/**
 * DEV ONLY – fake SpinResults to exercise the visuals without the engine.
 * Not a fair game; no maths here.
 */
import { PAYLINES } from '../../engine/paylines';
import {
  FREE_SPINS_AWARD, REELS, ROWS, WIN_TIER_THRESHOLDS,
  type Cell, type LineWin, type Pos, type SpinMode, type SpinResult, type SymbolId, type WinTier,
} from '../../engine/types';

export type MockKind = 'random' | 'nearmiss' | 'nearmissHit' | 'line' | 'coins' | 'bigwin' | 'freespins';

export const MOCK_LABELS: Record<MockKind, string> = {
  random: 'Zufall (meist Verlust)',
  nearmiss: 'Near-Miss (Antizipation)',
  nearmissHit: 'Antizipation → Treffer',
  line: 'Linien-Gewinn',
  coins: 'Münzen + Sammler',
  bigwin: 'Big / Mega / Epic Win',
  freespins: 'Freispiele auslösen',
};

const PLAIN: SymbolId[] = ['L1', 'L1', 'L2', 'L2', 'L3', 'L3', 'L4', 'L4', 'H1', 'H2', 'H3', 'H4', 'WILD'];
const pick = <T,>(a: readonly T[]): T => a[Math.floor(Math.random() * a.length)];
const randInt = (n: number) => Math.floor(Math.random() * n);

function plainGrid(): Cell[][] {
  return Array.from({ length: REELS }, () =>
    Array.from({ length: ROWS }, () => ({ symbol: pick(PLAIN.filter((s) => s !== 'WILD' || Math.random() < 0.3)) })),
  );
}

function tierFor(total: number, bet: number): WinTier {
  const x = total / bet;
  if (x >= WIN_TIER_THRESHOLDS.epic) return 'epic';
  if (x >= WIN_TIER_THRESHOLDS.mega) return 'mega';
  if (x >= WIN_TIER_THRESHOLDS.big) return 'big';
  return total > 0 ? 'small' : 'none';
}

function base(mode: SpinMode, bet: number, grid: Cell[][]): SpinResult {
  return {
    mode, bet, grid, stops: [0, 0, 0, 0, 0], lineWins: [], scatterPositions: [], coinCollect: null,
    totalWin: 0, freeSpinsAwarded: 0, anticipationFromReel: null, nearMiss: null, isLDW: false, winTier: 'none',
  };
}

function placeLine(grid: Cell[][], lineIndex: number, symbol: SymbolId, count: number): Pos[] {
  const line = PAYLINES[lineIndex];
  const positions: Pos[] = [];
  for (let r = 0; r < count; r++) {
    grid[r][line[r]] = { symbol: r === 1 && Math.random() < 0.3 ? 'WILD' : symbol };
    positions.push([r, line[r]]);
  }
  // break the line after `count`
  if (count < REELS) {
    const nr = count;
    if (grid[nr][line[nr]].symbol === symbol || grid[nr][line[nr]].symbol === 'WILD') {
      grid[nr][line[nr]] = { symbol: symbol === 'L1' ? 'L2' : 'L1' };
    }
  }
  return positions;
}

function scatterAt(grid: Cell[][], reel: number): Pos {
  const row = randInt(ROWS);
  grid[reel][row] = { symbol: 'SCATTER' };
  return [reel, row];
}

export function makeMockResult(kind: MockKind, bet: number, mode: SpinMode = 'base'): SpinResult {
  const grid = plainGrid();
  const res = base(mode, bet, grid);

  switch (kind) {
    case 'random': {
      if (Math.random() < 0.35) res.scatterPositions.push(scatterAt(grid, randInt(REELS)));
      break;
    }
    case 'nearmiss':
    case 'nearmissHit':
    case 'freespins': {
      const reels = kind === 'freespins' ? [0, 2, 4] : kind === 'nearmissHit' ? [0, 1, 3] : [0, 2];
      reels.forEach((r) => res.scatterPositions.push(scatterAt(grid, r)));
      // anticipation starts after the 2nd scatter's reel
      res.anticipationFromReel = reels[1] + 1 < REELS ? reels[1] + 1 : null;
      if (reels.length >= 3) {
        res.freeSpinsAwarded = FREE_SPINS_AWARD;
      } else {
        res.nearMiss = {
          kind: 'scatter',
          detail: 'Zwei Supernovas gelandet – die dritte hat «knapp» gefehlt.',
          reel: 4,
        };
      }
      break;
    }
    case 'line': {
      const lines = Math.random() < 0.5 ? [randInt(10)] : [randInt(5), 5 + randInt(5)];
      const wins: LineWin[] = [];
      lines.forEach((li) => {
        const symbol = pick<SymbolId>(['L1', 'L2', 'L3', 'L4', 'H1', 'H2', 'H3']);
        const count = 3 + randInt(3);
        const positions = placeLine(grid, li, symbol, count);
        wins.push({ lineIndex: li, symbol, count, positions, payout: +(bet * (0.4 + count * 0.6)).toFixed(2) });
      });
      res.lineWins = wins;
      break;
    }
    case 'coins': {
      const coinPositions: Pos[] = [];
      const values = [1, 2, 2, 3, 5, 10];
      let sum = 0;
      [0, 1, 2, 3].forEach((r) => {
        if (r === 2 && Math.random() < 0.4) return;
        const row = randInt(ROWS);
        const v = pick(values);
        sum += v;
        grid[r][row] = { symbol: 'COIN', coinValue: v };
        coinPositions.push([r, row]);
      });
      const crow = randInt(ROWS);
      grid[4][crow] = { symbol: 'COLLECT' };
      res.coinCollect = { coinPositions, collectPositions: [[4, crow]], total: sum * bet };
      break;
    }
    case 'bigwin': {
      const target = pick([14, 32, 75]);
      const li = randInt(10);
      const positions = placeLine(grid, li, 'H4', 5);
      const li2 = (li + 3) % 10;
      const symbol2: SymbolId = 'H1';
      const pos2 = placeLine(grid, li2, symbol2, 4);
      // re-apply first line in case the 2nd overwrote a cell
      placeLine(grid, li, 'H4', 5);
      const p2 = +(bet * 3).toFixed(2);
      res.lineWins = [
        { lineIndex: li, symbol: 'H4', count: 5, positions, payout: +(bet * target - p2).toFixed(2) },
        { lineIndex: li2, symbol: symbol2, count: 4, positions: pos2.filter(([r, row]) => grid[r][row].symbol !== 'H4' || r === 1), payout: p2 },
      ];
      break;
    }
  }

  res.totalWin = +(res.lineWins.reduce((a, w) => a + w.payout, 0) + (res.coinCollect?.total ?? 0)).toFixed(2);
  res.winTier = tierFor(res.totalWin, bet);
  res.isLDW = mode === 'base' && res.totalWin > 0 && res.totalWin < bet;
  return res;
}
