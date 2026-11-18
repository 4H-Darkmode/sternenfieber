import { CRYSTALS, type CrystalName } from './defs';
import { Facet, Sparkle, pts, type Pt } from './parts';

const body = (c: CrystalName) => `url(#sf-${c}-body)`;
const face = (c: CrystalName) => `url(#sf-${c}-face)`;

/** L1 – Ruby: classic brilliant cut (side view). */
export function Ruby() {
  const c: CrystalName = 'ruby';
  const T = [30, 43, 57, 70].map((x) => [x, 18] as Pt);
  const G = [12, 31, 50, 69, 88].map((x) => [x, 37] as Pt);
  const B: Pt = [50, 86];
  const crown: [Pt[], number][] = [
    [[T[0], G[0], G[1]], 0.38],
    [[T[0], G[1], T[1]], 0.18],
    [[T[1], G[1], G[2]], 0.5],
    [[T[1], G[2], T[2]], 0.28],
    [[T[2], G[2], G[3]], 0.22],
    [[T[2], G[3], T[3]], 0.05],
    [[T[3], G[3], G[4]], -0.12],
  ];
  const pav: [Pt[], number][] = [
    [[G[0], G[1], B], 0.12],
    [[G[1], G[2], B], -0.05],
    [[G[2], G[3], B], -0.28],
    [[G[3], G[4], B], -0.45],
  ];
  return (
    <g>
      <ellipse cx="50" cy="52" rx="38" ry="34" fill={`url(#sf-${c}-core)`} opacity="0.35" filter="url(#sf-blur-lg)" />
      <g filter="url(#sf-glow)">
        {crown.map(([p, s], i) => <Facet key={`c${i}`} p={p} s={s} fill={body(c)} />)}
        {pav.map(([p, s], i) => <Facet key={`p${i}`} p={p} s={s} fill={face(c)} />)}
        {/* inner fire streaks */}
        <polygon points={pts([G[1], [44, 37], B])} fill="#ffffff" opacity="0.18" />
        <polygon points={pts([[56, 37], G[3], B])} fill="#ffffff" opacity="0.08" />
        <polygon points={pts([T[0], T[3], G[4], B, G[0]])} fill="none" stroke={CRYSTALS[c].edge} strokeWidth="1.3" strokeLinejoin="round" opacity="0.85" />
        <line x1={G[0][0]} y1={G[0][1]} x2={G[4][0]} y2={G[4][1]} stroke={CRYSTALS[c].edge} strokeWidth="1" opacity="0.7" />
      </g>
      <Sparkle x={36} y={24} r={8} />
      <Sparkle x={66} y={58} r={4} opacity={0.75} />
    </g>
  );
}

/** L2 – Emerald: step (emerald) cut, front view. */
export function Emerald() {
  const c: CrystalName = 'emerald';
  const O: Pt[] = [[30, 13], [70, 13], [87, 30], [87, 70], [70, 87], [30, 87], [13, 70], [13, 30]];
  const M: Pt[] = [[34, 20], [66, 20], [80, 34], [80, 66], [66, 80], [34, 80], [20, 66], [20, 34]];
  const I: Pt[] = [[38, 28], [62, 28], [72, 38], [72, 62], [62, 72], [38, 72], [28, 62], [28, 38]];
  const shades = [0.45, 0.22, -0.22, -0.4, -0.5, -0.25, 0.12, 0.38];
  return (
    <g>
      <rect x="14" y="14" width="72" height="72" rx="18" fill={`url(#sf-${c}-core)`} opacity="0.35" filter="url(#sf-blur-lg)" />
      <g filter="url(#sf-glow)">
        <polygon points={pts(O)} fill={body(c)} />
        {O.map((_, k) => {
          const k2 = (k + 1) % 8;
          return <Facet key={`o${k}`} p={[O[k], O[k2], M[k2], M[k]]} s={shades[k]} fill={body(c)} />;
        })}
        {M.map((_, k) => {
          const k2 = (k + 1) % 8;
          return <Facet key={`m${k}`} p={[M[k], M[k2], I[k2], I[k]]} s={shades[k] * 0.6} fill={face(c)} />;
        })}
        <polygon points={pts(I)} fill={body(c)} />
        <polygon points={pts([[38, 28], [52, 28], [28, 52], [28, 38]])} fill="#ffffff" opacity="0.28" />
        <polygon points={pts([[60, 28], [64, 28], [28, 64], [28, 60]])} fill="#ffffff" opacity="0.16" />
        <polygon points={pts(O)} fill="none" stroke={CRYSTALS[c].edge} strokeWidth="1.3" strokeLinejoin="round" opacity="0.85" />
        <polygon points={pts(I)} fill="none" stroke={CRYSTALS[c].edge} strokeWidth="0.8" opacity="0.55" />
      </g>
      <Sparkle x={30} y={22} r={8} />
      <Sparkle x={68} y={68} r={4} opacity={0.7} />
    </g>
  );
}

