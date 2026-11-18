import { useEffect, useRef, useState, type RefObject } from 'react';
import { bus } from '../core/events';
import type { Pos } from '../engine/types';
import { prefersReducedMotion } from './motion';
import { fx } from './particles';
import { shake } from './shake';
import s from './ScatterCelebration.module.css';

/**
 * Supernova celebration on `scatterWinShow` (3+ scatters), mounted inside
 * the reel grid: light rays + shockwaves behind each supernova, crackling
 * energy beams connecting them, star bursts and a short shake.
 */
export interface ScatterCelebrationProps {
  gridRef: RefObject<HTMLElement>;
  /** element to shake (the machine) */
  shakeRef?: RefObject<HTMLElement>;
  turbo: boolean;
  spinning: boolean;
}

interface Show {
  id: number;
  positions: Pos[];
  beams: string[];
}

const cx = (r: number) => r * 100 + 50;
const cy = (row: number) => row * 100 + 50;

/** jagged "lightning" polyline between two cells */
function bolt(a: Pos, b: Pos): string {
  const x0 = cx(a[0]), y0 = cy(a[1]), x1 = cx(b[0]), y1 = cy(b[1]);
  const dx = x1 - x0, dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  const segs = Math.max(4, Math.round(len / 28));
  const pts: string[] = [`${x0},${y0}`];
  for (let i = 1; i < segs; i++) {
    const t = i / segs;
    const j = (Math.random() * 2 - 1) * 14 * Math.sin(Math.PI * t);
    pts.push(`${(x0 + dx * t + nx * j).toFixed(1)},${(y0 + dy * t + ny * j).toFixed(1)}`);
  }
  pts.push(`${x1},${y1}`);
  return pts.join(' ');
}

export default function ScatterCelebration({ gridRef, shakeRef, turbo, spinning }: ScatterCelebrationProps) {
  const [show, setShow] = useState<Show | null>(null);
  const turboRef = useRef(turbo);
  turboRef.current = turbo;

  useEffect(() => {
    let n = 0;
    let timer = 0;
    const off = bus.on('scatterWinShow', ({ positions }) => {
      if (!positions.length) return;
      const sorted = [...positions].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
      const beams: string[] = [];
      for (let i = 0; i < sorted.length - 1; i++) beams.push(bolt(sorted[i], sorted[i + 1]));
      const id = ++n;
      setShow({ id, positions: sorted, beams });

      const reduced = prefersReducedMotion();
      const g = gridRef.current;
      if (g) {
        const r = g.getBoundingClientRect();
        sorted.forEach(([reel, row], i) => {
          window.setTimeout(() => {
            const x = r.left + ((reel + 0.5) * r.width) / 5;
            const y = r.top + ((row + 0.5) * r.height) / 3;
            fx.burst(x, y, 'star', turboRef.current ? 18 : 40);
            fx.burst(x, y, 'spark', turboRef.current ? 8 : 18);
          }, reduced ? 0 : i * 90);
        });
      }
      shake(shakeRef?.current, turboRef.current ? 0.35 : 0.6);
      window.clearTimeout(timer);
      timer = window.setTimeout(
        () => setShow((cur) => (cur && cur.id === id ? null : cur)),
        turboRef.current ? 700 : 1500,
      );
    });
    return () => {
      off();
      window.clearTimeout(timer);
    };
  }, [gridRef, shakeRef]);

  useEffect(() => {
    if (spinning) setShow(null);
  }, [spinning]);

  if (!show) return null;
  return (
    <>
      {/* behind the win symbols: rays + shockwaves */}
      <svg key={`u${show.id}`} className={`${s.svg} ${s.under}`} viewBox="0 0 500 300" aria-hidden="true" data-turbo={turbo}>
        <defs>
          <radialGradient id={`sc-ray-${show.id}`}>
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="0.35" stopColor="#ff9be0" stopOpacity="0.7" />
            <stop offset="1" stopColor="#8b5cff" stopOpacity="0" />
          </radialGradient>
        </defs>
        {show.positions.map(([r, row], i) => (
          <g key={i} transform={`translate(${cx(r)} ${cy(row)})`}>
            <g className={s.rays} style={{ animationDelay: `${i * 0.09}s` }}>
              <g className={s.raysSpin}>
                {Array.from({ length: 12 }, (_, k) => (
                  <polygon key={k} points="-5,0 5,0 0,-95" fill={`url(#sc-ray-${show.id})`} transform={`rotate(${k * 30})`} />
                ))}
              </g>
            </g>
            <circle className={s.wave} r="40" style={{ animationDelay: `${i * 0.09}s` }} />
            <circle className={s.wave} r="40" style={{ animationDelay: `${i * 0.09 + 0.3}s` }} />
          </g>
        ))}
      </svg>
      {/* above: crackling energy beams between the supernovas */}
      <svg key={`o${show.id}`} className={`${s.svg} ${s.over}`} viewBox="0 0 500 300" aria-hidden="true">
        {show.beams.map((p, i) => (
          <g key={i} className={s.beam} style={{ animationDelay: `${0.15 + i * 0.12}s` }}>
            <polyline className={s.beamGlow} points={p} pathLength={1} />
            <polyline className={s.beamMain} points={p} pathLength={1} />
            <polyline className={s.beamCore} points={p} pathLength={1} />
            <polyline className={s.beamFlow} points={p} pathLength={1} />
          </g>
        ))}
      </svg>
    </>
  );
}

export { ScatterCelebration };
