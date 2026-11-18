import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { attachAudio, initAudio, useAudioSettings } from '../audio';
import { bus, type GameEvents } from '../core/events';
import { lossSoFar, useGame } from '../core/store';
import { BET_STEPS, BONUS_BUY_COST_X, START_BALANCE, getStrip, type ForceOutcome } from '../engine';
import { BigWinOverlay, FreeSpinsOverlays, ParticleCanvas } from '../fx';
import {
  CalloutFeed,
  CashoutSludge,
  LimitPanel,
  RealityCheckModal,
  RevealToggle,
  SessionStats,
  calloutFor,
  createCalloutGate,
  revealIntroCallouts,
  type CalloutData,
} from '../reveal';
import { ControlBar, SlotMachine } from '../slot';
import SiteFooter from './components/SiteFooter';
import SiteNav from './components/SiteNav';
import styles from './Play.module.css';

const FORCE_OPTIONS: { id: ForceOutcome; label: string }[] = [
  { id: 'nearmiss', label: 'Beinahe-Gewinn' },
  { id: 'ldw', label: 'Getarnter Verlust' },
  { id: 'coins', label: 'Münz-Bonus' },
  { id: 'bigwin', label: 'Big Win' },
  { id: 'freespins', label: 'Freispiele' },
];

function wantsDebug() {
  return /[?&]debug(=1)?\b/.test(window.location.search + '&' + (window.location.hash.split('?')[1] ?? ''));
}

export default function Play() {
  const g = useGame();
  const audio = useAudioSettings();
  const [callouts, setCallouts] = useState<CalloutData[]>([]);
  const [cashoutOpen, setCashoutOpen] = useState(false);
  const [debug, setDebug] = useState(wantsDebug);
  const gate = useMemo(() => createCalloutGate(), []);
  const revealRef = useRef(g.reveal);
  revealRef.current = g.reveal;

  // audio
  useEffect(() => attachAudio(), []);

  // reveal callouts from the event stream
  useEffect(
    () =>
      bus.onAny((type, payload) => {
        if (!revealRef.current) return;
        let stats = useGame.getState().stats;
        if (type === 'bigWinStart') {
          const p = payload as GameEvents['bigWinStart'];
          stats = { ...stats, totalReturned: stats.totalReturned + p.amount };
        }
        const c = calloutFor(type, payload, stats);
        if (c && gate.accept(c)) setCallouts((l) => [...l, c]);
      }),
    [gate],
  );

  // presentation shortcut: "D" toggles the force panel
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
      if (e.key === 'd' || e.key === 'D') setDebug((d) => !d);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const onReveal = (v: boolean) => {
    g.setReveal(v);
    if (v) {
      gate.reset();
      setCallouts(revealIntroCallouts(g.bet, BET_STEPS[0]));
    } else {
      setCallouts([]);
    }
  };

  const fillerFor = useCallback((reel: number) => getStrip('base', reel), []);

  const betIdx = BET_STEPS.indexOf(g.bet as (typeof BET_STEPS)[number]);
  const idle = g.phase === 'idle';
  const spinning = g.phase === 'spinning';
  const bonusCost = g.bet * BONUS_BUY_COST_X;

  const openCashout = () => {
    bus.emit('cashoutAttempt', {});
    setCashoutOpen(true);
  };

  return (
    <div className={styles.page} onPointerDown={() => initAudio()}>
      <SiteNav variant="casino" />

      <main id="inhalt" className={`${styles.main} ${g.reveal ? styles.revealOn : ''}`}>
        <div className={styles.topBar}>
          <RevealToggle value={g.reveal} onChange={onReveal} />
          <button type="button" className={styles.cashout} onClick={openCashout}>
            Auszahlen
          </button>
        </div>

        {g.reveal && (
          <div className={styles.ledger}>
            <SessionStats stats={g.stats} balance={g.balance} startBalance={START_BALANCE} />
          </div>
        )}

        <div className={styles.stage}>
          <div className={styles.machine}>
            <SlotMachine
              result={g.result}
              spinId={g.spinId}
              quickStopId={g.quickStopId}
              turbo={g.turbo}
              bet={g.freeSpins?.bet ?? g.bet}
              highlight={g.highlight}
              onAllStopped={g.onReelsStopped}
              fillerFor={fillerFor}
            />
            <ControlBar
              balance={g.balance}
              bet={g.bet}
              lastWin={g.lastWin}
              spinning={spinning}
              canSpin={(idle && g.balance >= g.bet && !g.freeSpins) || spinning}
              onSpin={g.spin}
              onBetUp={g.betUp}
              onBetDown={g.betDown}
              canBetUp={idle && !g.freeSpins && betIdx < BET_STEPS.length - 1}
              canBetDown={idle && !g.freeSpins && betIdx > 0}
              turbo={g.turbo}
              onToggleTurbo={g.toggleTurbo}
              autoplayLeft={g.autoplayLeft}
              onAutoplay={() => g.startAutoplay(25)}
              onStopAutoplay={g.stopAutoplay}
              onBonusBuy={g.bonusBuy}
              bonusBuyCost={bonusCost}
              freeSpins={g.freeSpins ? { remaining: g.freeSpins.remaining, total: g.freeSpins.total } : null}
              muted={audio.muted}
              onToggleMute={audio.toggleMuted}
              winAmount={g.freeSpins ? g.freeSpins.totalWin : g.winAmount}
              winDurationMs={g.winDurationMs}
            />
          </div>

          {g.reveal && (
            <aside className={styles.side} aria-label="Entlarvte Mechanismen">
              <CalloutFeed items={callouts} onDismiss={(id) => setCallouts((l) => l.filter((c) => c.id !== id))} />
              <LimitPanel
                currentLimit={g.limit.current}
                pendingLimit={
                  g.limit.pending && Number.isFinite(g.limit.pending.value) ? g.limit.pending : null
                }
                onSetLimit={g.setLimit}
                lossSoFar={lossSoFar(g.stats)}
              />
              {g.limit.pending && (
                <button type="button" className={styles.ffwd} onClick={g.fastForwardLimit}>
                  Demo: 24 Stunden vorspulen
                </button>
              )}
            </aside>
          )}
        </div>

        {debug && (
          <div className={styles.debug} role="group" aria-label="Präsentation: nächsten Spin erzwingen">
            <span>Präsentation – nächster Spin:</span>
            {FORCE_OPTIONS.map((o) => (
              <button
                key={o.id}
                type="button"
                className={g.nextForce === o.id ? styles.forceOn : undefined}
                onClick={() => g.setForce(g.nextForce === o.id ? null : o.id)}
              >
                {o.label}
              </button>
            ))}
            <button type="button" onClick={g.resetSession}>
              Session zurücksetzen
            </button>
          </div>
        )}
      </main>

      <SiteFooter variant="casino" />

      <ParticleCanvas />
      <BigWinOverlay />
      <FreeSpinsOverlays />

      <RealityCheckModal
        open={g.realityCheckOpen}
        minutes={Math.round((Date.now() - g.stats.startedAt) / 60000)}
        net={g.stats.totalReturned - g.stats.totalWagered}
        onContinue={() => g.closeRealityCheck(false)}
        onStop={() => g.closeRealityCheck(true)}
      />
      <CashoutSludge
        open={cashoutOpen}
        balance={g.balance}
        reveal={g.reveal}
        onClose={() => setCashoutOpen(false)}
        onKeepPlaying={() => setCashoutOpen(false)}
      />
    </div>
  );
}
