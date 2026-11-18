import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import SiteFooter from './components/SiteFooter';
import SiteNav from './components/SiteNav';
import s from './components/Home.module.css';

/* ── tiny decorative symbols for the casino teaser ─────────────────────── */
function Gem({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 40 40" width="100%" height="100%">
      <path d="M20 4 L34 16 L20 36 L6 16 Z" fill={color} />
      <path d="M20 4 L26 16 L20 36 L14 16 Z" fill="rgba(255,255,255,0.28)" />
      <path d="M6 16 H34" stroke="rgba(255,255,255,0.5)" strokeWidth="1.2" />
    </svg>
  );
}
function Planet() {
  return (
    <svg viewBox="0 0 40 40" width="100%" height="100%">
      <circle cx="20" cy="20" r="10" fill="#8b5cff" />
      <ellipse cx="20" cy="21" rx="17" ry="5" fill="none" stroke="#34e7ff" strokeWidth="2.4" transform="rotate(-18 20 21)" />
    </svg>
  );
}
function Star() {
  return (
    <svg viewBox="0 0 40 40" width="100%" height="100%">
      <path d="M20 3l4.6 10.8 11.4 1-8.7 7.6 2.7 11.4L20 27.8 10 33.8l2.7-11.4L4 14.8l11.4-1z" fill="#ffcf4a" />
    </svg>
  );
}

const PAIRS = [
  {
    seen: 'GEWINN! +0.60',
    seenSub: 'Münzregen, Fanfare, der Zähler läuft hoch',
    truth: 'Dein Einsatz war 1.00. Netto hast du 0.40 verloren – gefeiert wird trotzdem.',
    tag: 'Verlust als Gewinn getarnt',
  },
  {
    seen: 'SO KNAPP!',
    seenSub: 'Zwei Supernovas – die dritte stoppt direkt daneben',
    truth: '«Fast» ist kein Gewinn. Das Ergebnis stand schon fest, als du auf Spin gedrückt hast.',
    tag: 'Beinahe-Gewinn',
  },
  {
    seen: "1'000 CREDITS",
    seenSub: 'Einsatz 2.00 – schon vorausgewählt',
    truth: '1 Credit = 1 Franken. Und der hohe Startwert ist Absicht: Viele behalten einfach den Vorschlag (Default-Effekt).',
    tag: 'Dark Pattern',
  },
  {
    seen: 'WARTE! 50 FREISPIELE',
    seenSub: 'Riesiger Goldknopf statt «Auszahlen»',
    truth: 'Einzahlen dauert Sekunden, Auszahlen Werktage. Die Hürden sind eingebaut, damit du weiterspielst.',
    tag: 'Sludge',
  },
];