/** L3 – Sapphire: hexagonal crystal column with pointed tips. */
export function Sapphire() {
  const c: CrystalName = 'sapphire';
  const top: Pt = [50, 5];
  const bot: Pt = [50, 95];
  const uL: Pt = [24, 29], uFL: Pt = [40, 34], uFR: Pt = [60, 34], uR: Pt = [76, 29];
  const lL: Pt = [24, 69], lFL: Pt = [40, 73], lFR: Pt = [60, 73], lR: Pt = [76, 69];
  const faces: [Pt[], number, string][] = [
    [[top, uL, uFL], 0.4, body(c)],
    [[top, uFL, uFR], 0.55, body(c)],
    [[top, uFR, uR], 0.1, body(c)],
    [[uL, uFL, lFL, lL], 0.12, face(c)],
    [[uFL, uFR, lFR, lFL], 0, body(c)],
    [[uFR, uR, lR, lFR], -0.32, face(c)],
    [[lL, lFL, bot], -0.18, face(c)],
    [[lFL, lFR, bot], -0.36, face(c)],
    [[lFR, lR, bot], -0.55, face(c)],
  ];
  return (
    <g>
      <ellipse cx="50" cy="50" rx="30" ry="44" fill={`url(#sf-${c}-core)`} opacity="0.4" filter="url(#sf-blur-lg)" />
      <g filter="url(#sf-glow)">
        {faces.map(([p, s, f], i) => <Facet key={i} p={p} s={s} fill={f} />)}
        <polygon points={pts([[43, 36], [48, 36], [48, 71], [43, 71]])} fill="#ffffff" opacity="0.32" />
        <polygon points={pts([[52, 36], [54, 36], [54, 71], [52, 71]])} fill="#ffffff" opacity="0.18" />
        <polygon points={pts([top, uR, lR, bot, lL, uL])} fill="none" stroke={CRYSTALS[c].edge} strokeWidth="1.3" strokeLinejoin="round" opacity="0.85" />
        <polyline points={pts([uL, uFL, uFR, uR])} fill="none" stroke={CRYSTALS[c].edge} strokeWidth="0.8" opacity="0.6" />
        <polyline points={pts([lL, lFL, lFR, lR])} fill="none" stroke={CRYSTALS[c].edge} strokeWidth="0.8" opacity="0.45" />
      </g>
      <Sparkle x={42} y={22} r={8} />
      <Sparkle x={66} y={80} r={4} opacity={0.6} />
    </g>
  );
}

function Shard({ c, cx, top, w, base, angle = 0 }: { c: CrystalName; cx: number; top: number; w: number; base: number; angle?: number }) {
  const sh = top + w * 1.15;
  const t: Pt = [cx, top];
  const l: Pt = [cx - w, sh], r: Pt = [cx + w, sh], m: Pt = [cx, sh + w * 0.35];
  const bl: Pt = [cx - w, base], br: Pt = [cx + w, base], bm: Pt = [cx, base + 2];
  return (
    <g transform={`rotate(${angle} ${cx} ${base})`}>
      <Facet p={[t, l, m]} s={0.5} fill={body(c)} />
      <Facet p={[t, m, r]} s={0.08} fill={body(c)} />
      <Facet p={[l, m, bm, bl]} s={0.14} fill={body(c)} />
      <Facet p={[m, r, br, bm]} s={-0.3} fill={face(c)} />
      <polygon points={pts([t, r, br, bm, bl, l])} fill="none" stroke={CRYSTALS[c].edge} strokeWidth="1.1" strokeLinejoin="round" opacity="0.8" />
      <line x1={cx - w * 0.45} y1={sh + 4} x2={cx - w * 0.45} y2={base - 6} stroke="#ffffff" strokeWidth="1.6" opacity="0.35" strokeLinecap="round" />
    </g>
  );
}

/** L4 – Amethyst: crystal cluster growing out of a geode rock. */
export function Amethyst() {
  const c: CrystalName = 'amethyst';
  return (
    <g>
      <ellipse cx="50" cy="56" rx="38" ry="36" fill={`url(#sf-${c}-core)`} opacity="0.35" filter="url(#sf-blur-lg)" />
      <g filter="url(#sf-glow)">
        <Shard c={c} cx={30} top={34} w={8} base={82} angle={-24} />
        <Shard c={c} cx={70} top={30} w={9} base={82} angle={22} />
        <Shard c={c} cx={50} top={7} w={12} base={84} />
        <path
          d="M12,84 Q18,74 30,79 Q40,72 50,78 Q62,71 72,78 Q82,73 88,84 Q84,94 50,94 Q16,94 12,84Z"
          fill="#2a0e52"
          stroke="#8b5cff"
          strokeWidth="1.2"
        />
        <path d="M20,84 Q30,80 40,85 Q50,81 60,86 Q72,81 80,85" fill="none" stroke="#c06bff" strokeWidth="1" opacity="0.6" />
      </g>
      <Sparkle x={44} y={18} r={8} />
      <Sparkle x={76} y={40} r={4} opacity={0.75} />
    </g>
  );
}
