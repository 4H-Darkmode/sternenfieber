/* Sternenfieber math report: `npm run sim [spins] [seed]` */
import { exactScatterDistribution, simulate, simulateBonusBuy } from '../src/engine/simulate';
import { PAYTABLE, expectedCoinValue } from '../src/engine/paytable';
import { STRIPS, countOnStrip } from '../src/engine/reels';
import { BONUS_BUY_COST_X } from '../src/engine/types';

const n = Number(process.argv[2] ?? 10_000_000);
const seed = Number(process.argv[3] ?? 42);

const pct = (x: number, d = 2) => `${(x * 100).toFixed(d)} %`;
const row = (k: string, v: string, note = '') => console.log(`  ${k.padEnd(42)} ${v.padStart(14)}  ${note}`);
const hr = (t: string) => console.log(`\n── ${t} ${'─'.repeat(Math.max(0, 60 - t.length))}`);

console.log(`Sternenfieber – Simulation: ${n.toLocaleString('de-CH')} Basis-Spins, Seed ${seed}`);

hr('Reel strips');
for (const mode of ['base', 'free'] as const) {
  const lens = STRIPS[mode].map((s) => s.length).join('/');
  const sc = STRIPS[mode].map((_, r) => countOnStrip(mode, r, 'SCATTER')).join('/');
  const coin = STRIPS[mode].map((_, r) => countOnStrip(mode, r, 'COIN')).join('/');
  const col = countOnStrip(mode, 4, 'COLLECT');
  row(`${mode}: lengths`, lens, `scatter ${sc} · coin ${coin} · collect(r5) ${col}`);
}
row('E[coin value] base / free', `${expectedCoinValue('base').toFixed(2)}x / ${expectedCoinValue('free').toFixed(2)}x`);

const s = simulate(n, seed);

hr('RTP');
row('RTP total', pct(s.rtpTotal), 'target 94–96 %');
row('  base line wins', pct(s.rtpBaseLines));
row('  base scatter pays', pct(s.rtpScatter));
row('  base coin collect', pct(s.rtpCoins));
row('  free spins (incl. retriggers)', pct(s.rtpFreeSpins));

hr('Frequencies (base game)');
row('Hit frequency (win > 0)', pct(s.hitFrequency), 'target 25–32 %');
row('Real wins (win ≥ bet)', pct(s.realWinShare));
row('LDW (0 < win < bet)', pct(s.ldwShare), `${s.ldwCount.toLocaleString('de-CH')} spins`);
row('Coin collect', pct(s.coinCollectShare));
row('Anticipation shown', pct(s.anticipationShare));
row('Free spins trigger', `1 in ${s.fsOneIn.toFixed(0)}`, `${s.fsTriggers} triggers · target 1 in 150–250`);
const ex = exactScatterDistribution('base');
const exTrig = ex[3] + ex[4] + ex[5];
row('  exact (from strips)', `1 in ${(1 / exTrig).toFixed(1)}`, `2 scatters exactly: ${pct(ex[2])}`);
row('Near-miss: scatter', pct(s.nearMissShare.scatter), `${(s.nearMiss.scatter / Math.max(1, s.fsTriggers)).toFixed(1)}x as often as a trigger`);
row('Near-miss: coin (≥2 coins, no collector)', pct(s.nearMissShare.coin));
row('Near-miss: line (4x H3/H4/WILD)', pct(s.nearMissShare.line));
const nmAll = s.nearMiss.scatter + s.nearMiss.coin + s.nearMiss.line;
row('Near-miss: any', pct(nmAll / s.spins));

hr('Free spins');
row('Avg free-spins round', `${s.avgFsWinX.toFixed(1)}x bet`, 'target 70–110x');
row('Avg spins per round', s.avgFsSpins.toFixed(2), `retriggers/round ${s.fsRetriggerRate.toFixed(3)}`);
const bb = simulateBonusBuy(Math.max(20_000, Math.round(n / 20)), seed + 1);
row(`Bonus buy (${BONUS_BUY_COST_X}x) EV – from triggers`, pct(s.bonusBuyEvX, 1), `avg ${s.avgFsWinX.toFixed(1)}x for ${BONUS_BUY_COST_X}x`);
row('Bonus buy EV – dedicated sim', pct(bb.avgX / BONUS_BUY_COST_X, 1), `avg ${bb.avgX.toFixed(1)}x · max ${bb.maxX.toFixed(0)}x`);
const expRtp = s.rtpBaseLines + s.rtpCoins + (ex[3] * 2 + ex[4] * 10 + ex[5] * 50) + exTrig * bb.avgX;
row('RTP (exact scatter odds + bonus sim)', pct(expRtp), 'lower-variance estimate');

hr('Extremes & tiers (base spins)');
row('Max base spin', `${s.maxBaseWinX.toFixed(1)}x`);
row('Max free-spins round', `${s.maxFsRoundX.toFixed(1)}x`);
row('Max paid spin incl. FS', `${s.maxWinX.toFixed(1)}x`);
for (const t of ['none', 'small', 'big', 'mega', 'epic'] as const) {
  row(`Tier ${t}`, pct(s.tiers[t] / s.spins, 3), `${s.tiers[t].toLocaleString('de-CH')}`);
}

hr('Paytable (x line bet; line bet = bet/10)');
for (const [sym, p] of Object.entries(PAYTABLE)) row(sym, `${p[3]} / ${p[4]} / ${p[5]}`);

console.log(`\nDone in ${(s.ms / 1000).toFixed(1)} s`);
