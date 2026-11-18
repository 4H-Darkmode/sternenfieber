import { getScatterWin } from './evaluate';
import { playFreeSpinsRound } from './freespins';
import { createRng } from './rng';
import { spin } from './spin';
import { countOnStrip, stripLength } from './reels';
import { BONUS_BUY_COST_X, REELS, ROWS, type NearMissKind, type SpinMode, type WinTier } from './types';

export interface SimStats {
  spins: number;
  seed: number;
  bet: number;
  wagered: number;
  /** returns by source (credits) */
  returnBaseLines: number;
  returnBaseScatter: number;
  returnBaseCoins: number;
  returnFreeSpins: number;
  returnTotal: number;
  /** RTPs (fraction of wagered) */
  rtpTotal: number;
  rtpBaseLines: number;
  rtpScatter: number;
  rtpCoins: number;
  rtpFreeSpins: number;
  /** base spins with totalWin > 0 */
  hitFrequency: number;
  fsTriggers: number;
  /** 1 in N base spins triggers free spins */
  fsOneIn: number;
  avgFsWinX: number;
  avgFsSpins: number;
  fsRetriggerRate: number;
  /** EV of a bought bonus as multiple of its price (avgFsWinX / BONUS_BUY_COST_X) */
  bonusBuyEvX: number;
  bonusBuyReturnPct: number;
  ldwCount: number;
  ldwShare: number;
  /** wins ≥ bet among base spins (a "real" win) */
  realWinShare: number;
  nearMiss: Record<NearMissKind, number>;
  nearMissShare: Record<NearMissKind, number>;
  anticipationShare: number;
  coinCollectShare: number;
  /** largest single base spin (x bet) and largest FS round (x bet) */
  maxBaseWinX: number;
  maxFsRoundX: number;
  /** largest total of one paid spin incl. its free spins (x bet) */
  maxWinX: number;
  tiers: Record<WinTier, number>;
  ms: number;
}

/** Monte-Carlo simulation of n paid base spins (bet = 1) incl. triggered free-spin rounds. */
export function simulate(n: number, seed = 42): SimStats {
  const t0 = Date.now();
  const rng = createRng(seed);
  const bet = 1;
  let lines = 0, scatter = 0, coins = 0, fs = 0;
  let hits = 0, ldw = 0, realWins = 0, triggers = 0, fsSpins = 0, retriggers = 0;
  let anticipation = 0, coinCollects = 0;
  let maxBase = 0, maxFs = 0, maxWin = 0;
  const nearMiss: Record<NearMissKind, number> = { scatter: 0, coin: 0, line: 0 };
  const tiers: Record<WinTier, number> = { none: 0, small: 0, big: 0, mega: 0, epic: 0 };

  for (let i = 0; i < n; i++) {
    const r = spin({ bet, mode: 'base', rng });
    let lineSum = 0;
    for (const w of r.lineWins) lineSum += w.payout;
    lines += lineSum;
    scatter += getScatterWin(r);
    if (r.coinCollect) {
      coins += r.coinCollect.total;
      coinCollects++;
    }
    if (r.totalWin > 0) hits++;
    if (r.totalWin >= bet) realWins++;
    if (r.isLDW) ldw++;
    if (r.nearMiss) nearMiss[r.nearMiss.kind]++;
    if (r.anticipationFromReel !== null) anticipation++;
    tiers[r.winTier]++;
    if (r.totalWin > maxBase) maxBase = r.totalWin;
    let spinTotal = r.totalWin;
    if (r.freeSpinsAwarded > 0) {
      triggers++;
      const round = playFreeSpinsRound(bet, rng, { initialSpins: r.freeSpinsAwarded, keepResults: false });
      fs += round.totalWin;
      fsSpins += round.spinsPlayed;
      retriggers += round.retriggers;
      spinTotal += round.totalWin;
      if (round.totalWin > maxFs) maxFs = round.totalWin;
    }
    if (spinTotal > maxWin) maxWin = spinTotal;
  }

  const wagered = n * bet;
  const total = lines + scatter + coins + fs;
  const avgFs = triggers ? fs / triggers / bet : 0;
  const share = (k: number) => k / n;
  return {
    spins: n,
    seed,
    bet,
    wagered,
    returnBaseLines: lines,
    returnBaseScatter: scatter,
    returnBaseCoins: coins,
    returnFreeSpins: fs,
    returnTotal: total,
    rtpTotal: total / wagered,
    rtpBaseLines: lines / wagered,
    rtpScatter: scatter / wagered,
    rtpCoins: coins / wagered,
    rtpFreeSpins: fs / wagered,
    hitFrequency: share(hits),
    fsTriggers: triggers,
    fsOneIn: triggers ? n / triggers : Infinity,
    avgFsWinX: avgFs,
    avgFsSpins: triggers ? fsSpins / triggers : 0,
    fsRetriggerRate: triggers ? retriggers / triggers : 0,
    bonusBuyEvX: avgFs / BONUS_BUY_COST_X,
    bonusBuyReturnPct: (avgFs / BONUS_BUY_COST_X) * 100,
    ldwCount: ldw,
    ldwShare: share(ldw),
    realWinShare: share(realWins),
    nearMiss,
    nearMissShare: { scatter: share(nearMiss.scatter), coin: share(nearMiss.coin), line: share(nearMiss.line) },
    anticipationShare: share(anticipation),
    coinCollectShare: share(coinCollects),
    maxBaseWinX: maxBase / bet,
    maxFsRoundX: maxFs / bet,
    maxWinX: maxWin / bet,
    tiers,
    ms: Date.now() - t0,
  };
}

