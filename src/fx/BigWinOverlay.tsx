import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { gsap } from 'gsap';
import { bus } from '../core/events';
import { WIN_TIER_THRESHOLDS } from '../engine/types';
import { formatCredits } from '../slot/format';
import { prefersReducedMotion, screenElement, useOwner } from './motion';
import { shake } from './shake';
import { fx } from './particles';
import s from './BigWinOverlay.module.css';

type Tier = 'big' | 'mega' | 'epic';
const ORDER: Tier[] = ['big', 'mega', 'epic'];
const WORDS: Record<Tier, string> = { big: 'BIG', mega: 'MEGA', epic: 'EPIC' };
const DURATION: Record<Tier, number> = { big: 4, mega: 6, epic: 8 };
const HOLD_MS = 1500;

interface Active {
  id: number;
  tier: Tier;
  amount: number;
  bet: number;
}

/**
 * Fullscreen BIG → MEGA → EPIC win presentation. Mount ONCE at app level.
 * Listens: bigWinStart. Emits: bigWinTierUp (each upgrade), bigWinEnd.
 * Click / tap / Space / Enter = skip to the final amount (again = close).
 */
export default function BigWinOverlay() {
  const owner = useOwner('BigWinOverlay');
  const [active, setActive] = useState<Active | null>(null);
  const [tier, setTier] = useState<Tier>('big');
  const rootRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const valueRef = useRef<HTMLSpanElement>(null);
  const raysRef = useRef<HTMLDivElement>(null);
  const amountRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const skipRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (!owner) return;
    let seq = 0;
    return bus.on('bigWinStart', (p) => {
      setTier('big');
      setActive({ id: ++seq, tier: p.tier, amount: p.amount, bet: p.bet });
    });
  }, [owner]);

  useLayoutEffect(() => {
    if (!active) return;
    const root = rootRef.current;
    const title = titleRef.current;
    const value = valueRef.current;
    if (!root || !title || !value) return;

    const reduced = prefersReducedMotion();
    const { amount, bet } = active;
    const maxIdx = ORDER.indexOf(active.tier);
    const thrMega = WIN_TIER_THRESHOLDS.mega * bet;
    const thrEpic = WIN_TIER_THRESHOLDS.epic * bet;
    let current: Tier = 'big';
    let phase: 'count' | 'hold' | 'out' = 'count';
    let ended = false;
    let holdTimer = 0;

    const write = (v: number) => {
      value.textContent = formatCredits(v);
    };
    const tierFor = (v: number): Tier => {
      if (maxIdx >= 2 && v >= thrEpic) return 'epic';
      if (maxIdx >= 1 && v >= thrMega) return 'mega';
      return 'big';
    };
    const upgrade = (t: Tier) => {
      if (ORDER.indexOf(t) <= ORDER.indexOf(current)) return;
      current = t;
      setTier(t);
      bus.emit('bigWinTierUp', { tier: t });
      shake(screenElement(), t === 'epic' ? 1.4 : 1);
      shake(contentRef.current, t === 'epic' ? 1.1 : 0.7);
      if (!reduced) {
        gsap.fromTo(title, { scale: 1.55 }, { scale: 1, duration: 0.8, ease: 'elastic.out(1, 0.5)', overwrite: 'auto' });
        gsap.fromTo(raysRef.current, { scale: 1.25 }, { scale: 1, duration: 0.9, ease: 'power3.out' });
      }
    };

    const end = () => {
      if (ended) return;
      ended = true;
      phase = 'out';
      window.clearTimeout(holdTimer);
      bus.emit('bigWinEnd', { amount });
      gsap.to(root, {
        opacity: 0,
        duration: reduced ? 0.15 : 0.45,
        ease: 'power2.in',
        onComplete: () => setActive((a) => (a && a.id === active.id ? null : a)),
      });
    };

    const hold = () => {
      if (phase !== 'count') return;
      phase = 'hold';
      write(amount);
      upgrade(tierFor(amount));
      if (!reduced) {
        gsap.fromTo(amountRef.current, { scale: 1.25 }, { scale: 1, duration: 0.7, ease: 'elastic.out(1, 0.45)' });
        fx.burst(window.innerWidth / 2, window.innerHeight * 0.55, 'star', 40);
      }
      holdTimer = window.setTimeout(end, HOLD_MS);
    };

    // ── entrance ──
    write(0);
    gsap.set(root, { opacity: 0 });
    const intro = gsap.timeline();
    intro.to(root, { opacity: 1, duration: reduced ? 0.1 : 0.35, ease: 'power1.out' });
    if (!reduced) {
      intro.fromTo(raysRef.current, { scale: 0.2, opacity: 0 }, { scale: 1, opacity: 1, duration: 1.1, ease: 'power3.out' }, 0);
      intro.fromTo(
        title,
        { scale: 0.15, opacity: 0, rotation: -10 },
        { scale: 1, opacity: 1, rotation: 0, duration: 1, ease: 'elastic.out(1, 0.55)' },
        0.1,
      );
      intro.fromTo(amountRef.current, { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'back.out(2)' }, 0.35);
    }

    const counter = { v: 0 };
    const count = gsap.to(counter, {
      v: amount,
      duration: reduced ? 1.5 : DURATION[active.tier],
      delay: reduced ? 0 : 0.35,
      ease: 'power1.inOut',
      onUpdate: () => {
        write(counter.v);
        upgrade(tierFor(counter.v));
      },
      onComplete: hold,
    });

    skipRef.current = () => {
      if (phase === 'count') {
        count.progress(1);
        intro.progress(1);
      } else if (phase === 'hold') {
        end();
      }
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'Escape') {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (!e.repeat) skipRef.current();
      }
    };
    window.addEventListener('keydown', onKey, true);

    return () => {
      window.removeEventListener('keydown', onKey, true);
      window.clearTimeout(holdTimer);
      intro.kill();
      count.kill();
      gsap.killTweensOf([root, title, raysRef.current, amountRef.current, contentRef.current]);
      // never leave the store waiting
      if (!ended) bus.emit('bigWinEnd', { amount });
    };
  }, [active]);

  if (!owner || !active) return null;

  return createPortal(
    <div
      ref={rootRef}
      className={s.root}
      data-tier={tier}
      onClick={() => skipRef.current()}
      role="dialog"
      aria-modal="true"
      aria-label={`${WORDS[tier]} WIN`}
    >
      <div className={s.dim} />
      <div ref={raysRef} className={s.rays} aria-hidden="true">
        <div className={s.raysA} />
        <div className={s.raysB} />
      </div>
      <div className={s.core} aria-hidden="true" />
      <div ref={contentRef} className={s.content}>
        <div ref={titleRef} className={s.title}>
          <div className={s.titleInner}>
            <span className={s.word}>{WORDS[tier]}</span>
            <span className={s.word}>WIN</span>
          </div>
        </div>
        <div ref={amountRef} className={s.amountWrap}>
          <span ref={valueRef} className={s.amount} aria-live="off" />
          <span className={s.unit}>Credits</span>
        </div>
        <div className={s.hint}>Tippen zum Überspringen</div>
      </div>
    </div>,
    document.body,
  );
}

export { BigWinOverlay };
