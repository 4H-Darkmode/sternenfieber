import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { ACCESS_HASH } from './config';
import s from './AccessGate.module.css';

/**
 * Simple password gate for sharing the demo with a class.
 * NOTE: client-side only – keeps casual visitors out, it is NOT real security.
 * The password itself is not in the bundle, only its SHA-256 hash.
 */
const STORAGE_KEY = 'sternenfieber.access.v1';

async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function readGranted(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === ACCESS_HASH;
  } catch {
    return false;
  }
}

export default function AccessGate({ children }: { children: ReactNode }) {
  const enabled = ACCESS_HASH.length > 0;
  const [granted, setGranted] = useState(() => !enabled || readGranted());
  const [value, setValue] = useState('');
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!granted) document.title = 'Zugang – Der Preis des Spiels';
  }, [granted]);

  if (granted) return <>{children}</>;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const hash = await sha256(value.trim());
    setBusy(false);
    if (hash === ACCESS_HASH) {
      try {
        localStorage.setItem(STORAGE_KEY, hash);
      } catch {
        /* private mode: access for this visit only */
      }
      document.title = 'Sternenfieber – Der Preis des Spiels';
      setGranted(true);
    } else {
      setError(true);
    }
  };

  return (
    <main className={s.page}>
      <form className={s.card} onSubmit={submit}>
        <p className={s.kicker}>ABU-Vertiefungsarbeit</p>
        <h1 className={s.title}>Der Preis des Spiels</h1>
        <p className={s.lead}>
          Demo-Webseite zum Thema Online-Spielsucht. Der Zugang ist für meine Klasse und meine Lehrperson gedacht.
        </p>
        <label className={s.label} htmlFor="access-pw">
          Passwort
        </label>
        <input
          id="access-pw"
          className={`${s.input} ${error ? s.inputError : ''}`}
          type="password"
          autoComplete="current-password"
          autoFocus
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(false);
          }}
          aria-invalid={error}
          aria-describedby={error ? 'access-err' : undefined}
        />
        {error && (
          <p id="access-err" className={s.error} role="alert">
            Das Passwort stimmt nicht.
          </p>
        )}
        <button className={s.button} type="submit" disabled={busy || value.trim().length === 0}>
          Eintreten
        </button>
        <p className={s.note}>Nur Spielgeld. Keine Einzahlung, keine Anmeldung, keine Daten.</p>
      </form>
    </main>
  );
}
