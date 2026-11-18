import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { gsap } from 'gsap';
import { bus } from '../core/events';
import type { Pos } from '../engine/types';
import { playSfx } from '../audio';
import { formatCredits } from '../slot/format';
import { prefersReducedMotion, useOwner } from './motion';
import { fx } from './particles';
import s from './CollectOverlay.module.css';

/**
 * Coin-collect presentation, mounted INSIDE the reel grid (5×3 coordinate
 * space, viewBox 500×300). On `coinCollectStart` each coin (left→right,
 * top→bottom) fires a golden beam + value chip into the collector, the
 * collector pulses and its counter counts up; at the end the total pops.
 * Emits `coinCollectEnd` exactly once per start (also on unmount / reduced
 * motion / when a new spin interrupts).
 */
export interface CollectOverlayProps {
  /** the reel grid element (for screen positions of bursts / pulses) */
  gridRef: RefObject<HTMLElement>;
  /** a new spin started → finish immediately */
  spinning: boolean;
  /** coin at "reel-row" has been collected (dim it) */
  onCollected: (key: string) => void;
}

interface Coin {
  key: string;
  x: number;
  y: number;
  value: number;
}
interface Seq {
  id: number;
  coins: Coin[];
  collectors: { key: string; x: number; y: number; row: number; reel: number }[];
  total: number;
  turbo: boolean;
  reduced: boolean;
}

const cx = (reel: number) => reel * 100 + 50;
const cy = (row: number) => row * 100 + 50;
const keyOf = ([r, row]: Pos) => `${r}-${row}`;

/** quadratic curve bending "upwards" (perpendicular to the chord) */
function curve(x0: number, y0: number, x1: number, y1: number) {
  const mx = (x0 + x1) / 2;
  const my = (y0 + y1) / 2;
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  let px = -dy / len;
  let py = dx / len;
  if (py > 0 || (py === 0 && px > 0)) {
    px = -px;
    py = -py;
  }
  const bend = Math.min(60, len * 0.22);
  const qx = mx + px * bend;
  const qy = my + py * bend;
  return {
    d: `M${x0},${y0} Q${qx},${qy} ${x1},${y1}`,
    at: (t: number) => {
      const u = 1 - t;
      return [u * u * x0 + 2 * u * t * qx + t * t * x1, u * u * y0 + 2 * u * t * qy + t * t * y1] as const;
    },
  };
}

