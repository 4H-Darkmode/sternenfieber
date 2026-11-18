import { useEffect, type ReactNode } from 'react';
import SiteFooter from './SiteFooter';
import SiteNav from './SiteNav';
import s from './Article.module.css';

/** Paper-world page frame: clarity nav, main#inhalt, footer. */
export default function ClarityPage({ title, children }: { title: string; children: ReactNode }) {
  useEffect(() => {
    document.title = `${title} – Der Preis des Spiels`;
    window.scrollTo(0, 0);
  }, [title]);

  return (
    <div className={s.page}>
      <SiteNav variant="clarity" />
      <main id="inhalt" tabIndex={-1} className={s.main}>
        {children}
      </main>
      <SiteFooter variant="clarity" />
    </div>
  );
}

/** Scroll to a section without touching the URL hash (HashRouter). */
export function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  const heading = el.querySelector<HTMLElement>('h2');
  if (heading) {
    heading.setAttribute('tabindex', '-1');
    heading.focus({ preventScroll: true });
  }
}
