/**
 * Public audio API.
 *
 *   useEffect(() => attachAudio(), []);             // subscribe to the game bus
 *   onPointerDown={() => initAudio()}               // first user gesture
 *
 * attachAudio() also installs its own pointerdown/keydown listeners that call
 * initAudio(), so explicit calls are a belt-and-braces measure.
 */
import { useCallback, useSyncExternalStore } from 'react';
import { bus } from '../core/events';
import { getMusicMode, musicEngineReady, setMusicMode, stopMusicNow } from './music';
import type { MusicMode } from './music';
import * as sfx from './sfx';
import { clamp, isRunning, setBusVolume, setMasterMuted, unlockAudio, killAllVoices, getEngine } from './synth';

export { setMusicMode, getMusicMode };
export type { MusicMode };

// ───────────────────────────────────────────────────────── settings store

export interface AudioSettings {
  muted: boolean;
  sfxVolume: number;
  musicVolume: number;
}

const STORAGE_KEY = 'sternenfieber.audio.v1';
const DEFAULTS: AudioSettings = { muted: false, sfxVolume: 0.8, musicVolume: 0.6 };

function load(): AudioSettings {
  try {
    if (typeof localStorage === 'undefined') return DEFAULTS;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const p = JSON.parse(raw) as Partial<AudioSettings>;
    return {
      muted: typeof p.muted === 'boolean' ? p.muted : DEFAULTS.muted,
      sfxVolume: typeof p.sfxVolume === 'number' ? clamp(p.sfxVolume, 0, 1) : DEFAULTS.sfxVolume,
      musicVolume: typeof p.musicVolume === 'number' ? clamp(p.musicVolume, 0, 1) : DEFAULTS.musicVolume,
    };
  } catch {
    return DEFAULTS;
  }
}

function persist(s: AudioSettings): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* private mode / quota – ignore */
  }
}

let settings: AudioSettings = load();
const listeners = new Set<() => void>();

function applySettings(s: AudioSettings): void {
  setMasterMuted(s.muted);
  setBusVolume('sfx', s.sfxVolume);
  setBusVolume('music', s.musicVolume);
}
applySettings(settings);

function update(patch: Partial<AudioSettings>): void {
  const next = { ...settings, ...patch };
  if (next.muted === settings.muted && next.sfxVolume === settings.sfxVolume && next.musicVolume === settings.musicVolume) return;
  if (next.muted !== settings.muted) setMasterMuted(next.muted);
  if (next.sfxVolume !== settings.sfxVolume) setBusVolume('sfx', next.sfxVolume);
  if (next.musicVolume !== settings.musicVolume) setBusVolume('music', next.musicVolume);
  settings = next;
  persist(settings);
  listeners.forEach((l) => l());
}

export function setMuted(muted: boolean): void {
  if (!muted) initAudio(); // unmuting is a user gesture – good moment to unlock
  update({ muted });
}
export function isMuted(): boolean {
  return settings.muted;
}
export function setSfxVolume(v: number): void {
  update({ sfxVolume: clamp(v, 0, 1) });
}
export function setMusicVolume(v: number): void {
  update({ musicVolume: clamp(v, 0, 1) });
}
export function getAudioSettings(): AudioSettings {
  return settings;
}

function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}
const snapshot = () => settings;

/** React hook: current settings + setters (persisted to localStorage) */
export function useAudioSettings() {
  const s = useSyncExternalStore(subscribe, snapshot, snapshot);
  const toggleMuted = useCallback(() => setMuted(!settings.muted), []);
  return {
    muted: s.muted,
    sfxVolume: s.sfxVolume,
    musicVolume: s.musicVolume,
    setMuted,
    toggleMuted,
    setSfxVolume,
    setMusicVolume,
  };
}

// ───────────────────────────────────────────────────────── init

/** Create/resume the AudioContext. Call from a user gesture. Idempotent, SSR-safe. */
export function initAudio(): void {
  const e = unlockAudio();
  if (e) musicEngineReady();
}

// ───────────────────────────────────────────────────────── bus wiring

