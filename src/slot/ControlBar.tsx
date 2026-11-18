import { useEffect, useRef } from 'react';
import { bus } from '../core/events';
import NetCounter from './NetCounter';
import { formatCredits } from './format';
import s from './ControlBar.module.css';

export interface ControlBarProps {
  balance: number;
  bet: number;
  spinning: boolean;
  canSpin: boolean;
  /** called for SPIN and – while spinning – for STOP (slam stop) */
  onSpin(): void;
  onBetUp(): void;
  onBetDown(): void;
  canBetUp: boolean;
  canBetDown: boolean;
  turbo: boolean;
  onToggleTurbo(): void;
  autoplayLeft: number;
  onAutoplay(): void;
  onStopAutoplay(): void;
  onBonusBuy(): void;
  bonusBuyCost: number;
  freeSpins: { remaining: number; total: number } | null;
  muted: boolean;
  onToggleMute(): void;
  /** session result: returned − wagered (negative = loss) */
  sessionNet: number;
}

const click = (kind: 'spin' | 'bet' | 'menu' | 'toggle' | 'generic') => bus.emit('buttonClick', { kind });

function isTypingTarget(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false;
  if (t.isContentEditable) return true;
  const tag = t.tagName;
  // buttons/links handle Space natively – don't double-trigger
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON' || tag === 'A';
}

export default function ControlBar(p: ControlBarProps) {
  const ref = useRef(p);
  ref.current = p;

  // Space = spin / stop
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space' && e.key !== ' ') return;
      if (e.defaultPrevented || e.repeat || e.altKey || e.ctrlKey || e.metaKey) return;
      if (isTypingTarget(e.target)) return;
      const cur = ref.current;
      if (!cur.spinning && !cur.canSpin) return;
      e.preventDefault();
      click('spin');
      cur.onSpin();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const {
    balance, bet, spinning, canSpin, canBetUp, canBetDown, turbo, autoplayLeft,
    bonusBuyCost, freeSpins, muted, sessionNet,
  } = p;
  const spinDisabled = !spinning && !canSpin;
  const auto = autoplayLeft > 0;
  const bonusDisabled = spinning || !!freeSpins || auto || balance < bonusBuyCost;

  return (
    <div className={s.wrap} data-fs={freeSpins ? 'true' : 'false'}>
      <div className={s.bar}>
        <button
          type="button"
          className={s.bonus}
          disabled={bonusDisabled}
          onClick={() => {
            click('generic');
            p.onBonusBuy();
          }}
        >
          <span className={s.bonusShine} aria-hidden="true" />
          <span className={s.bonusLabel}>Bonus kaufen</span>
          <span className={s.bonusCost}>{formatCredits(bonusBuyCost)}</span>
        </button>

        <div className={`${s.stat} ${s.bal}`}>
          <span className={s.label}>Guthaben</span>
          <span className={s.value}>{formatCredits(balance)}</span>
          <span className={s.unit}>Credits</span>
        </div>

        {freeSpins ? (
          <div className={`${s.stat} ${s.bet} ${s.fs}`} aria-live="polite">
            <span className={s.label}>Freispiele</span>
            <span className={s.fsValue}>
              {freeSpins.remaining} <small>/ {freeSpins.total}</small>
            </span>
          </div>
        ) : (
          <div className={`${s.stat} ${s.bet}`}>
            <span className={s.label}>Einsatz</span>
            <div className={s.betRow}>
              <button
                type="button"
                className={s.betBtn}
                aria-label="Einsatz senken"
                disabled={!canBetDown || spinning || auto}
                onClick={() => {
                  click('bet');
                  p.onBetDown();
                }}
              >
                −
              </button>
              <span className={s.betValue}>{formatCredits(bet)}</span>
              <button
                type="button"
                className={s.betBtn}
                aria-label="Einsatz erhöhen"
                disabled={!canBetUp || spinning || auto}
                onClick={() => {
                  click('bet');
                  p.onBetUp();
                }}
              >
                +
              </button>
            </div>
            <span className={s.unit}>Credits</span>
          </div>
        )}

        <div className={s.spinCell}>
          <button
            type="button"
            className={s.spin}
            data-state={spinning ? 'stop' : 'spin'}
            data-attract={!spinning && canSpin ? 'true' : 'false'}
            disabled={spinDisabled}
            aria-label={spinning ? 'Stopp' : 'Drehen'}
            onClick={() => {
              click('spin');
              p.onSpin();
            }}
          >
            <span className={s.spinRing} aria-hidden="true" />
            <span className={s.spinFace} aria-hidden="true">
              <svg className={s.spinIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3.5 12a8.5 8.5 0 0 1 14.6-5.9L20.5 8.5" />
                <path d="M20.5 3.5v5h-5" />
                <path d="M20.5 12a8.5 8.5 0 0 1-14.6 5.9L3.5 15.5" />
                <path d="M3.5 20.5v-5h5" />
              </svg>
              <span className={s.spinLabel}>{spinning ? 'Stop' : freeSpins ? 'Frei' : 'Spin'}</span>
            </span>
          </button>
        </div>

        <div className={`${s.stat} ${s.win}`}>
          <span className={s.label}>Gewinn / Verlust</span>
          <NetCounter value={sessionNet} className={`${s.value} ${s.net}`} />
          <span className={s.unit}>Seit Start</span>
        </div>

        <div className={s.tools}>
          <button
            type="button"
            className={s.tool}
            aria-pressed={turbo}
            aria-label="Turbo"
            title="Turbo"
            onClick={() => {
              click('toggle');
              p.onToggleTurbo();
            }}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M13.5 2 4.5 13.5h6l-1 8.5 9-11.5h-6z" fill="currentColor" />
            </svg>
          </button>
          <button
            type="button"
            className={`${s.tool} ${auto ? s.toolActive : ''}`}
            aria-label={auto ? `Autoplay stoppen (${autoplayLeft} übrig)` : 'Autoplay'}
            title="Autoplay"
            disabled={!auto && (spinning || !canSpin)}
            onClick={() => {
              click('generic');
              if (auto) p.onStopAutoplay();
              else p.onAutoplay();
            }}
          >
            {auto ? (
              <span className={s.autoCount}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor" />
                </svg>
                <b>{autoplayLeft}</b>
              </span>
            ) : (
              <span className={s.autoText}>Auto</span>
            )}
          </button>
          <button
            type="button"
            className={s.tool}
            aria-pressed={muted}
            aria-label={muted ? 'Ton an' : 'Ton aus'}
            title={muted ? 'Ton an' : 'Ton aus'}
            onClick={() => {
              click('toggle');
              p.onToggleMute();
            }}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" />
              {muted ? (
                <path d="m16 9.5 5 5m0-5-5 5" />
              ) : (
                <>
                  <path d="M15.5 9a4 4 0 0 1 0 6" />
                  <path d="M18 6.5a7.5 7.5 0 0 1 0 11" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export { ControlBar };
