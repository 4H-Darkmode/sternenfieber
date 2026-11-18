import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { bus } from '../core/events';
import { REELS, ROWS, type Cell, type Pos, type SpinResult, type SymbolId } from '../engine/types';
import PaylineOverlay from '../fx/PaylineOverlay';
import { fx } from '../fx/particles';
import { shake } from '../fx/shake';
import { prefersReducedMotion } from '../fx/motion';
import Reel, { type AntState, type RowState } from './Reel';
import { ReelController, type SpinParams } from './reelController';
import { buildBaseStrip, randomGrid } from './fillers';
import { SymbolView } from './Symbol';
import s from './SlotMachine.module.css';

export interface SlotMachineProps {
  result: SpinResult | null;
  /** increment (together with a new `result`) to start a spin */
  spinId: number;
  /** increment while spinning to slam-stop all remaining reels */
  quickStopId: number;
  turbo: boolean;
  bet: number;
  /** cells to present as winning (others dim); lineIndex draws that payline */
  highlight: { positions: Pos[]; lineIndex?: number } | null;
  onAllStopped?: (r: SpinResult) => void;
  /** optional real reel strips for the blurred filler symbols (keep stable) */
  fillerFor?: (reel: number) => SymbolId[];
  className?: string;
}

const TIMING = {
  normal: {
    firstStop: 0.42, gap: 0.22, speed: 24, windup: 0.13, accel: 140, brakeT: 0.32, settle: 0.42,
    antExtra: 1.4, antSpeed: 9, antBrakeT: 0.7, finishDelay: 0.16,
  },
  turbo: {
    firstStop: 0.12, gap: 0.05, speed: 32, windup: 0.06, accel: 320, brakeT: 0.2, settle: 0.3,
    antExtra: 0.9, antSpeed: 12, antBrakeT: 0.55, finishDelay: 0.06,
  },
};
type Timing = (typeof TIMING)['normal'];

interface Run {
  result: SpinResult;
  turbo: boolean;
  timing: Timing;
  impacted: boolean[];
  flushed: number;
  scatters: number;
  slammed: boolean;
  antFrom: number | null;
  done: boolean;
}

const range = (n: number) => Array.from({ length: n }, (_, i) => i);

