import { describe, expect, it } from 'vitest';
import {
  LINES,
  computeAnticipation,
  computeWinTier,
  evaluateGrid,
  evaluateLine,
  getScatterWin,
} from './evaluate';
import { PAYTABLE, roundCredits } from './paytable';
import { PAYLINES, PAYLINE_COLORS } from './paylines';
import { BET_STEPS } from './types';
import { countOnStrip, stripLength } from './reels';
import type { Cell, Grid, SymbolId } from './types';

type Col = [SymbolId | Cell, SymbolId | Cell, SymbolId | Cell];
const cell = (c: SymbolId | Cell): Cell => (typeof c === 'string' ? { symbol: c } : c);
const g = (...cols: Col[]): Grid => cols.map((col) => col.map(cell));
const coin = (v: number): Cell => ({ symbol: 'COIN', coinValue: v });
const STOPS = [0, 0, 0, 0, 0];

/**
 * Base layout: only the middle row (line 1, index 0) can win; top/bottom rows
 * are all distinct per column so no other payline matches.
 */
const middle = (m: [SymbolId, SymbolId, SymbolId, SymbolId, SymbolId]): Grid =>
  g(
    ['H1', m[0], 'H2'],
    ['H3', m[1], 'L2'],
    ['L3', m[2], 'L4'],
    ['H4', m[3], 'H1'],
    ['L2', m[4], 'L4'],
  );

describe('paylines', () => {
  it('has 25 unique lines, the first 10 unchanged', () => {
    expect(PAYLINES).toHaveLength(25);
    expect(LINES).toBe(25);
    expect(new Set(PAYLINES.map((l) => l.join(''))).size).toBe(25);
    PAYLINES.forEach((l) => {
      expect(l).toHaveLength(5);
      l.forEach((row) => expect([0, 1, 2]).toContain(row));
    });
    expect(PAYLINES.slice(0, 10).map((l) => l.join(''))).toEqual([
      '11111', '00000', '22222', '01210', '21012', '00122', '22100', '10001', '12221', '10121',
    ]);
  });
  it('has 25 distinct colours', () => {
    expect(PAYLINE_COLORS).toHaveLength(25);
    expect(new Set(PAYLINE_COLORS.map((c) => c.toLowerCase())).size).toBe(25);
  });
});

describe('minimum wins', () => {
  const minBet = Math.min(...BET_STEPS);
  it('every paytable entry pays at least 0.04 at the smallest bet', () => {
    for (const row of Object.values(PAYTABLE)) {
      for (const c of [3, 4, 5] as const) {
        expect(roundCredits((row[c] * minBet) / LINES)).toBeGreaterThanOrEqual(0.04);
      }
    }
  });
  it('a 3x low-symbol line at bet 0.20 shows a visible 0.04', () => {
    const r = evaluateGrid(middle(['L1', 'L1', 'L1', 'H2', 'L3']), 'base', minBet, STOPS);
    expect(r.totalWin).toBe(0.04);
    expect(r.isLDW).toBe(true);
  });
});

describe('payline evaluation', () => {
  it('pays 3 of a kind from reel 1 on the middle line', () => {
    const r = evaluateGrid(middle(['L1', 'L1', 'L1', 'H2', 'L3']), 'base', 1, STOPS);
    expect(r.lineWins).toHaveLength(1);
    const w = r.lineWins[0];
    expect(w).toMatchObject({ lineIndex: 0, symbol: 'L1', count: 3 });
    expect(w.positions).toEqual([[0, 1], [1, 1], [2, 1]]);
    expect(w.payout).toBeCloseTo(PAYTABLE.L1[3] / LINES);
    expect(r.totalWin).toBeCloseTo(0.2);
  });

  it('requires the run to start on reel 1', () => {
    const r = evaluateGrid(middle(['L2', 'L1', 'L1', 'L1', 'L1']), 'base', 1, STOPS);
    expect(r.lineWins).toHaveLength(0);
    expect(r.totalWin).toBe(0);
  });

  it('pays 5 of a kind and scales with bet (line bet = bet/25)', () => {
    const r = evaluateGrid(middle(['H4', 'H4', 'H4', 'H4', 'H4']), 'base', 2, STOPS);
    const w = r.lineWins.find((x) => x.lineIndex === 0)!;
    expect(w).toMatchObject({ symbol: 'H4', count: 5 });
    expect(w.payout).toBeCloseTo((PAYTABLE.H4[5] * 2) / LINES);
  });

  it('evaluates every payline independently', () => {
    // top row L1 on all reels and bottom row L3 on all reels; middle row breaks
    const grid = g(
      ['L1', 'H1', 'L3'],
      ['L1', 'H2', 'L3'],
      ['L1', 'H3', 'L3'],
      ['L1', 'H4', 'L3'],
      ['L1', 'H1', 'L3'],
    );
    const r = evaluateGrid(grid, 'base', 1, STOPS);
    const byLine = Object.fromEntries(r.lineWins.map((w) => [w.lineIndex, w]));
    expect(byLine[1]).toMatchObject({ symbol: 'L1', count: 5 });
    expect(byLine[2]).toMatchObject({ symbol: 'L3', count: 5 });
    // line 6 [0,0,1,2,2] → L1 L1 H3 → nothing
    expect(byLine[5]).toBeUndefined();
  });
});

