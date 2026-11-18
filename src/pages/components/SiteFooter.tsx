import { Link } from 'react-router-dom';
import s from './SiteFooter.module.css';

export interface SiteFooterProps {
  variant?: 'casino' | 'clarity';
  className?: string;
}

export const HELP_LINKS = [
  {
    href: 'https://www.suchtschweiz.ch',
    label: 'Sucht Schweiz',
    text: 'Informationen und Beratung zu Glücksspiel und Sucht.',
  },
  {
    href: 'https://www.sos-spielsucht.ch',
    label: 'SOS Spielsucht',
    text: 'Hilfe für Betroffene und Angehörige.',
  },
];

export default function SiteFooter({ variant = 'clarity', className }: SiteFooterProps) {
  return (
    <footer className={`${s.footer} ${s[variant]} ${className ?? ''}`}>
      <div className={s.inner}>
        <section className={s.disclaimer} aria-labelledby="footer-hinweis">
          <h2 id="footer-hinweis" className={s.h}>
            Hinweis
          </h2>
          <p>
            «Sternenfieber» ist ein <strong>Aufklärungsprojekt</strong> im Rahmen einer ABU-Vertiefungsarbeit. Es wird{' '}
            <strong>kein echtes Geld</strong> eingesetzt, eine Einzahlung ist nicht möglich, Credits haben keinen Wert und können
            nicht ausbezahlt werden. Ziel ist es zu zeigen, wie Online-Glücksspiel Spielende manipuliert.
          </p>
        </section>

        <section className={s.help} aria-labelledby="footer-hilfe">
          <h2 id="footer-hilfe" className={s.h}>
            Hilfe &amp; Beratung
          </h2>
          <p className={s.helpLead}>Du oder jemand in deinem Umfeld spielt zu viel? Hol dir Unterstützung – kostenlos und vertraulich.</p>
          <ul className={s.helpList}>
            {HELP_LINKS.map((h) => (
              <li key={h.href}>
                <a href={h.href} target="_blank" rel="noopener noreferrer" className={s.helpLink}>
                  {h.label}
                  <span className={s.ext} aria-hidden="true">
                    ↗
                  </span>
                  <span className={s.srOnly}> (öffnet in neuem Tab)</span>
                </a>
                <span className={s.helpText}>{h.text}</span>
              </li>
            ))}
          </ul>
        </section>

        <nav className={s.nav} aria-label="Fusszeile">
          <Link to="/">Start</Link>
          <Link to="/spielen">Spielen</Link>
          <Link to="/hintergrund">Hintergrund</Link>
          <Link to="/ueber">Über &amp; Quellen</Link>
        </nav>
      </div>
    </footer>
  );
}
