// Number and date formatting for Ecuador (es-EC). All figures use tabular numerals in CSS.
const usd = new Intl.NumberFormat('es-EC', {style: 'currency', currency: 'USD', maximumFractionDigits: 0});
const usdCents = new Intl.NumberFormat('es-EC', {style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 4});
const int = new Intl.NumberFormat('es-EC', {maximumFractionDigits: 0});
const dec = new Intl.NumberFormat('es-EC', {minimumFractionDigits: 1, maximumFractionDigits: 2});

const toNumber = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'bigint' ? Number(v) : Number(v);
  return Number.isFinite(n) ? n : null;
};

export const fmtUsd = (v: unknown): string => {
  const n = toNumber(v);
  return n === null ? 'sin dato' : usd.format(n);
};

export const fmtPrice = (v: unknown): string => {
  const n = toNumber(v);
  return n === null ? 'sin dato' : usdCents.format(n);
};

export const fmtInt = (v: unknown): string => {
  const n = toNumber(v);
  return n === null ? 'sin dato' : int.format(n);
};

export const fmtRatio = (v: unknown): string => {
  const n = toNumber(v);
  return n === null ? 'sin dato' : `${dec.format(n)} veces`;
};

/** Compact USD for chart labels: 1,2 mil M (thousand millions) style used in Ecuadorian press. */
export const fmtUsdShort = (v: unknown): string => {
  const n = toNumber(v);
  if (n === null) return 'sin dato';
  const abs = Math.abs(n);
  if (abs >= 1e9) return `${dec.format(n / 1e9)} mil M`;
  if (abs >= 1e6) return `${dec.format(n / 1e6)} M`;
  if (abs >= 1e3) return `${dec.format(n / 1e3)} mil`;
  return int.format(n);
};

export const fmtDate = (v: unknown): string => {
  if (v === null || v === undefined) return 'sin dato';
  const d = v instanceof Date ? v : new Date(typeof v === 'number' ? v : String(v));
  if (Number.isNaN(d.getTime())) return 'sin dato';
  return d.toISOString().slice(0, 10);
};

export {toNumber};
