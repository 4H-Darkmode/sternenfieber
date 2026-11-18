import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { fmtNum } from './format';
import { useDialog } from './useDialog';
import s from './CashoutSludge.module.css';

export interface CashoutSludgeProps {
  open: boolean;
  balance: number;
  /** show red clarity annotations explaining each trick */
  reveal: boolean;
  onClose: () => void;
  onKeepPlaying: () => void;
}

type Step = 'identity' | 'processing' | 'offer' | 'submitted';

/** UI spots on the casino card that can carry a numbered marker. */
type Spot = 'dots' | 'kicker' | 'title' | 'text' | 'bonus' | 'timer' | 'action' | 'tiny';

type Tag = 'Sludge' | 'Dark Pattern' | 'Dark Nudge';

interface Annotation {
  spot: Spot;
  tag: Tag;
  title: string;
  text: string;
}

/** Reveal layer: one numbered explanation per visible trick, per step. */
const REVEAL: Record<Step, { summary: string; items: Annotation[]; footnote?: string }> = {
  identity: {
    summary: 'Hier wird das Auszahlen erschwert – Einzahlen ging in Sekunden.',
    items: [
      {
        spot: 'title',
        tag: 'Sludge',
        title: 'Die Hürde kommt erst jetzt',
        text: 'Beim Einzahlen musstest du nichts bestätigen. Die Kontrolle steht genau dort, wo du Geld zurückholen willst.',
      },
      {
        spot: 'action',
        tag: 'Sludge',
        title: 'Künstlich lange Prüfung',
        text: 'Der Upload «prüft» extra lange. Jede Sekunde Warten ist eine Sekunde, in der du es dir anders überlegen kannst.',
      },
      {
        spot: 'dots',
        tag: 'Dark Pattern',
        title: 'Der Weg wirkt lang',
        text: 'Drei Schritte für eine Auszahlung. Für eine Einzahlung reicht ein einziger Klick.',
      },
    ],
  },
  processing: {
    summary: 'Hier wird aus «sofort» plötzlich «3–5 Werktage».',
    items: [
      {
        spot: 'title',
        tag: 'Sludge',
        title: 'Warten mit Absicht',
        text: 'Einzahlungen sind sofort auf dem Konto. Wer sofort einzahlen lässt, könnte auch sofort auszahlen.',
      },
      {
        spot: 'text',
        tag: 'Sludge',
        title: 'Das Geld bleibt sichtbar',
        text: 'Während der Prüfung siehst du dein Guthaben weiter. Ein weiterer Einsatz von 5 Franken scheint ja nicht zu schaden.',
      },
      {
        spot: 'action',
        tag: 'Sludge',
        title: 'Noch eine Pause',
        text: 'Jeder Klick kostet ein paar Sekunden «Berechnung». Einzeln harmlos, zusammen zermürbend.',
      },
    ],
  },
  offer: {
    summary: 'Hier versucht das Casino, dich in letzter Sekunde umzustimmen.',
    items: [
      {
        spot: 'dots',
        tag: 'Dark Pattern',
        title: 'Getarnt als normaler Schritt',
        text: 'Die Punkte bleiben auf Schritt 2. So wirkt die Werbung wie ein Teil der Auszahlung.',
      },
      {
        spot: 'kicker',
        tag: 'Dark Nudge',
        title: '«Exklusiv» für alle',
        text: 'Dieses Angebot sieht jede Person, die auszahlen will. «Exklusiv» soll sich nur besonders anfühlen.',
      },
      {
        spot: 'bonus',
        tag: 'Dark Nudge',
        title: '«Gratis» ist nicht gratis',
        text: 'Die Freispiele gibt es nur, wenn du nicht auszahlst. Bezahlt wird mit deinem Guthaben, das im Spiel bleibt.',
      },
      {
        spot: 'timer',
        tag: 'Dark Pattern',
        title: 'Falscher Zeitdruck',
        text: 'Der Countdown springt immer wieder auf 59. Zeitdruck soll dich vom Nachdenken abhalten.',
      },
      {
        spot: 'action',
        tag: 'Dark Pattern',
        title: 'Gold gegen Grau',
        text: 'Was dem Casino nützt, ist riesig, golden und pulsiert. Was du eigentlich wolltest, ist ein kleiner grauer Link darunter.',
      },
    ],
  },
  submitted: {
    summary: 'Der Antrag ist gestellt – aber das Geld ist noch lange nicht weg.',
    items: [
      {
        spot: 'title',
        tag: 'Sludge',
        title: 'Eingereicht ist nicht ausbezahlt',
        text: 'Unterwegs ist nur der Antrag. Das Geld liegt weiter beim Casino.',
      },
      {
        spot: 'text',
        tag: 'Sludge',
        title: '«Ausstehend» hält das Geld in Reichweite',
        text: 'Solange der Antrag offen ist, bleibt das Guthaben im Spielerkonto sichtbar – und lässt sich in der Wartezeit leicht wieder verspielen.',
      },
      {
        spot: 'action',
        tag: 'Dark Nudge',
        title: 'Der Ausgang führt zum Automaten',
        text: 'Der Hauptknopf schickt dich direkt zurück ins Spiel, nicht zu deinem Konto.',
      },
    ],
    footnote: 'In dieser Demo wird nichts ausbezahlt – alles ist Spielgeld ohne Wert.',
  },
};

