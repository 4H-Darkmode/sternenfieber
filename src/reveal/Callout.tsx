import type { CSSProperties } from 'react';
import type { CalloutData } from './content';
import { MECHANISMS } from './content';
import s from './Callout.module.css';

export interface CalloutProps {
  item: CalloutData;
  onDismiss?: (id: string) => void;
  /** visual de-emphasis for older items (0..1, 1 = fully visible) */
  emphasis?: number;
  /** true while leaving (fade-out) */
  leaving?: boolean;
  /** show the long explanation below the live text */
  expanded?: boolean;
  /** if given, a «Warum?» toggle is shown */
  onToggleExpand?: () => void;
}

export default function Callout({ item, onDismiss, emphasis = 1, leaving = false, expanded = false, onToggleExpand }: CalloutProps) {
  const mech = MECHANISMS[item.mechanism];
  const style = { '--emph': String(emphasis) } as CSSProperties;
  return (
    <article
      className={`${s.card} ${s[item.tone]} ${leaving ? s.leaving : ''}`}
      style={style}
      aria-label={`${item.tag}: ${item.title}`}
    >
      <span className={s.margin} aria-hidden="true">
        {item.tone === 'alarm' ? '!!' : item.tone === 'warn' ? '!' : 'i'}
      </span>
      <div className={s.body}>
        <header className={s.head}>
          <span className={s.tag}>{item.tag}</span>
          <h3 className={s.title}>{item.title}</h3>
        </header>
        <p className={s.text}>{item.text}</p>
        {onToggleExpand && (
          <button type="button" className={s.more} onClick={onToggleExpand} aria-expanded={expanded}>
            {expanded ? 'Weniger' : 'Warum wirkt das?'}
          </button>
        )}
        {expanded && (
          <p className={s.long}>
            {mech.long}
            {mech.source && <span className={s.source}> Quelle: {mech.source}</span>}
          </p>
        )}
      </div>
      {onDismiss && (
        <button type="button" className={s.close} onClick={() => onDismiss(item.id)} aria-label="Hinweis schliessen">
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
            <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </article>
  );
}
