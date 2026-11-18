/**
 * Game store + controller. Drives the phase state machine:
 *   idle → spinning → presenting (→ bigWin) (→ fsIntro → free spins…) → idle
 * Reels own reel-level timing and call `onReelsStopped`; everything else is sequenced here.
 */
import { create } from 'zustand';
import {
  BET_STEPS,
  BONUS_BUY_COST_X,
  DEFAULT_BET,
  FREE_SPINS_AWARD,
  getScatterWin,
  START_BALANCE,
  spin as engineSpin,
  type ForceOutcome,
  type Pos,
  type SpinResult,
} from '../engine';
import { bus, type GameEvents } from './events';
import { emptyStats, type SessionStats } from './stats';

export type Phase = 'idle' | 'spinning' | 'presenting' | 'fsIntro' | 'fsOutro';

export interface FreeSpinsState {
  remaining: number;
  total: number;
  totalWin: number;
  /** best single spin of this round (for biggestWin stat) */
  bestSpin: number;
  bet: number;
}

export interface LimitState {
  current: number | null;
  pending: { value: number; activeAt: number } | null;
}

interface GameState {
  phase: Phase;
  balance: number;
  bet: number;
  result: SpinResult | null;
  spinId: number;
  quickStopId: number;
  turbo: boolean;
  autoplayLeft: number;
  freeSpins: FreeSpinsState | null;
  lastWin: number;
  winAmount: number;
  winDurationMs: number;
  highlight: { positions: Pos[]; lineIndex?: number } | null;
  reveal: boolean;
  stats: SessionStats;
  limit: LimitState;
  nextForce: ForceOutcome | null;
  realityCheckOpen: boolean;
  lastRealityCheckAt: number;
  realityCheckEveryMs: number;

  // actions
  spin(): void;
  quickStop(): void;
  onReelsStopped(r: SpinResult): void;
  betUp(): void;
  betDown(): void;
  toggleTurbo(): void;
  startAutoplay(n?: number): void;
  stopAutoplay(): void;
  bonusBuy(): void;
  setReveal(v: boolean): void;
  setForce(f: ForceOutcome | null): void;
  setLimit(v: number | null): void;
  closeRealityCheck(stop: boolean): void;
  /** demo helper: pretend 24h passed so a pending (higher) limit activates */
  fastForwardLimit(): void;
  resetSession(): void;
}

const r2 = (n: number) => Math.round(n * 100) / 100;
const sleep = (ms: number) => new Promise<void>((res) => setTimeout(res, ms));

function waitFor<K extends keyof GameEvents>(type: K, timeoutMs = 30000): Promise<GameEvents[K] | null> {
  return new Promise((resolve) => {
    const t = setTimeout(() => {
      off();
      resolve(null);
    }, timeoutMs);
    const off = bus.on(type, (p) => {
      clearTimeout(t);
      off();
      resolve(p);
    });
  });
}

function readForceFromUrl(): ForceOutcome | null {
  const raw = `${window.location.search}&${window.location.hash.split('?')[1] ?? ''}`;
  const m = raw.match(/force=(bigwin|freespins|nearmiss|ldw|coins)/);
  return (m?.[1] as ForceOutcome) ?? null;
}

function readRealityCheckMs(): number {
  const raw = `${window.location.search}&${window.location.hash.split('?')[1] ?? ''}`;
  const m = raw.match(/rc=(\d+(?:\.\d+)?)/);
  return (m ? Number(m[1]) : 10) * 60_000;
}

/** loss so far = wagered - returned, floored at 0 */
export const lossSoFar = (s: SessionStats) => Math.max(0, r2(s.totalWagered - s.totalReturned));

let presenting = false;

