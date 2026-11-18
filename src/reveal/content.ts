/**
 * Reveal-mode content: what each manipulation mechanism is, and how live game
 * events are turned into annotated callouts ("Mechanismen zeigen").
 *
 * Facts come from the VA paper «Der Preis des Spiels» (sources listed in
 * SOURCES). Slot-psychology concepts (near-miss, LDW, variable reward …) are
 * general, well-known concepts and are explained without invented numbers.
 */
import type { GameEvents } from '../core/events';
import { netResult, type SessionStats } from '../core/stats';
import { BONUS_BUY_COST_X, type NearMissKind, type SymbolId } from '../engine/types';
import { fmtNum, fmtSigned } from './format';

// ─── Sources (from the paper's Quellenverzeichnis) ─────────────────────────

export interface Source {
  id: string;
  short: string;
  full: string;
  url?: string;
}

export const SOURCES: Source[] = [
  {
    id: 'bj',
    short: 'BJ, Geldspielgesetz',
    full: 'Bundesamt für Justiz (BJ): Geldspielgesetz.',
    url: 'https://www.bj.admin.ch/de/geldspielgesetz',
  },
  {
    id: 'bundesrat',
    short: 'Bundesrat, Medienmitteilung',
    full: 'Der Bundesrat: Medienmitteilung zum Geldspielgesetz.',
    url: 'https://www.admin.ch/de/nsb?id=79674',
  },
  {
    id: 'esbk',
    short: 'ESBK, Spielbankenabgabe',
    full: 'Eidgenössische Spielbankenkommission (ESBK): Spielbankenabgabe.',
    url: 'https://www.esbk.admin.ch/de/spielbankenabgabe',
  },
  {
    id: 'newall',
    short: 'Newall (2025)',
    full:
      "Newall, P. (2025): Sludge, dark patterns and dark nudges: A taxonomy of online gambling platforms' deceptive design features. Addiction, 120(10), 1916–1923. https://doi.org/10.1111/add.70085",
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC12426356/',
  },
  {
    id: 'notari',
    short: 'Notari et al. (2023)',
    full:
      'Notari, L., Kuendig, H., Vorlet, J., Salvetti, K. & Al Kurdi, C. (2023): Online-Glücks- und Geldspiele im Zeitalter von COVID-19 und legalem Angebot. Forschungsbericht Nr. 148b. Lausanne: GREA, Sucht Schweiz.',
  },
  {
    id: 'scv',
    short: 'SCV (2025)',
    full: 'Schweizer Casino Verband (SCV) (2025): Jahresbericht 2024/25 (veröffentlicht am 10.04.2025).',
  },
];

const NEWALL = 'Newall (2025), Addiction 120(10)';
const VGS = 'Art. 87 VGS';
const PSY = 'Allgemeines Konzept der Glücksspielpsychologie';

// ─── Mechanisms ────────────────────────────────────────────────────────────

export type MechanismId =
  | 'nearMissScatter'
  | 'nearMissCoin'
  | 'nearMissLine'
  | 'ldw'
  | 'variableReward'
  | 'anticipation'
  | 'soundFx'
  | 'bigWinCelebration'
  | 'credits'
  | 'defaultBet'
  | 'bonusBuy'
  | 'autoplayTurbo'
  | 'freeSpinsHook'
  | 'sludgeCashout'
  | 'noClock'
  | 'lossChasing';

export type MechanismTag =
  | 'Beinahe-Gewinn'
  | 'Variable Belohnung'
  | 'Effekte'
  | 'Dark Pattern'
  | 'Dark Nudge'
  | 'Sludge'
  | 'Verlustspirale'
  | 'Zeitverzerrung'
  | 'Schutzmassnahme';

export interface Mechanism {
  title: string;
  tag: MechanismTag;
  /** one sentence, for chips / lists */
  short: string;
  /** 2–4 sentences, for cards / background page */
  long: string;
  source?: string;
}

