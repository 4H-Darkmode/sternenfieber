import st from '../Symbol.module.css';
import { Facet, Sparkle, pts, starPoints, type Pt } from './parts';

/** H1 – Ringed planet with tilted ring (back half behind, front half over). */
export function Planet() {
  const ringBack = 'M6,52 A44,13 0 0 1 94,52';
  const ringFront = 'M6,52 A44,13 0 0 0 94,52';
  return (
    <g>
      <circle cx="50" cy="52" r="32" fill="#ff3db8" opacity="0.35" filter="url(#sf-blur-lg)" />
      <g className={st.wobble}>
      <g transform="rotate(-20 50 52)">
        <path d={ringBack} fill="none" stroke="url(#sf-ring)" strokeWidth="8" opacity="0.5" />
        <path d={ringBack} fill="none" stroke="#ffffff" strokeWidth="1.4" opacity="0.55" />
        <circle cx="50" cy="52" r="25" fill="url(#sf-planet)" />
        <g clipPath="url(#sf-planet-clip)">
          <path d="M20,40 Q50,35 80,40 L80,44 Q50,39 20,44Z" fill="#fff2d6" opacity="0.28" />
          <path d="M20,50 Q50,45 80,50 L80,57 Q50,52 20,57Z" fill="#6a0a5a" opacity="0.38" />
          <path d="M20,61 Q50,57 80,61 L80,64 Q50,60 20,64Z" fill="#ffcf4a" opacity="0.32" />
          <ellipse cx="60" cy="55" rx="5" ry="2.4" fill="#ffd1f0" opacity="0.35" />
          <circle cx="50" cy="52" r="25" fill="url(#sf-planet-shade)" />
        </g>
        <circle cx="50" cy="52" r="25" fill="none" stroke="#ffd1f0" strokeWidth="1" opacity="0.55" />
        <path d={ringFront} fill="none" stroke="url(#sf-ring)" strokeWidth="8" opacity="0.92" filter="url(#sf-glow)" />
        <path d={ringFront} fill="none" stroke="#ffffff" strokeWidth="1.6" opacity="0.85" />
        <path d="M10,57 A41,10 0 0 0 90,57" fill="none" stroke="#1a0a3a" strokeWidth="1" opacity="0.5" />
      </g>
      </g>
      <circle cx="83" cy="19" r="6.5" fill="url(#sf-moon)" filter="url(#sf-glow)" />
      <Sparkle x={34} y={36} r={6} opacity={0.9} />
      <Sparkle x={16} y={20} r={4} opacity={0.7} />
    </g>
  );
}

/** H2 – Comet with twin ion/dust tails. */
export function Comet() {
  return (
    <g>
      <g className={st.tail}>
        <path d="M74,22 C56,30 28,58 6,95 C30,68 54,48 84,36Z" fill="url(#sf-comet-tail)" filter="url(#sf-glow)" />
        <path d="M70,28 C58,42 40,64 24,94 C42,72 58,54 78,36Z" fill="url(#sf-comet-tail2)" opacity="0.85" />
      </g>
      <g stroke="#ffffff" strokeLinecap="round" fill="none">
        <path d="M70,30 C52,44 34,64 20,86" strokeWidth="1.2" opacity="0.55" />
        <path d="M76,32 C60,44 44,60 32,78" strokeWidth="0.8" opacity="0.45" />
      </g>
      <g fill="#bff8ff">
        <circle cx="40" cy="56" r="1.6" opacity="0.9" />
        <circle cx="30" cy="70" r="1.2" opacity="0.7" />
        <circle cx="52" cy="50" r="1.1" opacity="0.8" />
        <circle cx="22" cy="80" r="0.9" opacity="0.6" />
      </g>
      <g className={st.headPulse}>
        <circle cx="74" cy="28" r="22" fill="url(#sf-comet-head)" />
        <circle cx="74" cy="28" r="8" fill="#ffffff" filter="url(#sf-glow-lg)" />
        <circle cx="72" cy="26" r="3" fill="#ffffff" />
      </g>
      <Sparkle x={24} y={26} r={6} opacity={0.85} />
      <Sparkle x={86} y={70} r={4} opacity={0.7} />
    </g>
  );
}

