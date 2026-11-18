/**
 * Imperative reel motion. One controller per reel; SlotMachine drives all of
 * them from a single requestAnimationFrame loop.
 *
 * Strip model (indices top → bottom, 1 index = 1 cell height):
 *   [spare 2][lead-in 6][loop copy A 6][loop copy B 6][current 3][spare 1]
 * The window shows cells [pos, pos+3). Spinning = pos decreasing (symbols
 * fall). While spinning, pos wraps by LOOP inside the two identical copies.
 * On stop we pick a target index t a few cells ahead, write the final cells
 * into t..t+2 (synchronous React commit), decelerate onto t, then a damped
 * spring gives the overshoot bounce. Only `transform` is animated.
 */
import type { Cell } from '../engine/types';

export const SPARE_TOP = 2;
export const LEAD = 6;
export const LOOP = 6;
export const VISIBLE = 3;
export const SPARE_BOTTOM = 1;
export const STRIP_LEN = SPARE_TOP + LEAD + LOOP * 2 + VISIBLE + SPARE_BOTTOM;
export const LOOP_START = SPARE_TOP + LEAD;
export const REST_TOP = LOOP_START + LOOP * 2;

export interface ReelView {
  items: Cell[];
  /** index of the top visible cell when resting / landing, -1 while free-spinning */
  restTop: number;
  ver: number;
}

type Phase = 'idle' | 'wait' | 'windup' | 'spin' | 'brake' | 'settle';

export interface SpinParams {
  speed: number; // cells / second
  windup: number; // seconds of back-pull (0 = none)
  accel: number; // cells / s²
  reduced: boolean;
  settle: number; // seconds of bounce
}

const PULL = 0.22; // back-pull distance in cells
const SPRING_W = 26; // rad/s
const SPRING_Z = 0.4; // damping ratio
const SPRING_WD = SPRING_W * Math.sqrt(1 - SPRING_Z * SPRING_Z);

const LAND_KEYFRAMES: Keyframe[] = [
  { transform: 'translateY(-5%) scale(1.03, 1.08)' },
  { transform: 'translateY(3%) scale(1.07, 0.92)', offset: 0.35 },
  { transform: 'translateY(-1%) scale(0.98, 1.03)', offset: 0.68 },
  { transform: 'none' },
];

export class ReelController {
  readonly index: number;
  pos = REST_TOP;
  vel = 0;
  phase: Phase = 'idle';
  private phaseStart = 0;
  private targetSpeed = 24;
  private stopAt = Infinity;
  private brakeT = 0.32;
  private final: Cell[] | null = null;
  private params: SpinParams = { speed: 24, windup: 0.13, accel: 140, reduced: false, settle: 0.42 };
  private blur = false;
  // brake / settle state
  private q = 0;
  private v0 = 0;
  private v1 = 0;
  private T = 0;
  private a = 0;
  private t = REST_TOP;

  private base: Cell[];
  private nextBase: Cell[] | null = null;
  items: Cell[];
  restTop = REST_TOP;
  ver = 0;
  committedVer = 0;

  stripEl: HTMLElement | null = null;
  flashEl: HTMLElement | null = null;
  /** set by the Reel component every render */
  commit: (view: ReelView, sync: boolean) => void = () => {};
  onImpact: (reel: number) => void = () => {};
  onSettled: (reel: number) => void = () => {};

  constructor(index: number, base: Cell[], initial: Cell[]) {
    this.index = index;
    this.base = base;
    this.items = base.slice();
    for (let r = 0; r < VISIBLE; r++) this.items[REST_TOP + r] = initial[r];
  }

  get view(): ReelView {
    return { items: this.items, restTop: this.restTop, ver: this.ver };
  }

  get active(): boolean {
    return this.phase !== 'idle';
  }

  /** has the reel reached its final position (impact happened)? */
  get landed(): boolean {
    return this.phase === 'idle' || this.phase === 'settle';
  }

  get braking(): boolean {
    return this.phase === 'brake' || this.landed;
  }

  /** new filler strip, applied at the next spin start */
  setBase(base: Cell[]) {
    this.nextBase = base;
  }

  visibleCells(): Cell[] {
    const top = this.restTop >= 0 ? this.restTop : REST_TOP;
    return this.items.slice(top, top + VISIBLE);
  }

  private push(sync: boolean) {
    this.ver++;
    this.items = this.items.slice();
    this.commit(this.view, sync);
  }

  applyTransform() {
    const el = this.stripEl;
    if (!el) return;
    el.style.transform = `translate3d(0, ${(-this.pos * (100 / VISIBLE)).toFixed(4)}%, 0)`;
  }

  private setBlur(on: boolean) {
    if (this.blur === on) return;
    this.blur = on;
    if (this.stripEl) this.stripEl.dataset.spinning = on ? 'true' : 'false';
  }