export const MECHANISMS: Record<MechanismId, Mechanism> = {
  nearMissScatter: {
    title: 'Beinahe-Bonus',
    tag: 'Beinahe-Gewinn',
    short: 'Zwei Supernovas – die dritte «verpasst» knapp. Das fühlt sich nach «fast» an, ist aber ein normaler Verlust.',
    long:
      'Wenn zwei Bonus-Symbole liegen und das dritte knapp daneben stoppt, meldet das Gehirn «Ich war nah dran». Dabei ist ein Beinahe-Gewinn genau gleich viel wert wie jeder andere Verlust: nichts. Der Automat bestimmt das Ergebnis per Zufallszahl, bevor die Walzen anhalten. Ein «fast» bringt dich dem nächsten Gewinn keinen Schritt näher.',
    source: PSY,
  },
  nearMissCoin: {
    title: 'Münzen ohne Sammler',
    tag: 'Beinahe-Gewinn',
    short: 'Wertvolle Münzen leuchten auf – ohne Sammler-Symbol sind sie wertlos.',
    long:
      'Sternmünzen zeigen grosse Zahlen und funkeln. Ausbezahlt werden sie aber nur, wenn gleichzeitig ein Sammler landet. Meistens fehlt er. Die Münzen sind ein Köder: Sie zeigen dir, was du «beinahe» gewonnen hättest.',
    source: PSY,
  },
  nearMissLine: {
    title: 'Knapp über der Linie',
    tag: 'Beinahe-Gewinn',
    short: 'Das Top-Symbol stoppt direkt über oder unter der Gewinnlinie.',
    long:
      'Wertvolle Symbole bleiben oft genau neben der Gewinnlinie stehen. So siehst du ständig, wie nah der grosse Gewinn scheinbar war. In Wahrheit spielt die Position neben der Linie keine Rolle – verloren ist verloren.',
    source: PSY,
  },
  ldw: {
    title: 'Verlust als Gewinn getarnt',
    tag: 'Effekte',
    short: 'Der Automat feiert einen «Gewinn», der kleiner ist als dein Einsatz.',
    long:
      'Du setzt 1.00 und «gewinnst» 0.60: Es blinkt, es klingelt, der Zähler läuft hoch. Unter dem Strich hast du 0.40 verloren. Solche Verluste, die wie Gewinne aussehen (englisch «losses disguised as wins», LDW), lassen eine Session erfolgreicher wirken, als sie ist.',
    source: PSY,
  },
  variableReward: {
    title: 'Variable Belohnung',
    tag: 'Variable Belohnung',
    short: 'Gewinne kommen unvorhersehbar. Genau das macht es so schwer, aufzuhören.',
    long:
      'Wann der nächste Gewinn kommt, weiss niemand – vielleicht beim nächsten Spin, vielleicht in 50 Spins. Belohnungen nach einem zufälligen Muster sind besonders fesselnd, weil jeder Spin «der eine» sein könnte. Darum hört man selten nach einem Verlust auf: Der Gewinn könnte ja gleich kommen.',
    source: PSY,
  },
  anticipation: {
    title: 'Künstliche Spannung',
    tag: 'Effekte',
    short: 'Die letzten Walzen drehen langsamer und leuchten – das Ergebnis steht aber längst fest.',
    long:
      'Liegen schon zwei Bonus-Symbole, drehen die restlichen Walzen extra langsam, mit Trommelwirbel und Glühen. Diese Verzögerung ist reine Inszenierung: Das Ergebnis wurde beim Klick auf «Spin» per Zufallszahl bestimmt. Die Spannung soll dich an den Bildschirm binden.',
    source: PSY,
  },
  soundFx: {
    title: 'Sound & Licht',
    tag: 'Effekte',
    short: 'Jeder Gewinn klingelt und funkelt – Verluste sind still.',
    long:
      'Gewinne werden mit Münzklang, Fanfaren und Lichtern gefeiert. Verluste passieren fast lautlos. So bleiben die Gewinne im Gedächtnis hängen und die Verluste nicht. In der Summe fühlt sich die Session besser an, als sie ist.',
    source: PSY,
  },
  bigWinCelebration: {
    title: 'Big-Win-Show',
    tag: 'Effekte',
    short: 'Riesige Animation für einen Gewinn – auch wenn du insgesamt im Minus bist.',
    long:
      'Bei einem grösseren Gewinn übernimmt eine Vollbild-Show: «BIG WIN», «MEGA WIN», hochzählende Zahlen. Was die Show nicht zeigt: wie viel du vorher schon verloren hast. Der einzelne Moment wird gross gemacht, die Gesamtbilanz bleibt unsichtbar.',
    source: PSY,
  },
  credits: {
    title: 'Credits statt Franken',
    tag: 'Dark Nudge',
    short: '«Credits» fühlen sich nicht wie echtes Geld an. Hier gilt: 1 Credit = 1 Franken.',
    long:
      'Wer mit Punkten, Chips oder Credits spielt, merkt weniger, dass es um echtes Geld geht. Ein Einsatz von «2 Credits» wirkt harmlos – doch das sind 2 Franken pro Spin, nach 50 Spins also 100 Franken Einsatz. Die Umrechnung macht der Automat absichtlich nicht für dich.',
    source: NEWALL,
  },
  defaultBet: {
    title: 'Vorausgewählter Einsatz',
    tag: 'Dark Pattern',
    short: 'Der Einsatz startet nicht beim Minimum, sondern höher. Default-Effekt.',
    long:
      'Menschen wählen oft einfach die Option, die ihnen bereits vorgeschlagen wird – das ist der Default-Effekt. Online-Casinos schlagen deshalb hohe Einzahlungs- und Einsatzbeträge vor. Laut Newall ist das gleichzeitig ein Dark Pattern (lenkt dich in eine Richtung) und ein Dark Nudge (nutzt einen Denkfehler aus).',
    source: NEWALL,
  },
  bonusBuy: {
    title: 'Bonus kaufen',
    tag: 'Dark Pattern',
    short: 'Ein Klick kostet 100-mal den Einsatz – so viel wie 100 Spins auf einmal.',
    long:
      'Statt auf den Bonus zu warten, kannst du ihn «kaufen». Der Preis ist das Hundertfache deines Einsatzes. Damit wird in einer Sekunde verspielt, wofür sonst 100 Spins nötig wären. Der grosse goldene Knopf lenkt dich zur Option, die für das Casino am profitabelsten ist.',
    source: NEWALL,
  },
  autoplayTurbo: {
    title: 'Autoplay & Turbo',
    tag: 'Dark Pattern',
    short: 'Schneller spielen heisst: mehr Einsätze pro Minute – und weniger Zeit zum Nachdenken.',
    long:
      'Mit Turbo und Autoplay laufen die Spins ohne Pause durch. Du musst nicht mehr klicken, also auch nicht mehr entscheiden. Mehr Spins pro Minute bedeuten mehr Einsatz pro Minute – und damit schnellere Verluste.',
    source: NEWALL,
  },
  freeSpinsHook: {
    title: 'Gratis-Spins als Köder',
    tag: 'Dark Nudge',
    short: '«Gratis» klingt nach Geschenk – bezahlt hast du die Spins mit allen Verlusten davor.',
    long:
      'Online-Casinos versprechen ständig Gratis-Spins oder doppelte Einsätze. Im Spiel fühlen sich Freispiele wie ein Geschenk an. Bezahlt wurden sie aber mit allen Einsätzen davor – sie sind fest in die Auszahlungsquote des Automaten eingerechnet.',
    source: NEWALL,
  },
  sludgeCashout: {
    title: 'Hürden beim Auszahlen',
    tag: 'Sludge',
    short: 'Einzahlen dauert Sekunden, Auszahlen Werktage – absichtlich.',
    long:
      'Sludge sind Hürden, die hilfreiche Handlungen erschweren. Typisch: Einzahlungen gehen sofort, für Auszahlungen wartet man mehrere Werktage oder muss Bedingungen erfüllen. Wer sofort einzahlen lässt, könnte auch sofort auszahlen. Die Wartezeit lässt dich das Geld weiter anschauen – und ein weiterer Einsatz von 5 Franken scheint ja nicht zu schaden.',
    source: NEWALL,
  },
  noClock: {
    title: 'Keine Uhr',
    tag: 'Zeitverzerrung',
    short: 'Im Spiel fehlt jede Uhr. Wie lange du schon spielst, siehst du nicht.',
    long:
      'Casinos – online wie vor Ort – zeigen selten die Uhrzeit. Ohne Uhr und ohne Pausen verlierst du das Zeitgefühl: Aus «noch fünf Minuten» wird eine Stunde. Weil Online-Casinos rund um die Uhr per Smartphone erreichbar sind, fehlt auch der natürliche Schluss, etwa eine Sperrstunde.',
    source: PSY,
  },
  lossChasing: {
    title: 'Verlustspirale',
    tag: 'Verlustspirale',
    short: 'Verluste zurückholen wollen führt zu höheren Einsätzen – und zu grösseren Verlusten.',
    long:
      'Wer im Minus ist, will das Geld zurückgewinnen und erhöht den Einsatz. Doch der Automat «schuldet» dir nichts: Jeder Spin ist unabhängig vom letzten. Höhere Einsätze machen die Verluste nur schneller grösser. So kann man sich beim Online-Glücksspiel schnell verschulden. Darum gilt in der Schweiz: Eine höhere Limite wird erst nach 24 Stunden aktiv (Art. 87 VGS).',
    source: VGS,
  },
};

