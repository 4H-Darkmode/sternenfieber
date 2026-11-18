import s from './RevealToggle.module.css';

export interface RevealToggleProps {
  value: boolean;
  onChange: (next: boolean) => void;
  className?: string;
  /** default «Mechanismen zeigen» */
  label?: string;
}

/** Red-marker switch that turns reveal mode on/off. */
export default function RevealToggle({ value, onChange, className, label = 'Mechanismen zeigen' }: RevealToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      className={`${s.toggle} ${value ? s.on : ''} ${className ?? ''}`}
      onClick={() => onChange(!value)}
    >
      <span className={s.label}>
        {label}
        <svg className={s.scribble} viewBox="0 0 120 8" preserveAspectRatio="none" aria-hidden="true">
          <path d="M2 5 C 20 1, 35 7, 55 4 S 95 2, 118 5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </span>
      <span className={s.track} aria-hidden="true">
        <span className={s.thumb}>
          <svg viewBox="0 0 16 16" width="14" height="14">
            {value ? (
              <path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            ) : (
              <circle cx="8" cy="8" r="2.5" fill="currentColor" />
            )}
          </svg>
        </span>
      </span>
      <span className={s.state} aria-hidden="true">
        {value ? 'AN' : 'AUS'}
      </span>
    </button>
  );
}
