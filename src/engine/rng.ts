import type { Rng } from './types';

/** mulberry32 – small, fast, seedable PRNG. Seed omitted → crypto/Math.random seed. */
export function createRng(seed?: number): Rng {
  let a = (seed ?? Math.floor(Math.random() * 2 ** 32)) >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return { next, int: (n: number) => Math.floor(next() * n) };
}
