import { ALL_SYMBOLS, REELS, ROWS, type Cell, type SymbolId } from '../engine/types';
import { LOOP, LOOP_START, STRIP_LEN } from './reelController';

const COIN_VALUES = [1, 1, 2, 2, 3, 5, 10];

/** Default filler pool: ALL_SYMBOLS minus COLLECT on reels 0–3 / COIN on reel 4, weighted. */
export function defaultFillerPool(reel: number): SymbolId[] {
  const out: SymbolId[] = [];
  for (const id of ALL_SYMBOLS) {
    if (reel < 4 && id === 'COLLECT') continue;
    if (reel === 4 && id === 'COIN') continue;
    const w = id.startsWith('L') ? 3 : id.startsWith('H') ? 2 : 1;
    for (let i = 0; i < w; i++) out.push(id);
  }
  return out;
}

export function makeCell(symbol: SymbolId): Cell {
  return symbol === 'COIN'
    ? { symbol, coinValue: COIN_VALUES[Math.floor(Math.random() * COIN_VALUES.length)] }
    : { symbol };
}

/**
 * Build a strip of STRIP_LEN filler cells for a reel.
 * `strip` from fillerFor() is read consecutively (like a real reel strip);
 * the default pool is sampled randomly. The two loop copies are identical
 * (same objects) so wrapping is seamless.
 */
export function buildBaseStrip(reel: number, strip?: SymbolId[] | null): Cell[] {
  const consecutive = !!strip && strip.length > 0;
  const pool = consecutive ? strip! : defaultFillerPool(reel);
  let k = Math.floor(Math.random() * pool.length);
  let prev: SymbolId | null = null;
  const next = (): Cell => {
    let id: SymbolId;
    if (consecutive) {
      id = pool[k++ % pool.length];
    } else {
      // avoid identical neighbours for a livelier blur
      do id = pool[Math.floor(Math.random() * pool.length)];
      while (id === prev && pool.length > 1);
    }
    prev = id;
    return makeCell(id);
  };
  const cells: Cell[] = [];
  for (let i = 0; i < STRIP_LEN; i++) cells.push(next());
  for (let i = 0; i < LOOP; i++) cells[LOOP_START + LOOP + i] = cells[LOOP_START + i];
  return cells;
}

/** Random resting grid shown before the first spin (no scatter trigger). */
export function randomGrid(fillerFor?: (reel: number) => SymbolId[]): Cell[][] {
  const grid: Cell[][] = [];
  let scatters = 0;
  for (let r = 0; r < REELS; r++) {
    const pool = (fillerFor?.(r) ?? defaultFillerPool(r)).filter((s) => s !== 'COLLECT');
    const col: Cell[] = [];
    for (let row = 0; row < ROWS; row++) {
      let id = pool[Math.floor(Math.random() * pool.length)] ?? 'L1';
      if (id === 'SCATTER' && (scatters >= 2 || col.some((c) => c.symbol === 'SCATTER'))) id = 'L1';
      if (id === 'SCATTER') scatters++;
      col.push(makeCell(id));
    }
    grid.push(col);
  }
  return grid;
}
