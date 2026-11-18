import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { bus, type GameEvents } from '../core/events';
import { formatCredits } from '../slot/format';
import { prefersReducedMotion } from './motion';
import s from './WinSummaryOverlay.module.css';

type Summary = GameEvents['winSummaryStart'];

const signed = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : '±'}${formatCredits(Math.abs(n))}`;

/**
 * Blurs the slot machine after a base-game win and states plainly what the
 * win is worth against the bet. Mount inside a `position: relative` wrapper
 * around the SlotMachine. Emits `winSummaryEnd` when done (auto or tap).
 */
export default function WinSummaryOverlay({ reveal }: { reveal: boolean }) {
  const [data, setData] = useState<Summary | null>(null);
  const [leaving, setLeaving] = useState(false);
  const amountRef = useRef<HTMLSpanElement>(null);
  const timers = useRef<number[]>([]);
  const ended = useRef(true);

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };

  const finish = () => {
    if (ended.current) return;
    ended.current = true;
    clearTimers();
    setLeaving(true);
    timers.current.push(
      window.setTimeout(() => {
        setData(null);
        setLeaving(false);
        bus.emit('winSummaryEnd', {});
      }, 220),
    );
  };

  useEffect(() => {
    const off = bus.on('winSummaryStart', (p) => {
      clearTimers();
      ended.current = false;
      setLeaving(false);
      setData(p);
      const hold = p.turbo ? 900 : p.isLDW ? 2000 : 1700;
      timers.current.push(window.setTimeout(finish, hold));
    });
    return () => {
      off();
      clearTimers();
      // never leave the store waiting
      if (!ended.current) {
        ended.current = true;
        bus.emit('winSummaryEnd', {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // quick count-up of the celebrated amount
  useEffect(() => {
    const el = amountRef.current;
    if (!data || !el) return;
    if (prefersReducedMotion()) {
      el.textContent = `+${formatCredits(data.amount)}`;
      return;
    }
    const o = { v: 0 };
    const tw = gsap.to(o, {
      v: data.amount,
      duration: data.turbo ? 0.25 : 0.5,
      ease: 'power2.out',
      onUpdate: () => {
        el.textContent = `+${formatCredits(o.v)}`;
      },
    });
    gsap.fromTo(el, { scale: 0.6 }, { scale: 1, duration: 0.6, ease: 'back.out(2.2)' });
    return () => {
      tw.kill();
    };
  }, [data]);

  if (!data) return null;
  const loss = data.net < 0;

  return (
    <div
      className={`${s.overlay} ${leaving ? s.leaving : ''}`}
      onClick={finish}
      role="status"
      aria-live="polite"
    >
      <div className={s.card}>
        <div className={s.title}>Gewinn</div>
        <div className={s.amount}>
          <span ref={amountRef}>+{formatCredits(data.amount)}</span>
          <small>Credits</small>
        </div>

        <div className={s.ledger}>
          <div>
            <span>Einsatz</span>
            <b>−{formatCredits(data.bet)}</b>
          </div>
          <div className={`${s.net} ${loss ? s.netLoss : s.netWin}`}>
            <span>Wirklich gewonnen</span>
            <b>{signed(data.net)}</b>
          </div>
        </div>

        {reveal && loss && (
          <p className={s.note}>Das war ein Verlust – gefeiert wie ein Gewinn.</p>
        )}
      </div>
    </div>
  );
}