let attachCount = 0;
let detachFns: Array<() => void> = [];
let musicAutoStarted = false;
let freeEndTimer: ReturnType<typeof setTimeout> | null = null;

function clearFreeEndTimer(): void {
  if (freeEndTimer) clearTimeout(freeEndTimer);
  freeEndTimer = null;
}

function wire(): void {
  const on = bus.on.bind(bus);
  const offs: Array<() => void> = [
    on('buttonClick', (p) => sfx.uiClick(p.kind)),
    on('betChange', (p) => sfx.betChange(p.direction)),
    on('spinStart', (p) => {
      // background music starts with the first spin after the user gesture
      if (isRunning()) {
        const want: MusicMode = p.mode === 'free' ? 'free' : 'base';
        if (!musicAutoStarted) {
          musicAutoStarted = true;
          setMusicMode(want);
        } else if (getMusicMode() !== 'off' && getMusicMode() !== want) {
          clearFreeEndTimer();
          setMusicMode(want);
        }
      }
      sfx.spinStart(p.turbo);
    }),
    on('reelStop', (p) => sfx.reelStop(p.reel, p.turbo)),
    on('scatterLand', (p) => sfx.scatterLand(p.reel, p.nth)),
    on('coinLand', (p) => sfx.coinLand(p.reel, p.value)),
    on('collectLand', (p) => sfx.collectLand(p.reel)),
    on('anticipationStart', () => sfx.anticipationStart()),
    on('anticipationEnd', (p) => sfx.anticipationEnd(p.success)),
    on('allReelsStopped', () => sfx.allReelsStopped()),
    // noWin: silence is the point.
    on('winPresentStart', (p) => {
      // LDW gets the exact same celebration on purpose
      if (p.tier === 'small' || (p.tier === 'none' && p.amount > 0)) sfx.winSmall();
    }),
    on('lineWinShow', (p) => sfx.lineWin(p.index)),
    on('coinCollectStart', (p) => sfx.coinCascade(p.coinCount)),
    on('rollupStart', (p) => sfx.rollupStart(p.durationMs)),
    on('rollupEnd', () => sfx.rollupEnd()),
    on('bigWinStart', (p) => sfx.bigWinStart(p.tier)),
    on('bigWinTierUp', (p) => sfx.bigWinTierUp(p.tier)),
    on('bigWinEnd', () => sfx.bigWinEnd()),
    on('freeSpinsTriggered', (p) => sfx.freeSpinsTriggered(p.retrigger)),
    on('freeSpinsIntroStart', () => sfx.freeSpinsIntro()),
    on('freeSpinsStart', () => {
      clearFreeEndTimer();
      if (getMusicMode() !== 'off' || musicAutoStarted) {
        musicAutoStarted = true;
        setMusicMode('free');
      }
    }),
    on('freeSpinsEnd', () => {
      sfx.freeSpinsOutro();
      clearFreeEndTimer();
      freeEndTimer = setTimeout(() => {
        freeEndTimer = null;
        if (getMusicMode() === 'free') setMusicMode('base');
      }, 2400);
    }),
    on('bonusBuy', () => sfx.bonusBuy()),
    on('cashoutAttempt', () => sfx.cashoutBonk()),
    on('realityCheck', () => sfx.notify()),
    on('limitReached', () => sfx.notify()),
  ];

  // autoplay unlock on any gesture (capture, passive; cheap if already running)
  if (typeof window !== 'undefined') {
    const gesture = () => initAudio();
    const opts: AddEventListenerOptions = { capture: true, passive: true };
    window.addEventListener('pointerdown', gesture, opts);
    window.addEventListener('keydown', gesture, opts);
    window.addEventListener('touchend', gesture, opts);
    offs.push(() => {
      window.removeEventListener('pointerdown', gesture, opts);
      window.removeEventListener('keydown', gesture, opts);
      window.removeEventListener('touchend', gesture, opts);
    });
  }
  detachFns = offs;
}

function unwire(): void {
  detachFns.forEach((f) => f());
  detachFns = [];
  clearFreeEndTimer();
  sfx.stopAllLoops();
  stopMusicNow();
  if (getEngine()) killAllVoices('sfx', 0.15);
  musicAutoStarted = false;
}

