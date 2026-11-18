import type { MouseEvent } from 'react';
import { NavLink } from 'react-router-dom';
import s from './SiteNav.module.css';

export interface SiteNavProps {
  /** casino = dark neon (Home / Spielen), clarity = paper (Hintergrund / Über) */
  variant?: 'casino' | 'clarity';
  className?: string;
}

const LINKS = [
  { to: '/', label: 'Start', end: true },
  { to: '/spielen', label: 'Spielen', end: false },
  { to: '/hintergrund', label: 'Hintergrund', end: false },
  { to: '/ueber', label: 'Über', end: false },
];

/** Focus the page's main content (HashRouter: no #anchors). */
function skipToContent(e: MouseEvent) {
  e.preventDefault();
  const main = document.getElementById('inhalt') ?? document.querySelector('main');
  if (main instanceof HTMLElement) {
    if (!main.hasAttribute('tabindex')) main.setAttribute('tabindex', '-1');
    main.focus();
  }
}

export default function SiteNav({ variant = 'clarity', className }: SiteNavProps) {
  return (
    <header className={`${s.bar} ${s[variant]} ${className ?? ''}`}>
      <a href="#inhalt" className={s.skip} onClick={skipToContent}>
        Zum Inhalt springen
      </a>
      <div className={s.inner}>
        <NavLink to="/" className={s.brand} aria-label="Der Preis des Spiels – Startseite">
          <span className={s.brandMark} aria-hidden="true">
            <svg viewBox="0 0 24 24" width="22" height="22">
              <path
                d="M12 2l2.6 6.2 6.7.6-5.1 4.4 1.6 6.6L12 16.3 6.2 19.8l1.6-6.6L2.7 8.8l6.7-.6z"
                fill="currentColor"
              />
              <path d="M3 21L21 3" stroke="var(--strike)" strokeWidth="2.6" strokeLinecap="round" />
            </svg>
          </span>
          <span className={s.brandText}>
            Der Preis des Spiels
            <small>Sternenfieber-Demo</small>
          </span>
        </NavLink>
        <nav aria-label="Hauptnavigation" className={s.navEl}>
          <ul className={s.links}>
            {LINKS.map((l) => (
              <li key={l.to}>
                <NavLink to={l.to} end={l.end} className={({ isActive }) => `${s.link} ${isActive ? s.active : ''}`}>
                  {l.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
