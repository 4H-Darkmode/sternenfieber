import { Link } from 'react-router-dom';
import ClarityPage from './components/ClarityPage';
import { HELP_LINKS } from './components/SiteFooter';
import { SOURCES } from '../reveal/content';
import s from './components/Article.module.css';

export default function About() {
  return (
    <ClarityPage title="Über das Projekt">
      <header className={s.hero}>
        <p className={s.kicker}>Über das Projekt</p>
        <h1 className={s.h1}>Der Preis des Spiels</h1>
        <p className={s.lead}>
          Diese Webseite ist Teil einer Vertiefungsarbeit (VA) im Allgemeinbildenden Unterricht (ABU) der Berufsschule. Thema:
          Online-Spielsucht zwischen Nervenkitzel und Regulierung.
        </p>
      </header>

      <section className={s.section} aria-labelledby="projekt-h">
        <span className={s.sectionNum}>01</span>
        <h2 id="projekt-h" className={s.h2}>
          Worum es geht
        </h2>
        <p>
          Online-Glücksspiel ist heute sehr präsent – auch unter Jugendlichen – und wird oft nicht als Sucht-Risiko
          wahrgenommen. Die Arbeit untersucht, wie verbreitet Online-Glücksspiel in der Schweiz ist, wer am stärksten betroffen
          ist, mit welchen psychologischen Tricks Online-Casinos arbeiten und wie gut die Schutzmassnahmen wirken.
        </p>
        <p>Die Arbeit ist in vier Teilziele gegliedert:</p>
        <ol className={s.goals}>
          <li>
            <strong>Zahlen, Betroffene und Suchtmechanismen</strong>
            Wie viele Personen spielen online, wer ist am stärksten betroffen, und welche Mechanismen stecken dahinter
            (Verlustspirale, Beinahe-Gewinne, variable Belohnung)?
          </li>
          <li>
            <strong>Rechtliche Grundlagen und Schutzmassnahmen</strong>
            Geldspielgesetz, ESBK, Spielsperrsystem und Einsatzlimiten – und wie wirksam sie in der Praxis sind.
          </li>
          <li className={s.goalThis}>
            <strong>Demo-Webseite (diese Seite)</strong>
            Ein Slot-Machine-Prototyp, der Beinahe-Gewinne, Sound- und Animationseffekte und variable Belohnung sichtbar macht –
            ohne echtes Geld.
          </li>
          <li>
            <strong>Interviews und gesellschaftliche Einordnung</strong>
            Gespräche mit einer Fachperson und mit Lernenden über ihren Umgang mit Online-Glücksspiel.
          </li>
        </ol>
        <p>
          Die Zahlen und Fakten zu Markt, Risikogruppen und Recht findest du unter <Link to="/hintergrund">Hintergrund</Link>.
        </p>
      </section>

      <section className={s.section} aria-labelledby="demo-h">
        <span className={s.sectionNum}>02</span>
        <h2 id="demo-h" className={s.h2}>
          So funktioniert die Demo
        </h2>
        <p>
          «Sternenfieber» sieht aus und klingt wie ein echter Online-Spielautomat. Das ist Absicht: Nur wenn die Verführung echt
          wirkt, kann man sie auch entlarven. Mit dem Schalter <strong>«Mechanismen zeigen»</strong> wird jeder Trick im Moment
          markiert, in dem er passiert, und eine ehrliche Bilanz zeigt, was du wirklich gesetzt und verloren hast.
        </p>

        <div className={s.techGrid}>
          <article className={s.techCard}>
            <h3>React &amp; TypeScript</h3>
            <p>Die Seite ist mit React, TypeScript und Vite gebaut und läuft komplett im Browser. Es gibt keinen Server.</p>
          </article>
          <article className={s.techCard}>
            <h3>Eigene Grafiken</h3>
            <p>Alle Symbole, Walzen und Diagramme sind selbst gezeichnete SVG-Grafiken – keine Bilder von echten Casinos.</p>
          </article>
          <article className={s.techCard}>
            <h3>Synthetische Sounds</h3>
            <p>Die Klänge werden live mit der Web Audio API erzeugt. Es werden keine Audiodateien geladen.</p>
          </article>
          <article className={s.techCard}>
            <h3>Simulierte Auszahlungsquote</h3>
            <p>
              Der Automat zahlt auf lange Sicht rund <strong>95&nbsp;%</strong> der Einsätze zurück (RTP). Wer lange spielt, verliert
              also im Schnitt rund 5&nbsp;% von allem, was gesetzt wird. <strong>Das Haus gewinnt immer.</strong>
            </p>
          </article>
        </div>

        <p className={s.note}>
          <strong>Wichtig</strong>
          Kein echtes Geld, keine Einzahlung, keine Auszahlung, keine Anmeldung. Credits haben keinen Wert. Formulare in der Demo
          (zum Beispiel «Auszahlen») speichern und senden nichts. Die Seite richtet sich an Lernende ab 16 Jahren und dient nur der
          Aufklärung.
        </p>
      </section>

      <section className={s.section} aria-labelledby="hilfe-h">
        <span className={s.sectionNum}>03</span>
        <h2 id="hilfe-h" className={s.h2}>
          Hilfe &amp; Beratung
        </h2>
        <p>Wenn du merkst, dass du oder jemand in deinem Umfeld zu viel spielt: Es gibt kostenlose und vertrauliche Hilfe.</p>
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
        <span className={s.sectionNum}>04</span>
        <h2 id="quellen-h" className={s.h2}>
          Quellenverzeichnis
        </h2>
        <ul className={s.sources}>
          {SOURCES.map((src) => (
            <li key={src.id}>
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
          ))}
        </ul>
        <p style={{ marginTop: 16 }}>
          Allgemeine Konzepte der Glücksspielpsychologie (Beinahe-Gewinne, als Gewinn getarnte Verluste, variable Belohnung,
          Sound- und Lichteffekte, Zeitverzerrung) werden in der Demo ohne zusätzliche Zahlen erklärt.
        </p>
      </section>
    </ClarityPage>
  );
}