describe('wild substitution', () => {
  it('wild in the middle substitutes', () => {
    const w = evaluateLine(middle(['L1', 'WILD', 'L1', 'H2', 'L3']), 0, 1)!;
    expect(w).toMatchObject({ symbol: 'L1', count: 3 });
  });

  it('leading wilds extend the first regular symbol', () => {
    const w = evaluateLine(middle(['WILD', 'H4', 'H4', 'L2', 'L3']), 0, 1)!;
    expect(w).toMatchObject({ symbol: 'H4', count: 3 });
  });

  it('pure wild line pays its own (H4) row when that is better', () => {
    // WILD WILD WILD L1 L2 → L1x4 = 25 vs WILDx3 = 30 → wild line wins
    const w = evaluateLine(middle(['WILD', 'WILD', 'WILD', 'L1', 'L2']), 0, 1)!;
    expect(w).toMatchObject({ symbol: 'WILD', count: 3 });
    expect(w.payout).toBeCloseTo(PAYTABLE.WILD[3] / LINES);
  });

  it('prefers the regular symbol when it pays more', () => {
    const w = evaluateLine(middle(['WILD', 'WILD', 'WILD', 'H4', 'L2']), 0, 1)!;
    expect(w).toMatchObject({ symbol: 'H4', count: 4 });
  });

  it('five wilds pay as WILD x5', () => {
    const w = evaluateLine(middle(['WILD', 'WILD', 'WILD', 'WILD', 'WILD']), 0, 1)!;
    expect(w).toMatchObject({ symbol: 'WILD', count: 5 });
  });

  it('wild does not substitute scatter / coin', () => {
    expect(evaluateLine(middle(['SCATTER', 'WILD', 'SCATTER', 'L1', 'L2']), 0, 1)).toBeNull();
    expect(evaluateLine(middle(['WILD', 'COIN', 'WILD', 'L1', 'L2']), 0, 1)).toBeNull();
  });
});

describe('scatter', () => {
  const three = g(
    ['SCATTER', 'L1', 'H2'],
    ['H3', 'SCATTER', 'L2'],
    ['L3', 'H1', 'SCATTER'],
    ['H4', 'L2', 'H1'],
    ['L2', 'L3', 'L4'],
  );
  it('3 scatters trigger 10 free spins and pay 2x bet', () => {
    const r = evaluateGrid(three, 'base', 2, STOPS);
    expect(r.scatterPositions).toHaveLength(3);
    expect(r.freeSpinsAwarded).toBe(10);
    expect(getScatterWin(r)).toBeCloseTo(4);
    expect(r.totalWin).toBeCloseTo(4 + r.lineWins.reduce((a, w) => a + w.payout, 0));
    expect(r.nearMiss).toBeNull();
  });
  it('3 scatters in free spins retrigger +5', () => {
    expect(evaluateGrid(three, 'free', 1, STOPS).freeSpinsAwarded).toBe(5);
  });
  it('5 scatters pay 50x', () => {
    const r = evaluateGrid(
      g(['SCATTER', 'L1', 'H2'], ['SCATTER', 'L1', 'L2'], ['SCATTER', 'H1', 'L3'], ['SCATTER', 'L2', 'H1'], ['SCATTER', 'L3', 'L4']),
      'base', 1, STOPS,
    );
    expect(getScatterWin(r)).toBe(50);
    expect(r.winTier).toBe('epic');
  });
});

describe('coin collect', () => {
  it('collector collects all coin values x bet', () => {
    const grid = g(
      [coin(2), 'L1', 'H2'],
      ['H3', 'H1', 'L2'],
      ['L3', coin(5), 'L4'],
      ['H4', 'L2', coin(0.5)],
      ['L2', 'COLLECT', 'L4'],
    );
    const r = evaluateGrid(grid, 'base', 2, STOPS);
    expect(r.coinCollect).not.toBeNull();
    expect(r.coinCollect!.coinPositions).toHaveLength(3);
    expect(r.coinCollect!.collectPositions).toEqual([[4, 1]]);
    expect(r.coinCollect!.total).toBeCloseTo(7.5 * 2);
    expect(r.totalWin).toBeCloseTo(15);
    expect(r.winTier).toBe('small');
  });

  it('coins without collector pay nothing and are a coin near-miss (≥2 coins)', () => {
    const grid = g(
      [coin(2), 'L1', 'H2'],
      ['H3', 'H1', 'L2'],
      ['L3', coin(10), 'L4'],
      ['H4', 'L2', 'H1'],
      ['L2', 'L3', 'L4'],
    );
    const r = evaluateGrid(grid, 'base', 1, STOPS);
    expect(r.coinCollect).toBeNull();
    expect(r.totalWin).toBe(0);
    expect(r.nearMiss?.kind).toBe('coin');
    expect(r.nearMiss?.detail).toContain('12× Einsatz');
    expect(r.nearMiss?.stripFact?.symbol).toBe('COLLECT');
  });

  it('collector without coins pays nothing', () => {
    const grid = middle(['L2', 'H1', 'L3', 'H2', 'COLLECT']);
    expect(evaluateGrid(grid, 'base', 1, STOPS).coinCollect).toBeNull();
  });
});

