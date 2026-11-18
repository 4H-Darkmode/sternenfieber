import { useEffect, useId, useRef, useState } from 'react';
import { fmtNum } from '../../reveal/format';
import s from './BarChart.module.css';

export type BarTone = 'ink' | 'red' | 'muted';

export interface BarSeries {
  name: string;
  tone: BarTone;
}

export interface BarRow {
  label: string;
  /** one value per series */
  values: number[];
  /** optional small note next to the label */
  note?: string;
  /** override the series tone for this row (single-series highlight) */
  tone?: BarTone;
}

export interface BarChartProps {
  title: string;
  /** what one number means, e.g. «in Millionen Franken» */
  subtitle?: string;
  series: BarSeries[];
  rows: BarRow[];
  /** appended to every value label, e.g. ' %' or ' Mio.' */
  unit: string;
  decimals?: number;
  /** domain max; default = largest value */
  max?: number;
  source: string;
  /** extra remark under the chart */
  note?: string;
}

const TONE_FILL: Record<BarTone, string> = {
  ink: 'var(--k-ink)',
  red: 'var(--k-red)',
  muted: '#9a917f',
};

const LABEL_H = 20;
const BAR_H = 14;
const BAR_GAP = 3;
const ROW_GAP = 14;
const VALUE_W = 78;

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(560);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setW(Math.max(240, Math.floor(el.getBoundingClientRect().width)));
    update();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

/**
 * Hand-written horizontal bar chart (inline SVG, rendered at real pixel width
 * so labels stay readable at 360px). Labels sit above their bars, every bar is
 * directly labelled, a data table is available as fallback.
 */
export default function BarChart({
  title,
  subtitle,
  series,
  rows,
  unit,
  decimals = 1,
  max,
  source,
  note,
}: BarChartProps) {
  const [wrapRef, width] = useWidth<HTMLDivElement>();
  const titleId = useId();
  const descId = useId();
  const [hover, setHover] = useState<string | null>(null);

  const domain = max ?? Math.max(...rows.flatMap((r) => r.values), 1);
  const plotW = Math.max(60, width - VALUE_W);
  const rowH = LABEL_H + series.length * (BAR_H + BAR_GAP) - BAR_GAP + ROW_GAP;
  const height = rows.length * rowH - ROW_GAP + 4;

  const fmt = (v: number) => `${fmtNum(v, decimals)}${unit}`;
  const summary = rows
    .map((r) => `${r.label}: ${r.values.map((v, i) => (series.length > 1 ? `${series[i].name} ${fmt(v)}` : fmt(v))).join(', ')}`)
    .join('; ');

  return (
    <figure className={s.figure}>
      <figcaption className={s.caption}>
        <span id={titleId} className={s.title}>
          {title}
        </span>
        {subtitle && <span className={s.subtitle}>{subtitle}</span>}
      </figcaption>

      {series.length > 1 && (
        <ul className={s.legend} aria-hidden="true">
          {series.map((se) => (
            <li key={se.name}>
              <span className={s.swatch} style={{ background: TONE_FILL[se.tone] }} />
              {se.name}
            </li>
          ))}
        </ul>
      )}

      <div ref={wrapRef} className={s.plot}>
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-labelledby={titleId}
          aria-describedby={descId}
          className={s.svg}
        >
          <desc id={descId}>{summary}</desc>
          {/* baseline */}
          <line x1={0.5} x2={0.5} y1={0} y2={height} stroke="var(--k-rule)" strokeWidth={1} />
          {rows.map((r, ri) => {
            const y0 = ri * rowH;
            return (
              <g key={r.label}>
                <text x={0} y={y0 + 14} className={s.rowLabel}>
                  {r.label}
                  {r.note && (
                    <tspan className={s.rowNote} dx={8}>
                      {r.note}
                    </tspan>
                  )}
                </text>
                {r.values.map((v, si) => {
                  const se = series[si];
                  const tone = r.tone ?? se.tone;
                  const y = y0 + LABEL_H + si * (BAR_H + BAR_GAP);
                  const w = Math.max(2, (v / domain) * plotW);
                  const key = `${ri}-${si}`;
                  const dim = hover !== null && hover !== key;
                  return (
                    <g
                      key={key}
                      onMouseEnter={() => setHover(key)}
                      onMouseLeave={() => setHover(null)}
                      className={s.barGroup}
                      style={{ opacity: dim ? 0.45 : 1 }}
                    >
                      <title>{`${r.label}${series.length > 1 ? ` (${se.name})` : ''}: ${fmt(v)}`}</title>
                      {/* hit target larger than the mark */}
                      <rect x={0} y={y - 1} width={width} height={BAR_H + 2} fill="transparent" />
                      {w < 8 ? (
                        <rect x={0} y={y} width={w} height={BAR_H} rx={1} fill={TONE_FILL[tone]} />
                      ) : (
                        <path
                          d={`M0 ${y} H${w - 4} a4 4 0 0 1 4 4 V${y + BAR_H - 4} a4 4 0 0 1 -4 4 H0 Z`}
                          fill={TONE_FILL[tone]}
                        />
                      )}
                      <text x={w + 6} y={y + BAR_H - 2} className={`${s.value} ${tone === 'red' ? s.valueStrong : ''}`}>
                        {fmt(v)}
                      </text>
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>

      <details className={s.table}>
        <summary>Daten als Tabelle</summary>
        <table>
          <thead>
            <tr>
              <th scope="col">&nbsp;</th>
              {series.map((se) => (
                <th key={se.name} scope="col">
                  {se.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label}>
                <th scope="row">
                  {r.label}
                  {r.note ? ` (${r.note})` : ''}
                </th>
                {r.values.map((v, i) => (
                  <td key={i}>{fmt(v)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </details>

      {note && <p className={s.note}>{note}</p>}
      <p className={s.source}>Quelle: {source}</p>
    </figure>
  );
}
