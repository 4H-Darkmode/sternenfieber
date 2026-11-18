import { Link } from 'react-router-dom';
import BarChart from './components/BarChart';
import ClarityPage, { scrollToSection } from './components/ClarityPage';
import NestedCircles from './components/NestedCircles';
import { MECHANISMS, MECHANISM_ORDER } from '../reveal/content';
import s from './components/Article.module.css';

const SECTIONS = [
  { id: 'markt', label: 'Markt' },
  { id: 'betroffene', label: 'Wer betroffen ist' },
  { id: 'mechanismen', label: 'Mechanismen' },
  { id: 'recht', label: 'Recht' },
  { id: 'wirkung', label: 'Wirkt das?' },
];

const SRC_NOTARI = 'Notari et al. (2023), eGames-Studie, Sucht Schweiz / GREA';
const SRC_ESBK = 'ESBK, Spielbankenabgabe; Bundesrat / BJ zum Geldspielgesetz';

export default function Background() {
  return (
    <ClarityPage title="Hintergrund">
      <header className={s.hero}>
        <p className={s.kicker}>Hintergrund · Teilziele 1 &amp; 2</p>
        <h1 className={s.h1}>Online-Glücksspiel in der Schweiz – Zahlen, Tricks und Gesetze</h1>
        <p className={s.lead}>
          Seit 2019 sind Online-Casinos in der Schweiz legal. Seither wächst der Markt stark – und mit ihm die Zahl der Menschen, bei
          denen Spielen ernsthafte Folgen hat. Hier findest du die wichtigsten Zahlen, die psychologischen Tricks und was das
          Gesetz dagegen unternimmt.
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
          Ein Markt, der seit 2019 explodiert
        </h2>
        <p>
          Am <strong>1. Januar 2019</strong> trat das Schweizer Geldspielgesetz in Kraft. Seither dürfen Schweizer Spielbanken mit
          einer erweiterten Konzession auch Online-Glücksspiele anbieten. Bis Ende 2019 bewilligte die Eidgenössische
          Spielbankenkommission (ESBK) die ersten vier Schweizer Online-Casinos.
        </p>
        <p>
          Einen zusätzlichen Schub brachte die Corona-Pandemie: Während die Casinos vor Ort wegen Schliessungen und
          Schutzmassnahmen deutlich weniger einnahmen, stiegen die Erträge im Online-Bereich kontinuierlich an. Die Plattformen
          sind rund um die Uhr verfügbar.
        </p>

        <div className={s.stats}>
          <div className={s.stat}>
            <span className={`${s.statValue} ${s.statRed}`}>+695&nbsp;%</span>
            <span className={s.statLabel}>Wachstum des Bruttospielertrags von 2019 auf 2020</span>
          </div>
          <div className={s.stat}>
            <span className={s.statValue}>285.7 Mio.</span>
            <span className={s.statLabel}>Franken Bruttospielertrag der Online-Casinos 2023 (+14&nbsp;% gegenüber 2022)</span>
          </div>
        </div>

        <BarChart
          title="Bruttospielertrag (BSE) der legalen Online-Casinos"
          subtitle="in Millionen Franken – vereinfacht: Einsätze minus ausbezahlte Gewinne, also was die Spielenden verloren haben"
          series={[{ name: 'BSE', tone: 'ink' }]}
          rows={[
            { label: '2019', values: [23.5], note: 'erstes Jahr' },
            { label: '2020', values: [186.8], note: 'Corona-Jahr' },
            { label: '2023', values: [285.7], tone: 'red' },
          ]}
          unit={'\u00a0Mio.'}
          source={SRC_ESBK}
          note="Für 2021 und 2022 nennt die Arbeit keine Einzelwerte. Die Jahre sind deshalb nicht gleichmässig verteilt."
        />

        <p>
          Ein Teil dieser Erträge geht über die <strong>Spielbankenabgabe</strong> an die AHV und die IV. Das ist so im Bundesgesetz
          über Geldspiele vorgesehen. Auch die Abgabe der Online-Casinos ist stark gewachsen:
        </p>

        <BarChart
          title="Spielbankenabgabe der Online-Casinos"
          subtitle="in Millionen Franken, gerundet"
          series={[{ name: 'Abgabe', tone: 'ink' }]}
          rows={[
            { label: '2019', values: [7] },
            { label: '2020', values: [78] },
            { label: '2023', values: [120] },
            { label: '2024', values: [132], note: 'von total 401 Mio.', tone: 'red' },
          ]}
          unit={'\u00a0Mio.'}
          decimals={0}
          source="ESBK, Spielbankenabgabe"
          note="2024 kam rund ein Drittel der gesamten Schweizer Spielbankenabgabe (401 Mio.) aus dem Online-Geschäft. 2025 flossen insgesamt 353 Mio. Franken an AHV und IV."
        />

        <p className={s.note}>
          <strong>Randnotiz</strong>
          Mehr Abgaben für die AHV klingen gut. Aber jeder Franken Bruttospielertrag ist ein Franken, den Spielende verloren
          haben.
        </p>
      </section>

      {/* ── 2 Betroffene ─────────────────────────────────────── */}
      <section id="betroffene" className={s.section} aria-labelledby="betroffene-h">
        <span className={s.sectionNum}>02</span>
        <h2 id="betroffene-h" className={s.h2}>
          Wer gefährdet ist
        </h2>
        <p>
          Nicht jede Person, die um Geld spielt, wird süchtig. Die eGames-Studie von Sucht Schweiz und GREA (Notari et al., 2023)
          teilt die Spielenden mit dem <strong>Problem Gambling Severity Index (PGSI)</strong> in vier Gruppen ein:
          unproblematisch, geringes Risiko, mässiges Risiko und problematisch.
        </p>
        <p>
          Zwischen 2018 und 2021 ist der Anteil mit problematischem Spielverhalten von 2.3&nbsp;% auf{' '}
          <span className={s.mark}>5.2&nbsp;%</span> gestiegen – er hat sich <strong>mehr als verdoppelt</strong>. Die Gruppe, bei der
          das Spielen ernsthafte Folgen hat, ist also grösser geworden.
        </p>

        <BarChart
          title="Spielende nach Risikokategorie (PGSI), 2018 und 2021"
          subtitle="Anteil der Online-Spielenden in Prozent"
          series={[
            { name: '2018', tone: 'muted' },
            { name: '2021', tone: 'red' },
          ]}
          rows={[
            { label: 'Unproblematisch', values: [70.3, 73.7] },
            { label: 'Geringes Risiko', values: [25.2, 19.6] },
            { label: 'Problematisch', values: [2.3, 5.2] },
          ]}
          unit={'\u00a0%'}
          source={SRC_NOTARI}
          note="Die Kategorie «mässiges Risiko» wird in der Arbeit nicht einzeln ausgewiesen (Rest auf 100&nbsp;%)."
        />

        <h3 className={s.h3}>Junge Erwachsene sind am stärksten betroffen</h3>
        <p>
          Bei den 18- bis 29-Jährigen zeigen <span className={s.mark}>18.8&nbsp;%</span> ein mässiges oder problematisches
          Risikoprofil – fast jede fünfte Person. Bei den über 60-Jährigen sind es nur 0.6&nbsp;%. Genau die Gruppe, die das
          Smartphone ständig dabeihat, ist also am stärksten gefährdet.
        </p>

        <BarChart
          title="Mässiges oder problematisches Risikoprofil nach Alter"
          subtitle="Anteil der Spielenden in Prozent"
          series={[{ name: 'Anteil', tone: 'ink' }]}
          rows={[
            { label: '18–29 Jahre', values: [18.8], tone: 'red' },
            { label: '30–39 Jahre', values: [9.8] },
            { label: '60+ Jahre', values: [0.6] },
          ]}
          unit={'\u00a0%'}
          max={20}
          source={SRC_NOTARI}
        />

        <BarChart
          title="Mässiges oder problematisches Risikoprofil nach Geschlecht"
          subtitle="Anteil der Spielenden in Prozent"
          series={[{ name: 'Anteil', tone: 'ink' }]}
          rows={[
            { label: 'Männer', values: [7.1] },
            { label: 'Frauen', values: [5.6] },
          ]}
          unit={'\u00a0%'}
          max={20}
          source={SRC_NOTARI}
          note="Gleiche Skala wie die Altersgrafik: Der Unterschied zwischen den Altersgruppen ist viel grösser als zwischen den Geschlechtern."
        />

        <p>Spielende mit mässigem oder problematischem Risikoprofil …</p>
        <ul>
          <li>spielen oft mehrere Spielarten,</li>
          <li>nutzen häufiger das Mobiltelefon,</li>
          <li>spielen auch auf ausländischen Webseiten</li>
          <li>und besuchen zusätzlich Spielbanken vor Ort.</li>
        </ul>
      </section>

      {/* ── 3 Mechanismen ────────────────────────────────────── */}
      <section id="mechanismen" className={s.section} aria-labelledby="mechanismen-h">
        <span className={s.sectionNum}>03</span>
        <h2 id="mechanismen-h" className={s.h2}>
          Wie Online-Casinos dich am Spielen halten
        </h2>
        <p>
          Philip Newall (University of Bristol) beschreibt das täuschende Design von Online-Glücksspielplattformen als digitales
          Gegenstück zur Gestaltung von Casinos vor Ort. Spielautomaten hatten schon immer Merkmale, die zum Weiterspielen
          verleiten. Online kommen weitere Risiken dazu:
        </p>
        <ul>
          <li>Online-Casinos sind in wenigen Sekunden per Smartphone oder Laptop erreichbar.</li>
          <li>Einzahlungen sind extrem schnell, das Geld ist sofort auf dem Konto.</li>
          <li>Ständig erscheinen Angebote, die versprechen, den Einsatz zu verdoppeln oder Gratis-Spins zu schenken.</li>
          <li>Das Spielangebot ist riesig – in Sekunden wechselt man von einem Spiel zum nächsten.</li>
        </ul>

        <h3 className={s.h3}>Sludge, Dark Patterns, Dark Nudges</h3>
        <p>
          Newall ordnet das täuschende Design mit drei Begriffen aus der Verhaltensforschung ein. Sie bauen aufeinander auf wie
          Schichten: Der weitere Begriff schliesst jeweils den engeren mit ein. Alle drei verfolgen dasselbe Ziel: Du sollst
          möglichst lange spielen und möglichst viel Geld einsetzen.
        </p>

        <NestedCircles />

        <h3 className={s.h3}>Was im Spielautomaten selbst wirkt</h3>
        <p>
          Dazu kommen die Mechanismen im Spiel selbst. Sie sind aus der Glücksspielpsychologie bekannt – und du kannst sie in der
          Demo live beobachten.
        </p>

        {(['lossChasing', 'nearMissScatter', 'variableReward', 'ldw', 'soundFx'] as const).map((id) => {
          const m = MECHANISMS[id];
          const heading =
            id === 'nearMissScatter' ? 'Beinahe-Gewinne' : id === 'soundFx' ? 'Sound- und Animationseffekte' : m.title;
          return (
            <div key={id}>
              <h4 className={s.h3}>{heading}</h4>
              <p>{m.long}</p>
            </div>
          );
        })}
      </section>

      {/* ── 4 Recht ──────────────────────────────────────────── */}
      <section id="recht" className={s.section} aria-labelledby="recht-h">
        <span className={s.sectionNum}>04</span>
        <h2 id="recht-h" className={s.h2}>
          Was das Gesetz dagegen tut
        </h2>
        <p>
          Das <strong>Bundesgesetz über Geldspiele (BGS, SR 935.51)</strong> regelt alle Formen des Geldspiels – von Casinos über
          Lotterien bis zu Sportwetten. Die Stimmbevölkerung nahm es am 10. Juni 2018 mit <span className={s.mark}>72.9&nbsp;%</span>{' '}
          Ja-Stimmen an. Seit dem 1. Januar 2019 ist es in Kraft und ersetzt das frühere Spielbankengesetz und das Lotteriegesetz.
        </p>
        <p>
          Online-Casinos dürfen nur Spielbanken mit einer Schweizer Konzession anbieten, die für das Online-Angebot erweitert
          wurde. Ausländische Anbieter ohne Bewilligung sind verboten. Das Gesetz soll die Bevölkerung vor den Gefahren des
          Geldspiels schützen und für sichere, transparente Spiele sorgen (Art. 2 BGS).
        </p>

        <div className={s.lawGrid}>
          <article className={s.lawCard}>
            <h3>Aufsicht: die ESBK</h3>
            <span className={s.lawRef}>Art. 97 BGS</span>
            <p>
              Die Eidgenössische Spielbankenkommission ist eine unabhängige Behörde des Bundes (administrativ beim EJPD). Sie
              beaufsichtigt alle Schweizer Casinos, prüft die Geldwäschereivorschriften und kontrolliert, ob die Sozialkonzepte
              umgesetzt werden. Lotterien und Sportwetten beaufsichtigt die interkantonale Behörde Gespa.
            </p>
          </article>
          <article className={s.lawCard}>
            <h3>Spielsperre</h3>
            <span className={s.lawRef}>Art. 80 und 81 BGS</span>
            <p>
              Man kann sich freiwillig sperren lassen. Das Casino muss selbst sperren, wenn jemand überschuldet ist, Rechnungen
              nicht bezahlt oder Beträge einsetzt, die nicht zu Einkommen und Vermögen passen – eine Suchtdiagnose ist nicht nötig.
              Die Sperre gilt in allen bewilligten Schweizer Online-Casinos, ist unbefristet und wird nur auf Antrag und unter
              Einbezug einer Fachstelle aufgehoben. Eine freiwillige Sperre frühestens nach drei Monaten.
            </p>
          </article>
          <article className={s.lawCard}>
            <h3>Einsatz- und Verlustlimiten</h3>
            <span className={s.lawRef}>Art. 87 VGS</span>
            <p>
              Schon bei der Kontoeröffnung muss das Casino verlangen, dass du Höchstwerte für tägliche, wöchentliche oder
              monatliche Einsätze oder Verluste festlegst. <strong>Eine tiefere Limite gilt sofort, eine höhere frühestens nach 24
              Stunden.</strong> Einsätze, Gewinne und Verluste müssen jederzeit einsehbar sein. Einen festen Frankenbetrag schreibt
              das Gesetz nicht vor.
            </p>
          </article>
          <article className={s.lawCard}>
            <h3>Netzsperren</h3>
            <span className={s.lawRef}>Sperrliste der ESBK</span>
            <p>
              Schweizer Internetanbieter müssen Websites auf der Sperrliste blockieren. 2025 kamen 580 neue Domains dazu, und die
              ESBK führte 28 Hausdurchsuchungen durch. Weil sich Netzsperren zum Beispiel mit einem VPN umgehen lassen, bleibt der
              Kampf gegen illegale Anbieter eine Daueraufgabe.
            </p>
          </article>
        </div>

        <p className={s.note}>
          <strong>Warum 24 Stunden?</strong>
          Die Wartezeit für höhere Limiten soll verhindern, dass jemand im Moment eines Verlusts spontan mehr Geld einsetzt – sie
          bremst die Verlustspirale. In der Demo kannst du das selbst ausprobieren.
        </p>
      </section>

      {/* ── 5 Wirkung ────────────────────────────────────────── */}
      <section id="wirkung" className={s.section} aria-labelledby="wirkung-h">
        <span className={s.sectionNum}>05</span>
        <h2 id="wirkung-h" className={s.h2}>
          Wirken die Schutzmassnahmen?
        </h2>

        <div className={s.stats}>
          <div className={s.stat}>
            <span className={s.statValue}>über 100&apos;000</span>
            <span className={s.statLabel}>Spielsperren gegen Betroffene (Schweizer Casino Verband)</span>
          </div>
          <div className={s.stat}>
            <span className={`${s.statValue} ${s.statRed}`}>bis −85&nbsp;%</span>
            <span className={s.statLabel}>Umsatz der Casinos in Liechtenstein, seit Schweizer Sperren dort gelten (ab 7.1.2025)</span>
          </div>
        </div>

        <div className={s.verdict}>
          <div className={s.verdictCol}>
            <h3>Was funktioniert</h3>
            <ul>
              <li>
                Die <strong>Spielsperre</strong> ist das stärkste Instrument: Gesperrte Personen können in keinem Schweizer Casino
                mehr spielen, weder online noch vor Ort.
              </li>
              <li>
                Seit dem 7. Januar 2025 gelten Schweizer Sperren auch in Liechtenstein. Die Umsätze der dortigen Casinos brachen um
                bis zu 85&nbsp;% ein, viele schlossen.
              </li>
              <li>
                <strong>Netzsperren</strong> zeigen Wirkung: Der Anteil der Personen, die bei ausländischen Anbietern spielen, sank
                bis 2022 auf 0.8&nbsp;%. Bei Schweizer Anbietern lag er 2022 bei 2.0&nbsp;%. Viele wechselten also zu legalen Anbietern mit
                Spielerschutz.
              </li>
            </ul>
          </div>
          <div className={`${s.verdictCol} ${s.verdictWarn}`}>
            <h3>Wo es hapert</h3>
            <ul>
              <li>
                Der Anteil der Online-Spielenden insgesamt blieb fast gleich: 2.3&nbsp;% (2017) und 2.4&nbsp;% (2022).
              </li>
              <li>Netzsperren lassen sich mit einem VPN umgehen.</li>
              <li>
                Limiten schützen nur, wenn die Technik stimmt: 2020 funktionierten bei einem Anbieter die Verlustlimiten von 411
                Spielenden nicht richtig. Die ESBK stellte einen Gesetzesverstoss fest.
              </li>
            </ul>
          </div>
        </div>

        <h3 className={s.h3}>Zwischenfazit</h3>
        <p>
          Seit dem Geldspielgesetz von 2019 ist Online-Glücksspiel legal und einfach zugänglich. Der Bruttospielertrag der
          Online-Casinos stieg von 23.5 Mio. (2019) auf 285.7 Mio. Franken (2023). Gleichzeitig hat sich der Anteil mit
          problematischem Spielverhalten mehr als verdoppelt. Ob die Mechanismen allein dafür verantwortlich sind, lässt sich nicht
          beweisen – aber Marktwachstum und problematisches Spielen nehmen deutlich gleichzeitig zu.
        </p>
        <p>
          Bleibt die zentrale Frage: <strong>Reichen die bestehenden Schutzmassnahmen aus, um diese Entwicklung zu bremsen?</strong>
        </p>
        <p>
          Mehr zum Projekt und alle Quellen findest du unter <Link to="/ueber">Über &amp; Quellen</Link>.
        </p>
      </section>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section className={s.cta} aria-labelledby="cta-h">
        <h2 id="cta-h">Diese Mechanismen findest du im Spiel</h2>
        <p>
          Spiel «Sternenfieber» mit Spielgeld und schalte <strong>«Mechanismen zeigen»</strong> ein. Dann wird jeder Trick in dem
          Moment markiert, in dem er passiert.
        </p>
        <ul className={s.mechList}>
          {MECHANISM_ORDER.map((id) => {
            const m = MECHANISMS[id];
            return (
              <li key={id} className={s.mechItem}>
                <span className={s.mechTag}>{m.tag}</span>
                <span className={s.mechTitle}>{m.title}</span>
                <span className={s.mechText}>{m.short}</span>
              </li>
            );
          })}
        </ul>
        <div className={s.btnRow}>
          <Link to="/spielen" className={s.btnGold}>
            Jetzt spielen &amp; entlarven
          </Link>
        </div>
      </section>
    </ClarityPage>
  );
}
