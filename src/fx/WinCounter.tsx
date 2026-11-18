import { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { formatCredits } from '../slot/format';
import { prefersReducedMotion } from './motion';
import s from './WinCounter.module.css';

export interface WinCounterProps {
  /** target amount in credits; 0 resets instantly */
  amount: number;
  /** roll-up duration; increases continue from the currently shown value */
  durationMs: number;
  label?: string;
  className?: string;
}

/**
 * Rolling credit counter. Text is written directly to the DOM (no React
 * re-render per frame) and pops with an elastic scale when finished.
 */
export default function WinCounter({ amount, durationMs, label, className }: WinCounterProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const valRef = useRef<HTMLSpanElement>(null);
  const shown = useRef(0);

  useLayoutEffect(() => {
    const el = valRef.current;
    const root = rootRef.current;
    if (!el || !root) return;
    const write = (v: number) => {
      el.textContent = formatCredits(v);
      shown.current = v;
    };
    const pop = () => {
      if (prefersReducedMotion()) return;
      gsap.fromTo(el, { scale: 1.32 }, { scale: 1, duration: 0.6, ease: 'elastic.out(1, 0.45)', overwrite: true });
    };

    root.dataset.active = amount > 0 ? 'true' : 'false';
    if (amount <= 0) {
      write(0);
      return;
    }
    if (amount === shown.current) {
      write(amount);
      return;
    }
    const from = amount > shown.current ? shown.current : 0;
    if (durationMs <= 0 || prefersReducedMotion()) {
      write(amount);
      pop();
      return;
    }
    root.dataset.rolling = 'true';
    const obj = { v: from };
    const tw = gsap.to(obj, {
      v: amount,
      duration: durationMs / 1000,
      ease: 'power1.out',
      onUpdate: () => write(obj.v),
      onComplete: () => {
        write(amount);
        root.dataset.rolling = 'false';
        pop();
      },
    });
    return () => {
      tw.kill();
      root.dataset.rolling = 'false';
    };
  }, [amount, durationMs]);

  useLayoutEffect(() => () => {
    if (valRef.current) gsap.killTweensOf(valRef.current);
  }, []);

  return (
    <div ref={rootRef} className={`${s.counter} ${className ?? ''}`} aria-live="polite">
      {label && <span className={s.label}>{label}</span>}
      <span ref={valRef} className={s.value} />
    </div>
  );
}

export { WinCounter };