export const MECHANISM_ORDER: MechanismId[] = [
  'nearMissScatter',
  'nearMissCoin',
  'nearMissLine',
  'ldw',
  'variableReward',
  'anticipation',
  'soundFx',
  'bigWinCelebration',
  'credits',
  'defaultBet',
  'bonusBuy',
  'autoplayTurbo',
  'freeSpinsHook',
  'sludgeCashout',
  'noClock',
  'lossChasing',
];

// ─── Callouts ──────────────────────────────────────────────────────────────

export type CalloutTone = 'warn' | 'info' | 'alarm';

export interface CalloutData {
  id: string;
  mechanism: MechanismId;
  title: string;
  text: string;
  tag: MechanismTag;
  tone: CalloutTone;
  /** epoch ms */
  at: number;
}

const SYMBOL_NAMES: Record<SymbolId, string> = {
  L1: 'Rubin',
  L2: 'Smaragd',
  L3: 'Saphir',
  L4: 'Amethyst',
  H1: 'Ringplanet',
  H2: 'Komet',
  H3: 'Rakete',
  H4: 'Goldstern',
  WILD: 'Schwarzes Loch',
  SCATTER: 'Supernova',
  COIN: 'Sternmünze',
  COLLECT: 'Sammler',
};

const NEAR_MISS_MECH: Record<NearMissKind, MechanismId> = {
  scatter: 'nearMissScatter',
  coin: 'nearMissCoin',
  line: 'nearMissLine',
};

