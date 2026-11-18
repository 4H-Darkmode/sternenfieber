/** Small shared SVG building blocks for symbol art (viewBox 0 0 100 100). */

export type Pt = readonly [number, number];

export const pts = (p: readonly Pt[]) => p.map(([x, y]) => `${x},${y}`).join(' ');

/** A polygon facet: base fill + white (s>0) or black (s<0) shading overlay. */
export function Facet({ p, s = 0, fill }: { p: readonly Pt[]; s?: number; fill: string }) {
  const points = pts(p);
  return (
    <>
      <polygon points={points} fill={fill} />
      {s !== 0 && <polygon points={points} fill={s > 0 ? '#ffffff' : '#000016'} opacity={Math.abs(s)} />}
    </>
  );
}

/** Four-point twinkle sparkle. */
export function Sparkle({ x, y, r, opacity = 1, className }: { x: number; y: number; r: number; opacity?: number; className?: string }) {
  const k = r * 0.18;
  const d = `M${x},${y - r} Q${x + k},${y - k} ${x + r},${y} Q${x + k},${y + k} ${x},${y + r} Q${x - k},${y + k} ${x - r},${y} Q${x - k},${y - k} ${x},${y - r}Z`;
  return (
    <g className={className} opacity={opacity}>
      <path d={d} fill="#ffffff" filter="url(#sf-glow)" />
    </g>
  );
}

/** Star polygon points (n spikes). */
export function starPoints(cx: number, cy: number, rOuter: number, rInner: number, n: number, rot = -90): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 === 0 ? rOuter : rInner;
    const a = ((rot + (180 / n) * i) * Math.PI) / 180;
    out.push([+(cx + Math.cos(a) * r).toFixed(2), +(cy + Math.sin(a) * r).toFixed(2)]);
  }
  return out;
}
