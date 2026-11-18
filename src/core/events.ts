/**
 * SHARED CONTRACT – typed event bus.
 * Visual reels emit reel-level events (they own timing).
 * The store/controller emits presentation-level events.
 * Audio, FX and reveal mode only SUBSCRIBE.
 */
import type { Cell, LineWin, NearMissInfo, Pos, SpinMode, SpinResult, WinTier } from '../engine/types';

export type GameEvents = {
  // ── UI ──────────────────────────────────────────────
  buttonClick: { kind: 'spin' | 'bet' | 'menu' | 'toggle' | 'generic' };
  betChange: { bet: number; direction: 'up' | 'down' };

  // ── Spin lifecycle (emitted by SlotMachine / reels) ──
  spinStart: { mode: SpinMode; bet: number; turbo: boolean };
  /** a reel landed; symbols top→bottom */
  reelStop: { reel: number; symbols: Cell[]; turbo: boolean };
  /** a scatter landed; nth = how many scatters visible so far (1,2,3…) */
  scatterLand: { reel: number; nth: number };
  /** a coin / collector landed (for a little sparkle + ping) */
  coinLand: { reel: number; row: number; value: number };
  collectLand: { reel: number; row: number };
  /** reels from `reel` onwards now spin slowly (2 scatters landed) */
  anticipationStart: { reel: number };
  anticipationEnd: { success: boolean };
  allReelsStopped: { result: SpinResult };

  // ── Presentation (emitted by store/controller) ──────
  noWin: { result: SpinResult };
  winPresentStart: { result: SpinResult; amount: number; tier: WinTier };
  lineWinShow: { win: LineWin; index: number };
  /**
   * Collector picks up coins. Visuals animate each coin flying into the
   * collector (in order) and MUST emit `coinCollectEnd` when done.
   */
  coinCollectStart: {
    total: number;
    coinCount: number;
    coinPositions: Pos[];
    collectPositions: Pos[];
    /** credits per coin, same order as coinPositions */
    coinValues: number[];
    turbo: boolean;
  };
  coinCollectEnd: { total: number };
  /** 3+ scatters: highlight them (free-spins trigger / scatter pay) */
  scatterWinShow: { positions: Pos[]; count: number; pay: number };
  /** credit counter rolls up; audio plays a coin-rollup loop for durationMs */
  rollupStart: { from: number; to: number; durationMs: number };
  rollupEnd: { amount: number };
  bigWinStart: { tier: Exclude<WinTier, 'none' | 'small'>; amount: number; bet: number };
  /** tier upgraded during big-win count-up (big → mega → epic) */
  bigWinTierUp: { tier: Exclude<WinTier, 'none' | 'small'> };
  bigWinEnd: { amount: number };
  winPresentEnd: { amount: number };
  /** honest summary overlay after a base-game win: amount vs. bet */
  winSummaryStart: { amount: number; bet: number; net: number; isLDW: boolean; turbo: boolean };
  winSummaryEnd: Record<string, never>;

  // ── Psychology markers (consumed by reveal mode + optional fx) ─
  ldw: { win: number; bet: number };
  nearMiss: { info: NearMissInfo };

  // ── Free spins ──────────────────────────────────────
  freeSpinsTriggered: { count: number; retrigger: boolean };
  freeSpinsIntroStart: { count: number };
  freeSpinsIntroEnd: Record<string, never>;
  freeSpinsStart: { total: number };
  freeSpinsSpin: { remaining: number; total: number };
  freeSpinsEnd: { totalWin: number; bet: number };

  // ── Dark patterns / protection ──────────────────────
  bonusBuy: { cost: number };
  cashoutAttempt: Record<string, never>;
  realityCheck: { minutes: number; net: number };
  limitReached: { limit: number };
};

type Handler<T> = (payload: T) => void;

class EventBus<E extends Record<string, unknown>> {
  private handlers: { [K in keyof E]?: Set<Handler<E[K]>> } = {};
  private anyHandlers = new Set<(type: keyof E, payload: unknown) => void>();

  on<K extends keyof E>(type: K, h: Handler<E[K]>): () => void {
    (this.handlers[type] ??= new Set()).add(h);
    return () => this.off(type, h);
  }

  off<K extends keyof E>(type: K, h: Handler<E[K]>): void {
    this.handlers[type]?.delete(h);
  }

  /** subscribe to every event (debug / reveal log) */
  onAny(h: (type: keyof E, payload: unknown) => void): () => void {
    this.anyHandlers.add(h);
    return () => this.anyHandlers.delete(h);
  }

  emit<K extends keyof E>(type: K, payload: E[K]): void {
    this.handlers[type]?.forEach((h) => {
      try {
        h(payload);
      } catch (err) {
        console.error(`[events] handler for ${String(type)} failed`, err);
      }
    });
    this.anyHandlers.forEach((h) => h(type, payload));
  }
}

export const bus = new EventBus<GameEvents>();
export type { EventBus };
