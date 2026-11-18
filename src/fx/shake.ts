import { gsap } from 'gsap';
import { prefersReducedMotion } from './motion';

const active = new WeakMap<Element, ReturnType<typeof gsap.timeline>>();

/**
 * Decaying camera-shake on an element (transform only).
 * strength ≈ 0.3 (nudge) … 1 (big win) … 1.6 (epic).
 * No-op with prefers-reduced-motion.
 */
export function shake(el: Element | null | undefined, strength = 1): void {
  if (!el || prefersReducedMotion() || strength <= 0) return;
  active.get(el)?.kill();

  const steps = 9;
  const amp = 11 * strength;
  const tl = gsap.timeline({
    onComplete: () => {
      gsap.set(el, { clearProps: 'x,y,rotation' });
      active.delete(el);
    },
  });
  for (let i = 0; i < steps; i++) {
    const k = 1 - i / steps;
    tl.to(el, {
      x: (Math.random() * 2 - 1) * amp * k,
      y: (Math.random() * 2 - 1) * amp * 0.7 * k,
      rotation: (Math.random() * 2 - 1) * 0.5 * strength * k,
      duration: 0.045,
      ease: 'sine.inOut',
    });
  }
  tl.to(el, { x: 0, y: 0, rotation: 0, duration: 0.12, ease: 'power2.out' });
  active.set(el, tl);
}
