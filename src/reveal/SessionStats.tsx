import { useEffect, useId, useState } from 'react';
import { netResult, sessionRtp, type SessionStats as Stats } from '../core/stats';
import { fmtDuration, fmtNum, fmtSigned } from './format';
import s from './SessionStats.module.css';

export interface SessionStatsProps {
  stats: Stats;
  balance: number;
  startBalance: number;
  className?: string;
}

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(t);
  }, [intervalMs]);
  return now;
}

/**
 * The honest ledger: ONE big number (Netto), one plain sentence,
 * three calm facts. Everything else sits behind «Details».
 */
export default function SessionStats({ stats, balance, startBalance, className }: SessionStatsProps) {
  const now = useNow();
  const [open, setOpen] = useState(false);
  const detailsId = useId();

  const net = netResult(stats);
  const neg = net < -0.004;
  const played = stats.totalWagered > 0;
  const celebrated = Math.max(stats.celebratedCount, stats.ldwCount);
  const per100 = Math.round(sessionRtp(stats) * 100);

  return (
    <section className={`${s.ledger} ${className ?? ''}`} aria-label="Ehrliche Bilanz dieser Session">
      <div className={s.hero}>
        <h2 className={s.kicker}>Ehrliche Bilanz</h2>
        <p className={`${s.net} ${neg ? s.neg : ''}`}>
          <span className={s.srOnly}>Netto: </span>
          {fmtSigned(net)}
        </p>
        <p className={s.chf}>= CHF {fmtSigned(net)}</p>
      </div>

      <div className={s.story}>
        <p className={s.sentence}>
          {played ? (
            <>
              Du hast <strong>{fmtNum(stats.totalWagered)}</strong> gesetzt und{' '}
              <strong>{fmtNum(stats.totalReturned)}</strong> zurückbekommen.
              {stats.ldwCount > 0 && (
                <>
                  {' '}
                  <mark className={s.mark}>
                    {stats.ldwCount} von {celebrated} «Gewinnen» waren in Wahrheit Verluste.
                  </mark>
                </>
              )}
            </>
          ) : (
            'Noch kein Spin. Hier siehst du gleich, was wirklich passiert.'
          )}
        </p>

        <ul className={s.facts}>
          <li>
            <span className={s.factLabel}>Spielzeit</span>
            <span className={s.factValue}>{fmtDuration(now - stats.startedAt)}</span>
          </li>
          <li>
            <span className={s.factLabel}>Spins</span>
            <span className={s.factValue}>{stats.spins}</span>
          </li>
          <li>
            <span className={s.factLabel}>Beinahe-Gewinne</span>
            <span className={s.factValue}>{stats.nearMissCount}</span>
          </li>
        </ul>
      </div>

      <div className={s.more}>
        <button
          type="button"
          className={s.toggle}
          aria-expanded={open}
          aria-controls={detailsId}
          onClick={() => setOpen((o) => !o)}
        >
          Details
          <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true" className={open ? s.chevUp : ''}>
            <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {open && (
        <ul id={detailsId} className={s.details}>
          {played && (
            <li>
              Von 100 gesetzten Franken kamen <strong>{per100}</strong> zurück. Auf Dauer sind es beim Automaten rund 95.
            </li>
          )}
          <li>
            Kontostand <strong>{fmtNum(balance)}</strong> (Start {fmtNum(startBalance)}). 1 Credit = 1 Franken.
          </li>
          {stats.freeSpinsPlayed > 0 && (
            <li>
              Dazu <strong>{stats.freeSpinsPlayed}</strong> «Gratis»-Spins – bezahlt mit den Einsätzen davor.
            </li>
          )}
          {stats.bonusBuys > 0 && (
            <li>
              <strong>{stats.bonusBuys}×</strong> Bonus gekauft – je 100-mal der Einsatz.
            </li>
          )}
          {stats.biggestWin > 0 && (
            <li>
              Grösster Gewinn: <strong>{fmtNum(stats.biggestWin)}</strong>.
            </li>
          )}
        </ul>
      )}
    </section>
  );
}
