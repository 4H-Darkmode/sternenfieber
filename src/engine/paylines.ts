/** SHARED CONTRACT – 10 paylines, each = row index per reel (0 top, 1 middle, 2 bottom). */
export const PAYLINES: readonly (readonly number[])[] = [
  [1, 1, 1, 1, 1],
  [0, 0, 0, 0, 0],
  [2, 2, 2, 2, 2],
  [0, 1, 2, 1, 0],
  [2, 1, 0, 1, 2],
  [0, 0, 1, 2, 2],
  [2, 2, 1, 0, 0],
  [1, 0, 0, 0, 1],
  [1, 2, 2, 2, 1],
  [1, 0, 1, 2, 1],
];

/** Distinct neon colour per payline (for overlay drawing). */
export const PAYLINE_COLORS = [
  '#ffcf4a', '#34e7ff', '#ff3db8', '#5dff9e', '#8b5cff',
  '#ff8a3d', '#3dd6ff', '#ff5d8f', '#c6ff4a', '#b98bff',
];
