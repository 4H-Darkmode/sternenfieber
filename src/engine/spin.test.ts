import { describe, expect, it } from 'vitest';
import { evaluateGrid } from './evaluate';
import { playFreeSpinsRound } from './freespins';
import { COIN_VALUE_WEIGHTS } from './paytable';
import { STRIPS, getStrip, windowAt } from './reels';
import { createRng } from './rng';
import { simulate } from './simulate';
import { spin } from './spin';
import { REELS, ROWS, type ForceOutcome, type SpinMode, type SpinResult } from './types';

const MODES: SpinMode[] = ['base', 'free'];

/** Result must be the honest evaluation of a grid that really sits on the strips at `stops`. */
function expectConsistent(r: SpinResult) {
  expect(r.stops).toHaveLength(REELS);
  for (let reel = 0; reel < REELS; reel++) {
    const w = windowAt(r.mode, reel, r.stops[reel]);
    expect(r.grid[reel].map((c) => c.symbol)).toEqual(w);
    for (const c of r.grid[reel]) {
      if (c.symbol === 'COIN') expect(COIN_VALUE_WEIGHTS[r.mode].map(([v]) => v)).toContain(c.coinValue);
      else expect(c.coinValue).toBeUndefined();
    }
  }
  const again = evaluateGrid(r.grid, r.mode, r.bet, r.stops);
  expect(again).toEqual(r);
}

describe('strips', () => {
  it.each(MODES)('%s strips: valid lengths and symbol placement', (mode) => {
    for (let reel = 0; reel < REELS; reel++) {
      const s = getStrip(mode, reel);
      expect(s.length).toBeGreaterThanOrEqual(30);
      expect(s.length).toBeLessThanOrEqual(55);
      if (reel === 4) expect(s).not.toContain('COIN');
      else expect(s).not.toContain('COLLECT');
      expect(s).toContain('H4');
      // max 1 scatter / collector visible in any window
      for (let stop = 0; stop < s.length; stop++) {
        const w = windowAt(mode, reel, stop);
        expect(w.filter((x) => x === 'SCATTER').length).toBeLessThanOrEqual(1);
        expect(w.filter((x) => x === 'COLLECT').length).toBeLessThanOrEqual(1);
      }
    }
  });

  it('scatters are deliberately rarer on reels 4–5 (base)', () => {
    const density = (r: number) => STRIPS.base[r].filter((x) => x === 'SCATTER').length / STRIPS.base[r].length;
    expect(Math.max(density(3), density(4))).toBeLessThan(Math.max(density(0), density(1), density(2)));
  });

  it('getStrip returns a copy', () => {
    const s = getStrip('base', 0);
    s[0] = 'COLLECT';
    expect(getStrip('base', 0)[0]).not.toBe('COLLECT');
  });
});

describe('spin', () => {
  it('is deterministic for a given seed', () => {
    const a = Array.from({ length: 50 }, ((rng) => () => spin({ bet: 2, mode: 'base', rng }))(createRng(123)));
    const b = Array.from({ length: 50 }, ((rng) => () => spin({ bet: 2, mode: 'base', rng }))(createRng(123)));
    expect(a).toEqual(b);
    const c = spin({ bet: 2, mode: 'base', rng: createRng(124) });
    expect(c).not.toEqual(a[0]);
  });

  it.each(MODES)('%s spins are consistent with the strips', (mode) => {
    const rng = createRng(9);
    for (let i = 0; i < 300; i++) {
      const r = spin({ bet: 1, mode, rng });
      expectConsistent(r);
      expect(r.grid).toHaveLength(REELS);
      r.grid.forEach((col) => expect(col).toHaveLength(ROWS));
    }
  });

  const promises: Record<ForceOutcome, (r: SpinResult) => void> = {
    bigwin: (r) => {
      expect(r.totalWin / r.bet).toBeGreaterThanOrEqual(15);
      expect(['big', 'mega', 'epic']).toContain(r.winTier);
    },
    freespins: (r) => {
      expect(r.scatterPositions).toHaveLength(3);
      expect(r.freeSpinsAwarded).toBe(r.mode === 'base' ? 10 : 5);
    },
    nearmiss: (r) => {
      expect(r.scatterPositions).toHaveLength(2);
      expect(r.scatterPositions.every(([reel]) => reel <= 2)).toBe(true);
      expect(r.anticipationFromReel).not.toBeNull();
      expect(r.freeSpinsAwarded).toBe(0);
      expect(r.nearMiss?.kind).toBe('scatter');
      expect(r.nearMiss?.stripFact?.reel).toBe(4);
    },
    ldw: (r) => {
      expect(r.totalWin).toBeGreaterThan(0);
      expect(r.totalWin).toBeLessThan(r.bet);
      expect(r.isLDW).toBe(r.mode === 'base');
    },
    coins: (r) => {
      expect(r.coinCollect).not.toBeNull();
      expect(r.coinCollect!.coinPositions.length).toBeGreaterThan(0);
      expect(r.coinCollect!.collectPositions).toHaveLength(1);
      expect(r.coinCollect!.total).toBeGreaterThan(0);
    },
  };

  for (const mode of MODES) {
    for (const force of Object.keys(promises) as ForceOutcome[]) {
      it(`force '${force}' (${mode}) delivers what it promises`, () => {
        for (let seed = 1; seed <= 8; seed++) {
          const r = spin({ bet: 2, mode, force, rng: createRng(seed) });
          expect(r.mode).toBe(mode);
          promises[force](r);
          expectConsistent(r);
          if (force !== 'freespins') expect(r.freeSpinsAwarded).toBe(0);
        }
      });
    }
  }
});

describe('free spins round', () => {
  it('plays at least 10 spins and sums the wins', () => {
    const round = playFreeSpinsRound(2, createRng(5));
    expect(round.spinsPlayed).toBeGreaterThanOrEqual(10);
    expect(round.spinsPlayed).toBe(round.results.length);
    expect(round.spinsPlayed).toBe(10 + round.retriggers * 5);
    const sum = round.results.reduce((a, r) => a + r.totalWin, 0);
    expect(round.totalWin).toBeCloseTo(sum, 2);
    round.results.forEach((r) => {
      expect(r.mode).toBe('free');
      expect(r.isLDW).toBe(false);
    });
  });
});

describe('simulation (smoke)', () => {
  it('is deterministic and in the right ballpark', () => {
    const a = simulate(150_000, 11);
    const b = simulate(150_000, 11);
    expect({ ...a, ms: 0 }).toEqual({ ...b, ms: 0 });
    // Base-game-only parts are stable even on a small sample
    expect(a.hitFrequency).toBeGreaterThan(0.4);
    expect(a.hitFrequency).toBeLessThan(0.5);
    expect(a.ldwShare).toBeGreaterThan(0.2);
    expect(a.ldwShare).toBeLessThan(0.28);
    expect(a.rtpBaseLines + a.rtpScatter + a.rtpCoins).toBeGreaterThan(0.48);
    expect(a.rtpBaseLines + a.rtpScatter + a.rtpCoins).toBeLessThan(0.58);
    expect(a.fsOneIn).toBeGreaterThan(150);
    expect(a.fsOneIn).toBeLessThan(290);
    expect(a.nearMiss.scatter).toBeGreaterThan(a.fsTriggers * 5);
    expect(a.rtpTotal).toBeGreaterThan(0.85);
    expect(a.rtpTotal).toBeLessThan(1.05);
  });
});
