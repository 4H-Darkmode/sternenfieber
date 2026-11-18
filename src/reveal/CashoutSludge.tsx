import { useEffect, useId, useRef, useState, type ReactElement } from 'react';
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

/** One short red note per step (reveal mode). */
const NOTES: Record<Step, { tag: string; title: string; text: string }> = {
  identity: {
    tag: 'Sludge',
    title: 'Die Hürde kommt erst jetzt',
    text: 'Einzahlen ging mit einem Klick. Erst beim Auszahlen musst du dich ausweisen und warten.',
  },
  processing: {
    tag: 'Sludge',
    title: 'Warten mit Absicht',
    text: 'Wer sofort einzahlen lässt, könnte auch sofort auszahlen. Die Wartezeit lässt dich das Geld weiter sehen – und weiterspielen.',
  },
  offer: {
    tag: 'Dark Pattern',
    title: 'Gold gegen Grau',
    text: 'Die Option, die dem Casino nützt, ist riesig und golden. Deine Wahl ist klein und grau. Der Countdown startet immer neu.',
  },
  submitted: {
    tag: 'Sludge',
    title: '«Ausstehend» heisst: noch nicht weg',
    text: 'Solange der Antrag offen ist, bleibt das Geld einen Klick vom Weiterspielen entfernt. In dieser Demo wird nichts ausbezahlt.',
  },
};

/** progress dot index: the offer pretends to be part of step 2 */
const DOT: Record<Step, number> = { identity: 0, processing: 1, offer: 1, submitted: 2 };

/**
 * A slick but subtly annoying withdrawal flow (Sludge). Casino-styled.
 * One thing per step. Nothing is collected – no fields, nothing is sent.
 */
export default function CashoutSludge({ open, balance, reveal, onClose, onKeepPlaying }: CashoutSludgeProps) {
  const [step, setStep] = useState<Step>('identity');
  const [busy, setBusy] = useState(false);
  const [offerLeft, setOfferLeft] = useState(59);
  const ref = useDialog<HTMLDivElement>(open, onClose);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstStep = useRef(true);
  const titleId = useId();
  const textId = useId();

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
  const note = NOTES[step];
  const isOffer = step === 'offer';

  let body: { title: string; text: string; action: ReactElement };
  switch (step) {
    case 'identity':
      body = {
        title: 'Identität bestätigen',
        text: `Lade deinen Ausweis hoch, um ${amount} auszuzahlen.`,
        action: (
          <button type="button" className={s.primary} onClick={() => advance('processing', 2400)} aria-disabled={busy}>
            {busy ? <Spinner label="Ausweis wird geprüft" /> : 'Ausweis hochladen'}
          </button>
        ),
      };
      break;
    case 'processing':
      body = {
        title: 'Bearbeitung: 3–5 Werktage',
        text: `Wir prüfen deine Auszahlung von ${amount}.`,
        action: (
          <button type="button" className={s.primary} onClick={() => advance('offer', 1400)} aria-disabled={busy}>
            {busy ? <Spinner label="Wird berechnet" /> : 'Auszahlung beantragen'}
          </button>
        ),
      };
      break;
    case 'offer':
      body = {
        title: 'Warte!',
        text: `Spiel weiter und erhalte 50 Freispiele. Nur noch 00:${String(offerLeft).padStart(2, '0')}.`,
        action: (
          <button type="button" className={s.mega} onClick={onKeepPlaying}>
            50 Freispiele holen
          </button>
        ),
      };
      break;
    case 'submitted':
      body = {
        title: 'Antrag eingereicht',
        text: 'Status: Bearbeitung ausstehend.',
        action: (
          <button type="button" className={s.primary} onClick={onClose}>
            Zurück zum Spiel
          </button>
        ),
      };
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

          <ol className={s.dots} aria-label={`Schritt ${DOT[step] + 1} von 3`}>
            {[0, 1, 2].map((i) => (
              <li key={i} className={`${s.dot} ${i < DOT[step] ? s.dotDone : ''} ${i === DOT[step] ? s.dotNow : ''}`} />
            ))}
          </ol>

          <div key={step} className={s.body}>
            {isOffer && (
              <p className={s.offerKicker} aria-hidden="true">
                Exklusiv für dich
              </p>
            )}
            <h2 id={titleId} ref={headingRef} tabIndex={-1} className={isOffer ? s.offerH : s.h}>
              {body.title}
            </h2>
            <p id={textId} className={s.text}>
              {body.text}
            </p>
            <div className={s.action}>{body.action}</div>
            {isOffer && (
              <button type="button" className={s.tiny} onClick={() => setStep('submitted')}>
                Trotzdem auszahlen
              </button>
            )}
          </div>
        </div>

        {reveal && (
          <aside key={step} className={s.note} aria-label="Entlarvt">
            <span className={s.noteTag}>{note.tag}</span>
            <p className={s.noteTitle}>{note.title}</p>
            <p className={s.noteText}>
              {note.text} <span className={s.noteSrc}>(Newall, 2025)</span>
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
