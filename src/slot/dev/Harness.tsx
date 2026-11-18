/**
 * DEV harness for the slot visuals (route it at /#/dev).
 * Emulates a tiny store: spin → reels → win presentation → big win / free spins.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { bus } from '../../core/events';
import { PAYLINES } from '../../engine/paylines';
import {
  BET_STEPS, BONUS_BUY_COST_X, DEFAULT_BET, START_BALANCE,
  type Pos, type SpinResult,
} from '../../engine/types';
import SlotMachine from '../SlotMachine';
import ControlBar from '../ControlBar';
import ParticleCanvas from '../../fx/ParticleCanvas';
import BigWinOverlay from '../../fx/BigWinOverlay';
import FreeSpinsOverlays from '../../fx/FreeSpinsOverlays';
import { fx } from '../../fx/particles';
import { makeMockResult, MOCK_LABELS, type MockKind } from './mock';
import { formatCredits } from '../format';
import s from './Harness.module.css';

type HL = { positions: Pos[]; lineIndex?: number } | null;
interface FS {
  remaining: number;
  total: number;
  totalWin: number;
}

export default function Harness() {
  const [bet, setBet] = useState<number>(DEFAULT_BET);
  const [balance, setBalance] = useState<number>(START_BALANCE);
  const [result, setResult] = useState<SpinResult | null>(null);
  const [spinId, setSpinId] = useState(0);
  const [quickStopId, setQuickStopId] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [turbo, setTurbo] = useState(false);
  const [muted, setMuted] = useState(false);
  const [highlight, setHighlight] = useState<HL>(null);
  const [win, setWin] = useState({ amount: 0, dur: 0 });
  const [lastWin, setLastWin] = useState(0);
  const [fs, setFs] = useState<FS | null>(null);
  const [auto, setAuto] = useState(0);
  const [ready, setReady] = useState(true);
  const [log, setLog] = useState<string[]>([]);
  const [nextKind, setNextKind] = useState<MockKind>('random');

  const timers = useRef<number[]>([]);
  const st = useRef({ spinning, busy, fs, bet, turbo, nextKind });
  st.current = { spinning, busy, fs, bet, turbo, nextKind };

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };
  const later = (ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  // event log
  useEffect(
    () =>
      bus.onAny((type, payload) => {
        let p = '';
        try {
          p = JSON.stringify(payload, (k, v) => (k === 'result' || k === 'grid' || k === 'symbols' ? '…' : v));
        } catch {
          p = '';
        }
        const line = `${String(type)} ${p.length > 90 ? p.slice(0, 90) + '…' : p}`;
        setLog((l) => [line, ...l].slice(0, 16));
      }),
    [],
  );

  useEffect(() => () => clearTimers(), []);

  const spin = useCallback((kind?: MockKind) => {
    const cur = st.current;
    if (cur.spinning) {
      setQuickStopId((q) => q + 1);
      return;
    }
    if (cur.busy) return;
    clearTimers();
    setHighlight(null);
    setWin({ amount: 0, dur: 0 });
    setReady(false);
    const mode = cur.fs ? 'free' : 'base';
    if (cur.fs) {
      setFs({ ...cur.fs, remaining: cur.fs.remaining - 1 });
      bus.emit('freeSpinsSpin', { remaining: cur.fs.remaining - 1, total: cur.fs.total });
    } else {
      setBalance((b) => +(b - cur.bet).toFixed(2));
    }
    const res = makeMockResult(kind ?? cur.nextKind, cur.bet, mode);
    setResult(res);
    setSpinId((n) => n + 1);
    setSpinning(true);
    bus.emit('spinStart', { mode, bet: cur.bet, turbo: cur.turbo });
  }, []);

  const finishPresentation = (r: SpinResult) => {
    const cur = st.current;
    // free spins bookkeeping
    if (cur.fs) {
      const totalWin = +(cur.fs.totalWin + r.totalWin).toFixed(2);
      const remaining = cur.fs.remaining + (r.freeSpinsAwarded || 0);
      if (r.freeSpinsAwarded) bus.emit('freeSpinsTriggered', { count: r.freeSpinsAwarded, retrigger: true });
      if (remaining <= 0) {
        later(900, () => {
          bus.emit('freeSpinsEnd', { totalWin, bet: cur.bet });
          setFs(null);
          setReady(true);
        });
        setFs({ remaining: 0, total: cur.fs.total, totalWin });
        return;
      }
      setFs({ remaining, total: cur.fs.total + (r.freeSpinsAwarded || 0), totalWin });
      setReady(true);
      return;
    }
    if (r.freeSpinsAwarded) {
      later(700, () => {
        bus.emit('freeSpinsTriggered', { count: r.freeSpinsAwarded, retrigger: false });
        setBusy(true);
        later(900, () => bus.emit('freeSpinsIntroStart', { count: r.freeSpinsAwarded }));
        const off = bus.on('freeSpinsIntroEnd', () => {
          off();
          setBusy(false);
          setAuto(0);
          setFs({ remaining: r.freeSpinsAwarded, total: r.freeSpinsAwarded, totalWin: 0 });
          bus.emit('freeSpinsStart', { total: r.freeSpinsAwarded });
          setReady(true);
        });
      });
      return;
    }
    setReady(true);
  };

  const onAllStopped = useCallback((r: SpinResult) => {
    setSpinning(false);
    const cur = st.current;
    const sets: { positions: Pos[]; lineIndex?: number }[] = r.lineWins.map((w) => ({ positions: w.positions, lineIndex: w.lineIndex }));
    if (r.coinCollect) sets.push({ positions: [...r.coinCollect.coinPositions, ...r.coinCollect.collectPositions] });
    if (r.freeSpinsAwarded) sets.push({ positions: r.scatterPositions });

    if (r.totalWin > 0) {
      const big = r.winTier === 'big' || r.winTier === 'mega' || r.winTier === 'epic';
      setBalance((b) => +(b + r.totalWin).toFixed(2));
      setLastWin(r.totalWin);
      if (r.coinCollect) bus.emit('coinCollectStart', { total: r.coinCollect.total, coinCount: r.coinCollect.coinPositions.length });
      bus.emit('winPresentStart', { result: r, amount: r.totalWin, tier: r.winTier });
      if (r.isLDW) bus.emit('ldw', { win: r.totalWin, bet: r.bet });
      if (big) {
        setBusy(true);
        if (sets.length) setHighlight(sets[0]);
        bus.emit('bigWinStart', { tier: r.winTier as 'big' | 'mega' | 'epic', amount: r.totalWin, bet: r.bet });
        const off = bus.on('bigWinEnd', () => {
          off();
          setBusy(false);
          setWin({ amount: r.totalWin, dur: 0 });
          cycle(sets);
          finishPresentation(r);
        });
        return;
      }
      const dur = cur.turbo ? 600 : 1400;
      setWin({ amount: r.totalWin, dur });
      bus.emit('rollupStart', { from: 0, to: r.totalWin, durationMs: dur });
      later(dur, () => bus.emit('rollupEnd', { amount: r.totalWin }));
    } else {
      bus.emit('noWin', { result: r });
      if (r.nearMiss) bus.emit('nearMiss', { info: r.nearMiss });
    }
    cycle(sets);
    finishPresentation(r);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cycle = (sets: { positions: Pos[]; lineIndex?: number }[]) => {
    if (!sets.length) return;
    const step = st.current.turbo ? 800 : 1400;
    let i = 0;
    const show = () => {
      const set = sets[i % sets.length];
      setHighlight(set);
      if (set.lineIndex !== undefined) {
        const w = { lineIndex: set.lineIndex, symbol: 'L1' as const, count: set.positions.length, positions: set.positions, payout: 0 };
        bus.emit('lineWinShow', { win: w, index: i });
      }
      i++;
      if (i < sets.length * 3) later(step, show);
    };
    show();
  };

  // autoplay / free-spin auto-advance
  useEffect(() => {
    if (!ready || spinning || busy) return;
    if (!(auto > 0 || (fs && fs.remaining > 0))) return;
    const t = window.setTimeout(() => {
      if (auto > 0 && !fs) setAuto((a) => a - 1);
      spin();
    }, fs ? 1200 : 900);
    return () => window.clearTimeout(t);
  }, [ready, spinning, busy, auto, fs, spin]);

  const betIdx = BET_STEPS.indexOf(bet as (typeof BET_STEPS)[number]);
  const fire = (kind: MockKind) => {
    setNextKind(kind);
    st.current.nextKind = kind;
    spin(kind);
  };

  return (
    <div className={s.page}>
      <ParticleCanvas />
      <BigWinOverlay />
      <FreeSpinsOverlays />

      <div className={s.stage}>
        <SlotMachine
          result={result}
          spinId={spinId}
          quickStopId={quickStopId}
          turbo={turbo}
          bet={bet}
          highlight={highlight}
          onAllStopped={onAllStopped}
        />
        <ControlBar
          balance={balance}
          bet={bet}
          lastWin={lastWin}
          spinning={spinning}
          canSpin={!busy && balance >= bet}
          onSpin={() => spin()}
          onBetUp={() => setBet(BET_STEPS[Math.min(BET_STEPS.length - 1, betIdx + 1)])}
          onBetDown={() => setBet(BET_STEPS[Math.max(0, betIdx - 1)])}
          canBetUp={betIdx < BET_STEPS.length - 1}
          canBetDown={betIdx > 0}
          turbo={turbo}
          onToggleTurbo={() => setTurbo((t) => !t)}
          autoplayLeft={auto}
          onAutoplay={() => setAuto(10)}
          onStopAutoplay={() => setAuto(0)}
          onBonusBuy={() => {
            setBalance((b) => +(b - bet * BONUS_BUY_COST_X + bet).toFixed(2));
            bus.emit('bonusBuy', { cost: bet * BONUS_BUY_COST_X });
            fire('freespins');
          }}
          bonusBuyCost={bet * BONUS_BUY_COST_X}
          freeSpins={fs ? { remaining: fs.remaining, total: fs.total } : null}
          muted={muted}
          onToggleMute={() => setMuted((m) => !m)}
          winAmount={win.amount}
          winDurationMs={win.dur}
        />
      </div>

      <section className={s.panel}>
        <h3>Nächster Spin erzwingen</h3>
        <div className={s.btns}>
          {(Object.keys(MOCK_LABELS) as MockKind[]).map((k) => (
            <button key={k} type="button" data-active={nextKind === k} onClick={() => fire(k)}>
              {MOCK_LABELS[k]}
            </button>
          ))}
        </div>
        <p className={s.note}>Klick dreht sofort mit diesem Ergebnis; SPIN/Leertaste nutzt das zuletzt gewählte.</p>

        <h3>Highlight direkt</h3>
        <div className={s.btns}>
          {Array.from({ length: 10 }, (_, li) => (
            <button
              key={li}
              type="button"
              disabled={spinning}
              onClick={() => setHighlight({ lineIndex: li, positions: PAYLINES[li].map((row, r) => [r, row] as Pos) })}
            >
              Linie {li + 1}
            </button>
          ))}
          <button type="button" onClick={() => setHighlight(null)}>
            Aus
          </button>
        </div>

        <h3>Events direkt feuern</h3>
        <div className={s.btns}>
          {(['big', 'mega', 'epic'] as const).map((tier) => (
            <button
              key={tier}
              type="button"
              onClick={() => bus.emit('bigWinStart', { tier, amount: bet * { big: 15, mega: 38, epic: 90 }[tier], bet })}
            >
              bigWinStart {tier}
            </button>
          ))}
          <button type="button" onClick={() => bus.emit('freeSpinsIntroStart', { count: 10 })}>
            freeSpinsIntroStart
          </button>
          <button type="button" onClick={() => bus.emit('freeSpinsEnd', { totalWin: bet * 42.5, bet })}>
            freeSpinsEnd
          </button>
          <button type="button" onClick={() => bus.emit('freeSpinsTriggered', { count: 10, retrigger: false })}>
            freeSpinsTriggered
          </button>
          <button type="button" onClick={() => fx.coinRain(true, 1.6)}>
            Münzregen an
          </button>
          <button type="button" onClick={() => fx.coinRain(false)}>
            Münzregen aus
          </button>
          <button type="button" onClick={() => fx.burst(window.innerWidth / 2, window.innerHeight / 2, 'coin', 40)}>
            Münz-Burst
          </button>
        </div>
        <p className={s.note}>
          Guthaben {formatCredits(balance)} · Einsatz {formatCredits(bet)} · {spinning ? 'dreht' : busy ? 'Präsentation' : 'bereit'}
        </p>
      </section>

      <section className={s.panel}>
        <h3>Event-Log</h3>
        <ol className={s.log}>
          {log.map((l, i) => (
            <li key={i}>{l}</li>
          ))}
        </ol>
      </section>
    </div>
  );
}