export default function CollectOverlay({ gridRef, spinning, onCollected }: CollectOverlayProps) {
  const owner = useOwner('CollectOverlay');
  const [seq, setSeq] = useState<Seq | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  /** current sequence bookkeeping (survives re-renders) */
  const active = useRef<{ id: number; total: number; ended: boolean; finish: () => void } | null>(null);
  const onCollectedRef = useRef(onCollected);
  onCollectedRef.current = onCollected;

  const endSeq = (id: number) => {
    const a = active.current;
    if (!a || a.id !== id || a.ended) return;
    a.ended = true;
    bus.emit('coinCollectEnd', { total: a.total });
  };

  // listen for collect starts
  useEffect(() => {
    if (!owner) return;
    let n = 0;
    const off = bus.on('coinCollectStart', (p) => {
      // a previous collect still running → close it properly first
      const prev = active.current;
      if (prev && !prev.ended) prev.finish();
      const coins: Coin[] = p.coinPositions
        .map((pos, i) => ({ pos, value: p.coinValues[i] ?? 0 }))
        .sort((a, b) => a.pos[0] - b.pos[0] || a.pos[1] - b.pos[1])
        .map(({ pos, value }) => ({ key: keyOf(pos), x: cx(pos[0]), y: cy(pos[1]), value }));
      const collectors = p.collectPositions.map((pos) => ({
        key: keyOf(pos), x: cx(pos[0]), y: cy(pos[1]), reel: pos[0], row: pos[1],
      }));
      const id = ++n;
      active.current = { id, total: p.total, ended: false, finish: () => endSeq(id) };
      if (!coins.length || !collectors.length) {
        // nothing to animate – release the store right away
        endSeq(id);
        return;
      }
      setSeq({ id, coins, collectors, total: p.total, turbo: p.turbo, reduced: prefersReducedMotion() });
    });
    return () => {
      off();
      // real unmount: never leave the store waiting
      const a = active.current;
      if (a && !a.ended) {
        a.ended = true;
        bus.emit('coinCollectEnd', { total: a.total });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [owner]);

  // a new spin interrupts → finish now
  useEffect(() => {
    if (spinning && active.current && !active.current.ended) {
      active.current.finish();
      setSeq(null);
    }
  }, [spinning]);

  // run the sequence
  useLayoutEffect(() => {
    if (!seq) return;
    const root = rootRef.current;
    const svg = svgRef.current;
    if (!root || !svg) return;
    const { id, coins, collectors, total, turbo, reduced } = seq;
    const per = collectors.length > 1 ? total / collectors.length : total;
    const cellEl = (key: string) => gridRef.current?.querySelector<HTMLElement>(`[data-cell="${key}"]`) ?? null;
    const screenAt = (x: number, y: number): [number, number] | null => {
      const g = gridRef.current;
      if (!g) return null;
      const r = g.getBoundingClientRect();
      return [r.left + (x / 500) * r.width, r.top + (y / 300) * r.height];
    };
    const burst = (x: number, y: number, kind: 'spark' | 'coin' | 'star', count: number) => {
      const p = screenAt(x, y);
      if (p) fx.burst(p[0], p[1], kind, count);
    };
    const counters = Array.from(root.querySelectorAll<HTMLElement>('[data-counter]'));
    const values = Array.from(root.querySelectorAll<HTMLElement>('[data-value]'));
    const writeAll = (v: number) => values.forEach((el) => (el.textContent = formatCredits(v)));

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      endSeq(id);
      gsap.to(root, {
        opacity: 0,
        duration: reduced ? 0.1 : 0.35,
        delay: reduced ? 0 : 0.25,
        onComplete: () => setSeq((cur) => (cur && cur.id === id ? null : cur)),
      });
    };
    if (active.current && active.current.id === id) active.current.finish = finish;

    // ── reduced motion: just show the total ──
    if (reduced) {
      coins.forEach((c) => onCollectedRef.current(c.key));
      writeAll(per);
      root.dataset.final = 'true';
      const t = window.setTimeout(finish, 600);
      return () => {
        window.clearTimeout(t);
        finish();
      };
    }

    const step = turbo ? 0.12 : 0.35;
    const fly = Math.max(0.1, step * 0.92);
    const hold = turbo ? 0.2 : 0.5;
    const shown = { v: 0 };
    let running = 0;
    const tl = gsap.timeline({ onComplete: finish });

    gsap.set(root, { opacity: 1 });
    tl.fromTo(counters, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.25, ease: 'back.out(2.5)' }, 0);

    coins.forEach((coin, i) => {
      const at = 0.12 + i * step;
      const beams = Array.from(svg.querySelectorAll<SVGPathElement>(`[data-beam="${i}"] path`));
      const chip = svg.querySelector<SVGGElement>(`[data-chip="${i}"]`);
      const curves = collectors.map((c) => curve(coin.x, coin.y, c.x, c.y));
      tl.call(() => {
        burst(coin.x, coin.y, 'spark', 7);
        const el = cellEl(coin.key);
        el?.animate?.([{ transform: 'scale(1)' }, { transform: 'scale(1.18)' }, { transform: 'scale(1)' }], { duration: 220 });
      }, [], at);
      tl.fromTo(beams, { strokeDashoffset: 1, opacity: 1 }, { strokeDashoffset: 0, duration: fly, ease: 'power2.in' }, at);
      if (chip) {
        const proxy = { t: 0 };
        tl.set(chip, { opacity: 1 }, at);
        tl.to(proxy, {
          t: 1,
          duration: fly,
          ease: 'power2.in',
          onUpdate: () => {
            const [x, y] = curves[0].at(proxy.t);
            chip.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${(1 + proxy.t * 0.25).toFixed(3)})`);
          },
        }, at);
        tl.to(chip, { opacity: 0, duration: 0.12 }, at + fly);
      }
      // impact
      tl.call(() => {
        onCollectedRef.current(coin.key);
        running += coin.value;
        gsap.to(shown, { v: running, duration: Math.min(0.3, step), ease: 'power1.out', onUpdate: () => writeAll(shown.v) });
        gsap.fromTo(counters, { scale: 1.35 }, { scale: 1, duration: 0.35, ease: 'back.out(3)', overwrite: 'auto' });
        collectors.forEach((c) => {
          cellEl(c.key)?.animate?.(
            [{ transform: 'scale(1)' }, { transform: 'scale(1.24)', offset: 0.3 }, { transform: 'scale(1)' }],
            { duration: 320, easing: 'ease-out' },
          );
          burst(c.x, c.y, 'spark', turbo ? 8 : 14);
        });
        svg.querySelectorAll<SVGCircleElement>('[data-ring]').forEach((ring) => {
          gsap.fromTo(ring, { scale: 0.45, opacity: 0.95, transformOrigin: '50% 50%' }, { scale: 1.5, opacity: 0, duration: 0.5, ease: 'power2.out' });
        });
        try {
          playSfx('coinLand');
        } catch {
          /* audio optional */
        }
      }, [], at + fly);
      tl.to(beams, { opacity: 0, duration: 0.4, ease: 'power1.in' }, at + fly + 0.04);
    });

    const endAt = 0.12 + (coins.length - 1) * step + fly + 0.12;
    tl.call(() => {
      gsap.killTweensOf(shown);
      writeAll(per);
      root.dataset.final = 'true';
      gsap.fromTo(counters, { scale: 2 }, { scale: 1.3, duration: 0.7, ease: 'elastic.out(1, 0.45)', overwrite: 'auto' });
      collectors.forEach((c) => {
        cellEl(c.key)?.animate?.(
          [{ transform: 'scale(1)' }, { transform: 'scale(1.35)', offset: 0.25 }, { transform: 'scale(1)' }],
          { duration: 520, easing: 'ease-out' },
        );
        burst(c.x, c.y, 'coin', turbo ? 14 : 28);
        burst(c.x, c.y, 'star', turbo ? 8 : 18);
      });
    }, [], endAt);
    tl.to({}, { duration: hold }, endAt);

    return () => {
      tl.kill();
      gsap.killTweensOf(shown);
      gsap.killTweensOf(counters);
      gsap.killTweensOf(root);
      finish();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seq]);

  if (!owner || !seq) return null;

  return (
    <div ref={rootRef} className={s.root} key={seq.id} aria-hidden="true">
      <svg ref={svgRef} className={s.svg} viewBox="0 0 500 300">
        {seq.coins.map((coin, i) => (
          <g key={`b${i}`} data-beam={i} className={s.beam}>
            {seq.collectors.map((c, j) => {
              const { d } = curve(coin.x, coin.y, c.x, c.y);
              return (
                <g key={j}>
                  <path className={s.glowWide} d={d} pathLength={1} />
                  <path className={s.glow} d={d} pathLength={1} />
                  <path className={s.main} d={d} pathLength={1} />
                  <path className={s.core} d={d} pathLength={1} />
                </g>
              );
            })}
          </g>
        ))}
        {seq.collectors.map((c, j) => (
          <circle key={`r${j}`} data-ring={j} className={s.ring} cx={c.x} cy={c.y} r="46" />
        ))}
        {seq.coins.map((coin, i) => {
          const label = `+${formatCredits(coin.value)}`;
          const w = 16 + label.length * 9;
          return (
            <g key={`c${i}`} data-chip={i} className={s.chip} transform={`translate(${coin.x} ${coin.y})`}>
              <rect x={-w / 2} y={-13} width={w} height={26} rx={13} className={s.chipBg} />
              <text x={0} y={6} textAnchor="middle" className={s.chipText}>
                {label}
              </text>
            </g>
          );
        })}
      </svg>
      {seq.collectors.map((c, j) => (
        <div
          key={`k${j}`}
          className={s.counterPos}
          style={{
            left: `${(c.reel + 0.5) * 20}%`,
            top: `${(c.row + (c.row === 0 ? 0.84 : 0.12)) * (100 / 3)}%`,
          }}
        >
          <div className={s.counter} data-counter={j}>
            <span className={s.counterLabel}>Gesammelt</span>
            <span className={s.counterValue} data-value={j}>
              {formatCredits(0)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

export { CollectOverlay };