/** Average win (x bet) of `rounds` independently played (e.g. bought) free-spin rounds. */
export function simulateBonusBuy(rounds: number, seed = 7): { avgX: number; evPct: number; maxX: number } {
  const rng = createRng(seed);
  let sum = 0, max = 0;
  for (let i = 0; i < rounds; i++) {
    const w = playFreeSpinsRound(1, rng, { keepResults: false }).totalWin;
    sum += w;
    if (w > max) max = w;
  }
  const avgX = sum / rounds;
  return { avgX, evPct: (avgX / BONUS_BUY_COST_X) * 100, maxX: max };
}

/**
 * Exact distribution of visible scatter count (0..5) for a mode, from the strips.
 * Valid because each reel shows at most one scatter (spacing on the strips).
 */
export function exactScatterDistribution(mode: SpinMode): number[] {
  let dist = [1];
  for (let r = 0; r < REELS; r++) {
    const q = (ROWS * countOnStrip(mode, r, 'SCATTER')) / stripLength(mode, r);
    const next = new Array(dist.length + 1).fill(0);
    dist.forEach((v, k) => {
      next[k] += v * (1 - q);
      next[k + 1] += v * q;
    });
    dist = next;
  }
  return dist;
}

export interface FreeModeStats {
  spins: number;
  /** share of free spins with a COLLECT visible */
  collectVisible: number;
  /** share of free spins where the collector paid (≥1 coin visible) */
  collectPays: number;
  /** share of free-spin winnings from collect / lines / scatter */
  collectShare: number;
  lineShare: number;
  scatterShare: number;
  avgCoinsPerCollect: number;
  /** average paid collect, x bet */
  avgCollectX: number;
  /** average win per free spin, x bet */
  avgWinPerSpinX: number;
  /** free spins with any win */
  hitRate: number;
  /** free spins with a line win */
  lineHitRate: number;
}

/** Statistics over n independent free-mode spins (bet = 1). */
export function simulateFreeSpins(n: number, seed = 42): FreeModeStats {
  const rng = createRng(seed);
  let visible = 0, pays = 0, coinsInCollect = 0, collect = 0, lines = 0, scatter = 0, total = 0, hits = 0, lineHits = 0;
  for (let i = 0; i < n; i++) {
    const r = spin({ bet: 1, mode: 'free', rng });
    if (r.grid[REELS - 1].some((c) => c.symbol === 'COLLECT')) visible++;
    if (r.coinCollect) {
      pays++;
      collect += r.coinCollect.total;
      coinsInCollect += r.coinCollect.coinPositions.length;
    }
    let l = 0;
    for (const w of r.lineWins) l += w.payout;
    lines += l;
    if (l > 0) lineHits++;
    scatter += getScatterWin(r);
    total += r.totalWin;
    if (r.totalWin > 0) hits++;
  }
  const t = Math.max(total, 1e-9);
  return {
    spins: n,
    collectVisible: visible / n,
    collectPays: pays / n,
    collectShare: collect / t,
    lineShare: lines / t,
    scatterShare: scatter / t,
    avgCoinsPerCollect: pays ? coinsInCollect / pays : 0,
    avgCollectX: pays ? collect / pays : 0,
    avgWinPerSpinX: total / n,
    hitRate: hits / n,
    lineHitRate: lineHits / n,
  };
}