describe('anticipation & scatter near-miss', () => {
  const withScatters = (reels: number[]): Grid =>
    g(
      ...[0, 1, 2, 3, 4].map((r): Col => {
        const fill: Col = [(['H1', 'H3', 'L3', 'H4', 'L2'] as SymbolId[])[r], (['L1', 'H1', 'H2', 'L2', 'L3'] as SymbolId[])[r], (['H2', 'L2', 'L4', 'H1', 'L4'] as SymbolId[])[r]];
        if (reels.includes(r)) fill[r % 3] = 'SCATTER';
        return fill;
      }),
    );

  it.each([
    [[0, 1], 2],
    [[0, 2], 3],
    [[1, 2], 3],
    [[0, 3], 4],
    [[2, 3], 4],
    [[0, 4], null],
    [[3, 4], null],
    [[0], null],
    [[], null],
  ])('scatters on reels %j → anticipationFromReel %j', (reels, expected) => {
    expect(computeAnticipation(withScatters(reels))).toBe(expected);
  });

  it('3 scatters still anticipate from after the 2nd', () => {
    expect(computeAnticipation(withScatters([0, 1, 3]))).toBe(2);
  });

  it('exactly 2 scatters → scatter near-miss with reel-5 strip fact', () => {
    const r = evaluateGrid(withScatters([0, 1]), 'base', 1, STOPS);
    expect(r.freeSpinsAwarded).toBe(0);
    expect(r.nearMiss?.kind).toBe('scatter');
    expect(r.nearMiss?.reel).toBe(4);
    expect(r.nearMiss?.stripFact).toEqual({
      reel: 4,
      symbol: 'SCATTER',
      countOnStrip: countOnStrip('base', 4, 'SCATTER'),
      stripLength: stripLength('base', 4),
    });
    expect(r.nearMiss?.detail).toMatch(/^Zwei Supernovas – die dritte fehlte knapp\. Auf Walze 5 gibt es nur 1 Supernova auf \d+ Positionen\.$/);
    expect(r.nearMiss?.detail).not.toContain('ß');
  });

  it('scatter near-miss has priority over coin near-miss', () => {
    const grid = withScatters([0, 1]);
    grid[2][0] = coin(1);
    grid[3][0] = coin(1);
    expect(evaluateGrid(grid, 'base', 1, STOPS).nearMiss?.kind).toBe('scatter');
  });
});

describe('line near-miss', () => {
  it('4 gold stars without a 5th → line near-miss', () => {
    const r = evaluateGrid(middle(['H4', 'H4', 'H4', 'H4', 'L3']), 'base', 1, STOPS);
    expect(r.nearMiss?.kind).toBe('line');
    expect(r.nearMiss?.detail).toContain('Vier Goldsterne auf Linie 1');
    expect(r.nearMiss?.detail).toContain(`${PAYTABLE.H4[5] / LINES}× statt ${PAYTABLE.H4[4] / LINES}× Einsatz`);
  });
  it('4 low symbols are no near-miss', () => {
    expect(evaluateGrid(middle(['L1', 'L1', 'L1', 'L1', 'L3']), 'base', 1, STOPS).nearMiss).toBeNull();
  });
});

describe('LDW & win tiers', () => {
  it('LDW: base win below bet', () => {
    const r = evaluateGrid(middle(['L1', 'L1', 'L1', 'H2', 'L3']), 'base', 1, STOPS);
    expect(r.isLDW).toBe(true);
    expect(r.winTier).toBe('small');
  });
  it('no LDW in free spins', () => {
    expect(evaluateGrid(middle(['L1', 'L1', 'L1', 'H2', 'L3']), 'free', 1, STOPS).isLDW).toBe(false);
  });
  it('win equal to bet is not an LDW', () => {
    // L1 x4 = 25 line bets = exactly 1x bet
    const r = evaluateGrid(middle(['L1', 'L1', 'L1', 'L1', 'L3']), 'base', 1, STOPS);
    expect(r.totalWin).toBeCloseTo(1);
    expect(r.isLDW).toBe(false);
  });
  it('no win → not LDW, tier none', () => {
    const r = evaluateGrid(middle(['L2', 'H1', 'L3', 'H2', 'L4']), 'base', 1, STOPS);
    expect(r.isLDW).toBe(false);
    expect(r.winTier).toBe('none');
  });
  it.each([
    [0, 'none'],
    [0.5, 'small'],
    [9.99, 'small'],
    [10, 'big'],
    [24.9, 'big'],
    [25, 'mega'],
    [50, 'epic'],
    [500, 'epic'],
  ] as const)('winTier(%d x bet) = %s', (x, tier) => {
    expect(computeWinTier(x * 2, 2)).toBe(tier);
  });
});
