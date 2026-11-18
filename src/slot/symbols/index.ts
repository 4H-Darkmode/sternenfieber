import type { ComponentType } from 'react';
import type { SymbolId } from '../../engine/types';
import { Amethyst, Emerald, Ruby, Sapphire } from './Crystals';
import { Comet, GoldStar, Planet, Rocket } from './Cosmic';
import { Coin, Collect, Scatter, Wild } from './Specials';

export { ensureSymbolDefs } from './defs';

export const SYMBOL_ART: Record<SymbolId, ComponentType<{ label?: string }>> = {
  L1: Ruby,
  L2: Emerald,
  L3: Sapphire,
  L4: Amethyst,
  H1: Planet,
  H2: Comet,
  H3: Rocket,
  H4: GoldStar,
  WILD: Wild,
  SCATTER: Scatter,
  COIN: Coin,
  COLLECT: Collect,
};

/** German display names (for aria-labels, paytable, reveal mode). */
export const SYMBOL_NAMES: Record<SymbolId, string> = {
  L1: 'Rubin',
  L2: 'Smaragd',
  L3: 'Saphir',
  L4: 'Amethyst',
  H1: 'Ringplanet',
  H2: 'Komet',
  H3: 'Rakete',
  H4: 'Goldstern',
  WILD: 'Wild (Schwarzes Loch)',
  SCATTER: 'Scatter (Supernova)',
  COIN: 'Sternenmünze',
  COLLECT: 'Sammler',
};

/** Glow colour per symbol (used for halos / win pulses). */
export const SYMBOL_GLOW: Record<SymbolId, string> = {
  L1: '#ff3d6e',
  L2: '#2dff9a',
  L3: '#4aa3ff',
  L4: '#c06bff',
  H1: '#ff5dc8',
  H2: '#34e7ff',
  H3: '#ff9a4a',
  H4: '#ffcf4a',
  WILD: '#a77bff',
  SCATTER: '#ff3db8',
  COIN: '#ffcf4a',
  COLLECT: '#34e7ff',
};

export const SPECIAL_SYMBOLS: ReadonlySet<SymbolId> = new Set<SymbolId>(['WILD', 'SCATTER', 'COIN', 'COLLECT']);
