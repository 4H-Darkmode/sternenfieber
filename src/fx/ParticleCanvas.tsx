import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { bus } from '../core/events';
import { fx } from './particles';
import { useOwner } from './motion';

const RAIN_INTENSITY = { big: 1, mega: 1.7, epic: 2.6 } as const;

/**
 * Fullscreen, click-through particle canvas. Mount ONCE at app level.
 * Listens: bigWinStart (coin rain on), bigWinTierUp (coin fountain),
 *          bigWinEnd (rain off), freeSpinsTriggered (star burst).
 */
export default function ParticleCanvas() {
  const owner = useOwner('ParticleCanvas');
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = ref.current;
    if (!owner || !c) return;
    fx._attach(c);
    const center = () => [window.innerWidth / 2, window.innerHeight * 0.45] as const;
    const offs = [
      bus.on('bigWinStart', ({ tier }) => fx.coinRain(true, RAIN_INTENSITY[tier])),
      bus.on('bigWinTierUp', ({ tier }) => {
        fx.coinRain(true, RAIN_INTENSITY[tier]);
        const [x, y] = center();
        fx.burst(x, y, 'coin', tier === 'epic' ? 60 : 40);
        fx.burst(x, y, 'star', 30);
      }),
      bus.on('bigWinEnd', () => fx.coinRain(false)),
      bus.on('freeSpinsTriggered', () => {
        const [x, y] = center();
        fx.burst(x, y, 'star', 90);
        fx.burst(x, y, 'spark', 40);
      }),
    ];
    return () => {
      offs.forEach((off) => off());
      fx._detach(c);
    };
  }, [owner]);

  if (!owner) return null;
  return createPortal(
    <canvas
      ref={ref}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 1200,
      }}
    />,
    document.body,
  );
}

export { ParticleCanvas };
