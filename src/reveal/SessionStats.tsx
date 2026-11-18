import { useEffect, useId, useState } from 'react';
import { netResult, sessionRtp, type SessionStats as Stats } from '../core/stats';
import { fmtDuration, fmtNum, fmtPct, fmtSigned } from './format';
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

/** The honest ledger: what the casino does not show you. */
export default function SessionStats({ stats, balance, startBalance, className }: SessionStatsProps) {
  const now = useNow();
  const [open, setOpen] = useState(false);
  const bodyId = useId();

  const net = netResult(stats);
  const rtp = sessionRtp(stats);
  const elapsed = now - stats.startedAt;
  const neg = net < -0.004;
  const balanceDelta = balance - startBalance;

  return (
    <section className={`${s.ledger} ${className ?? ''}`} aria-label="Ehrliche Bilanz dieser Session">
      <div className={s.top}>
        <h2 className={s.heading}>
          <span className={s.kicker}>Ehrliche Bilanz</span>
        </h2>
        <dl className={s.headline}>
          <div className={s.cell}>
            <dt>Spielzeit</dt>
            <dd className={s.num}>{fmtDuration(elapsed)}</dd>
          </div>
          <div className={`${s.cell} ${s.netCell} ${neg ? s.neg : ''}`}>
            <dt>Netto</dt>
            <dd className={s.num}>{fmtSigned(net)}</dd>
          </div>
        </dl>
        <button
          type="button"
          className={s.toggle}
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? 'Weniger' : 'Alle Zahlen'}
          <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true" className={open ? s.chevUp : ''}>
            <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div id={bodyId} className={`${s.body} ${open ? s.open : ''}`}>
        <dl className={s.grid}>
          <div className={s.cell}>
            <dt>Spins</dt>
            <dd className={s.num}>
              {stats.spins}
              {stats.freeSpinsPlayed > 0 && <small> +{stats.freeSpinsPlayed} frei</small>}
            </dd>
          </div>
          <div className={s.cell}>
            <dt>Gesetzt</dt>
            <dd className={s.num}>{fmtNum(stats.totalWagered)}</dd>
          </div>
          <div className={s.cell}>
            <dt>Zurück</dt>
            <dd className={s.num}>{fmtNum(stats.totalReturned)}</dd>
          </div>
          <div className={`${s.cell} ${neg ? s.neg : ''}`}>
            <dt>Session-RTP</dt>
            <dd className={s.num}>{stats.totalWagered > 0 ? fmtPct(rtp) : '–'}</dd>
          </div>
          <div className={`${s.cell} ${s.wide}`}>
            <dt>Gefeierte Gewinne</dt>
            <dd>
              <span className={s.num}>{stats.celebratedCount}</span>, davon in Wahrheit Verluste:{' '}
              <mark className={s.mark}>
                <span className={s.num}>{stats.ldwCount}</span> (LDW)
              </mark>
            </dd>
          </div>
          <div className={s.cell}>
            <dt>Beinahe-Gewinne</dt>
            <dd className={s.num}>{stats.nearMissCount}</dd>
          </div>
          {stats.bonusBuys > 0 && (
            <div className={s.cell}>
              <dt>Bonus gekauft</dt>
              <dd className={s.num}>{stats.bonusBuys}×</dd>
            </div>
          )}
        </dl>
        <p className={s.chf}>
          <span className={s.eq} aria-hidden="true">
            =
          </span>
          <span>
            In Franken: <strong className={`${s.num} ${neg ? s.negText : ''}`}>CHF {fmtSigned(net)}</strong>
            <span className={s.dim}>
              {' '}
              · Kontostand {fmtNum(balance)} (Start {fmtNum(startBalance)}, {fmtSigned(balanceDelta)}) · 1 Credit = 1 CHF
            </span>
          </span>
        </p>
      </div>
    </section>
  );
}