let seq = 0;
function make(
  mechanism: MechanismId,
  text: string,
  tone: CalloutTone,
  title: string = MECHANISMS[mechanism].title,
  tag: MechanismTag = MECHANISMS[mechanism].tag,
): CalloutData {
  const at = Date.now();
  seq += 1;
  return { id: `${mechanism}-${at}-${seq}`, mechanism, title, text, tag, tone, at };
}

function balanceLine(stats?: SessionStats): string {
  if (!stats || stats.totalWagered <= 0) return '';
  const net = netResult(stats);
  return net < 0
    ? ` Seit Sessionstart hast du trotzdem ${fmtNum(-net)} Credits verloren.`
    : ` Seit Sessionstart liegst du bei ${fmtSigned(net)} Credits – auf lange Sicht zahlt der Automat aber nur rund 95 % zurück.`;
}

/**
 * Turns a bus event into a callout for the reveal feed (or null if the event
 * is not interesting). Pass the CURRENT session stats (already including the
 * spin that triggered the event) for live balance numbers.
 */
export function calloutFor<K extends keyof GameEvents>(
  type: K,
  payload: GameEvents[K],
  stats?: SessionStats,
): CalloutData | null;
export function calloutFor(type: keyof GameEvents, payload: unknown, stats?: SessionStats): CalloutData | null;
export function calloutFor(type: keyof GameEvents, payload: unknown, stats?: SessionStats): CalloutData | null {
  switch (type) {
    case 'ldw': {
      const { win, bet } = payload as GameEvents['ldw'];
      const net = win - bet;
      return make(
        'ldw',
        `Gefeiert wurden ${fmtSigned(win)} Credits – dein Einsatz war ${fmtNum(bet)}. Netto: ${fmtSigned(net)}. Ein Verlust mit Gewinn-Sound.`,
        'warn',
      );
    }

    case 'nearMiss': {
      const { info } = payload as GameEvents['nearMiss'];
      const mech = NEAR_MISS_MECH[info.kind];
      let text = info.detail?.trim() ?? '';
      if (info.stripFact) {
        const f = info.stripFact;
        const pct = f.stripLength > 0 ? (f.countOnStrip / f.stripLength) * 100 : 0;
        const name = SYMBOL_NAMES[f.symbol] ?? f.symbol;
        text += `${text ? ' ' : ''}Walze ${f.reel + 1} hat nur ${f.countOnStrip}× «${name}» auf ${f.stripLength} Positionen (${fmtNum(pct, 1)} %).`;
      }
      text += `${text ? ' ' : ''}«Fast» ist kein Gewinn – das Ergebnis stand schon beim Klick fest.`;
      return make(mech, text, 'warn');
    }

    case 'anticipationStart': {
      const { reel } = payload as GameEvents['anticipationStart'];
      return make(
        'anticipation',
        `Ab Walze ${reel + 1} wird es langsam und laut. Das ist Inszenierung: Das Ergebnis wurde beim Klick auf «Spin» bestimmt.`,
        'info',
      );
    }

    case 'winPresentStart': {
      const { result, amount, tier } = payload as GameEvents['winPresentStart'];
      if (result.isLDW || tier !== 'small' || result.mode !== 'base') return null;
      return make(
        'variableReward',
        `Echter kleiner Gewinn: ${fmtSigned(amount - result.bet)} Credits netto. Wann der nächste kommt, ist reiner Zufall – genau das hält dich am Spielen.`,
        'info',
      );
    }

    case 'rollupStart': {
      const { from, to } = payload as GameEvents['rollupStart'];
      return make(
        'soundFx',
        `Münzklang für ${fmtNum(to - from)} Credits. Verluste dagegen passieren lautlos – so bleiben nur die Gewinne im Kopf.`,
        'info',
      );
    }

    case 'bigWinStart': {
      const { amount, bet, tier } = payload as GameEvents['bigWinStart'];
      const label = tier === 'epic' ? 'Epic Win' : tier === 'mega' ? 'Mega Win' : 'Big Win';
      const x = bet > 0 ? amount / bet : 0;
      return make(
        'bigWinCelebration',
        `${label}! ${fmtSigned(amount)} Credits (${fmtNum(x, 0)}× Einsatz).${balanceLine(stats) || ' Die Show zeigt nur diesen Moment – nicht deine Gesamtbilanz.'}`,
        'warn',
      );
    }

    case 'freeSpinsTriggered': {
      const { count, retrigger } = payload as GameEvents['freeSpinsTriggered'];
      return make(
        'freeSpinsHook',
        `${retrigger ? 'Nochmals ' : ''}${count} «Gratis»-Spins. Bezahlt hast du sie mit allen Einsätzen davor – sie sind in die Auszahlungsquote eingerechnet.${balanceLine(stats)}`,
        'info',
      );
    }

    case 'bonusBuy': {
      const { cost } = payload as GameEvents['bonusBuy'];
      const bet = cost / BONUS_BUY_COST_X;
      return make(
        'bonusBuy',
        `Ein Klick, ${fmtNum(cost)} Credits weg – so viel wie ${BONUS_BUY_COST_X} Spins à ${fmtNum(bet)}. In Franken: CHF ${fmtNum(cost)}.`,
        'alarm',
      );
    }

    case 'spinStart': {
      const { turbo, mode } = payload as GameEvents['spinStart'];
      if (!turbo || mode !== 'base') return null;
      return make(
        'autoplayTurbo',
        'Turbo an: mehr Spins pro Minute heisst mehr Einsatz pro Minute – und weniger Zeit, um nachzudenken.',
        'warn',
      );
    }

    case 'betChange': {
      const { bet, direction } = payload as GameEvents['betChange'];
      if (direction !== 'up' || !stats) return null;
      const net = netResult(stats);
      if (net >= 0) return null;
      return make(
        'lossChasing',
        `Einsatz erhöht auf ${fmtNum(bet)}, während du ${fmtNum(-net)} Credits im Minus bist. Verluste zurückholen wollen ist der Anfang der Verlustspirale.`,
        'alarm',
      );
    }

    case 'cashoutAttempt':
      return make(
        'sludgeCashout',
        'Einzahlen ging in Sekunden. Beim Auszahlen kommen plötzlich Formulare, Wartezeiten und «Angebote». Das ist Sludge.',
        'warn',
      );

    case 'realityCheck': {
      const { minutes, net } = payload as GameEvents['realityCheck'];
      return make(
        'noClock',
        `Du spielst seit ${Math.round(minutes)} Minuten. Bilanz: ${fmtSigned(net)} Credits (= CHF ${fmtSigned(net)}). Im Spiel selbst gibt es keine Uhr.`,
        net < 0 ? 'alarm' : 'info',
      );
    }

    case 'limitReached': {
      const { limit } = payload as GameEvents['limitReached'];
      return make(
        'lossChasing',
        `Deine Verlustlimite von ${fmtNum(limit)} Credits ist erreicht. Genau dafür gibt es Limiten: damit du nicht im Moment des Verlusts nachlegst.`,
        'alarm',
        'Limite erreicht',
        'Schutzmassnahme',
      );
    }

    default:
      return null;
  }
}

