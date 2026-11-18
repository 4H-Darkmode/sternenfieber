/**
 * Shared SVG <defs> (gradients + filters) for all symbols, injected ONCE into
 * the document. Symbols reference them by id (e.g. url(#sf-gold)).
 * Not display:none – some browsers drop gradients/filters from hidden SVGs.
 */

export const CRYSTALS = {
  ruby: { light: '#ffc2cf', mid: '#ff2d55', dark: '#7a0020', edge: '#ffd6df' },
  emerald: { light: '#c8ffe2', mid: '#16d47a', dark: '#025a32', edge: '#d9ffec' },
  sapphire: { light: '#cfe6ff', mid: '#2f7bff', dark: '#0a237a', edge: '#e0efff' },
  amethyst: { light: '#f3d4ff', mid: '#b44dff', dark: '#3f0878', edge: '#f6e2ff' },
} as const;

export type CrystalName = keyof typeof CRYSTALS;

const lin = (id: string, stops: [number, string, number?][], x1 = 0, y1 = 0, x2 = 0, y2 = 1) =>
  `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops
    .map(([o, c, op]) => `<stop offset="${o}" stop-color="${c}"${op !== undefined ? ` stop-opacity="${op}"` : ''}/>`)
    .join('')}</linearGradient>`;

const rad = (id: string, stops: [number, string, number?][], cx = 0.5, cy = 0.5, r = 0.5, fx?: number, fy?: number) =>
  `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}"${fx !== undefined ? ` fx="${fx}" fy="${fy}"` : ''}>${stops
    .map(([o, c, op]) => `<stop offset="${o}" stop-color="${c}"${op !== undefined ? ` stop-opacity="${op}"` : ''}/>`)
    .join('')}</radialGradient>`;

