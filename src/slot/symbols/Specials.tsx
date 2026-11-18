import s from '../Symbol.module.css';
import { Sparkle, pts, starPoints } from './parts';

const DISPLAY_FONT = 'Bungee, system-ui, sans-serif';

function Disk() {
  return (
    <g transform="translate(50 46) scale(1 0.32)">
      <g className={s.spinSlow}>
        <circle r="38" fill="none" stroke="url(#sf-disk)" strokeWidth="15" opacity="0.8" />
        <circle r="30" fill="none" stroke="url(#sf-disk2)" strokeWidth="3" strokeDasharray="22 12" />
        <circle r="44" fill="none" stroke="#ffcf4a" strokeWidth="1.6" strokeDasharray="5 16" opacity="0.85" />
        <circle r="24" fill="none" stroke="#ffffff" strokeWidth="1.2" strokeDasharray="3 9" opacity="0.7" />
      </g>
    </g>
  );
}

/** WILD – black hole with swirling accretion disk. */
export function Wild() {
  return (
    <g>
      <circle cx="50" cy="46" r="48" fill="url(#sf-wild-halo)" />
      {/* lensed far side of the disk, bent over the top of the hole */}
      <path d="M27,46 A23,23 0 0 1 73,46" fill="none" stroke="url(#sf-disk)" strokeWidth="4.5" opacity="0.9" filter="url(#sf-glow)" />
      <Disk />
      <circle cx="50" cy="46" r="17" fill="url(#sf-hole)" />
      <circle cx="50" cy="46" r="17.6" fill="none" stroke="#ffe3a0" strokeWidth="1.6" filter="url(#sf-glow)" />
      <g clipPath="url(#sf-wild-front)">
        <Disk />
      </g>
      <Sparkle x={18} y={18} r={5} opacity={0.8} className={s.twinkle} />
      <Sparkle x={84} y={26} r={3.5} opacity={0.7} />
      <text
        x="50"
        y="92"
        textAnchor="middle"
        fontFamily={DISPLAY_FONT}
        fontSize="24"
        letterSpacing="1"
        fill="url(#sf-text-gold)"
        stroke="#2a0650"
        strokeWidth="3.2"
        paintOrder="stroke"
        strokeLinejoin="round"
        filter="url(#sf-text-shadow)"
      >
        WILD
      </text>
    </g>
  );
}

/** SCATTER – supernova burst. */
export function Scatter() {
  return (
    <g>
      <g className={s.pulse}>
        <circle cx="50" cy="45" r="47" fill="url(#sf-nova-bg)" />
      </g>
      <g className={s.spinSlow}>
        <polygon points={pts(starPoints(50, 45, 45, 8, 12))} fill="url(#sf-nova-ray)" opacity="0.85" />
      </g>
      <g className={s.spinRev}>
        <polygon points={pts(starPoints(50, 45, 33, 7, 8, -67.5))} fill="url(#sf-nova-ray2)" />
      </g>
      <g className={s.ring}>
        <circle cx="50" cy="45" r="27" fill="none" stroke="#bff8ff" strokeWidth="1.4" />
      </g>
      <circle cx="50" cy="45" r="13" fill="url(#sf-nova-core)" filter="url(#sf-glow-lg)" />
      <circle cx="50" cy="45" r="5.5" fill="#ffffff" />
      <text
        x="50"
        y="93"
        textAnchor="middle"
        fontFamily={DISPLAY_FONT}
        fontSize="17"
        letterSpacing="0.5"
        fill="#ffffff"
        stroke="#b0127a"
        strokeWidth="3.4"
        paintOrder="stroke"
        strokeLinejoin="round"
        filter="url(#sf-text-shadow)"
      >
        BONUS
      </text>
    </g>
  );
}

