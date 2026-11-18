/** Formatting helpers for the clarity (reveal) world. Swiss style: 1'234.50 */

const MINUS = '−';

/** 1234.5 → "1'234.50" (no sign for positives) */
export function fmtNum(n: number, decimals = 2): string {
  const abs = Math.abs(n);
  const [int, frac] = abs.toFixed(decimals).split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, "'");
  const body = frac ? `${grouped}.${frac}` : grouped;
  return n < 0 && Number(abs.toFixed(decimals)) !== 0 ? `${MINUS}${body}` : body;
}

/** always signed: "+0.60" / "−0.40" / "±0.00" */
export function fmtSigned(n: number, decimals = 2): string {
  const rounded = Number(n.toFixed(decimals));
  if (rounded === 0) return `±${fmtNum(0, decimals)}`;
  return rounded > 0 ? `+${fmtNum(n, decimals)}` : fmtNum(n, decimals);
}

/** "CHF −12.40" */
export function fmtChf(n: number, signed = false): string {
  return `CHF ${signed ? fmtSigned(n) : fmtNum(n)}`;
}

export function fmtPct(ratio: number, decimals = 1): string {
  return `${fmtNum(ratio * 100, decimals)} %`;
}

/** ms → "mm:ss" (or "h:mm:ss" past one hour) */
export function fmtDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (v: number) => String(v).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/** epoch ms → "Do 19.11., 14:32" */
export function fmtDateTime(ms: number): string {
  const d = new Date(ms);
  const days = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  const pad = (v: number) => String(v).padStart(2, '0');
  return `${days[d.getDay()]} ${pad(d.getDate())}.${pad(d.getMonth() + 1)}., ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
