import type { CSSProperties } from 'react';
import { PAYLINES, PAYLINE_COLORS } from '../engine/paylines';
import type { Pos } from '../engine/types';
import s from './PaylineOverlay.module.css';

export interface WinHighlight {
  positions: Pos[];
  lineIndex?: number;
}

/**
 * SVG overlay for the 5×3 grid (place it absolutely over the reel area,
 * which must have aspect-ratio 5/3). Draws the payline as an animated
 * glowing polyline + frames around winning cells. Without lineIndex
 * (scatter / coin collect) only gold frames are drawn.
 */
export default function PaylineOverlay({ highlight }: { highlight: WinHighlight | null }) {
  if (!highlight || highlight.positions.length === 0) return null;
  const { positions, lineIndex } = highlight;
  const hasLine = lineIndex !== undefined && lineIndex >= 0 && lineIndex < PAYLINES.length;
  const color = hasLine ? PAYLINE_COLORS[lineIndex! % PAYLINE_COLORS.length] : '#ffcf4a';
  const line = hasLine ? PAYLINES[lineIndex!] : null;
  const points = line
    ? [
        `0,${line[0] * 100 + 50}`,
        ...line.map((row, reel) => `${reel * 100 + 50},${row * 100 + 50}`),
        `500,${line[line.length - 1] * 100 + 50}`,
      ].join(' ')
    : '';
  const key = `${hasLine ? lineIndex : 'x'}:${positions.map((p) => p.join('.')).join('_')}`;

  return (
    <svg
      key={key}
      className={s.overlay}
      viewBox="0 0 500 300"
      aria-hidden="true"
      style={{ '--line': color } as CSSProperties}
    >
      {positions.map(([reel, row], i) => (
        <g key={`${reel}-${row}`} className={s.boxWrap} style={{ animationDelay: `${i * 45}ms` }}>
          <rect className={s.boxGlow} x={reel * 100 + 5} y={row * 100 + 5} width="90" height="90" rx="14" />
          <rect className={s.box} x={reel * 100 + 5} y={row * 100 + 5} width="90" height="90" rx="14" />
        </g>
      ))}
      {line && (
        <g className={s.line}>
          <polyline className={s.glowWide} points={points} pathLength={1} />
          <polyline className={s.glow} points={points} pathLength={1} />
          <polyline className={s.main} points={points} pathLength={1} />
          <polyline className={s.core} points={points} pathLength={1} />
          <polyline className={s.flow} points={points} pathLength={1} />
          {line.map((row, reel) => (
            <circle key={reel} className={s.node} cx={reel * 100 + 50} cy={row * 100 + 50} r="5" style={{ animationDelay: `${120 + reel * 70}ms` }} />
          ))}
        </g>
      )}
    </svg>
  );
}

export { PaylineOverlay };
