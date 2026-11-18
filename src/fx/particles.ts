/**
 * Lightweight canvas particle engine (singleton).
 * - Only runs requestAnimationFrame while particles are alive or coin rain is on.
 * - Sprites are pre-rendered once to offscreen canvases (no per-frame gradients).
 * - All public calls are safe no-ops until <ParticleCanvas/> attaches a canvas.
 */
import { prefersReducedMotion } from './motion';

export type BurstKind = 'spark' | 'coin' | 'star';

interface Particle {
  kind: BurstKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  g: number; // gravity px/s²
  drag: number;
  life: number;
  maxLife: number;
  size: number;
  rot: number;
  vr: number;
  phase: number; // coin flip phase
  spin: number;
  sprite: number; // index into star sprite colours
  /** coin rain coins live until they leave the screen */
  rain?: boolean;
}

const MAX_PARTICLES = 650;
const STAR_COLORS = ['#ffffff', '#ffcf4a', '#34e7ff', '#ff3db8', '#b98bff'];

function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function drawStarPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, r1: number, r2: number, n: number) {
  ctx.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 === 0 ? r1 : r2;
    const a = (Math.PI * i) / n - Math.PI / 2;
    ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  ctx.closePath();
}

function makeCoinSprite(back: boolean): HTMLCanvasElement {
  const S = 64;
  const c = makeCanvas(S, S);
  const ctx = c.getContext('2d')!;
  const cx = S / 2;
  // rim
  const rim = ctx.createLinearGradient(0, 0, S, S);
  rim.addColorStop(0, back ? '#c98a12' : '#fff2b0');
  rim.addColorStop(0.5, back ? '#8a5a06' : '#e8961a');
  rim.addColorStop(1, back ? '#5a3800' : '#a86400');
  ctx.fillStyle = rim;
  ctx.beginPath();
  ctx.arc(cx, cx, 30, 0, Math.PI * 2);
  ctx.fill();
  // face
  const face = ctx.createRadialGradient(cx - 8, cx - 10, 2, cx, cx, 26);
  face.addColorStop(0, back ? '#f0c040' : '#fffbe0');
  face.addColorStop(0.35, back ? '#d9a21e' : '#ffd84a');
  face.addColorStop(1, back ? '#9a6608' : '#e09412');
  ctx.fillStyle = face;
  ctx.beginPath();
  ctx.arc(cx, cx, 24, 0, Math.PI * 2);
  ctx.fill();
  // embossed star
  ctx.fillStyle = back ? 'rgba(120,70,0,0.55)' : 'rgba(255,255,255,0.85)';
  drawStarPath(ctx, cx, cx + 1, 13, 5.5, 5);
  ctx.fill();
  ctx.strokeStyle = back ? 'rgba(80,45,0,0.6)' : 'rgba(170,100,0,0.7)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // shine
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath();
  ctx.ellipse(cx - 9, cx - 12, 9, 4, -0.6, 0, Math.PI * 2);
  ctx.fill();
  return c;
}

function makeStarSprite(color: string): HTMLCanvasElement {
  const S = 64;
  const c = makeCanvas(S, S);
  const ctx = c.getContext('2d')!;
  const cx = S / 2;
  const glow = ctx.createRadialGradient(cx, cx, 0, cx, cx, cx);
  glow.addColorStop(0, color);
  glow.addColorStop(0.25, color + '88');
  glow.addColorStop(1, color + '00');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, S, S);
  ctx.fillStyle = '#ffffff';
  drawStarPath(ctx, cx, cx, 30, 3.2, 4);
  ctx.fill();
  return c;
}

function makeSparkSprite(): HTMLCanvasElement {
  const S = 32;
  const c = makeCanvas(S, S);
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.2, 'rgba(255,236,170,0.95)');
  g.addColorStop(0.5, 'rgba(255,190,60,0.35)');
  g.addColorStop(1, 'rgba(255,160,40,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  return c;
}

class ParticleEngine {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private w = 0;
  private h = 0;
  private dpr = 1;
  private ps: Particle[] = [];
  private raf = 0;
  private last = 0;
  private rainOn = false;
  private rainIntensity = 1;
  private rainAcc = 0;
  private sprites: {
    coin: HTMLCanvasElement;
    coinBack: HTMLCanvasElement;
    spark: HTMLCanvasElement;
    stars: HTMLCanvasElement[];
  } | null = null;

