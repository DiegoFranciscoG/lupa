import {describe, expect, it} from 'vitest';
import {fmtDate, fmtInt, fmtPrice, fmtRatio, fmtUsd, fmtUsdShort, toNumber} from './format';
import {href, parseHash} from './router';
import {sumBy} from './data';
import {viewStatements} from './db';
import {cleanTerm, medianByEntity} from '../pages/Precios';
import {feedSlug} from '../pages/Entidades';

describe('format', () => {
  it('formats dollars and integers for Ecuador', () => {
    expect(fmtUsd(1234567)).toContain('1.234.567');
    expect(fmtInt(2251027)).toBe('2.251.027');
    expect(fmtPrice(0.0064)).toContain('0,0064');
  });

  it('never invents a value for missing data', () => {
    expect(fmtUsd(null)).toBe('sin dato');
    expect(fmtInt(undefined)).toBe('sin dato');
    expect(fmtRatio('')).toBe('sin dato');
    expect(fmtDate('not a date')).toBe('sin dato');
    expect(toNumber('abc')).toBeNull();
  });

  it('formats ratios and short amounts', () => {
    expect(fmtRatio(4.3)).toBe('4,3 veces');
    expect(fmtUsdShort(4_150_000_000)).toBe('4,15 mil M');
    expect(fmtUsdShort(2_500_000)).toBe('2,5 M');
    expect(fmtUsdShort(7_500)).toBe('7,5 mil');
    expect(fmtUsdShort(12)).toBe('12');
  });

  it('accepts bigint from DuckDB', () => {
    expect(fmtInt(BigInt(42))).toBe('42');
    expect(fmtDate('2025-03-01T00:00:00Z')).toBe('2025-03-01');
  });
});

describe('router', () => {
  it('parses paths, params and query', () => {
    const r = parseHash('#/precios/352/SIN%20UNIDAD/2025?x=1');
    expect(r.path).toBe('precios');
    expect(r.params).toEqual(['352', 'SIN UNIDAD', '2025']);
    expect(r.query.get('x')).toBe('1');
    expect(parseHash('').path).toBe('');
  });

  it('builds encoded links', () => {
    expect(href('entidad', 'EC-RUC-1/2')).toBe('#/entidad/EC-RUC-1%2F2');
    expect(href('')).toBe('#/');
  });
});

describe('data helpers', () => {
  it('sums by key, descending', () => {
    const out = sumBy([{k: 'a', v: 1}, {k: 'b', v: 5}, {k: 'a', v: 2}], (r) => r.k, (r) => r.v);
    expect(out).toEqual([
      {label: 'b', value: 5},
      {label: 'a', value: 3},
    ]);
  });

  it('creates one view per table with escaped URLs', () => {
    const stmts = viewStatements(['adjudicaciones/anio=2025/datos0.parquet', "items/anio=2025/o'k.parquet"], (p) => `https://x/${p}`);
    expect(stmts.some((s) => s.startsWith('CREATE OR REPLACE VIEW entidades'))).toBe(true);
    expect(stmts.find((s) => s.includes('VIEW adjudicaciones'))).toContain('https://x/adjudicaciones/anio=2025/datos0.parquet');
    expect(stmts.find((s) => s.includes('VIEW items'))).toContain("o''k.parquet");
    expect(stmts.some((s) => s.includes('VIEW procesos'))).toBe(false);
  });
});

describe('page helpers', () => {
  it('cleans search input', () => {
    expect(cleanTerm('  para   cetamol  ')).toBe('para cetamol');
    expect(cleanTerm('x'.repeat(200))).toHaveLength(80);
  });

  it('computes the median price per entity', () => {
    const out = medianByEntity([
      {entidad: 'A', precio_unitario: 1},
      {entidad: 'A', precio_unitario: 3},
      {entidad: 'B', precio_unitario: 10},
      {entidad: 'B', precio_unitario: null},
    ]);
    expect(out).toEqual([
      {label: 'B', value: 10, n: 1},
      {label: 'A', value: 2, n: 2},
    ]);
  });

  it('makes file-safe feed slugs', () => {
    expect(feedSlug('EC-RUC-0960000001001-1')).toBe('EC-RUC-0960000001001-1');
    expect(feedSlug('a/b c')).toBe('a_b_c');
  });
});
