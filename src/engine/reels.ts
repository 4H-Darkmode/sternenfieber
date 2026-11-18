/**
 * Reel strips ("virtual reels") for Sternenfieber.
 *
 * Each reel in each mode has its own strip. A spin picks a random stop per reel
 * (uniform over the strip); the 3 visible rows are strip[stop], strip[stop+1],
 * strip[stop+2] (wrapping).
 *
 * Note the deliberately UNEQUAL scatter distribution (base game): reels 2–3
 * carry 2 supernovas each (12 % chance to show one), reels 4–5 only 1 on ~51
 * positions (~6 %). Two scatters early are therefore common ("so knapp!"),
 * the third one is rare: exactly-2 happens ~11x as often as a trigger. This is how real slots
 * manufacture near-misses without any "cheating" code – the strips alone do it.
 *
 * Strips are generated deterministically from the specs below (fixed seed), so
 * every build/run yields the exact same strips.
 */
import { createRng } from './rng';
import type { SpinMode, SymbolId } from './types';
import { REELS } from './types';

interface ReelSpec {
  /** Symbols kept at least 3 apart (max 1 visible): SCATTER, COLLECT. */
  spaced: SymbolId[];
  /** Single symbols and their counts. */
  counts: Partial<Record<SymbolId, number>>;
  /** Stacks: runs of the same symbol (e.g. 3 WILDs in a row). */
  stacks?: { symbol: SymbolId; size: number; count: number }[];
}

const sc = (n: number): SymbolId[] => Array.from({ length: n }, () => 'SCATTER' as SymbolId);

/** Base game: ~50 positions per reel. */
const BASE_SPECS: ReelSpec[] = [
  // reel 1
  { spaced: sc(1), counts: { L1: 10, L2: 9, L3: 8, L4: 8, H1: 4, H2: 3, H3: 3, H4: 2, COIN: 3 } },
  // reel 2
  { spaced: sc(2), counts: { L1: 8, L2: 8, L3: 7, L4: 7, H1: 4, H2: 3, H3: 3, H4: 2, WILD: 3, COIN: 3 } },
  // reel 3
  { spaced: sc(2), counts: { L1: 8, L2: 8, L3: 7, L4: 7, H1: 4, H2: 3, H3: 3, H4: 2, WILD: 3, COIN: 3 } },
  // reel 4 – supernova rare
  { spaced: sc(1), counts: { L1: 8, L2: 8, L3: 8, L4: 8, H1: 4, H2: 4, H3: 3, H4: 2, WILD: 4, COIN: 3 } },
  // reel 5 – supernova rare, collector only here
  { spaced: [...sc(1), 'COLLECT'], counts: { L1: 9, L2: 9, L3: 8, L4: 8, H1: 4, H2: 4, H3: 3, H4: 2, WILD: 2 } },
];

/** Free spins: richer – more high symbols, stacked wilds, many coins & collectors. */
const FREE_SPECS: ReelSpec[] = [
  { spaced: sc(2), counts: { L1: 4, L2: 4, L3: 4, L4: 4, H1: 4, H2: 4, H3: 4, H4: 4, COIN: 11 } },
  {
    spaced: sc(2),
    counts: { L1: 4, L2: 4, L3: 4, L4: 4, H1: 3, H2: 3, H3: 3, H4: 3, COIN: 11 },
    stacks: [{ symbol: 'WILD', size: 3, count: 1 }],
  },
  {
    spaced: sc(2),
    counts: { L1: 4, L2: 4, L3: 4, L4: 4, H1: 3, H2: 3, H3: 3, H4: 3, COIN: 11 },
    stacks: [{ symbol: 'WILD', size: 3, count: 1 }],
  },
  {
    spaced: sc(1),
    counts: { L1: 4, L2: 4, L3: 4, L4: 4, H1: 4, H2: 4, H3: 3, H4: 3, COIN: 11 },
    stacks: [{ symbol: 'WILD', size: 3, count: 1 }],
  },
  {
    spaced: [...sc(1), ...Array.from({ length: 12 }, () => 'COLLECT' as SymbolId)],
    counts: { L1: 4, L2: 4, L3: 4, L4: 4, H1: 4, H2: 4, H3: 4, H4: 3, WILD: 2 },
  },
];

function buildStrip(spec: ReelSpec, seed: number): SymbolId[] {
  const rng = createRng(seed);
  const units: SymbolId[][] = [];
  for (const [sym, n] of Object.entries(spec.counts) as [SymbolId, number][]) {
    for (let i = 0; i < n; i++) units.push([sym]);
  }
  for (const st of spec.stacks ?? []) {
    for (let i = 0; i < st.count; i++) units.push(Array.from({ length: st.size }, () => st.symbol));
  }
  // Fisher–Yates shuffle
  for (let i = units.length - 1; i > 0; i--) {
    const j = rng.int(i + 1);
    [units[i], units[j]] = [units[j], units[i]];
  }
  // Shuffle spaced symbols too (order of SCATTER/COLLECT), then interleave:
  // strip = spaced[0] + group0 + spaced[1] + group1 + ...
  const spaced = [...spec.spaced];
  for (let i = spaced.length - 1; i > 0; i--) {
    const j = rng.int(i + 1);
    [spaced[i], spaced[j]] = [spaced[j], spaced[i]];
  }
  const k = Math.max(1, spaced.length);
  const flatLen = units.reduce((a, u) => a + u.length, 0);
  const strip: SymbolId[] = [];
  let ui = 0;
  let placed = 0;
  for (let g = 0; g < k; g++) {
    if (g < spaced.length) strip.push(spaced[g]);
    const target = Math.round(((g + 1) * flatLen) / k);
    while (ui < units.length && (placed < target || g === k - 1)) {
      strip.push(...units[ui]);
      placed += units[ui].length;
      ui++;
    }
  }
  return strip;
}

function buildMode(specs: ReelSpec[], seedBase: number): SymbolId[][] {
  return specs.map((s, r) => buildStrip(s, seedBase + r * 7919));
}

/** STRIPS[mode][reel] – frozen, do not mutate. */
export const STRIPS: Record<SpinMode, readonly (readonly SymbolId[])[]> = {
  base: buildMode(BASE_SPECS, 20241),
  free: buildMode(FREE_SPECS, 90517),
};

/** Copy of the strip for a mode/reel (visuals use it for filler symbols while spinning). */
export function getStrip(mode: SpinMode, reel: number): SymbolId[] {
  if (reel < 0 || reel >= REELS) throw new RangeError(`reel ${reel} out of range`);
  return [...STRIPS[mode][reel]];
}

/** How often `symbol` appears on a strip – used for the reveal "strip facts". */
export function countOnStrip(mode: SpinMode, reel: number, symbol: SymbolId): number {
  let n = 0;
  for (const s of STRIPS[mode][reel]) if (s === symbol) n++;
  return n;
}

export function stripLength(mode: SpinMode, reel: number): number {
  return STRIPS[mode][reel].length;
}

/** Symbols visible for a stop: rows 0..2 = strip[stop], strip[stop+1], strip[stop+2]. */
export function windowAt(mode: SpinMode, reel: number, stop: number): SymbolId[] {
  const s = STRIPS[mode][reel];
  const n = s.length;
  return [s[stop % n], s[(stop + 1) % n], s[(stop + 2) % n]];
}
