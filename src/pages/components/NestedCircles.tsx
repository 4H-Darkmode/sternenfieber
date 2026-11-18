import { useId } from 'react';
import s from './NestedCircles.module.css';

/**
 * Newall's taxonomy as three nested circles:
 * Sludge ⊂ Dark Patterns ⊂ Dark Nudges.
 */
export default function NestedCircles() {
  const titleId = useId();
  const descId = useId();
  const cx = 200;
  return (
    <figure className={s.figure}>
      <div className={s.layout}>
        <svg viewBox="0 0 400 400" className={s.svg} role="img" aria-labelledby={titleId} aria-describedby={descId}>
          <title id={titleId}>Drei Begriffe als Schichten: Sludge liegt in Dark Patterns, beides liegt in Dark Nudges.</title>
          <desc id={descId}>
            Äusserer Kreis: Dark Nudges, Beispiel Glücksspiel als harmloser Spass für die Freizeit. Mittlerer Kreis: Dark Patterns,
            Beispiel hohe vorgeschlagene Beträge. Innerer Kreis: Sludge, Beispiel Auszahlung dauert mehrere Arbeitstage.
          </desc>

          <circle cx={cx} cy={200} r={192} className={s.outer} />
          <circle cx={cx} cy={238} r={140} className={s.middle} />
          <circle cx={cx} cy={276} r={82} className={s.inner} />

          {/* labels */}
          <text x={cx} y={40} className={s.label}>
            DARK NUDGES
          </text>
          <text x={cx} y={60} className={s.example}>
            Glücksspiel als «harmloser Spass»
          </text>

          <text x={cx} y={128} className={s.label}>
            DARK PATTERNS
          </text>
          <text x={cx} y={157} className={s.example}>
            hoher Vorschlagsbetrag
          </text>

          <text x={cx} y={262} className={`${s.label} ${s.labelRed}`}>
            SLUDGE
          </text>
          <text x={cx} y={284} className={s.example}>
            Auszahlung dauert
          </text>
          <text x={cx} y={302} className={s.example}>
            Arbeitstage
          </text>

          {/* red-pen circle around the default effect: it is BOTH pattern and nudge */}
          <ellipse cx={cx} cy={152} rx={92} ry={15} className={s.pen} />
        </svg>

        <figcaption className={s.legend}>
          <dl>
            <div className={s.item}>
              <dt>
                <span className={`${s.dot} ${s.dotInner}`} aria-hidden="true" />
                Sludge – die engste Schicht
              </dt>
              <dd>Schädliche Hürden, die hilfreiche Handlungen erschweren – z. B. Auszahlungen, die mehrere Arbeitstage dauern.</dd>
            </div>
            <div className={s.item}>
              <dt>
                <span className={`${s.dot} ${s.dotMiddle}`} aria-hidden="true" />
                Dark Patterns – umfassen Sludge
              </dt>
              <dd>Täuschendes Interface-Design, das gezielt in eine Richtung lenkt – z. B. hohe vorgeschlagene Einsatzbeträge.</dd>
            </div>
            <div className={s.item}>
              <dt>
                <span className={`${s.dot} ${s.dotOuter}`} aria-hidden="true" />
                Dark Nudges – umfassen beides
              </dt>
              <dd>Alle Formen von täuschendem Design, die typische Denkfehler ausnutzen – z. B. Glücksspiel als harmloser Spass.</dd>
            </div>
          </dl>
          <p className={s.penNote}>
            <span className={s.penMark} aria-hidden="true" />
            Derselbe hohe Vorschlagsbetrag ist gleichzeitig ein Dark Pattern und ein Dark Nudge (Default-Effekt).
          </p>
          <p className={s.source}>Quelle: Newall (2025), Addiction 120(10), 1916–1923</p>
        </figcaption>
      </div>
    </figure>
  );
}
