/**
 * SHARED CONTRACT – 25 fixed paylines, each = row index per reel (0 top, 1 middle, 2 bottom).
 * Indices 0–9 are the original 10 lines (unchanged); 10–24 add common zig-zag / V / W shapes.
 * lineBet = totalBet / PAYLINES.length (= bet / 25).
 */
export const PAYLINES: readonly (readonly number[])[] = [
  [1, 1, 1, 1, 1], // 1  middle
  [0, 0, 0, 0, 0], // 2  top
  [2, 2, 2, 2, 2], // 3  bottom
  [0, 1, 2, 1, 0], // 4  V
  [2, 1, 0, 1, 2], // 5  inverted V
  [0, 0, 1, 2, 2], // 6
  [2, 2, 1, 0, 0], // 7
  [1, 0, 0, 0, 1], // 8
  [1, 2, 2, 2, 1], // 9
  [1, 0, 1, 2, 1], // 10
  [1, 2, 1, 0, 1], // 11
  [0, 1, 1, 1, 0], // 12
  [2, 1, 1, 1, 2], // 13
  [0, 1, 0, 1, 0], // 14 W (top)
  [2, 1, 2, 1, 2], // 15 M (bottom)
  [1, 1, 0, 1, 1], // 16
  [1, 1, 2, 1, 1], // 17
  [0, 0, 2, 0, 0], // 18
  [2, 2, 0, 2, 2], // 19
  [0, 2, 2, 2, 0], // 20
  [2, 0, 0, 0, 2], // 21
  [0, 2, 0, 2, 0], // 22
  [2, 0, 2, 0, 2], // 23
  [1, 2, 0, 2, 1], // 24
  [1, 0, 2, 0, 1], // 25
];

/** Distinct neon colour per payline (for overlay drawing on a dark violet background). */
export const PAYLINE_COLORS = [
  '#ffcf4a', '#34e7ff', '#ff3db8', '#5dff9e', '#8b5cff',
  '#ff8a3d', '#3dd6ff', '#ff5d8f', '#c6ff4a', '#b98bff',
  '#ffe14d', '#00ffd5', '#ff6bd6', '#7dff5d', '#a3b8ff',
  '#ffb14a', '#4dfff0', '#ff4d6d', '#e6ff6b', '#d68bff',
  '#fff59d', '#5ce1ff', '#ff9ec7', '#9effc4', '#ffa3f0',
];