function buildDefs(): string {
  const parts: string[] = [];

  // ── filters ───────────────────────────────────────────
  parts.push(`
    <filter id="sf-glow" x="-35%" y="-35%" width="170%" height="170%" color-interpolation-filters="sRGB">
      <feGaussianBlur in="SourceGraphic" stdDeviation="2.4" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="sf-glow-lg" x="-45%" y="-45%" width="190%" height="190%" color-interpolation-filters="sRGB">
      <feGaussianBlur in="SourceGraphic" stdDeviation="4.5" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="sf-soft" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="1.4"/>
    </filter>
    <filter id="sf-blur-lg" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="5"/>
    </filter>
    <filter id="sf-mblur" x="-10%" y="-70%" width="120%" height="240%">
      <feGaussianBlur stdDeviation="0 7"/>
    </filter>
    <filter id="sf-text-shadow" x="-20%" y="-40%" width="140%" height="180%" color-interpolation-filters="sRGB">
      <feDropShadow dx="0" dy="1.6" stdDeviation="0.8" flood-color="#1a0033" flood-opacity="0.9"/>
    </filter>`);

  // ── crystals ──────────────────────────────────────────
  for (const [name, c] of Object.entries(CRYSTALS)) {
    parts.push(lin(`sf-${name}-body`, [[0, c.light], [0.38, c.mid], [1, c.dark]]));
    parts.push(lin(`sf-${name}-face`, [[0, c.mid], [1, c.dark]], 0, 0, 1, 1));
    parts.push(rad(`sf-${name}-core`, [[0, '#ffffff', 0.9], [0.35, c.light, 0.6], [1, c.mid, 0]]));
  }

  // ── gold ──────────────────────────────────────────────
  parts.push(lin('sf-gold', [[0, '#fff6c2'], [0.3, '#ffd84a'], [0.62, '#e8961a'], [1, '#8a4f00']]));
  parts.push(lin('sf-gold-hi', [[0, '#fffbe6'], [1, '#ffd23f']], 0, 0, 1, 1));
  parts.push(lin('sf-gold-lo', [[0, '#f0a21e'], [1, '#8a4a00']], 0, 0, 1, 1));
  parts.push(lin('sf-gold-rim', [[0, '#fff2b0'], [0.5, '#c7800f'], [1, '#6b3d00']], 0, 0, 1, 1));
  parts.push(rad('sf-coin-face', [[0, '#fffbe0'], [0.35, '#ffd84a'], [0.8, '#e8961a'], [1, '#b06a00']], 0.4, 0.35, 0.7));
  parts.push(lin('sf-text-gold', [[0, '#fffbe6'], [0.45, '#ffd84a'], [0.55, '#e8961a'], [1, '#fff0a8']]));

  // ── planet ────────────────────────────────────────────
  parts.push(rad('sf-planet', [[0, '#ffe7c2'], [0.28, '#ff9a4a'], [0.62, '#ff3db8'], [1, '#3d0a5e']], 0.36, 0.3, 0.75));
  parts.push(rad('sf-planet-shade', [[0, '#0a0018', 0], [0.55, '#0a0018', 0], [1, '#0a0018', 0.8]], 0.32, 0.28, 0.85));
  parts.push(lin('sf-ring', [[0, '#34e7ff', 0.2], [0.25, '#9ff6ff'], [0.5, '#ffffff'], [0.75, '#c9a8ff'], [1, '#8b5cff', 0.2]], 0, 0, 1, 0));
  parts.push(rad('sf-moon', [[0, '#ffffff'], [0.6, '#b3c4ff'], [1, '#5a5fa8']], 0.35, 0.3, 0.7));

  // ── comet ─────────────────────────────────────────────
  parts.push(lin('sf-comet-tail', [[0, '#ffffff', 0.95], [0.18, '#7ff2ff', 0.85], [0.6, '#34e7ff', 0.35], [1, '#34e7ff', 0]], 1, 0, 0, 1));
  parts.push(lin('sf-comet-tail2', [[0, '#ffd1f0', 0.9], [0.4, '#ff3db8', 0.5], [1, '#ff3db8', 0]], 1, 0, 0, 1));
  parts.push(rad('sf-comet-head', [[0, '#ffffff'], [0.3, '#e6fdff'], [0.6, '#34e7ff', 0.7], [1, '#34e7ff', 0]]));

  // ── rocket ────────────────────────────────────────────
  parts.push(lin('sf-rocket-body', [[0, '#6e72a0'], [0.4, '#ffffff'], [0.7, '#d2d6f0'], [1, '#4a4f80']], 0, 0, 1, 0));
  parts.push(lin('sf-rocket-red', [[0, '#ff8aa6'], [0.45, '#ff2d55'], [1, '#7a0020']], 0, 0, 1, 0));
  parts.push(rad('sf-glass', [[0, '#ffffff'], [0.25, '#b8fbff'], [0.6, '#34a8ff'], [1, '#0a2a7a']], 0.35, 0.3, 0.75));
  parts.push(lin('sf-flame', [[0, '#ffffff'], [0.2, '#fff2a8'], [0.45, '#ffb23d'], [0.75, '#ff3db8', 0.8], [1, '#8b5cff', 0]]));

  // ── wild (black hole) ─────────────────────────────────
  parts.push(rad('sf-wild-halo', [[0, '#000000', 0], [0.3, '#8b5cff', 0.55], [0.55, '#ff3db8', 0.25], [1, '#8b5cff', 0]]));
  parts.push(lin('sf-disk', [[0, '#fff2b0'], [0.3, '#ffb23d'], [0.6, '#ff3db8'], [1, '#8b5cff']], 0, 0, 1, 0));
  parts.push(lin('sf-disk2', [[0, '#34e7ff', 0.1], [0.5, '#ffffff', 0.9], [1, '#ff3db8', 0.1]], 0, 0, 1, 0));
  parts.push(rad('sf-hole', [[0, '#000000'], [0.82, '#000000'], [1, '#2a0a4a']]));

  // ── scatter (supernova) ───────────────────────────────
  parts.push(rad('sf-nova-bg', [[0, '#ffffff'], [0.12, '#ffe0f6'], [0.35, '#ff3db8', 0.75], [0.7, '#8b5cff', 0.3], [1, '#8b5cff', 0]]));
  parts.push(rad('sf-nova-ray', [[0, '#ffffff'], [0.35, '#bff8ff'], [0.75, '#34e7ff'], [1, '#34e7ff', 0.2]]));
  parts.push(rad('sf-nova-ray2', [[0, '#ffffff'], [0.35, '#ffd1f0'], [0.75, '#ff3db8'], [1, '#8b5cff', 0.2]]));
  parts.push(rad('sf-nova-core', [[0, '#ffffff'], [0.5, '#ffffff'], [0.75, '#fff2b0', 0.8], [1, '#ffcf4a', 0]]));

  // ── collect (gravity well) ────────────────────────────
  parts.push(rad('sf-well-bg', [[0, '#3a1f8a'], [0.6, '#160a3a'], [1, '#07031a']], 0.5, 0.55, 0.6));
  parts.push(lin('sf-well-rim', [[0, '#ff3db8'], [0.5, '#ffcf4a'], [1, '#34e7ff']], 0, 0, 1, 1));
  parts.push(rad('sf-well-core', [[0, '#ffffff'], [0.3, '#bff8ff'], [0.65, '#34e7ff', 0.5], [1, '#34e7ff', 0]]));

  // ── generic ───────────────────────────────────────────
  parts.push(lin('sf-shine', [[0, '#ffffff', 0.85], [1, '#ffffff', 0]]));

  // ── clip paths (user space of the referencing group) ──
  parts.push(`
    <clipPath id="sf-planet-clip"><circle cx="50" cy="52" r="25"/></clipPath>
    <clipPath id="sf-wild-front"><rect x="-10" y="46" width="120" height="70"/></clipPath>`);

  return `<defs>${parts.join('')}</defs>`;
}

let injected = false;

export function ensureSymbolDefs(): void {
  if (injected || typeof document === 'undefined' || !document.body) return;
  injected = true;
  if (document.getElementById('sf-symbol-defs')) return;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('id', 'sf-symbol-defs');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('width', '0');
  svg.setAttribute('height', '0');
  svg.style.position = 'absolute';
  svg.style.width = '0';
  svg.style.height = '0';
  svg.style.overflow = 'hidden';
  svg.style.pointerEvents = 'none';
  svg.innerHTML = buildDefs();
  document.body.prepend(svg);
}
