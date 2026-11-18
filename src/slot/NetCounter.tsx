import { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { prefersReducedMotion } from '../fx/motion';
import { formatCredits } from './format';

const signed = (n: number) => {
  const r = Math.round(n * 100) / 100;
  return `${r > 0 ? '+' : r < 0 ? '−' : ''}${formatCredits(Math.abs(r))}`;
};

/**
 * Session result (returned − wagered), signed. Tweens between values and
 * flips colour between win (green) and loss (red).
 */
export default function NetCounter({ value, className }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const shown = useRef(value);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const tone = (v: number) => {
      const r = Math.round(v * 100) / 100;
      el.dataset.tone = r < 0 ? 'loss' : r > 0 ? 'win' : 'zero';
    };
    if (prefersReducedMotion() || Math.abs(value - shown.current) < 0.005) {
      el.textContent = signed(value);
      tone(value);
      shown.current = value;
      return;
    }
    const o = { v: shown.current };
    const tw = gsap.to(o, {
      v: value,
      duration: 0.45,
      ease: 'power2.out',
      onUpdate: () => {
        el.textContent = signed(o.v);
        tone(o.v);
        shown.current = o.v;
      },
    });
    return () => {
      tw.kill();
    };
  }, [value]);

  return (
    <span ref={ref} className={className} data-tone="zero">
      {signed(value)}
    </span>
  );
}
