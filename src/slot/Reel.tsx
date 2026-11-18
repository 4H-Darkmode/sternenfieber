import { useLayoutEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import type { Cell } from '../engine/types';
import { SymbolView } from './Symbol';
import { ReelController, VISIBLE, type ReelView } from './reelController';
import s from './Reel.module.css';

export type RowState = 'idle' | 'dim' | 'hidden';
export type AntState = 'none' | 'glow' | 'focus';

export interface ReelProps {
  index: number;
  bet: number;
  base: Cell[];
  initial: Cell[];
  rowStates: RowState[];
  ant: AntState;
  register: (index: number, ctrl: ReelController | null) => void;
}

const CELL_STYLES = Array.from({ length: 64 }, (_, i) => ({ transform: `translateY(${i * 100}%)` }));

export default function Reel({ index, bet, base, initial, rowStates, ant, register }: ReelProps) {
  const ctrlRef = useRef<ReelController | null>(null);
  if (!ctrlRef.current) ctrlRef.current = new ReelController(index, base, initial);
  const ctrl = ctrlRef.current;

  const [view, setView] = useState<ReelView>(() => ctrl.view);
  ctrl.commit = (v, sync) => {
    if (sync) flushSync(() => setView(v));
    else setView(v);
  };

  const stripRef = useRef<HTMLDivElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);

  // new filler strip → applied on next spin
  const lastBase = useRef(base);
  if (lastBase.current !== base) {
    lastBase.current = base;
    ctrl.setBase(base);
  }

  useLayoutEffect(() => {
    ctrl.stripEl = stripRef.current;
    ctrl.flashEl = flashRef.current;
    ctrl.applyTransform();
    register(index, ctrl);
    return () => register(index, null);
  }, [ctrl, index, register]);

  useLayoutEffect(() => {
    ctrl.committedVer = view.ver;
    ctrl.applyTransform();
  }, [ctrl, view]);

  return (
    <div className={s.reel} data-ant={ant}>
      <div className={s.window}>
        <div className={s.strip} ref={stripRef} data-spinning="false">
          {view.items.map((cell, i) => {
            const r = i - view.restTop;
            const visible = view.restTop >= 0 && r >= 0 && r < VISIBLE;
            const st: RowState = visible ? rowStates[r] ?? 'idle' : 'idle';
            return (
              <div
                key={i}
                className={s.cell}
                style={CELL_STYLES[i]}
                data-hidden={st === 'hidden' ? 'true' : undefined}
                aria-hidden={visible ? undefined : true}
              >
                <SymbolView cell={cell} bet={bet} state={st === 'dim' ? 'dim' : 'idle'} animate={visible} />
              </div>
            );
          })}
        </div>
        <div className={s.shade} aria-hidden="true" />
        <div className={s.flash} ref={flashRef} aria-hidden="true" />
      </div>
      <div className={s.antFrame} aria-hidden="true">
        <div className={s.antStreaks} />
      </div>
    </div>
  );
}