/** Static callouts to show once when reveal mode is switched on. */
export function revealIntroCallouts(currentBet: number, minBet: number): CalloutData[] {
  const out: CalloutData[] = [
    make(
      'noClock',
      'Schau dich um: Im Spiel gibt es keine Uhr. Die ehrliche Bilanz mit Spielzeit siehst du jetzt oben.',
      'info',
    ),
    make(
      'credits',
      `Dein Kontostand heisst «Credits». Hier gilt 1 Credit = 1 Franken. Dein Einsatz von ${fmtNum(currentBet)} kostet also CHF ${fmtNum(currentBet)} pro Spin.`,
      'info',
    ),
  ];
  if (currentBet > minBet) {
    out.push(
      make(
        'defaultBet',
        `Der Einsatz war auf ${fmtNum(currentBet)} vorausgewählt – das ${fmtNum(currentBet / minBet, 0)}-Fache des Minimums (${fmtNum(minBet)}). Viele ändern den Vorschlag nie.`,
        'warn',
      ),
    );
  }
  return out;
}

// ─── Gate: avoid flooding the feed ─────────────────────────────────────────

/** Mechanisms explained once per session (they would repeat on every spin). */
const ONCE: ReadonlySet<MechanismId> = new Set<MechanismId>(['autoplayTurbo', 'soundFx', 'credits', 'defaultBet']);

export interface CalloutGate {
  /** true if the callout should be shown; records it if so */
  accept(c: CalloutData): boolean;
  reset(): void;
}

/**
 * Rate limiter for the feed: the same mechanism shows at most every
 * `cooldownMs`; some (turbo, sound, credits, default bet) only once.
 * Alarms (bonus buy, loss chasing, limit) always pass.
 */
export function createCalloutGate(cooldownMs = 6000): CalloutGate {
  const last = new Map<MechanismId, number>();
  const seen = new Set<MechanismId>();
  return {
    accept(c) {
      if (c.tone === 'alarm') {
        last.set(c.mechanism, c.at);
        return true;
      }
      if (ONCE.has(c.mechanism) && seen.has(c.mechanism)) return false;
      const prev = last.get(c.mechanism);
      if (prev !== undefined && c.at - prev < cooldownMs) return false;
      last.set(c.mechanism, c.at);
      seen.add(c.mechanism);
      return true;
    },
    reset() {
      last.clear();
      seen.clear();
    },
  };
}