  attach(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    if (!this.sprites) {
      this.sprites = {
        coin: makeCoinSprite(false),
        coinBack: makeCoinSprite(true),
        spark: makeSparkSprite(),
        stars: STAR_COLORS.map(makeStarSprite),
      };
    }
    this.resize();
    window.addEventListener('resize', this.resize);
    if (this.ps.length || this.rainOn) this.kick();
  }

  detach(canvas: HTMLCanvasElement) {
    if (this.canvas !== canvas) return;
    window.removeEventListener('resize', this.resize);
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.canvas = null;
    this.ctx = null;
    this.ps = [];
    this.rainOn = false;
  }

  private resize = () => {
    const c = this.canvas;
    if (!c) return;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    c.width = Math.round(this.w * this.dpr);
    c.height = Math.round(this.h * this.dpr);
  };

  private scale(): number {
    // particle size scales mildly with viewport
    return Math.max(0.75, Math.min(1.35, Math.min(this.w, this.h) / 700));
  }

  burst(x: number, y: number, kind: BurstKind, count?: number) {
    if (!this.ctx) return;
    const reduced = prefersReducedMotion();
    const base = count ?? (kind === 'coin' ? 24 : kind === 'star' ? 26 : 16);
    const n = Math.max(1, Math.round(base * (reduced ? 0.3 : 1)));
    const s = this.scale();
    for (let i = 0; i < n && this.ps.length < MAX_PARTICLES; i++) {
      const a = Math.random() * Math.PI * 2;
      if (kind === 'coin') {
        const sp = (260 + Math.random() * 520) * s;
        this.ps.push({
          kind, x, y,
          vx: Math.cos(a) * sp * 0.7,
          vy: Math.sin(a) * sp * 0.6 - 420 * s,
          g: 1300 * s, drag: 0.4,
          life: 0, maxLife: 1.4 + Math.random() * 0.8,
          size: (20 + Math.random() * 14) * s,
          rot: Math.random() * 0.6 - 0.3, vr: (Math.random() - 0.5) * 2,
          phase: Math.random() * Math.PI * 2, spin: 6 + Math.random() * 10, sprite: 0,
        });
      } else if (kind === 'star') {
        const sp = (120 + Math.random() * 520) * s;
        this.ps.push({
          kind, x, y,
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          g: 140 * s, drag: 1.8,
          life: 0, maxLife: 0.7 + Math.random() * 0.9,
          size: (14 + Math.random() * 26) * s,
          rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 6,
          phase: 0, spin: 0, sprite: Math.floor(Math.random() * STAR_COLORS.length),
        });
      } else {
        const sp = (140 + Math.random() * 460) * s;
        this.ps.push({
          kind, x, y,
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 80 * s,
          g: 520 * s, drag: 2.2,
          life: 0, maxLife: 0.35 + Math.random() * 0.55,
          size: (8 + Math.random() * 12) * s,
          rot: 0, vr: 0, phase: 0, spin: 0, sprite: 0,
        });
      }
    }
    this.kick();
  }

  coinRain(on: boolean, intensity = 1) {
    this.rainOn = on;
    this.rainIntensity = Math.max(0.2, intensity);
    if (on) this.kick();
  }

  private spawnRainCoin() {
    const s = this.scale();
    const size = (18 + Math.random() * 18) * s;
    this.ps.push({
      kind: 'coin',
      x: Math.random() * this.w,
      y: -size,
      vx: (Math.random() - 0.5) * 90 * s,
      vy: (160 + Math.random() * 260) * s,
      g: 520 * s, drag: 0.15,
      life: 0, maxLife: 99,
      size,
      rot: (Math.random() - 0.5) * 0.8, vr: (Math.random() - 0.5) * 1.5,
      phase: Math.random() * Math.PI * 2, spin: 5 + Math.random() * 9, sprite: 0,
      rain: true,
    });
  }