/**
 * Subscribe audio to the game event bus. Returns an unsubscribe function.
 * Ref-counted: StrictMode double-mount or multiple callers never double up sounds.
 */
export function attachAudio(): () => void {
  attachCount++;
  if (attachCount === 1) wire();
  let done = false;
  return () => {
    if (done) return;
    done = true;
    attachCount = Math.max(0, attachCount - 1);
    if (attachCount === 0) unwire();
  };
}

// ───────────────────────────────────────────────────────── manual triggers

const timers = new Set<ReturnType<typeof setTimeout>>();
function after(ms: number, fn: () => void): void {
  const id = setTimeout(() => {
    timers.delete(id);
    fn();
  }, ms);
  timers.add(id);
}

const SFX_TABLE = {
  click: () => sfx.uiClick('generic'),
  clickSpin: () => sfx.uiClick('spin'),
  betUp: () => sfx.betChange('up'),
  betDown: () => sfx.betChange('down'),
  spin: () => {
    sfx.spinStart(false);
    for (let r = 0; r < 5; r++) after(900 + r * 260, () => sfx.reelStop(r, false));
    after(900 + 4 * 260 + 20, () => sfx.allReelsStopped());
  },
  spinTurbo: () => {
    sfx.spinStart(true);
    for (let r = 0; r < 5; r++) after(350 + r * 70, () => sfx.reelStop(r, true));
    after(350 + 4 * 70 + 20, () => sfx.allReelsStopped());
  },
  reelStop: () => sfx.reelStop(Math.floor(Math.random() * 5), false),
  scatter1: () => sfx.scatterLand(0, 1),
  scatter2: () => sfx.scatterLand(2, 2),
  scatter3: () => sfx.scatterLand(4, 3),
  coinLand: () => sfx.coinLand(2, 1),
  coinLandBig: () => sfx.coinLand(2, 50),
  collectLand: () => sfx.collectLand(4),
  anticipationWin: () => {
    sfx.anticipationStart();
    after(3000, () => sfx.anticipationEnd(true));
  },
  anticipationFail: () => {
    sfx.anticipationStart();
    after(3000, () => sfx.anticipationEnd(false));
  },
  winSmall: () => sfx.winSmall(),
  lineWins: () => {
    for (let i = 0; i < 5; i++) after(i * 450, () => sfx.lineWin(i));
  },
  coinCascade: () => sfx.coinCascade(6),
  rollup: () => {
    sfx.rollupStart(2000);
    after(2000, () => sfx.rollupEnd());
  },
  bigWin: () => {
    sfx.bigWinStart('big');
    after(5000, () => sfx.bigWinEnd());
  },
  megaWin: () => {
    sfx.bigWinStart('big');
    after(3000, () => sfx.bigWinTierUp('mega'));
    after(7000, () => sfx.bigWinEnd());
  },
  epicWin: () => {
    sfx.bigWinStart('epic');
    after(6000, () => sfx.bigWinEnd());
  },
  tierUpEpic: () => sfx.bigWinTierUp('epic'),
  bigWinEnd: () => sfx.bigWinEnd(),
  freeSpinsTriggered: () => sfx.freeSpinsTriggered(false),
  freeSpinsRetrigger: () => sfx.freeSpinsTriggered(true),
  freeSpinsIntro: () => sfx.freeSpinsIntro(),
  freeSpinsOutro: () => sfx.freeSpinsOutro(),
  bonusBuy: () => sfx.bonusBuy(),
  cashout: () => sfx.cashoutBonk(),
  notify: () => sfx.notify(),
  stopAll: () => {
    timers.forEach((id) => clearTimeout(id));
    timers.clear();
    sfx.stopAllLoops();
  },
} satisfies Record<string, () => void>;

export type SfxName = keyof typeof SFX_TABLE;
export const SFX_NAMES = Object.keys(SFX_TABLE) as SfxName[];

/** play a sound (or short demo sequence) manually; unlocks audio first */
export function playSfx(name: SfxName): void {
  initAudio();
  SFX_TABLE[name]?.();
}
