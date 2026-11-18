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
const STEPS: Step[] = ['identity', 'processing', 'offer', 'submitted'];

/** Red-pen annotation pinned to the casino UI (reveal mode only). */
function Annot({ tag, children, source = 'Newall, 2025' }: { tag: string; children: ReactNode; source?: string }) {
  return (
    <aside className={s.annot}>
      <span className={s.annotTag}>{tag}</span>
      <p className={s.annotText}>
        {children}
        {source && <span className={s.annotSrc}> ({source})</span>}
      </p>
    </aside>
  );
}

/**
 * A deliberately annoying withdrawal flow (Sludge). Casino-styled.
 * Nothing is collected: fields are read-only demo values, nothing is sent.
 */
export default function CashoutSludge({ open, balance, reveal, onClose, onKeepPlaying }: CashoutSludgeProps) {
  const [step, setStep] = useState<Step>('identity');
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [offerLeft, setOfferLeft] = useState(59);
  const ref = useDialog<HTMLDivElement>(open, onClose);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstStep = useRef(true);
  const titleId = useId();
  const termsId = useId();

  // reset whenever the flow is (re)opened
  useEffect(() => {
    if (!open) return;
    setStep('identity');
    setUploading(false);
    setUploaded(false);
    setAccepted(false);
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

  // fake upload check
  useEffect(() => {
    if (!uploading) return;
    const t = window.setTimeout(() => {
      setUploading(false);
      setUploaded(true);
    }, 2200);
    return () => window.clearTimeout(t);
  }, [uploading]);

  // fake urgency countdown on the offer
  useEffect(() => {
    if (step !== 'offer') return;
    const t = window.setInterval(() => setOfferLeft((v) => (v > 1 ? v - 1 : 59)), 1000);
    return () => window.clearInterval(t);
  }, [step]);

  if (!open) return null;
  const stepIndex = STEPS.indexOf(step);

  return createPortal(
    <div className={s.backdrop}>
      <div
        ref={ref}
        className={`${s.panel} ${reveal ? s.revealing : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className={s.top}>
          <span className={s.brand}>Sternenfieber · Kasse</span>
          <span className={s.demo}>Demo – keine echten Daten</span>
          <button type="button" className={s.close} onClick={onClose} aria-label="Auszahlung schliessen">
            <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        {step !== 'offer' && (
          <ol className={s.progress} aria-label="Fortschritt">
            {['Identität', 'Bearbeitung', 'Eingereicht'].map((label, i) => {
              const idx = i === 2 ? 3 : i;
              const done = stepIndex > idx;
              const current = stepIndex === idx;
              return (
                <li key={label} className={`${s.pStep} ${done ? s.pDone : ''} ${current ? s.pCurrent : ''}`} aria-current={current ? 'step' : undefined}>
                  <span className={s.pDot} aria-hidden="true">
                    {i + 1}
                  </span>
                  {label}
                </li>
              );
            })}
          </ol>
        )}

        {step === 'identity' && (
          <section className={s.step}>
            <h2 id={titleId} ref={headingRef} tabIndex={-1} className={s.h}>
              Identität bestätigen
            </h2>
            <p className={s.p}>
              Verfügbar: <strong className={s.gold}>{fmtNum(balance)} Credits</strong>. Bevor wir deine Auszahlung bearbeiten
              können, musst du deine Identität bestätigen.
            </p>
            {reveal && (
              <Annot tag="Sludge">
                Einzahlen ging mit einem Klick. Erst beim Auszahlen kommen Formulare, Upload und Bedingungen. Hürden, die eine
                hilfreiche Handlung erschweren, heissen Sludge.
              </Annot>
            )}

            <div className={s.fields}>
              <p className={s.demoNote}>Vorausgefüllte Demo-Werte. Bitte keine echten Daten – hier wird nichts gespeichert oder gesendet.</p>
              {[
                ['Vorname', 'Max'],
                ['Nachname', 'Muster'],
                ['Geburtsdatum', '01.01.2000'],
                ['IBAN', 'CH00 0000 0000 0000 0000 0'],
              ].map(([label, val]) => (
                <label key={label} className={s.field}>
                  <span>{label}</span>
                  <input value={val} readOnly aria-readonly="true" tabIndex={-1} />
                </label>
              ))}
            </div>

            <div className={s.upload}>
              <button
                type="button"
                className={s.uploadBtn}
                onClick={() => setUploading(true)}
                disabled={uploading || uploaded}
              >
                {uploaded ? 'Ausweis geprüft' : uploading ? 'Wird geprüft …' : 'Ausweis hochladen (Vorder- & Rückseite)'}
              </button>
              <span className={s.uploadHint} aria-live="polite">
                {uploading ? 'Prüfung läuft – bitte warten.' : uploaded ? 'Demo: Es wurde nichts hochgeladen.' : 'Pflichtfeld'}
              </span>
            </div>

            <label className={s.check}>
              <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} aria-describedby={termsId} />
              <span>Ich akzeptiere die Auszahlungsbedingungen.</span>
            </label>
            <p id={termsId} className={s.fine}>
              Auszahlungen werden nur an Werktagen bearbeitet. Gewinne aus Bonusangeboten und Freispielen sind erst nach Erfüllung
              der Umsatzbedingungen auszahlbar. Die Kasse kann zusätzliche Dokumente verlangen. Offene Auszahlungen können bis zur
              Bearbeitung storniert werden.
            </p>
            {reveal && (
              <Annot tag="Sludge">
                Das Kleingedruckte: Wer ein Angebot angenommen hat, muss oft zuerst Bedingungen erfüllen, bevor ausbezahlt wird.
              </Annot>
            )}

            <div className={s.actions}>
              <button type="button" className={s.primary} disabled={!uploaded || !accepted} onClick={() => setStep('processing')}>
                Weiter
              </button>
            </div>
          </section>
        )}

        {step === 'processing' && (
          <section className={s.step}>
            <h2 id={titleId} ref={headingRef} tabIndex={-1} className={s.h}>
              Bearbeitung: 3–5 Werktage
            </h2>
            <div className={s.compare}>
              <div className={s.cmpFast}>
                <span className={s.cmpLabel}>Einzahlung</span>
                <span className={s.cmpVal}>sofort</span>
              </div>
              <div className={s.cmpSlow}>
                <span className={s.cmpLabel}>Auszahlung</span>
                <span className={s.cmpVal}>3–5 Werktage</span>
              </div>
            </div>
            <p className={s.p}>
              Auszahlungsbetrag: <strong className={s.gold}>{fmtNum(balance)} Credits</strong>. Während der Bearbeitung bleibt dein
              Guthaben im Spielerkonto sichtbar.
            </p>
            {reveal && (
              <Annot tag="Sludge">
                Wer sofortige Einzahlungen anbieten kann, könnte auch sofort auszahlen. Die Wartezeit ist eingebaut: Du siehst das Geld
                weiter auf dem Spielkonto und denkst dir, ein weiterer Einsatz von 5 Franken schadet ja nicht.
              </Annot>
            )}
            <div className={s.actions}>
              <button type="button" className={s.secondary} onClick={() => setStep('identity')}>
                Zurück
              </button>
              <button type="button" className={s.primary} onClick={() => setStep('offer')}>
                Auszahlung beantragen
              </button>
            </div>
          </section>
        )}

        {step === 'offer' && (
          <section className={`${s.step} ${s.offer}`}>
            <p className={s.offerKicker} aria-hidden="true">
              Exklusiv für dich
            </p>
            <h2 id={titleId} ref={headingRef} tabIndex={-1} className={s.offerH}>
              Warte!
            </h2>
            <p className={s.offerText}>
              Spiel weiter und erhalte <span className={s.offerBig}>50 Freispiele</span>
            </p>
            <p className={s.timer}>
              Angebot läuft ab in <span className={s.mono}>00:{String(offerLeft).padStart(2, '0')}</span>
            </p>
            <button type="button" className={s.mega} onClick={onKeepPlaying}>
              Freispiele holen
            </button>
            {reveal && (
              <Annot tag="Dark Pattern">
                Die für das Casino profitable Option ist riesig, golden und blinkt. Die Option, die du eigentlich wolltest, ist klein und
                grau. Das Design lenkt dich gezielt in eine Richtung. Der Countdown startet übrigens immer wieder bei 59.
              </Annot>
            )}
            <button type="button" className={s.tiny} onClick={() => setStep('submitted')}>
              Trotzdem auszahlen
            </button>
          </section>
        )}

        {step === 'submitted' && (
          <section className={s.step}>
            <h2 id={titleId} ref={headingRef} tabIndex={-1} className={s.h}>
              Antrag eingereicht – Bearbeitung ausstehend
            </h2>
            <ul className={s.status}>
              <li className={s.stDone}>Antrag eingereicht</li>
              <li className={s.stWait}>Prüfung durch die Kasse – ausstehend</li>
              <li className={s.stWait}>Überweisung – in 3–5 Werktagen</li>
            </ul>
            <p className={s.p}>
              Dein Guthaben von <strong className={s.gold}>{fmtNum(balance)} Credits</strong> bleibt bis zur Bearbeitung reserviert. Du
              kannst die Auszahlung jederzeit stornieren und sofort weiterspielen.
            </p>
            {reveal && (
              <Annot tag="Sludge">
                «Ausstehend» heisst: Das Geld bleibt in Reichweite. Ein Klick auf «Stornieren» und es ist wieder Spielgeld. In dieser
                Demo wird übrigens nichts ausbezahlt – es ist alles Spielgeld ohne Wert.
              </Annot>
            )}
            <div className={s.actions}>
              <button type="button" className={s.secondary} onClick={onClose}>
                Schliessen
              </button>
              <button type="button" className={s.goldBtn} onClick={onKeepPlaying}>
                Stornieren &amp; weiterspielen
              </button>
            </div>
          </section>
        )}
      </div>
    </div>,
    document.body,
  );
}