  private kick() {
    if (this.raf || !this.ctx) return;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  private frame = (now: number) => {
    this.raf = 0;
    const ctx = this.ctx;
    const sp = this.sprites;
    if (!ctx || !sp) return;
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;

    // spawn rain
    if (this.rainOn) {
      const rate = 26 * this.rainIntensity * (prefersReducedMotion() ? 0.25 : 1);
      this.rainAcc += rate * dt;
      while (this.rainAcc >= 1 && this.ps.length < MAX_PARTICLES) {
        this.rainAcc -= 1;
        this.spawnRainCoin();
      }
      if (this.rainAcc > 4) this.rainAcc = 0;
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    const dpr = this.dpr;
    const alive: Particle[] = [];
    for (const p of this.ps) {
      p.life += dt;
      const dragK = Math.max(0, 1 - p.drag * dt);
      p.vx *= dragK;
      p.vy = p.vy * dragK + p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      p.phase += p.spin * dt;
      const off = p.y > this.h + 60 || p.x < -80 || p.x > this.w + 80;
      if (p.rain ? off : p.life >= p.maxLife || off) continue;
      alive.push(p);

      const t = p.life / p.maxLife;
      const fade = p.rain ? 1 : t > 0.7 ? 1 - (t - 0.7) / 0.3 : 1;
      if (p.kind === 'coin') {
        const flip = Math.cos(p.phase);
        const sx = Math.max(0.08, Math.abs(flip));
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = fade;
        const cos = Math.cos(p.rot);
        const sin = Math.sin(p.rot);
        ctx.setTransform(cos * sx * dpr, sin * sx * dpr, -sin * dpr, cos * dpr, p.x * dpr, p.y * dpr);
        const img = flip >= 0 ? sp.coin : sp.coinBack;
        ctx.drawImage(img, -p.size / 2, -p.size / 2, p.size, p.size);
        // glint when face-on
        if (flip > 0.92) {
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = (flip - 0.92) * 10 * fade;
          ctx.drawImage(sp.spark, -p.size * 0.7, -p.size * 0.7, p.size * 1.4, p.size * 1.4);
        }
      } else if (p.kind === 'star') {
        ctx.globalCompositeOperation = 'lighter';
        const tw = 0.7 + 0.3 * Math.sin(p.life * 22 + p.size);
        ctx.globalAlpha = fade * tw;
        const sz = p.size * (t < 0.15 ? t / 0.15 : 1);
        const cos = Math.cos(p.rot);
        const sin = Math.sin(p.rot);
        ctx.setTransform(cos * dpr, sin * dpr, -sin * dpr, cos * dpr, p.x * dpr, p.y * dpr);
        ctx.drawImage(sp.stars[p.sprite], -sz / 2, -sz / 2, sz, sz);
      } else {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = fade;
        // trail: draw stretched sprite along velocity
        const v = Math.hypot(p.vx, p.vy);
        const ang = Math.atan2(p.vy, p.vx);
        const len = Math.max(p.size, Math.min(p.size * 5, v * 0.05));
        const cos = Math.cos(ang);
        const sin = Math.sin(ang);
        ctx.setTransform(cos * dpr, sin * dpr, -sin * dpr, cos * dpr, p.x * dpr, p.y * dpr);
        ctx.drawImage(sp.spark, -len, -p.size / 2, len * 1.3, p.size);
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ps = alive;

    if (alive.length || this.rainOn) {
      this.raf = requestAnimationFrame(this.frame);
    } else {
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    }
  };
}

const engine = new ParticleEngine();

/** Imperative FX API (safe to call anytime; no-op if no canvas mounted). */
export const fx = {
  /** Burst at screen (client) coordinates. */
  burst(x: number, y: number, kind: BurstKind = 'spark', count?: number) {
    engine.burst(x, y, kind, count);
  },
  /** Burst at the centre of an element's bounding box. */
  burstAt(el: Element | null | undefined, kind: BurstKind = 'spark', count?: number) {
    if (!el) return;
    const r = el.getBoundingClientRect();
    engine.burst(r.left + r.width / 2, r.top + r.height / 2, kind, count);
  },
  /** Continuous gold coin rain from the top of the screen. */
  coinRain(on: boolean, intensity = 1) {
    engine.coinRain(on, intensity);
  },
  /** @internal used by ParticleCanvas */
  _attach(c: HTMLCanvasElement) {
    engine.attach(c);
  },
  /** @internal used by ParticleCanvas */
  _detach(c: HTMLCanvasElement) {
    engine.detach(c);
  },
};