const WATCH = [
  {
    title: 'Beinahe-Gewinne',
    text: 'Symbole, die «knapp» danebenliegen, fühlen sich wie Fortschritt an. Sie sind einfach Verluste.',
    icon: (
      <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true">
        <circle cx="16" cy="16" r="11" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="16" cy="16" r="5" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="23" cy="9" r="2.6" fill="currentColor" />
      </svg>
    ),
  },
  {
    title: 'Getarnte Verluste',
    text: 'Ein «Gewinn», der kleiner ist als dein Einsatz, wird mit Licht und Ton gefeiert. Rechne nach: Netto ist es ein Minus.',
    icon: (
      <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true">
        <path d="M6 16h20" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M16 6v20" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" opacity="0.35" />
        <path d="M5 27L27 5" stroke="var(--k-red)" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: 'Zufall & Effekte',
    text: 'Gewinne kommen unvorhersehbar, Walzen bremsen spannend ab, es klingelt. Das bindet dich – am Ergebnis ändert es nichts.',
    icon: (
      <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true">
        <path d="M4 20c4 0 4-8 8-8s4 12 8 12 4-16 8-16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: 'Dark Patterns & Sludge',
    text: 'Hohe Einsätze sind vorausgewählt, «Bonus kaufen» glänzt golden, Auszahlen ist mühsam. Das Design lenkt dich.',
    icon: (
      <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true">
        <rect x="5" y="7" width="22" height="18" rx="3" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M10 18l4-4 3 3 5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
];

export default function Home() {
  useEffect(() => {
    document.title = 'Sternenfieber – Der Preis des Spiels';
  }, []);

  return (
    <div className={s.home}>
      <SiteNav variant="casino" />
      <main id="inhalt" tabIndex={-1} className={s.main}>
        {/* ── split hero ─────────────────────────────────────── */}
        <section className={s.hero} aria-labelledby="home-h1">
          <div className={s.seen}>
            <p className={s.sideLabel}>Was du siehst</p>
            <div className={s.machine} aria-hidden="true">
              <p className={s.logo}>Sternenfieber</p>
              <div className={s.reels}>
                <span className={`${s.tile} ${s.tileWin}`}>
                  <Gem color="#ff3d6e" />
                </span>
                <span className={`${s.tile} ${s.tileWin}`}>
                  <Gem color="#ff3d6e" />
                </span>
                <span className={`${s.tile} ${s.tileWin}`}>
                  <Gem color="#ff3d6e" />
                </span>
                <span className={s.tile}>
                  <Planet />
                </span>
                <span className={s.tile}>
                  <Star />
                </span>
              </div>
              <p className={s.win}>
                <span className={s.winWord}>Gewinn!</span>
                <span className={s.winAmount}>+0.60</span>
              </p>
              <p className={s.betSmall}>Einsatz 1.00</p>
            </div>
            <p className={s.seenText} aria-hidden="true">
              Lichter. Fanfare. Ein Gewinn!
            </p>
          </div>

          <div className={s.truth}>
            <p className={s.sideLabelInk}>Was passiert</p>
            <h1 id="home-h1" className={s.h1}>
              Der Preis des Spiels
            </h1>
            <p className={s.lead}>
              Ein Spielautomat, der dich verführt – und ein Schalter, der jeden Trick in dem Moment entlarvt, in dem er passiert.
            </p>
            <dl className={s.ledger} aria-label="Dieselbe Runde, ehrlich gerechnet">
              <div>
                <dt>Einsatz</dt>
                <dd>−1.00</dd>
              </div>
              <div>
                <dt>«Gewinn»</dt>
                <dd>+0.60</dd>
              </div>
              <div className={s.ledgerNet}>
                <dt>Netto</dt>
                <dd>−0.40</dd>
              </div>
            </dl>
            <p className={s.truthText}>Gefeiert wurde ein Verlust.</p>
            <div className={s.ctas}>
              <Link to="/spielen" className={s.btnGold}>
                Spielen
                <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
                  <path d="M5 3l6 5-6 5z" fill="currentColor" />
                </svg>
              </Link>
              <Link to="/hintergrund" className={s.btnInk}>
                Hintergrund
              </Link>
            </div>
          </div>
        </section>

        {/* ── disclaimer ─────────────────────────────────────── */}
        <section className={s.disclaimer} aria-labelledby="hinweis-h">
          <div className={s.disclaimerInner}>
            <p className={s.stamp} aria-hidden="true">
              Nur Spielgeld
            </p>
            <div>
              <h2 id="hinweis-h" className={s.disclaimerH}>
                Ein Aufklärungsprojekt – kein Casino
              </h2>
              <ul className={s.disclaimerList}>
                <li>Kein echtes Geld: Du spielst mit wertlosen Credits.</li>
                <li>Keine Einzahlung möglich, keine Auszahlung, keine Anmeldung.</li>
                <li>Teil einer ABU-Vertiefungsarbeit über Online-Spielsucht.</li>
                <li>Gedacht für Lernende ab 16 Jahren, um Tricks zu erkennen.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ── seen vs. truth pairs ───────────────────────────── */}
        <section className={s.pairs} aria-labelledby="pairs-h">
          <h2 id="pairs-h" className={s.pairsH}>
            <span className={s.pairsSeen}>Was du siehst</span>
            <span className={s.pairsSlash} aria-hidden="true">
              /
            </span>
            <span className={s.pairsTruth}>Was passiert</span>
          </h2>
          <ul className={s.pairList}>
            {PAIRS.map((p) => (
              <li key={p.tag} className={s.pair}>
                <div className={s.pairSeen}>
                  <span className={s.pairNeon}>{p.seen}</span>
                  <span className={s.pairSub}>{p.seenSub}</span>
                </div>
                <div className={s.pairTruth}>
                  <span className={s.pairTag}>{p.tag}</span>
                  <p>{p.truth}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* ── what to watch for ─────────────────────────────── */}
        <section className={s.watch} aria-labelledby="watch-h">
          <div className={s.watchInner}>
            <h2 id="watch-h" className={s.watchH}>
              Darauf solltest du achten
            </h2>
            <p className={s.watchLead}>
              Schalte im Spiel <strong>«Mechanismen zeigen»</strong> ein. Dann erscheinen rote Notizen, sobald einer dieser Tricks
              passiert – mit echten Zahlen aus deiner Runde.
            </p>
            <ul className={s.cards}>
              {WATCH.map((w) => (
                <li key={w.title} className={s.card}>
                  <span className={s.cardIcon}>{w.icon}</span>
                  <h3 className={s.cardH}>{w.title}</h3>
                  <p className={s.cardText}>{w.text}</p>
                </li>
              ))}
            </ul>

            <div className={s.facts}>
              <h2 className={s.factsH}>Kein Spiel: die Zahlen</h2>
              <dl className={s.factGrid}>
                <div className={s.fact}>
                  <dt>Bruttospielertrag Online-Casinos 2023</dt>
                  <dd>
                    285.7 Mio. <small>Franken (2019: 23.5 Mio.)</small>
                  </dd>
                </div>
                <div className={s.fact}>
                  <dt>Problematisches Spielverhalten 2021</dt>
                  <dd>
                    5.2&nbsp;% <small>der Spielenden (2018: 2.3&nbsp;%)</small>
                  </dd>
                </div>
                <div className={s.fact}>
                  <dt>18- bis 29-Jährige mit Risikoprofil</dt>
                  <dd>
                    18.8&nbsp;% <small>mässig oder problematisch</small>
                  </dd>
                </div>
              </dl>
              <p className={s.factSrc}>Quellen: ESBK; Notari et al. (2023), Sucht Schweiz / GREA.</p>
              <Link to="/hintergrund" className={s.btnInk}>
                Mehr Hintergrund
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter variant="casino" />
    </div>
  );
}
