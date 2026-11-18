/** SHARED CONTRACT – honest session statistics shown in reveal mode. */
export interface SessionStats {
  startedAt: number; // epoch ms
  spins: number; // paid spins (base game)
  freeSpinsPlayed: number;
  totalWagered: number; // credits incl. bonus buys
  totalReturned: number; // credits won
  biggestWin: number;
  ldwCount: number; // "wins" smaller than the bet that were celebrated
  nearMissCount: number;
  bonusBuys: number;
  /** wins celebrated with sound/animation (incl. LDW) */
  celebratedCount: number;
}

export const emptyStats = (): SessionStats => ({
  startedAt: Date.now(),
  spins: 0,
  freeSpinsPlayed: 0,
  totalWagered: 0,
  totalReturned: 0,
  biggestWin: 0,
  ldwCount: 0,
  nearMissCount: 0,
  bonusBuys: 0,
  celebratedCount: 0,
});

/** net = returned - wagered (negative = loss) */
export const netResult = (s: SessionStats) => s.totalReturned - s.totalWagered;
export const sessionRtp = (s: SessionStats) => (s.totalWagered > 0 ? s.totalReturned / s.totalWagered : 0);
