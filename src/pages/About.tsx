import ClarityPage from './components/ClarityPage';
import { HELP_LINKS } from './components/SiteFooter';
import { SOURCES, type Source } from '../reveal/content';
import s from './components/Article.module.css';

const GOALS = [
  {
    title: 'Zahlen, Betroffene und Suchtmechanismen',
    text: 'wie viele Personen online spielen, wer am stärksten betroffen ist und welche Mechanismen dahinterstecken.',
  },
  {
    title: 'Rechtliche Grundlagen und Schutzmassnahmen',
    text: 'Geldspielgesetz, ESBK, Spielsperrsystem, Einsatzlimiten – und wie wirksam sie sind.',
  },
  {
    title: 'Demo-Webseite',
    text: 'ein Slot-Machine-Prototyp, der Suchtmechanismen sichtbar macht, ohne echtes Geld.',
    current: true,
  },
  {
    title: 'Interviews und gesellschaftliche Einordnung',
    text: 'mit einer Fachperson und mehreren Lernenden.',
  },
];

function SourceItem({ src }: { src: Source }) {
  return (
    <li>
      {src.full}
      {src.url && (
        <>
          {' '}
          Online:{' '}
          <a href={src.url} target="_blank" rel="noopener noreferrer">
            {src.url}
          </a>
        </>
      )}
    </li>
  );
}

export default function About() {
  return (
    <ClarityPage title="Über das Projekt">
      <header className={s.hero}>
        <p className={s.kicker}>Über das Projekt</p>
        <h1 className={s.h1}>Der Preis des Spiels</h1>
        <p className={s.lead}>
          Diese Webseite gehört zur Vertiefungsarbeit «Online-Glücksspiel – Der Preis des Spiels» im Allgemeinbildenden
          Unterricht (ABU). Online-Glücksspiel ist heutzutage sehr präsent, auch unter Jugendlichen, und wird oft nicht als
          suchterregende Aktivität angesehen. Die Demo zeigt, wie Beinahe-Gewinne, Sound- und Animationseffekte und variable
          Belohnung das Spielverhalten beeinflussen – ohne dass echtes Geld im Spiel ist.
        </p>
      </header>

      <section className={s.section} aria-labelledby="ziele-h">
        <h2 id="ziele-h" className={s.h2}>
          Teilziele
        </h2>
        <ol className={s.lineList}>
          {GOALS.map((g, i) => (
            <li key={g.title} className={g.current ? s.lineThis : undefined}>
              <span className={s.lineNum} aria-hidden="true">
                {i + 1}
              </span>
              <span>
                <strong>{g.title}</strong>
                {g.current && ' (diese Seite)'}: {g.text}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section className={s.section} aria-labelledby="demo-h">
        <h2 id="demo-h" className={s.h2}>
          So funktioniert die Demo
        </h2>
        <ul>
          <li>Gebaut mit React und TypeScript, läuft komplett im Browser.</li>
          <li>Eigene SVG-Grafiken, keine Bilder von echten Casinos.</li>
          <li>Die Sounds werden live mit der Web Audio API erzeugt.</li>
          <li>Simulierte Auszahlungsquote (RTP) von rund 95&nbsp;%: Auf Dauer gewinnt das Haus.</li>
        </ul>
        <p className={s.note}>
          <strong>Wichtig</strong>
          Kein echtes Geld, keine Einzahlung, keine Auszahlung. Credits haben keinen Wert. Die Seite dient rein zu Demonstrations-
          und Aufklärungszwecken.
        </p>
      </section>

      <section className={s.section} aria-labelledby="hilfe-h">
        <h2 id="hilfe-h" className={s.h2}>
          Hilfe &amp; Beratung
        </h2>
        <ul>
          {HELP_LINKS.map((h) => (
            <li key={h.href}>
              <a href={h.href} target="_blank" rel="noopener noreferrer">
                {h.label}
              </a>{' '}
              – {h.text}
            </li>
          ))}
        </ul>
      </section>

      <section className={s.section} aria-labelledby="quellen-h">
        <h2 id="quellen-h" className={s.h2}>
          Quellenverzeichnis
        </h2>
        <ul className={s.sources}>
          {SOURCES.filter((x) => x.group === 'list').map((src) => (
            <SourceItem key={src.id} src={src} />
          ))}
        </ul>
        <h3 className={s.sourceGroup}>Gesetze und weitere Links aus den Fussnoten</h3>
        <ul className={s.sources}>
          {SOURCES.filter((x) => x.group === 'footnote').map((src) => (
            <SourceItem key={src.id} src={src} />
          ))}
        </ul>
      </section>
    </ClarityPage>
  );
}
