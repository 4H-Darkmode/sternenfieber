import { useEffect, useId, useState, type FormEvent } from 'react';
import { fmtDateTime, fmtDuration, fmtNum } from './format';
import s from './LimitPanel.module.css';

export interface LimitPanelProps {
  /** active loss limit in credits, null = none */
  currentLimit: number | null;
  /** a higher limit waiting for its 24h delay */
  pendingLimit: { value: number; activeAt: number } | null;
  onSetLimit: (v: number) => void;
  /** net loss so far in credits (positive number = lost) */
  lossSoFar: number;
  className?: string;
}

const PRESETS = [20, 50, 100, 200, 500];
const DAY_MS = 24 * 60 * 60 * 1000;

function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [active]);
  return now;
}

/** Loss-limit panel modelled on Art. 87 VGS: lower = immediately, higher = after 24 h. */
export default function LimitPanel({ currentLimit, pendingLimit, onSetLimit, lossSoFar, className }: LimitPanelProps) {
  const [draft, setDraft] = useState<string>(currentLimit != null ? String(currentLimit) : '100');
  const now = useNow(pendingLimit != null);
  const inputId = useId();
  const ruleId = useId();

  const value = Number(draft.replace(',', '.'));
  const valid = Number.isFinite(value) && value > 0;
  const loss = Math.max(0, lossSoFar);

  let rule: { kind: 'now' | 'delay' | 'same'; text: string } | null = null;
  if (valid) {
    if (currentLimit == null) rule = { kind: 'now', text: 'Erste Limite: gilt sofort.' };
    else if (value < currentLimit) rule = { kind: 'now', text: 'Tiefer als jetzt: gilt sofort.' };
    else if (value > currentLimit) rule = { kind: 'delay', text: 'Höher als jetzt: gilt erst in 24 Stunden.' };
    else rule = { kind: 'same', text: 'Das ist bereits deine Limite.' };
  }

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!valid || rule?.kind === 'same') return;
    onSetLimit(Math.round(value * 100) / 100);
  };

  const usedRatio = currentLimit ? Math.min(1, loss / currentLimit) : 0;
  const pendingStart = pendingLimit ? pendingLimit.activeAt - DAY_MS : 0;
  const pendingRatio = pendingLimit ? Math.min(1, Math.max(0, (now - pendingStart) / DAY_MS)) : 0;
  const remaining = pendingLimit ? pendingLimit.activeAt - now : 0;

  return (
    <section className={`${s.panel} ${className ?? ''}`} aria-labelledby={`${inputId}-h`}>
      <h2 id={`${inputId}-h`} className={s.title}>
        Verlustlimite
      </h2>
      <p className={s.lead}>
        Eine Verlustlimite begrenzt, wie viel du netto verlieren kannst (Einsätze minus Gewinne). In der Schweiz muss dich
        ein Online-Casino schon bei der Kontoeröffnung danach fragen (Art.&nbsp;87 VGS).
      </p>

      <div className={s.status}>
        {currentLimit == null ? (
          <p className={s.none}>
            <strong>Keine Limite gesetzt.</strong> Bisher verloren: <span className={s.num}>{fmtNum(loss)}</span> Credits.
          </p>
        ) : (
          <>
            <p className={s.statusLine}>
              <span>
                Aktiv: <strong className={s.num}>{fmtNum(currentLimit)}</strong> Credits
              </span>
              <span className={s.num}>
                {fmtNum(loss)} / {fmtNum(currentLimit)}
              </span>
            </p>
            <div
              className={s.meter}
              role="meter"
              aria-label="Verbrauchte Verlustlimite"
              aria-valuemin={0}
              aria-valuemax={currentLimit}
              aria-valuenow={Math.min(loss, currentLimit)}
              aria-valuetext={`${fmtNum(loss)} von ${fmtNum(currentLimit)} Credits verloren`}
            >
              <span
                className={`${s.fill} ${usedRatio >= 0.8 ? s.fillHot : ''}`}
                style={{ width: `${usedRatio * 100}%` }}
              />
            </div>
          </>
        )}
      </div>

      {pendingLimit && (
        <div className={s.pending} aria-live="polite">
          <p className={s.pendingHead}>
            <span className={s.badge}>Wartet</span>
            Neue Limite <strong className={s.num}>{fmtNum(pendingLimit.value)}</strong> – aktiv ab{' '}
            <strong>{fmtDateTime(pendingLimit.activeAt)}</strong>
          </p>
          <div className={s.timeline} aria-hidden="true">
            <span className={s.tlFill} style={{ width: `${pendingRatio * 100}%` }} />
            <span className={s.tlStart}>gesetzt</span>
            <span className={s.tlEnd}>aktiv (+24 h)</span>
          </div>
          <p className={s.countdown}>
            noch <span className={s.num}>{remaining > 0 ? fmtDuration(remaining) : '00:00'}</span>
            {remaining > 0 && ' – bis dahin gilt die alte Limite.'}
          </p>
        </div>
      )}

      <form className={s.form} onSubmit={submit}>
        <fieldset className={s.presets}>
          <legend className={s.legend}>Neue Limite wählen</legend>
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              className={`${s.preset} ${value === p ? s.presetOn : ''}`}
              aria-pressed={value === p}
              onClick={() => setDraft(String(p))}
            >
              {p}
            </button>
          ))}
        </fieldset>
        <div className={s.row}>
          <label htmlFor={inputId} className={s.inputLabel}>
            Betrag in Credits
          </label>
          <input
            id={inputId}
            className={s.input}
            inputMode="decimal"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            aria-describedby={ruleId}
            aria-invalid={!valid}
          />
          <button type="submit" className={s.submit} disabled={!valid || rule?.kind === 'same'}>
            Limite setzen
          </button>
        </div>
        <p id={ruleId} className={`${s.rule} ${rule?.kind === 'delay' ? s.ruleDelay : ''}`}>
          {valid ? rule?.text : 'Bitte einen Betrag grösser als 0 eingeben.'}
        </p>
      </form>

      <aside className={s.why}>
        <span className={s.whyMark} aria-hidden="true">
          Warum 24 h?
        </span>
        <p>
          Eine tiefere Limite gilt sofort, eine höhere frühestens nach 24 Stunden. So soll verhindert werden, dass jemand im
          Moment eines Verlusts spontan mehr Geld einsetzt – also genau die Verlustspirale gebremst wird.
        </p>
      </aside>
    </section>
  );
}
