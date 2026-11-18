import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { gsap } from 'gsap';
import { bus } from '../core/events';
import { prefersReducedMotion, useOwner } from './motion';
import { fx } from './particles';
import WinCounter from './WinCounter';
import s from './FreeSpinsOverlays.module.css';

interface Intro {
  id: number;
  count: number;
}
interface Summary {
  id: number;
  totalWin: number;
  bet: number;
}

/**
 * Free-spins intro ("10 FREISPIELE" + Start) and end summary.
 * Mount ONCE at app level.
 * Listens: freeSpinsIntroStart, freeSpinsEnd. Emits: freeSpinsIntroEnd.
 */
export default function FreeSpinsOverlays() {
  const owner = useOwner('FreeSpinsOverlays');
  const [intro, setIntro] = useState<Intro | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    if (!owner) return;
    let seq = 0;
    const a = bus.on('freeSpinsIntroStart', ({ count }) => setIntro({ id: ++seq, count }));
    const b = bus.on('freeSpinsEnd', ({ totalWin, bet }) => setSummary({ id: ++seq, totalWin, bet }));
    return () => {
      a();
      b();
    };
  }, [owner]);

  if (!owner) return null;
  return (
    <>
      {intro && <IntroView key={intro.id} intro={intro} onDone={() => setIntro(null)} />}
      {summary && <SummaryView key={summary.id} summary={summary} onDone={() => setSummary(null)} />}
    </>
  );
}

function IntroView({ intro, onDone }: { intro: Intro; onDone: () => void }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const numRef = useRef<HTMLDivElement>(null);
  const wordRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const btnWrapRef = useRef<HTMLDivElement>(null);
  const subRef = useRef<HTMLDivElement>(null);
  const ended = useRef(false);
  const mounted = useRef(false);

  useLayoutEffect(() => {
    mounted.current = true;
    const root = rootRef.current!;
    const reduced = prefersReducedMotion();
    const letters = wordRef.current?.querySelectorAll('span') ?? [];
    const tl = gsap.timeline();
    tl.fromTo(root, { opacity: 0 }, { opacity: 1, duration: reduced ? 0.1 : 0.4 });
    if (!reduced) {
      tl.fromTo(numRef.current, { scale: 4, opacity: 0, rotation: 12 }, { scale: 1, opacity: 1, rotation: 0, duration: 0.9, ease: 'expo.out' }, 0.15)
        .fromTo(letters, { y: 60, opacity: 0, scale: 0.4 }, { y: 0, opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(2.2)', stagger: 0.045 }, 0.45)
        .fromTo(subRef.current, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.4 }, 0.9)
        .fromTo(btnWrapRef.current, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.6, ease: 'elastic.out(1, 0.5)' }, 1.05)
        .add(() => {
          fx.burst(window.innerWidth / 2, window.innerHeight * 0.4, 'star', 70);
          fx.burst(window.innerWidth / 2, window.innerHeight * 0.4, 'spark', 30);
        }, 0.3);
    }
    const focusT = window.setTimeout(() => btnRef.current?.focus({ preventScroll: true }), reduced ? 50 : 1100);
    return () => {
      window.clearTimeout(focusT);
      tl.kill();
      gsap.killTweensOf(root);
      // real unmount without pressing Start → still release the store.
      // (deferred so StrictMode's simulated unmount/remount doesn't fire it)
      mounted.current = false;
      window.setTimeout(() => {
        if (!mounted.current && !ended.current) {
          ended.current = true;
          bus.emit('freeSpinsIntroEnd', {});
        }
      }, 0);
    };
  }, []);

  const start = () => {
    if (ended.current) return;
    ended.current = true;
    bus.emit('freeSpinsIntroEnd', {});
    gsap.to(rootRef.current, {
      opacity: 0,
      scale: 1.08,
      duration: prefersReducedMotion() ? 0.1 : 0.4,
      ease: 'power2.in',
      onComplete: onDone,
    });
  };

  const word = 'FREISPIELE';
  return createPortal(
    <div ref={rootRef} className={`${s.root} ${s.intro}`} role="dialog" aria-modal="true" aria-label={`${intro.count} Freispiele gewonnen`}>
      <div className={s.bg} aria-hidden="true">
        <div className={s.nebula} />
        <div className={s.rays} />
        <div className={s.stars} />
      </div>
      <div className={s.content}>
        <div className={s.kicker}>Supernova!</div>
        <div ref={numRef} className={s.count}>
          {intro.count}
        </div>
        <div ref={wordRef} className={s.word} aria-hidden="true">
          {word.split('').map((ch, i) => (
            <span key={i}>{ch}</span>
          ))}
        </div>
        <div ref={subRef} className={s.sub}>
          Alle Gewinne während der Freispiele gehören dir.
        </div>
        <div ref={btnWrapRef}>
          <button ref={btnRef} type="button" className={s.startBtn} onClick={start}>
            Start
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function SummaryView({ summary, onDone }: { summary: Summary; onDone: () => void }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const closing = useRef(false);
  const reduced = prefersReducedMotion();

  const close = () => {
    if (closing.current) return;
    closing.current = true;
    gsap.to(rootRef.current, { opacity: 0, duration: reduced ? 0.1 : 0.35, onComplete: onDone });
  };
  const closeRef = useRef(close);
  closeRef.current = close;

  useLayoutEffect(() => {
    const tl = gsap.timeline();
    tl.fromTo(rootRef.current, { opacity: 0 }, { opacity: 1, duration: reduced ? 0.1 : 0.35 });
    if (!reduced) {
      tl.fromTo(cardRef.current, { scale: 0.5, rotationX: 40, opacity: 0 }, { scale: 1, rotationX: 0, opacity: 1, duration: 0.8, ease: 'back.out(1.7)' }, 0.1);
      if (summary.totalWin > 0) {
        tl.add(() => fx.burst(window.innerWidth / 2, window.innerHeight * 0.45, 'coin', 50), 0.3);
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopImmediatePropagation();
        closeRef.current();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      tl.kill();
      gsap.killTweensOf([rootRef.current, cardRef.current]);
    };
  }, [reduced, summary.totalWin]);

  const xBet = summary.bet > 0 ? summary.totalWin / summary.bet : 0;
  return createPortal(
    <div ref={rootRef} className={`${s.root} ${s.summary}`} onClick={close} role="dialog" aria-modal="true" aria-label="Freispiele beendet">
      <div className={s.bg} aria-hidden="true">
        <div className={s.nebula} />
        <div className={s.rays} />
      </div>
      <div ref={cardRef} className={s.card}>
        <div className={s.cardTitle}>Freispiele gewonnen</div>
        <WinCounter amount={summary.totalWin} durationMs={reduced ? 0 : 2600} className={s.cardCounter} />
        <div className={s.cardUnit}>Credits</div>
        {xBet > 0 && <div className={s.cardX}>= {Math.round(xBet)}× dein Einsatz</div>}
        <div className={s.hint}>Tippen zum Schliessen</div>
      </div>
    </div>,
    document.body,
  );
}

export { FreeSpinsOverlays };
