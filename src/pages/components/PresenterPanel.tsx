import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useGame } from '../../core/store';
import type { ForceOutcome } from '../../engine';
import styles from './PresenterPanel.module.css';

const OPTIONS: { id: ForceOutcome; label: string; hint: string }[] = [
  { id: 'nearmiss', label: 'Beinahe-Gewinn', hint: '2 Supernovas, die dritte fehlt knapp' },
  { id: 'ldw', label: 'Getarnter Verlust', hint: 'Gewinn kleiner als der Einsatz – wird gefeiert' },
  { id: 'coins', label: 'Münz-Bonus', hint: 'Sternenmünzen + Sammler' },
  { id: 'bigwin', label: 'Big Win', hint: 'Grosser Gewinn mit voller Show' },
  { id: 'freespins', label: 'Freispiele', hint: '3 Supernovas lösen 10 Freispiele aus' },
];

/**
 * Hidden presenter tool: a small, unobtrusive button bottom-left opens an
 * overlay to arm the outcome of the NEXT spin (for live demos / screenshots).
 * Keyboard: "P" toggles the overlay.
 */
export default function PresenterPanel() {
  const [open, setOpen] = useState(false);
  const nextForce = useGame((s) => s.nextForce);
  const setForce = useGame((s) => s.setForce);
  const resetSession = useGame((s) => s.resetSession);
  const canReset = useGame(
    (s) => s.phase === 'idle' && !s.freeSpins && s.limit.current == null && !s.limit.pending,
  );
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
      if (e.key === 'p' || e.key === 'P') setOpen((o) => !o);
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (open) dialogRef.current?.focus();
  }, [open]);

  const pick = (id: ForceOutcome) => {
    setForce(nextForce === id ? null : id);
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        className={`${styles.trigger} ${nextForce ? styles.armed : ''}`}
        onClick={() => setOpen(true)}
        aria-label="Präsentations-Steuerung öffnen"
        title="Präsentation"
      >
        <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
          <circle cx="12" cy="12" r="3" fill="currentColor" />
          <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      </button>

      {open &&
        createPortal(
          <div className={styles.backdrop} onClick={() => setOpen(false)}>
            <div
              ref={dialogRef}
              tabIndex={-1}
              role="dialog"
              aria-modal="true"
              aria-labelledby="presenter-title"
              className={styles.dialog}
              onClick={(e) => e.stopPropagation()}
            >
              <header className={styles.head}>
                <div>
                  <p className={styles.kicker}>Präsentation</p>
                  <h2 id="presenter-title">Nächsten Spin festlegen</h2>
                </div>
                <button type="button" className={styles.close} onClick={() => setOpen(false)} aria-label="Schliessen">
                  ×
                </button>
              </header>
              <p className={styles.note}>
                Der nächste Spin zeigt garantiert dieses Ergebnis. Danach läuft das Spiel wieder normal mit den echten
                Wahrscheinlichkeiten.
              </p>
              <ul className={styles.list}>
                {OPTIONS.map((o) => (
                  <li key={o.id}>
                    <button
                      type="button"
                      className={`${styles.option} ${nextForce === o.id ? styles.on : ''}`}
                      onClick={() => pick(o.id)}
                      aria-pressed={nextForce === o.id}
                    >
                      <span className={styles.label}>{o.label}</span>
                      <span className={styles.hint}>{o.hint}</span>
                    </button>
                  </li>
                ))}
              </ul>
              <footer className={styles.foot}>
                {nextForce ? (
                  <button type="button" className={styles.link} onClick={() => setForce(null)}>
                    Auswahl aufheben
                  </button>
                ) : (
                  <span />
                )}
                <button
                  type="button"
                  className={styles.link}
                  onClick={() => {
                    resetSession();
                    setOpen(false);
                  }}
                  disabled={!canReset}
                  title={canReset ? undefined : 'Nur im Ruhezustand und ohne aktive Limite möglich'}
                >
                  Session zurücksetzen
                </button>
              </footer>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