/** COIN – golden star coin carrying a credit value. */
export function Coin({ label = '' }: { label?: string }) {
  const len = label.length;
  const size = len <= 3 ? 22 : len === 4 ? 19 : len === 5 ? 16 : 13.5;
  return (
    <g>
      <circle cx="50" cy="50" r="44" fill="#ffcf4a" opacity="0.4" filter="url(#sf-blur-lg)" />
      <circle cx="50" cy="50" r="42" fill="url(#sf-gold-rim)" />
      <circle cx="50" cy="50" r="39.3" fill="none" stroke="#7a4300" strokeWidth="2.6" strokeDasharray="1.1 1.7" opacity="0.65" />
      <circle cx="50" cy="50" r="35.5" fill="url(#sf-coin-face)" />
      <circle cx="50" cy="50" r="35.5" fill="none" stroke="#fff6c2" strokeWidth="1.3" opacity="0.85" />
      <circle cx="50" cy="50" r="31" fill="none" stroke="#b06a00" strokeWidth="0.9" opacity="0.55" />
      <polygon points={pts(starPoints(50, 31, 10.5, 4.4, 5))} fill="url(#sf-gold-hi)" stroke="#a65e00" strokeWidth="0.9" strokeLinejoin="round" />
      <text
        x="50"
        y={62 + size * 0.28}
        textAnchor="middle"
        fontFamily={DISPLAY_FONT}
        fontSize={size}
        fill="#5a2a00"
        stroke="#fff4c0"
        strokeWidth="2.2"
        paintOrder="stroke"
        strokeLinejoin="round"
        {...(len > 6 ? { textLength: 58, lengthAdjust: 'spacingAndGlyphs' } : {})}
      >
        {label}
      </text>
      <ellipse cx="35" cy="28" rx="13" ry="5" fill="#ffffff" opacity="0.38" transform="rotate(-35 35 28)" />
      <Sparkle x={78} y={22} r={5} opacity={0.9} />
    </g>
  );
}

const WELL = [
  { rx: 32, ry: 11, cy: 36, o: 0.32 },
  { rx: 25, ry: 8.6, cy: 42.5, o: 0.48 },
  { rx: 18.5, ry: 6.2, cy: 48.5, o: 0.64 },
  { rx: 12.5, ry: 4.2, cy: 53.5, o: 0.8 },
  { rx: 6.8, ry: 2.3, cy: 57, o: 0.95 },
];

/** COLLECT – gravity-well collector that pulls in all coins. */
export function Collect() {
  return (
    <g>
      <circle cx="50" cy="47" r="46" fill="#ff3db8" opacity="0.28" filter="url(#sf-blur-lg)" />
      <circle cx="50" cy="47" r="42" fill="url(#sf-well-bg)" />
      <g fill="none" stroke="#7fdcff" strokeWidth="0.8" opacity="0.5">
        <path d="M14,34 Q38,44 50,59" />
        <path d="M86,34 Q62,44 50,59" />
        <path d="M27,22 Q44,40 50,59" />
        <path d="M73,22 Q56,40 50,59" />
        <path d="M50,14 L50,59" />
      </g>
      {WELL.map((e, i) => (
        <ellipse key={i} cx="50" cy={e.cy} rx={e.rx} ry={e.ry} fill="none" stroke="#34e7ff" strokeWidth="1.3" opacity={e.o} />
      ))}
      <circle cx="50" cy="58" r="9" fill="url(#sf-well-core)" filter="url(#sf-glow)" />
      <g transform="translate(50 46) scale(1 0.42)">
        <g className={s.orbit}>
          <circle cx="27" cy="0" r="4.6" fill="url(#sf-gold-hi)" stroke="#a65e00" strokeWidth="0.8" />
          <circle cx="-27" cy="0" r="4.6" fill="url(#sf-gold-hi)" stroke="#a65e00" strokeWidth="0.8" />
          <circle cx="0" cy="27" r="3.6" fill="url(#sf-gold-hi)" stroke="#a65e00" strokeWidth="0.8" />
          <circle cx="0" cy="-27" r="3.6" fill="url(#sf-gold-hi)" stroke="#a65e00" strokeWidth="0.8" />
        </g>
      </g>
      <circle cx="50" cy="47" r="42" fill="none" stroke="url(#sf-well-rim)" strokeWidth="4" filter="url(#sf-glow)" />
      <rect x="17" y="79" width="66" height="17" rx="8.5" fill="#1c1040" stroke="url(#sf-well-rim)" strokeWidth="1.6" />
      <text
        x="50"
        y="92"
        textAnchor="middle"
        fontFamily={DISPLAY_FONT}
        fontSize="11.5"
        letterSpacing="0.4"
        fill="url(#sf-text-gold)"
      >
        SAMMLER
      </text>
    </g>
  );
}