export default function SlotMachine(props: SlotMachineProps) {
  const { spinId, quickStopId, turbo, bet, highlight, fillerFor, className } = props;
  const propsRef = useRef(props);
  propsRef.current = props;

  // filler strips – memoised by content so an inline fillerFor doesn't churn
  const fillerKey = fillerFor ? range(REELS).map((r) => fillerFor(r).join(',')).join('|') : 'default';
  const bases = useMemo(
    () => range(REELS).map((r) => buildBaseStrip(r, propsRef.current.fillerFor?.(r))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fillerKey],
  );
  const [initialGrid] = useState<Cell[][]>(() => randomGrid(fillerFor));

  const [grid, setGrid] = useState<Cell[][]>(initialGrid);
  const [spinning, setSpinning] = useState(false);
  const [landed, setLanded] = useState<boolean[]>(() => range(REELS).map(() => true));
  const [antFrom, setAntFrom] = useState<number | null>(null);

  const machineRef = useRef<HTMLDivElement>(null);
  const reelsRef = useRef<HTMLDivElement>(null);
  const ctrls = useRef<(ReelController | null)[]>(range(REELS).map(() => null));
  const runRef = useRef<Run | null>(null);
  const loop = useRef({ raf: 0, clock: 0, last: 0, timers: [] as { at: number; fn: () => void }[] });
  const lastSpinId = useRef(spinId);
  const lastQuick = useRef(quickStopId);

  // ── director (stable functions operating on refs) ───────────────────
  const director = useMemo(() => {
    const cellCenter = (reel: number, row: number): [number, number] | null => {
      const el = reelsRef.current;
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return [r.left + ((reel + 0.5) * r.width) / REELS, r.top + ((row + 0.5) * r.height) / ROWS];
    };

    const burstCell = (reel: number, row: number, kind: 'spark' | 'coin' | 'star', count: number) => {
      const c = cellCenter(reel, row);
      if (c) fx.burst(c[0], c[1], kind, count);
    };

    const tick = (now: number) => {
      const L = loop.current;
      L.raf = 0;
      const dt = Math.min(0.05, Math.max(0, (now - L.last) / 1000));
      L.last = now;
      L.clock += dt;
      let active = false;
      for (const c of ctrls.current) if (c && c.update(L.clock, dt)) active = true;
      if (L.timers.length) {
        const due = L.timers.filter((t) => t.at <= L.clock);
        if (due.length) {
          L.timers = L.timers.filter((t) => t.at > L.clock);
          due.forEach((t) => t.fn());
        }
      }
      if (active || L.timers.length) L.raf = requestAnimationFrame(tick);
    };

    const kick = () => {
      const L = loop.current;
      if (L.raf) return;
      L.last = performance.now();
      L.raf = requestAnimationFrame(tick);
    };

    const finish = (run: Run) => {
      if (run.done) return;
      run.done = true;
      setSpinning(false);
      bus.emit('allReelsStopped', { result: run.result });
      propsRef.current.onAllStopped?.(run.result);
    };

    const emitReel = (run: Run, i: number) => {
      const cells = run.result.grid[i];
      bus.emit('reelStop', { reel: i, symbols: cells, turbo: run.turbo });
      cells.forEach((cell, row) => {
        if (cell.symbol === 'SCATTER') {
          run.scatters++;
          bus.emit('scatterLand', { reel: i, nth: run.scatters });
          burstCell(i, row, 'star', run.scatters >= 3 ? 46 : 22);
          if (run.scatters === 3) {
            burstCell(i, row, 'spark', 30);
            shake(machineRef.current, 0.6);
          }
        } else if (cell.symbol === 'COIN') {
          bus.emit('coinLand', { reel: i, row, value: cell.coinValue ?? 0 });
          burstCell(i, row, 'spark', 10);
        } else if (cell.symbol === 'COLLECT') {
          bus.emit('collectLand', { reel: i, row });
          burstCell(i, row, 'spark', 16);
          burstCell(i, row, 'star', 8);
        }
      });
      setLanded((prev) => {
        const next = prev.slice();
        next[i] = true;
        return next;
      });

      const L = loop.current;
      if (run.antFrom !== null && i === run.antFrom - 1) {
        const k = run.antFrom;
        bus.emit('anticipationStart', { reel: k });
        setAntFrom(k);
        if (!run.slammed) {
          for (let j = k; j < REELS; j++) {
            const c = ctrls.current[j];
            if (!c) continue;
            c.setTargetSpeed(run.timing.antSpeed);
            c.setStop(L.clock + run.timing.antExtra * (j - k + 1) - run.timing.antBrakeT * 0.6, run.timing.antBrakeT);
          }
        }
      }

      if (i === REELS - 1) {
        if (run.antFrom !== null) {
          bus.emit('anticipationEnd', { success: run.scatters >= 3 });
          setAntFrom(null);
        }
        L.timers.push({ at: L.clock + run.timing.finishDelay, fn: () => finish(run) });
        kick();
      }
    };

    const flush = (run: Run) => {
      while (run.flushed < REELS && run.impacted[run.flushed]) {
        emitReel(run, run.flushed);
        run.flushed++;
      }
    };

    const onImpact = (reel: number) => {
      const run = runRef.current;
      if (!run || run.done) return;
      run.impacted[reel] = true;
      flush(run);
    };

    const forceFinish = (run: Run) => {
      ctrls.current.forEach((c, i) => {
        if (c && !c.landed) c.snap(run.result.grid[i]);
        run.impacted[i] = true;
      });
      flush(run);
      loop.current.timers = [];
      finish(run);
    };

    const begin = (result: SpinResult) => {
      const prev = runRef.current;
      if (prev && !prev.done) forceFinish(prev);
      const isTurbo = propsRef.current.turbo;
      const timing = isTurbo ? TIMING.turbo : TIMING.normal;
      const reduced = prefersReducedMotion();
      const a = result.anticipationFromReel;
      const antK = a !== null && a !== undefined && a >= 1 && a < REELS ? a : null;
      const run: Run = {
        result, turbo: isTurbo, timing,
        impacted: range(REELS).map(() => false),
        flushed: 0, scatters: 0, slammed: false, antFrom: antK, done: false,
      };
      runRef.current = run;
      setGrid(result.grid);
      setSpinning(true);
      setLanded(range(REELS).map(() => false));
      setAntFrom(null);

      const L = loop.current;
      const params: SpinParams = {
        speed: timing.speed,
        windup: reduced ? 0 : timing.windup,
        accel: timing.accel,
        reduced,
        settle: reduced ? 0.12 : timing.settle,
      };
      ctrls.current.forEach((c, i) => {
        if (!c) return;
        c.start(L.clock, params);
        const at = antK !== null && i >= antK ? Infinity : L.clock + timing.firstStop + timing.gap * i;
        c.requestStop(result.grid[i], at, timing.brakeT);
      });
      kick();
    };

    const slam = () => {
      const run = runRef.current;
      if (!run || run.done) return;
      run.slammed = true;
      const L = loop.current;
      let rank = 0;
      ctrls.current.forEach((c) => {
        if (!c || c.braking) return;
        c.setTargetSpeed(Math.max(c.vel, run.timing.speed * 0.8));
        c.setStop(L.clock + rank * 0.055, 0.2);
        rank++;
      });
      kick();
    };

    const dispose = () => {
      const L = loop.current;
      if (L.raf) cancelAnimationFrame(L.raf);
      L.raf = 0;
      L.timers = [];
    };

    return { begin, slam, onImpact, dispose, cellCenter, burstCell };
  }, []);

  const register = useCallback(
    (i: number, c: ReelController | null) => {
      ctrls.current[i] = c;
      if (c) c.onImpact = director.onImpact;
    },
    [director],
  );

  // start a spin when spinId changes
  useEffect(() => {
    if (spinId === lastSpinId.current) return;
    lastSpinId.current = spinId;
    const res = propsRef.current.result;
    if (res) director.begin(res);
  }, [spinId, director]);

  // slam stop
  useEffect(() => {
    if (quickStopId === lastQuick.current) return;
    lastQuick.current = quickStopId;
    director.slam();
  }, [quickStopId, director]);

  useEffect(() => () => director.dispose(), [director]);

  // ── presentation state ───────────────────────────────────────────────
  const shownHL = highlight && !spinning && highlight.positions.length ? highlight : null;
  const winSet = useMemo(
    () => (shownHL ? new Set(shownHL.positions.map(([r, row]) => r * ROWS + row)) : null),
    [shownHL],
  );

  // sparks on newly highlighted cells
  useEffect(() => {
    if (!shownHL) return;
    shownHL.positions.slice(0, 6).forEach(([r, row], i) => {
      window.setTimeout(() => director.burstCell(r, row, 'spark', 8), i * 60);
    });
  }, [shownHL, director]);

  const firstUnlanded = antFrom !== null ? landed.findIndex((l, i) => i >= antFrom && !l) : -1;

  const rowStatesFor = (reel: number): RowState[] =>
    range(ROWS).map((row) => {
      if (winSet) return winSet.has(reel * ROWS + row) ? 'hidden' : 'dim';
      if (antFrom !== null && landed[reel] && grid[reel]?.[row]?.symbol !== 'SCATTER') return 'dim';
      return 'idle';
    });

  const antFor = (reel: number): AntState => {
    if (antFrom === null || reel < antFrom || landed[reel]) return 'none';
    return reel === firstUnlanded ? 'focus' : 'glow';
  };

  return (
    <div
      ref={machineRef}
      className={`${s.machine} ${className ?? ''}`}
      data-ant={antFrom !== null ? 'true' : 'false'}
      data-busy={spinning ? 'true' : 'false'}
      data-turbo={turbo ? 'true' : 'false'}
    >
      <div className={s.header}>
        <span className={`${s.deco} ${s.decoL}`} aria-hidden="true">✦</span>
        <h2 className={s.logo} data-text="STERNENFIEBER">
          STERNENFIEBER
        </h2>
        <span className={`${s.deco} ${s.decoR}`} aria-hidden="true">✦</span>
      </div>
      <div className={s.tagline}>10 Gewinnlinien · Freispiele · Sternenmünzen</div>

      <div className={s.cabinet}>
        <div className={s.bulbs} aria-hidden="true">
          {range(18).map((i) => (
            <span key={i} style={{ animationDelay: `${(i % 6) * 0.16}s` }} />
          ))}
        </div>
        <div className={s.screen}>
          <div className={s.backdrop} aria-hidden="true">
            <div className={s.nebula} />
            <div className={s.stars} />
            <div className={s.stars2} />
          </div>
          <div className={s.reels} ref={reelsRef} role="group" aria-label="Walzen">
            {range(REELS).map((i) => (
              <Reel
                key={i}
                index={i}
                bet={bet}
                base={bases[i]}
                initial={initialGrid[i]}
                rowStates={rowStatesFor(i)}
                ant={antFor(i)}
                register={register}
              />
            ))}
            {shownHL && (
              <div className={s.winLayer} aria-hidden="true">
                {shownHL.positions.map(([r, row]) => {
                  const cell = grid[r]?.[row];
                  if (!cell) return null;
                  return (
                    <div
                      key={`${r}-${row}`}
                      className={s.winCell}
                      style={{ left: `${r * (100 / REELS)}%`, top: `${row * (100 / ROWS)}%` }}
                    >
                      <SymbolView cell={cell} bet={bet} state="win" />
                    </div>
                  );
                })}
              </div>
            )}
            <PaylineOverlay highlight={shownHL} />
          </div>
          <div className={s.glass} aria-hidden="true" />
        </div>
        <div className={s.sheen} aria-hidden="true">
          <i />
        </div>
        <div className={`${s.bulbs} ${s.bulbsBottom}`} aria-hidden="true">
          {range(18).map((i) => (
            <span key={i} style={{ animationDelay: `${(i % 6) * 0.16}s` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

export { SlotMachine };