/** H3 – Retro rocket blasting diagonally. */
export function Rocket() {
  return (
    <g>
      <ellipse cx="38" cy="66" rx="26" ry="20" fill="#ff8a3d" opacity="0.3" filter="url(#sf-blur-lg)" />
      <g stroke="#bff8ff" strokeLinecap="round" opacity="0.5">
        <line x1="16" y1="58" x2="6" y2="66" strokeWidth="1.5" />
        <line x1="30" y1="80" x2="20" y2="90" strokeWidth="1.2" />
        <line x1="12" y1="74" x2="4" y2="80" strokeWidth="1" />
      </g>
      <g transform="translate(52 48) rotate(40) scale(0.84) translate(-50 -52)">
        <g className={st.flame}>
          <path d="M40,71 C40,84 46,92 50,108 C54,92 60,84 60,71Z" fill="url(#sf-flame)" filter="url(#sf-glow-lg)" />
          <path d="M45,72 C45,80 48,86 50,96 C52,86 55,80 55,72Z" fill="#ffffff" opacity="0.85" />
        </g>
        <path d="M38,50 C29,55 23,66 23,78 L38,69Z" fill="url(#sf-rocket-red)" />
        <path d="M62,50 C71,55 77,66 77,78 L62,69Z" fill="url(#sf-rocket-red)" />
        <path d="M50,5 C64,17 66,40 63,71 L37,71 C34,40 36,17 50,5Z" fill="url(#sf-rocket-body)" />
        <path d="M50,5 C57.5,11.5 61.3,19 62.6,26 L37.4,26 C38.7,19 42.5,11.5 50,5Z" fill="url(#sf-rocket-red)" />
        <path d="M36.6,58 L63.4,58 L63.2,63 L36.8,63Z" fill="url(#sf-rocket-red)" />
        <rect x="48.3" y="56" width="3.4" height="22" rx="1.5" fill="#7a0020" />
        <path d="M40,71 L60,71 L57,76 L43,76Z" fill="#3a3f6a" />
        <circle cx="50" cy="39" r="9" fill="url(#sf-gold)" />
        <circle cx="50" cy="39" r="6.6" fill="url(#sf-glass)" />
        <ellipse cx="47.5" cy="36.5" rx="2.6" ry="1.6" fill="#ffffff" opacity="0.85" transform="rotate(-30 47.5 36.5)" />
        <path d="M44,12 C41,22 40,36 41,56" fill="none" stroke="#ffffff" strokeWidth="2" opacity="0.6" strokeLinecap="round" />
        <path d="M50,5 C64,17 66,40 63,71 L37,71 C34,40 36,17 50,5Z" fill="none" stroke="#e6e9ff" strokeWidth="1" opacity="0.6" />
      </g>
      <Sparkle x={80} y={18} r={5} opacity={0.85} />
    </g>
  );
}

/** H4 – Beveled golden star (top regular symbol). */
export function GoldStar() {
  const cx = 50, cy = 53;
  const sp = starPoints(cx, cy, 43, 18, 5);
  const C: Pt = [cx, cy];
  const tris: [Pt[], boolean][] = [];
  for (let i = 0; i < 5; i++) {
    const o = sp[i * 2];
    const l = sp[(i * 2 + 9) % 10];
    const r = sp[i * 2 + 1];
    tris.push([[C, l, o], true], [[C, o, r], false]);
  }
  return (
    <g>
      <polygon points={pts(sp)} fill="#ffcf4a" opacity="0.55" filter="url(#sf-blur-lg)" />
      <g className={st.wiggle}>
      <g filter="url(#sf-glow)">
        {tris.map(([p, hi], i) => (
          <Facet key={i} p={p} s={hi ? 0.1 : 0} fill={hi ? 'url(#sf-gold-hi)' : 'url(#sf-gold-lo)'} />
        ))}
        <polygon points={pts(sp)} fill="none" stroke="#fff6c2" strokeWidth="1.4" strokeLinejoin="round" />
        <polygon points={pts(starPoints(cx, cy, 16, 7, 5))} fill="#fffbe6" opacity="0.5" />
      </g>
      </g>
      <Sparkle x={50} y={14} r={7} />
      <Sparkle x={80} y={70} r={4.5} opacity={0.8} />
      <Sparkle x={20} y={40} r={3.5} opacity={0.7} />
    </g>
  );
}
