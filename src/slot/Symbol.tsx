import { memo, type CSSProperties } from 'react';
import type { Cell } from '../engine/types';
import s from './Symbol.module.css';
import { SPECIAL_SYMBOLS, SYMBOL_ART, SYMBOL_GLOW, SYMBOL_NAMES, ensureSymbolDefs } from './symbols';
import { formatCoin } from './format';

export type SymbolState = 'idle' | 'win' | 'dim' | 'land';

export interface SymbolViewProps {
  cell: Cell;
  /** total bet – COIN label shows coinValue × bet in credits */
  bet: number;
  state?: SymbolState;
  /** false = pause idle loops (e.g. off-screen cells in a reel strip) */
  animate?: boolean;
  className?: string;
}

function SymbolViewImpl({ cell, bet, state = 'idle', animate = true, className }: SymbolViewProps) {
  ensureSymbolDefs();
  const Art = SYMBOL_ART[cell.symbol];
  const isCoin = cell.symbol === 'COIN';
  const label = isCoin ? formatCoin((cell.coinValue ?? 0) * bet) : undefined;
  const cls = [
    s.sym,
    s[state],
    SPECIAL_SYMBOLS.has(cell.symbol) ? s.special : '',
    animate ? '' : s.still,
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <div
      className={cls}
      data-symbol={cell.symbol}
      role="img"
      aria-label={isCoin ? `${SYMBOL_NAMES.COIN} ${label} Credits` : SYMBOL_NAMES[cell.symbol]}
      style={{ '--glow': SYMBOL_GLOW[cell.symbol] } as CSSProperties}
    >
      <div className={s.glow} />
      <svg className={s.art} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
        <g className={s.artInner}>
          <Art label={label} />
        </g>
      </svg>
      {state === 'win' && (
        <div className={s.sweep} aria-hidden="true">
          <div className={s.sweepBar} />
        </div>
      )}
    </div>
  );
}

/** Memoised on symbol/coinValue/bet/state so reel strips only re-render changed cells. */
export const SymbolView = memo(SymbolViewImpl, (a, b) => {
  return (
    a.cell.symbol === b.cell.symbol &&
    a.cell.coinValue === b.cell.coinValue &&
    (a.cell.symbol !== 'COIN' || a.bet === b.bet) &&
    a.state === b.state &&
    a.animate === b.animate &&
    a.className === b.className
  );
});

export default SymbolView;
