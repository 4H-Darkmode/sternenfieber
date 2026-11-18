import { Link } from 'react-router-dom';
import BarChart from './components/BarChart';
import ClarityPage, { scrollToSection } from './components/ClarityPage';
import NestedCircles from './components/NestedCircles';
import s from './components/Article.module.css';

const SECTIONS = [
  { id: 'markt', label: 'Markt' },
  { id: 'betroffene', label: 'Wer betroffen ist' },
  { id: 'mechanismen', label: 'Mechanismen' },
  { id: 'recht', label: 'Recht' },
  { id: 'wirkung', label: 'Wirkt das?' },
];

const SRC_NOTARI = 'Notari et al. (2023), eGames-Studie, Sucht Schweiz / GREA';

export default function Background() {
  return (
    <ClarityPage title="Hintergrund">
      <header className={s.hero}>
        <p className={s.kicker}>Hintergrund · Teilziele 1 &amp; 2</p>
        <h1 className={s.h1}>Online-Glücksspiel in der Schweiz</h1>
        <p className={s.lead}>
          Seit dem Geldspielgesetz von 2019 ist Online-Glücksspiel in der Schweiz legal und einfach zugänglich. Gleichzeitig hat
          sich der Anteil der Spielenden mit problematischem Spielverhalten zwischen 2018 und 2021 mehr als verdoppelt.
        </p>
      </header>

      <nav className={s.toc} aria-labelledby="toc-h">
        <h2 id="toc-h">Inhalt</h2>
        <ol>
          {SECTIONS.map((sec, i) => (
            <li key={sec.id}>
              <button type="button" className={s.tocBtn} onClick={() => scrollToSection(sec.id)}>
                <span>{String(i + 1).padStart(2, '0')}</span>
                {sec.label}
              </button>
            </li>
          ))}
        </ol>
      </nav>

      {/* ── 1 Markt ─────────────────────────────────────────── */}
      <section id="markt" className={s.section} aria-labelledby="markt-h">
        <span className={s.sectionNum}>01</span>
        <h2 id="markt-h" className={s.h2}>
          Entwicklung des Markts
        </h2>
        <p>
          Am <strong>1. Januar 2019</strong> trat das Schweizer Geldspielgesetz in Kraft. Seither dürfen Schweizer Spielbanken mit
          einer erweiterten Konzession Online-Glücksspiele anbieten. Bis Ende 2019 bewilligte die ESBK die ersten vier Schweizer
          Online-Casinos.
        </p>

        <div className={s.stats}>
          <div className={s.stat}>
            <span className={`${s.statValue} ${s.statRed}`}>+695&nbsp;%</span>
            <span className={s.statLabel}>Wachstum des Bruttospielertrags (BSE) von 2019 auf 2020</span>
          </div>
          <div className={s.stat}>
            <span className={s.statValue}>285.7 Mio.</span>
            <span className={s.statLabel}>Franken BSE der Online-Casinos 2023 (+14&nbsp;% gegenüber 2022)</span>
          </div>
        </div>

        <BarChart
          title="Bruttospielertrag (BSE) der legalen Online-Casinos"
          subtitle="in Millionen Franken"
          series={[{ name: 'BSE', tone: 'ink' }]}
          rows={[
            { label: '2019', values: [23.5] },
            { label: '2020', values: [186.8] },
            { label: '2023', values: [285.7], tone: 'red' },
          ]}
          unit={' Mio.'}
          source="ESBK, Spielbankenabgabe; Schweizer Casino Verband (2025), Jahresbericht 2024/25"
        />

        <p>
          Das Online-Glücksspiel ist in der Schweiz längst kein Nischenphänomen mehr, sondern ein fester und schnell wachsender
          Markt. Ein Teil der Erträge fliesst über die Spielbankenabgabe an die AHV und die IV – im Jahr 2025 waren das 353
          Millionen Franken.
        </p>
      </section>

      {/* ── 2 Betroffene ─────────────────────────────────────── */}
      <section id="betroffene" className={s.section} aria-labelledby="betroffene-h">
        <span className={s.sectionNum}>02</span>
        <h2 id="betroffene-h" className={s.h2}>
          Betroffene Risikogruppen
        </h2>
        <p>
          Die eGames-Studie von Sucht Schweiz und GREA teilt die Spielenden mit dem Problem Gambling Severity Index (PGSI) in vier
          Kategorien ein. Der Anteil mit problematischem Spielverhalten ist zwischen 2018 und 2021 von 2.3&nbsp;% auf{' '}
          <span className={s.mark}>5.2&nbsp;%</span> gestiegen und hat sich damit mehr als verdoppelt.
        </p>

        <BarChart
          title="Spielende nach Risikokategorie (PGSI), 2018 und 2021"
          subtitle="Anteil in Prozent"
          series={[
            { name: '2018', tone: 'muted' },
            { name: '2021', tone: 'red' },
          ]}
          rows={[
            { label: 'Unproblematisch', values: [70.3, 73.7] },
            { label: 'Geringes Risiko', values: [25.2, 19.6] },
            { label: 'Problematisch', values: [2.3, 5.2] },
          ]}
          unit={' %'}
          source={SRC_NOTARI}
          note="«Mässiges Risiko» ist nicht einzeln ausgewiesen."
        />

        <p>
          Am stärksten betroffen sind junge Erwachsene: Bei den 18- bis 29-Jährigen zeigen{' '}
          <span className={s.mark}>18.8&nbsp;%</span> ein mässiges oder problematisches Risikoprofil.
        </p>

        <BarChart
          title="Mässiges oder problematisches Risikoprofil nach Alter"
          subtitle="Anteil in Prozent"
          series={[{ name: 'Anteil', tone: 'ink' }]}
          rows={[
            { label: '18–29 Jahre', values: [18.8], tone: 'red' },
            { label: '30–39 Jahre', values: [9.8] },
            { label: '60+ Jahre', values: [0.6] },
          ]}
          unit={' %'}
          max={20}
          source={SRC_NOTARI}
        />

        <p>Männer (7.1&nbsp;%) sind etwas häufiger betroffen als Frauen (5.6&nbsp;%).</p>
      </section>

      {/* ── 3 Mechanismen ────────────────────────────────────── */}
      <section id="mechanismen" className={s.section} aria-labelledby="mechanismen-h">
        <span className={s.sectionNum}>03</span>
        <h2 id="mechanismen-h" className={s.h2}>
          Suchtmechanismen im digitalen Raum
        </h2>
        <p>
          Philip Newall (University of Bristol) ordnet das täuschende Design von Online-Casinos mit drei Begriffen ein, die wie
          Schichten aufeinander aufbauen. Alle drei verfolgen dasselbe Ziel: Die Spielenden sollen möglichst lange weiterspielen
          und möglichst viel Geld einsetzen.
        </p>

        <NestedCircles />

        <p>
          Die Demo-Webseite zeigt, wie Beinahe-Gewinne, Sound- und Animationseffekte und variable Belohnung das Spielverhalten
          beeinflussen. <Link to="/spielen">Selbst ausprobieren</Link>
        </p>
      </section>

      {/* ── 4 Recht ──────────────────────────────────────────── */}
      <section id="recht" className={s.section} aria-labelledby="recht-h">
        <span className={s.sectionNum}>04</span>
        <h2 id="recht-h" className={s.h2}>
          Rechtliche Grundlagen
        </h2>

        <div className={s.lawGrid}>
          <article className={s.lawCard}>
            <h3>Geldspielgesetz</h3>
            <span className={s.lawRef}>BGS, SR 935.51</span>
            <p>
              Seit dem 1. Januar 2019 in Kraft. Online-Casinos dürfen nur Spielbanken mit einer erweiterten Schweizer Konzession
              anbieten; ausländische Anbieter ohne Bewilligung sind verboten.
            </p>
          </article>
          <article className={s.lawCard}>
            <h3>Aufsicht: ESBK</h3>
            <span className={s.lawRef}>Art. 97 BGS</span>
            <p>
              Die ESBK beaufsichtigt alle Schweizer Casinos und kontrolliert, ob sie den Spielerschutz umsetzen. Schweizer
              Internetanbieter müssen Websites auf ihrer Sperrliste blockieren.
            </p>
          </article>
          <article className={s.lawCard}>
            <h3>Spielsperre</h3>
            <span className={s.lawRef}>Art. 80–81 BGS</span>
            <p>
              Freiwillig oder durch das Casino, zum Beispiel bei Überschuldung. Die Sperre gilt bei allen bewilligten Schweizer
              Online-Casinos und ist unbefristet.
            </p>
          </article>
          <article className={s.lawCard}>
            <h3>Limiten</h3>
            <span className={s.lawRef}>Art. 87 VGS</span>
            <p>
              Bei der Kontoeröffnung legt man Höchstwerte für Einsätze oder Verluste fest. Eine tiefere Limite gilt sofort, eine
              höhere frühestens nach 24 Stunden.
            </p>
          </article>
        </div>
      </section>

      {/* ── 5 Wirkung ────────────────────────────────────────── */}
      <section id="wirkung" className={s.section} aria-labelledby="wirkung-h">
        <span className={s.sectionNum}>05</span>
        <h2 id="wirkung-h" className={s.h2}>
          Wirksamkeit der Schutzmassnahmen
        </h2>

        <div className={s.verdict}>
          <div className={s.verdictCol}>
            <h3>Was funktioniert</h3>
            <ul>
              <li>
                Die <strong>Spielsperre</strong> ist das stärkste Instrument: Es gibt über 100&apos;000 Spielsperren.
              </li>
              <li>
                Seit dem 7. Januar 2025 gelten Schweizer Spielsperren auch für Liechtenstein. Danach brachen die Umsätze der
                Liechtensteiner Casinos um bis zu 85&nbsp;% ein.
              </li>
              <li>
                Der Anteil, der bei ausländischen Anbietern spielt, sank von 2.3&nbsp;% (2017) auf 0.8&nbsp;% (2022). Viele
                wechselten zu legalen Anbietern mit Spielerschutz.
              </li>
            </ul>
          </div>
          <div className={`${s.verdictCol} ${s.verdictWarn}`}>
            <h3>Was nicht funktioniert</h3>
            <ul>
              <li>Netzsperren lassen sich mit einem VPN umgehen. Allein 2025 kamen 580 neue Domains auf die Sperrliste.</li>
              <li>
                Limiten legen die Spielenden selbst fest. 2020 griffen bei einem Anbieter die Verlustlimiten von 411 Spielenden
                nicht richtig.
              </li>
              <li>Die Spielsperre greift oft erst, wenn bereits ein Schaden entstanden ist.</li>
              <li>
                Trotz der Massnahmen stieg der Anteil mit problematischem Spielverhalten von 2.3&nbsp;% (2018) auf 5.2&nbsp;% (2021).
              </li>
              <li>Gegen Sludge, Dark Patterns und Dark Nudges helfen die Massnahmen nicht direkt.</li>
            </ul>
          </div>
        </div>

        <div className={s.fazit}>
          <h3>Fazit</h3>
          <p>
            Die Schutzmassnahmen wirken, aber nur teilweise: <strong>Sie bremsen die Entwicklung, stoppen sie aber nicht.</strong>{' '}
            Gerade junge Erwachsene brauchen deshalb zusätzlich Aufklärung und Prävention. Hier setzt diese Demo-Webseite an.
          </p>
          <Link to="/spielen" className={s.btnGold}>
            Zur Demo
          </Link>
        </div>

        <p className={s.sourceLine}>
          Quellen: Schweizer Casino Verband (2025); Blick; ESBK &amp; Gespa (2024); ESBK. Alle Quellen unter{' '}
          <Link to="/ueber">Über &amp; Quellen</Link>.
        </p>
      </section>
    </ClarityPage>
  );
}