export const useGame = create<GameState>()((set, get) => {
  /** apply pending limit if its time has come */
  const refreshLimit = () => {
    const { limit } = get();
    if (limit.pending && Date.now() >= limit.pending.activeAt) {
      const v = limit.pending.value;
      set({ limit: { current: Number.isFinite(v) ? v : null, pending: null } });
    }
  };

  const limitBlocks = (cost: number) => {
    refreshLimit();
    const { limit, stats } = get();
    if (limit.current == null) return false;
    if (lossSoFar(stats) + cost > limit.current + 1e-9) {
      bus.emit('limitReached', { limit: limit.current });
      set({ autoplayLeft: 0 });
      return true;
    }
    return false;
  };

  const maybeRealityCheck = () => {
    const s = get();
    if (Date.now() - s.lastRealityCheckAt >= s.realityCheckEveryMs) {
      const minutes = Math.round((Date.now() - s.stats.startedAt) / 60000);
      bus.emit('realityCheck', { minutes, net: r2(s.stats.totalReturned - s.stats.totalWagered) });
      set({ realityCheckOpen: true, autoplayLeft: 0, lastRealityCheckAt: Date.now() });
      return true;
    }
    return false;
  };

  const consumeForce = (): ForceOutcome | undefined => {
    const f = get().nextForce;
    if (f) set({ nextForce: null });
    return f ?? undefined;
  };

  const startSpin = (mode: 'base' | 'free') => {
    const s = get();
    const bet = mode === 'free' ? s.freeSpins!.bet : s.bet;
    const result = engineSpin({ bet, mode, force: consumeForce() });
    set({
      phase: 'spinning',
      result,
      spinId: s.spinId + 1,
      highlight: null,
      winAmount: 0,
    });
    bus.emit('spinStart', { mode, bet, turbo: s.turbo });
    if (mode === 'free') {
      bus.emit('freeSpinsSpin', { remaining: s.freeSpins!.remaining, total: s.freeSpins!.total });
    }
  };

  const enterFreeSpins = async (count: number, bet: number) => {
    set({ phase: 'fsIntro', freeSpins: { remaining: count, total: count, totalWin: 0, bestSpin: 0, bet } });
    bus.emit('freeSpinsTriggered', { count, retrigger: false });
    await sleep(get().turbo ? 400 : 1100);
    const introEnd = waitFor('freeSpinsIntroEnd', 120000);
    bus.emit('freeSpinsIntroStart', { count });
    await introEnd;
    bus.emit('freeSpinsStart', { total: count });
    await sleep(500);
    nextFreeSpin();
  };

  const nextFreeSpin = () => {
    const fs = get().freeSpins;
    if (!fs) return;
    set({ freeSpins: { ...fs, remaining: fs.remaining - 1 } });
    startSpin('free');
  };

  const finishFreeSpins = async () => {
    const fs = get().freeSpins!;
    set({ phase: 'fsOutro' });
    bus.emit('freeSpinsEnd', { totalWin: r2(fs.totalWin), bet: fs.bet });
    const st = get().stats;
    set({
      balance: r2(get().balance + fs.totalWin),
      lastWin: r2(fs.totalWin),
      stats: { ...st, biggestWin: Math.max(st.biggestWin, fs.bestSpin) },
    });
    await sleep(2500);
    set({ freeSpins: null, phase: 'idle' });
  };

  const present = async (r: SpinResult) => {
    const turbo = get().turbo;
    const inFs = r.mode === 'free';

    if (r.nearMiss) {
      bus.emit('nearMiss', { info: r.nearMiss });
      set((s) => ({ stats: { ...s.stats, nearMissCount: s.stats.nearMissCount + 1 } }));
    }

    if (r.totalWin > 0) {
      set({ phase: 'presenting' });
      bus.emit('winPresentStart', { result: r, amount: r.totalWin, tier: r.winTier });
      if (r.isLDW) {
        bus.emit('ldw', { win: r.totalWin, bet: r.bet });
        set((s) => ({ stats: { ...s.stats, ldwCount: s.stats.ldwCount + 1 } }));
      }
      set((s) => ({ stats: { ...s.stats, celebratedCount: s.stats.celebratedCount + 1 } }));

      if (r.scatterPositions.length >= 3) {
        set({ highlight: { positions: r.scatterPositions } });
        bus.emit('scatterWinShow', {
          positions: r.scatterPositions,
          count: r.scatterPositions.length,
          pay: getScatterWin(r),
        });
        await sleep(turbo ? 500 : 1200);
      }

      if (r.coinCollect) {
        const cc = r.coinCollect;
        set({ highlight: { positions: [...cc.coinPositions, ...cc.collectPositions] } });
        const collectEnd = waitFor('coinCollectEnd', 20000);
        bus.emit('coinCollectStart', {
          total: cc.total,
          coinCount: cc.coinPositions.length,
          coinPositions: cc.coinPositions,
          collectPositions: cc.collectPositions,
          coinValues: cc.coinPositions.map(([x, y]) => r2((r.grid[x][y].coinValue ?? 0) * r.bet)),
          turbo,
        });
        await collectEnd;
      }

      const big = r.winTier === 'big' || r.winTier === 'mega' || r.winTier === 'epic';
      if (big) {
        const bigEnd = waitFor('bigWinEnd', 60000);
        bus.emit('bigWinStart', { tier: r.winTier as 'big' | 'mega' | 'epic', amount: r.totalWin, bet: r.bet });
        await bigEnd;
        set({ winAmount: r.totalWin, winDurationMs: 0 });
      } else {
        const rollMs = turbo ? 400 : Math.min(2500, 600 + (r.totalWin / r.bet) * 250);
        set({ winAmount: r.totalWin, winDurationMs: rollMs });
        bus.emit('rollupStart', { from: 0, to: r.totalWin, durationMs: rollMs });
        const lines = r.lineWins;
        let elapsed = 0;
        if (lines.length > 1) {
          // all winning cells at once first (like real slots), then cycle quickly
          const seen = new Set<string>();
          const all = lines
            .flatMap((l) => l.positions)
            .filter(([x, y]) => !seen.has(`${x}-${y}`) && !!seen.add(`${x}-${y}`));
          set({ highlight: { positions: all } });
          const intro = turbo ? 200 : 450;
          await sleep(intro);
          elapsed += intro;
        }
        if (lines.length) {
          const budget = Math.max(rollMs - elapsed, lines.length * 160);
          const per = Math.max(160, Math.min(turbo ? 250 : 650, budget / lines.length));
          for (let i = 0; i < lines.length; i++) {
            set({ highlight: { positions: lines[i].positions, lineIndex: lines[i].lineIndex } });
            bus.emit('lineWinShow', { win: lines[i], index: i });
            await sleep(per);
            elapsed += per;
          }
        }
        const rest = rollMs - elapsed;
        if (rest > 0) await sleep(rest);
        bus.emit('rollupEnd', { amount: r.totalWin });
      }
      bus.emit('winPresentEnd', { amount: r.totalWin });

      // money
      if (inFs) {
        const fs = get().freeSpins!;
        set({ freeSpins: { ...fs, totalWin: r2(fs.totalWin + r.totalWin), bestSpin: Math.max(fs.bestSpin, r.totalWin) } });
      } else {
        set((s) => ({
          balance: r2(s.balance + r.totalWin),
          lastWin: r.totalWin,
          stats: { ...s.stats, biggestWin: Math.max(s.stats.biggestWin, r.totalWin) },
        }));
      }
      set((s) => ({ stats: { ...s.stats, totalReturned: r2(s.stats.totalReturned + r.totalWin) } }));
      if (!inFs) {
        // honest summary: what the win really means against the bet
        const summaryEnd = waitFor('winSummaryEnd', 8000);
        bus.emit('winSummaryStart', {
          amount: r.totalWin,
          bet: r.bet,
          net: r2(r.totalWin - r.bet),
          isLDW: r.isLDW,
          turbo: turbo || get().autoplayLeft > 0,
        });
        await summaryEnd;
      } else {
        await sleep(turbo ? 150 : 500);
      }
    } else {
      bus.emit('noWin', { result: r });
      if (!inFs) set({ lastWin: 0 });
    }
    set({ highlight: null });

    // free spins trigger / retrigger
    if (r.freeSpinsAwarded > 0) {
      if (inFs) {
        const fs = get().freeSpins!;
        set({ freeSpins: { ...fs, remaining: fs.remaining + r.freeSpinsAwarded, total: fs.total + r.freeSpinsAwarded } });
        bus.emit('freeSpinsTriggered', { count: r.freeSpinsAwarded, retrigger: true });
        await sleep(1500);
      } else {
        await enterFreeSpins(r.freeSpinsAwarded, r.bet);
        return;
      }
    }

    if (inFs) {
      set((s) => ({ stats: { ...s.stats, freeSpinsPlayed: s.stats.freeSpinsPlayed + 1 } }));
      const fs = get().freeSpins!;
      if (fs.remaining > 0) {
        await sleep(turbo ? 200 : 600);
        nextFreeSpin();
      } else {
        await finishFreeSpins();
        afterRound();
      }
      return;
    }

    set({ phase: 'idle' });
    afterRound();
  };

  const afterRound = () => {
    if (maybeRealityCheck()) return;
    const s = get();
    if (s.autoplayLeft > 0 && s.phase === 'idle') {
      setTimeout(() => {
        const cur = get();
        if (cur.autoplayLeft > 0 && cur.phase === 'idle') {
          set({ autoplayLeft: cur.autoplayLeft - 1 });
          cur.spin();
        }
      }, s.turbo ? 120 : 350);
    }
  };

  return {
    phase: 'idle',
    balance: START_BALANCE,
    bet: DEFAULT_BET,
    result: null,
    spinId: 0,
    quickStopId: 0,
    turbo: false,
    autoplayLeft: 0,
    freeSpins: null,
    lastWin: 0,
    winAmount: 0,
    winDurationMs: 0,
    highlight: null,
    reveal: false,
    stats: emptyStats(),
    limit: { current: null, pending: null },
    nextForce: typeof window !== 'undefined' ? readForceFromUrl() : null,
    realityCheckOpen: false,
    lastRealityCheckAt: Date.now(),
    realityCheckEveryMs: typeof window !== 'undefined' ? readRealityCheckMs() : 600_000,

    spin() {
      const s = get();
      if (s.phase === 'spinning') return s.quickStop();
      if (s.phase !== 'idle' || s.realityCheckOpen) {
        set({ autoplayLeft: 0 });
        return;
      }
      if (s.balance + 1e-9 < s.bet) {
        set({ autoplayLeft: 0 });
        return;
      }
      if (limitBlocks(s.bet)) return;
      set({
        balance: r2(s.balance - s.bet),
        lastWin: 0,
        stats: { ...s.stats, spins: s.stats.spins + 1, totalWagered: r2(s.stats.totalWagered + s.bet) },
      });
      startSpin('base');
    },

    quickStop() {
      if (get().phase === 'spinning') set((s) => ({ quickStopId: s.quickStopId + 1 }));
    },

    onReelsStopped(r) {
      if (presenting) {
        console.warn('[store] reels stopped while still presenting – result ignored');
        return;
      }
      presenting = true;
      present(r)
        .catch((err) => {
          console.error('[store] presentation failed – recovering', err);
          const fs = get().freeSpins;
          set((s) => ({
            phase: 'idle',
            highlight: null,
            autoplayLeft: 0,
            freeSpins: null,
            balance: fs ? r2(s.balance + fs.totalWin) : s.balance,
          }));
        })
        .finally(() => {
          presenting = false;
        });
    },

    betUp() {
      const { bet, phase, freeSpins } = get();
      if (phase !== 'idle' || freeSpins) return;
      const i = BET_STEPS.indexOf(bet as (typeof BET_STEPS)[number]);
      if (i < BET_STEPS.length - 1) {
        set({ bet: BET_STEPS[i + 1] });
        bus.emit('betChange', { bet: BET_STEPS[i + 1], direction: 'up' });
      }
    },

    betDown() {
      const { bet, phase, freeSpins } = get();
      if (phase !== 'idle' || freeSpins) return;
      const i = BET_STEPS.indexOf(bet as (typeof BET_STEPS)[number]);
      if (i > 0) {
        set({ bet: BET_STEPS[i - 1] });
        bus.emit('betChange', { bet: BET_STEPS[i - 1], direction: 'down' });
      }
    },

    toggleTurbo() {
      set((s) => ({ turbo: !s.turbo }));
    },

    startAutoplay(n = 25) {
      const s = get();
      if (s.phase !== 'idle' || s.freeSpins || s.realityCheckOpen) return;
      set({ autoplayLeft: n - 1 });
      s.spin();
    },

    stopAutoplay() {
      set({ autoplayLeft: 0 });
    },

    bonusBuy() {
      const s = get();
      if (s.phase !== 'idle' || s.freeSpins || s.realityCheckOpen) return;
      const cost = r2(s.bet * BONUS_BUY_COST_X);
      if (s.balance + 1e-9 < cost) return;
      if (limitBlocks(cost)) return;
      set({
        balance: r2(s.balance - cost),
        stats: { ...s.stats, bonusBuys: s.stats.bonusBuys + 1, totalWagered: r2(s.stats.totalWagered + cost) },
      });
      bus.emit('bonusBuy', { cost });
      void enterFreeSpins(FREE_SPINS_AWARD, s.bet);
    },

    setReveal(v) {
      set({ reveal: v });
      bus.emit('buttonClick', { kind: 'toggle' });
    },

    setForce(f) {
      set({ nextForce: f });
    },

    setLimit(v) {
      refreshLimit();
      const { limit } = get();
      if (v == null) {
        // removing a limit = loosening → also delayed
        set({ limit: { ...limit, pending: limit.current == null ? null : { value: Infinity, activeAt: Date.now() + 86_400_000 } } });
        return;
      }
      if (limit.current == null || v <= limit.current) {
        set({ limit: { current: v, pending: null } });
      } else {
        set({ limit: { ...limit, pending: { value: v, activeAt: Date.now() + 86_400_000 } } });
      }
    },

    fastForwardLimit() {
      const { limit } = get();
      if (!limit.pending) return;
      const v = limit.pending.value;
      set({ limit: { current: Number.isFinite(v) ? v : null, pending: null } });
    },

    closeRealityCheck(stop) {
      set({ realityCheckOpen: false, lastRealityCheckAt: Date.now() });
      if (stop) set({ autoplayLeft: 0 });
    },

    resetSession() {
      const s = get();
      if (s.phase !== 'idle' || s.freeSpins || s.realityCheckOpen) return;
      // resetting stats would zero the counted loss and bypass an active limit
      if (s.limit.current != null || s.limit.pending) return;
      set({
        balance: START_BALANCE,
        bet: DEFAULT_BET,
        stats: emptyStats(),
        lastWin: 0,
        winAmount: 0,
        autoplayLeft: 0,
        lastRealityCheckAt: Date.now(),
      });
    },
  };
});
