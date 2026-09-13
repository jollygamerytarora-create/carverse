export const fmt = (n: number): string => n.toLocaleString('en-US');

export const usd = (n: number): string =>
  '$' + (n >= 1000 ? n.toLocaleString('en-US') : String(n));

/**
 * Demo USD → INR conversion. The database stores demo prices in USD;
 * INR figures are indicative (market FX ≈ 83, on-road costs excluded).
 */
export const USD_TO_INR = 83;

export const inr = (usd: number): string => {
  const v = Math.round(usd * USD_TO_INR);
  if (v >= 10000000) return '₹' + (v / 10000000).toFixed(2) + ' Cr';
  if (v >= 100000) return '₹' + (v / 100000).toFixed(2) + ' L';
  return '₹' + v.toLocaleString('en-IN');
};

/** "$122,000 · ₹1.01 Cr" dual-currency demo price tag. */
export const priceTag = (amount: number): string => `${usd(amount)} · ${inr(amount)}`;

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(pointer: coarse)').matches;
}

/** Konami sequence detector for easter eggs. */
export function createKonamiListener(cb: () => void): () => void {
  const SEQ = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  let pos = 0;
  const handler = (e: KeyboardEvent) => {
    pos = e.key === SEQ[pos] ? pos + 1 : e.key === SEQ[0] ? 1 : 0;
    if (pos === SEQ.length) {
      pos = 0;
      cb();
    }
  };
  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
}

export const clamp = (v: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, v));

/** Pick the most vivid (saturated/bright) colour from a vehicle's palette. */
export function vividPaintOf(v: { colors: { hex: string }[] }): string {
  const vividness = (hex: string) => {
    const c = hex.replace('#', '');
    const r = parseInt(c.slice(0, 2), 16) / 255;
    const g = parseInt(c.slice(2, 4), 16) / 255;
    const b = parseInt(c.slice(4, 6), 16) / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const sat = max === 0 ? 0 : (max - min) / max;
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return sat * 0.75 + lum * 0.25;
  };
  const colors = v.colors ?? [];
  return colors.reduce((best, c) => (vividness(c.hex) > vividness(best) ? c.hex : best), colors[0]?.hex ?? '#7a828c');
}
