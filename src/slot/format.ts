const nf2 = new Intl.NumberFormat('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const nf0 = new Intl.NumberFormat('de-CH', { maximumFractionDigits: 0 });

/** Credits with two decimals, Swiss grouping: 1’234.50 */
export function formatCredits(n: number): string {
  return nf2.format(Math.round(n * 100) / 100);
}

/** Compact label for coin symbols: "2.00", "40.00", "1’200" */
export function formatCoin(n: number): string {
  return n >= 1000 ? nf0.format(n) : formatCredits(n);
}
