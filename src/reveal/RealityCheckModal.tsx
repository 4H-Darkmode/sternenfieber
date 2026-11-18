import { useId } from 'react';
import { createPortal } from 'react-dom';
import { fmtNum, fmtSigned } from './format';
import { useDialog } from './useDialog';
import s from './RealityCheckModal.module.css';

export interface RealityCheckModalProps {
  open: boolean;
  minutes: number;
  /** net result in credits (negative = loss) */
  net: number;
  onContinue: () => void;
  onStop: () => void;
}

/** Swiss-style reality check: time played + honest balance, «Aufhören» is the big button. */
export default function RealityCheckModal({ open, minutes, net, onContinue, onStop }: RealityCheckModalProps) {
  const ref = useDialog<HTMLDivElement>(open);
  const titleId = useId();
  const descId = useId();
  if (!open) return null;

  const mins = Math.max(0, Math.round(minutes));
  const loss = net < 0;

  return createPortal(
    <div className={s.backdrop}>
      <div
        ref={ref}
        className={s.panel}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
      >
        <p className={s.stamp} aria-hidden="true">
          Realitätscheck
        </p>
        <h2 id={titleId} className={s.title}>
          Du spielst seit <span className={s.big}>{mins}</span> {mins === 1 ? 'Minute' : 'Minuten'}.
        </h2>

        <div id={descId}>
          <dl className={s.ledger}>
            <div>
              <dt>Bilanz</dt>
              <dd className={`${s.num} ${loss ? s.neg : ''}`}>{fmtSigned(net)} Credits</dd>
            </div>
            <div>
              <dt>In Franken</dt>
              <dd className={`${s.num} ${loss ? s.neg : ''}`}>CHF {fmtSigned(net)}</dd>
            </div>
          </dl>
          {loss && (
            <p className={s.note}>
              Das wären <strong>CHF {fmtNum(-net)}</strong> echtes Geld. Weiterspielen holt Verluste nicht zurück – jeder
              Spin ist unabhängig vom letzten.
            </p>
          )}

          <aside className={s.law}>
            <h3 className={s.lawTitle}>Was das Schweizer Recht verlangt</h3>
            <p>
              Schweizer Online-Casinos müssen schon bei der Kontoeröffnung verlangen, dass du Limiten für deine täglichen,
              wöchentlichen oder monatlichen Einsätze oder Verluste festlegst (<abbr title="Verordnung über Geldspiele">Art.&nbsp;87 VGS</abbr>).
              Eine tiefere Limite gilt sofort, eine höhere erst nach 24&nbsp;Stunden. Einsätze, Gewinne und Verluste musst du
              jederzeit im Spielerkonto sehen können.
            </p>
          </aside>
        </div>

        <div className={s.actions}>
          <button type="button" className={s.stop} onClick={onStop} data-autofocus>
            Aufhören
          </button>
          <button type="button" className={s.continue} onClick={onContinue}>
            Weiterspielen
          </button>
        </div>
        <p className={s.hint}>
          Fällt dir etwas auf? Hier ist «Aufhören» der grosse Knopf. Vergleiche das mit dem «Auszahlen» im Spiel.
        </p>
      </div>
    </div>,
    document.body,
  );
}