/** progress dot index: the offer pretends to be part of step 2 */
const DOT: Record<Step, number> = { identity: 0, processing: 1, offer: 1, submitted: 2 };

/**
 * A slick but subtly annoying withdrawal flow (Sludge). Casino-styled.
 * One thing per step. Nothing is collected – no fields, nothing is sent.
 * In reveal mode, numbered red markers sit on each trick, with a legend.
 */
export default function CashoutSludge({ open, balance, reveal, onClose, onKeepPlaying }: CashoutSludgeProps) {
  const [step, setStep] = useState<Step>('identity');
  const [busy, setBusy] = useState(false);
  const [offerLeft, setOfferLeft] = useState(59);
  const [hot, setHot] = useState<number | null>(null);
  const ref = useDialog<HTMLDivElement>(open, onClose);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstStep = useRef(true);
  const titleId = useId();
  const textId = useId();
  const legendId = useId();

  // reset whenever the flow is (re)opened
  useEffect(() => {
    if (!open) return;
    setStep('identity');
    setBusy(false);
    setOfferLeft(59);
    firstStep.current = true;
  }, [open]);

  // move focus to the new step's heading
  useEffect(() => {
    setHot(null);
    if (!open) return;
    if (firstStep.current) {
      firstStep.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [step, open]);

  // every "next" takes a little longer than it should
  const timer = useRef<number | undefined>(undefined);
  const advance = (next: Step, ms: number) => {
    if (busy) return;
    setBusy(true);
    timer.current = window.setTimeout(() => {
      setBusy(false);
      setStep(next);
    }, ms);
  };
  useEffect(() => {
    if (!open) window.clearTimeout(timer.current);
    return () => window.clearTimeout(timer.current);
  }, [open]);

  // fake urgency countdown on the offer
  useEffect(() => {
    if (step !== 'offer') return;
    const t = window.setInterval(() => setOfferLeft((v) => (v > 1 ? v - 1 : 59)), 1000);
    return () => window.clearInterval(t);
  }, [step]);

  if (!open) return null;

  const amount = `${fmtNum(balance)} Credits`;
  const isOffer = step === 'offer';
  const layer = REVEAL[step];

  /** Wraps a UI spot with its numbered marker (reveal only; no-op otherwise). */
  const mark = (spot: Spot, children: ReactNode, block = false) => {
    // the grey «trotzdem» link shares its number with the gold button
    const key: Spot = spot === 'tiny' ? 'action' : spot;
    const idx = reveal ? layer.items.findIndex((a) => a.spot === key) : -1;
    if (idx < 0) return <>{children}</>;
    const n = idx + 1;
    return (
      <span
        className={`${s.mk} ${block ? s.mkBlock : ''} ${hot === n ? s.mkHot : ''}`}
        onMouseEnter={() => setHot(n)}
        onMouseLeave={() => setHot(null)}
      >
        {children}
        <span className={s.pin} aria-hidden="true">
          {n}
        </span>
      </span>
    );
  };

  let title = '';
  let text: ReactNode = null;
  let action: ReactNode = null;
  switch (step) {
    case 'identity':
      title = 'Identität bestätigen';
      text = `Lade deinen Ausweis hoch, um ${amount} auszuzahlen.`;
      action = (
        <button type="button" className={s.primary} onClick={() => advance('processing', 2400)} aria-disabled={busy}>
          {busy ? <Spinner label="Ausweis wird geprüft" /> : 'Ausweis hochladen'}
        </button>
      );
      break;
    case 'processing':
      title = 'Bearbeitung: 3–5 Werktage';
      text = `Wir prüfen deine Auszahlung von ${amount}.`;
      action = (
        <button type="button" className={s.primary} onClick={() => advance('offer', 1400)} aria-disabled={busy}>
          {busy ? <Spinner label="Wird berechnet" /> : 'Auszahlung beantragen'}
        </button>
      );
      break;
    case 'offer':
      title = 'Warte!';
      text = (
        <>
          {mark('bonus', 'Spiel weiter und erhalte 50 Freispiele.')}{' '}
          {mark('timer', `Nur noch 00:${String(offerLeft).padStart(2, '0')}.`)}
        </>
      );
      action = (
        <button type="button" className={s.mega} onClick={onKeepPlaying}>
          50 Freispiele holen
        </button>
      );
      break;
    case 'submitted':
      title = 'Antrag eingereicht';
      text = 'Status: Bearbeitung ausstehend.';
      action = (
        <button type="button" className={s.primary} onClick={onClose}>
          Zurück zum Spiel
        </button>
      );
      break;
  }

  return createPortal(
    <div className={s.backdrop}>
      <div
        ref={ref}
        className={`${s.stage} ${reveal ? s.withNote : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={textId}
      >
        <div className={`${s.card} ${isOffer ? s.cardOffer : ''} ${reveal ? s.revealing : ''}`}>
          <header className={s.top}>
            <span className={s.brand}>Auszahlen</span>
            <span className={s.demo}>Demo</span>
            <button type="button" className={s.close} onClick={onClose} aria-label="Auszahlung schliessen">
              <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </header>

          <div className={s.dotsRow}>
            {mark(
              'dots',
              <ol className={s.dots} aria-label={`Schritt ${DOT[step] + 1} von 3`}>
                {[0, 1, 2].map((i) => (
                  <li key={i} className={`${s.dot} ${i < DOT[step] ? s.dotDone : ''} ${i === DOT[step] ? s.dotNow : ''}`} />
                ))}
              </ol>,
            )}
          </div>

          <div key={step} className={s.body}>
            {isOffer && (
              <p className={s.offerKicker}>
                {mark('kicker', <span aria-hidden="true">Exklusiv für dich</span>)}
              </p>
            )}
            <h2 id={titleId} ref={headingRef} tabIndex={-1} className={isOffer ? s.offerH : s.h}>
              {mark('title', title)}
            </h2>
            <p id={textId} className={s.text}>
              {mark('text', text)}
            </p>
            <div className={s.action}>
              {mark('action', action, true)}
            </div>
            {isOffer && (
              <div className={s.tinyRow}>
                {mark(
                  'tiny',
                  <button type="button" className={s.tiny} onClick={() => setStep('submitted')}>
                    Trotzdem auszahlen
                  </button>,
                )}
              </div>
            )}
          </div>
        </div>

        {reveal && (
          <aside key={step} className={s.legend} aria-labelledby={legendId}>
            <p className={s.legendKicker}>Entlarvt</p>
            <h3 id={legendId} className={s.legendSummary}>
              {layer.summary}
            </h3>
            <ol className={s.legendList}>
              {layer.items.map((a, i) => {
                const n = i + 1;
                return (
                  <li
                    key={a.spot}
                    className={`${s.item} ${hot === n ? s.itemHot : ''}`}
                    tabIndex={0}
                    onMouseEnter={() => setHot(n)}
                    onMouseLeave={() => setHot(null)}
                    onFocus={() => setHot(n)}
                    onBlur={() => setHot(null)}
                  >
                    <span className={s.num} aria-hidden="true">
                      {n}
                    </span>
                    <div className={s.itemBody}>
                      <span className={s.tag}>{a.tag}</span>
                      <p className={s.itemTitle}>
                        <span className={s.srOnly}>Markierung {n}: </span>
                        {a.title}
                      </p>
                      <p className={s.itemText}>{a.text}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
            <p className={s.legendSrc}>
              {layer.footnote && <>{layer.footnote} </>}
              Begriffe nach Newall (2025): Sludge, Dark Patterns, Dark Nudges.
            </p>
          </aside>
        )}
      </div>
    </div>,
    document.body,
  );
}

function Spinner({ label }: { label: string }) {
  return (
    <span className={s.busy} role="status">
      <span className={s.spin} aria-hidden="true" />
      {label} …
    </span>
  );
}