  /** Begin a spin. Final cells are given via requestStop(). */
  start(now: number, params: SpinParams) {
    const current = this.visibleCells();
    if (this.nextBase) {
      this.base = this.nextBase;
      this.nextBase = null;
    }
    this.params = params;
    this.items = this.base.slice();
    for (let r = 0; r < VISIBLE; r++) this.items[REST_TOP + r] = current[r];
    this.restTop = -1;
    this.pos = REST_TOP;
    this.vel = 0;
    this.targetSpeed = params.speed;
    this.stopAt = Infinity;
    this.final = null;
    this.phase = 'wait'; // wait for React to commit the new strip
    this.phaseStart = now;
    this.push(false);
  }

  requestStop(final: Cell[], at: number, brakeT: number) {
    this.final = final;
    this.stopAt = at;
    this.brakeT = brakeT;
  }

  /** move the stop time (anticipation / slam); ignored once braking */
  setStop(at: number, brakeT?: number) {
    if (this.braking) return;
    this.stopAt = at;
    if (brakeT !== undefined) this.brakeT = brakeT;
  }

  setTargetSpeed(v: number) {
    this.targetSpeed = v;
  }

  /** Jump straight to the final cells (used if a new spin interrupts). */
  snap(final: Cell[]) {
    this.items = this.base.slice();
    for (let r = 0; r < VISIBLE; r++) this.items[REST_TOP + r] = final[r];
    this.restTop = REST_TOP;
    this.pos = REST_TOP;
    this.vel = 0;
    this.phase = 'idle';
    this.final = null;
    this.setBlur(false);
    this.push(false);
    this.applyTransform();
  }

  /** returns true while still animating */
  update(now: number, dt: number): boolean {
    switch (this.phase) {
      case 'idle':
        return false;
      case 'wait':
        if (this.committedVer !== this.ver) return true;
        this.phase = this.params.windup > 0 ? 'windup' : 'spin';
        this.phaseStart = now;
        return true;
      case 'windup': {
        const e = (now - this.phaseStart) / this.params.windup;
        if (e < 1) {
          this.pos = REST_TOP + PULL * Math.sin((e * Math.PI) / 2);
        } else {
          this.pos = REST_TOP + PULL;
          this.phase = 'spin';
          this.phaseStart = now;
        }
        break;
      }
      case 'spin': {
        const target = this.targetSpeed;
        if (this.vel < target) this.vel = Math.min(target, this.vel + this.params.accel * dt);
        else this.vel = Math.max(target, this.vel - 40 * dt);
        this.pos -= this.vel * dt;
        if (this.pos < LOOP_START) this.pos += LOOP;
        if (!this.params.reduced && this.vel > 11) this.setBlur(true);
        if (now >= this.stopAt && this.final && this.vel >= Math.min(target * 0.7, 10)) {
          this.beginBrake(now);
        }
        break;
      }
      case 'brake': {
        const tau = now - this.phaseStart;
        if (tau >= this.T) {
          this.pos = this.t;
          this.phase = 'settle';
          this.phaseStart = now;
          this.setBlur(false);
          this.applyTransform();
          this.impactFx();
          this.onImpact(this.index);
          return true;
        }
        this.pos = this.q - this.v0 * tau + 0.5 * this.a * tau * tau;
        if (this.v0 - this.a * tau < 13) this.setBlur(false);
        break;
      }
      case 'settle': {
        const tau = now - this.phaseStart;
        if (tau >= this.params.settle) {
          this.pos = this.t;
          this.phase = 'idle';
          this.applyTransform();
          this.onSettled(this.index);
          return false;
        }
        this.pos = this.t - (this.v1 / SPRING_WD) * Math.exp(-SPRING_Z * SPRING_W * tau) * Math.sin(SPRING_WD * tau);
        break;
      }
    }
    this.applyTransform();
    return true;
  }

  private beginBrake(now: number) {
    const final = this.final!;
    const q = this.pos;
    const v0 = Math.max(this.vel, 4);
    const D = Math.min(5.2, Math.max(3.4, (v0 * this.brakeT) / 2));
    const t = Math.max(1, Math.floor(q - D));
    // write the final symbols just above the window (not yet visible)
    this.items = this.items.slice();
    for (let r = 0; r < VISIBLE; r++) this.items[t + r] = final[r];
    this.restTop = t;
    this.push(true);
    this.q = q;
    this.v0 = v0;
    this.v1 = this.params.reduced ? 0.4 : Math.max(0.17 * v0, 2.4);
    this.t = t;
    this.T = (2 * (q - t)) / (v0 + this.v1);
    this.a = (v0 - this.v1) / this.T;
    this.phase = 'brake';
    this.phaseStart = now;
  }

  private impactFx() {
    const strip = this.stripEl;
    if (!strip || typeof strip.animate !== 'function') return;
    const reduced = this.params.reduced;
    if (!reduced) {
      for (let r = 0; r < VISIBLE; r++) {
        const cell = strip.children[this.t + r] as HTMLElement | undefined;
        const sym = cell?.firstElementChild as HTMLElement | null | undefined;
        sym?.animate(LAND_KEYFRAMES, { duration: 460, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });
      }
    }
    this.flashEl?.animate([{ opacity: reduced ? 0.25 : 0.7 }, { opacity: 0 }], {
      duration: 420,
      easing: 'ease-out',
    });
  }
}
