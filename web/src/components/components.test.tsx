import {describe, expect, it, beforeEach} from 'vitest';
import {render, screen, fireEvent} from '@testing-library/react';
import {BarChart} from './BarChart';
import {Attribution} from './Attribution';
import {CookieNotice, NOTICE_KEY} from './CookieNotice';
import {legalPages} from '../content/legal';
import {loadWords, findForbidden} from '../../scripts/check-language.mjs';
import {renderFeed, xmlEscape} from '../../scripts/build-feeds.mjs';

describe('BarChart', () => {
  it('renders one bar per value and an equivalent data table', () => {
    const {container} = render(
      <BarChart
        title="Monto por año"
        bars={[
          {label: '2024', value: 10},
          {label: '2025', value: 20, isAccent: false},
        ]}
      />,
    );
    expect(container.querySelectorAll('rect')).toHaveLength(2);
    expect(container.querySelector('rect.bar-muted')).not.toBeNull();
    expect(screen.getByRole('table', {hidden: true})).toBeInTheDocument();
    expect(screen.getAllByText('2025').length).toBeGreaterThan(0);
  });

  it('keeps a zero baseline with empty or zero data', () => {
    const {container} = render(<BarChart title="Vacío" bars={[{label: 'a', value: 0}]} orientation="horizontal" />);
    expect(container.querySelector('rect')?.getAttribute('width')).toBe('0');
  });
});

describe('Attribution (T-08)', () => {
  it('names the source, the license and the transformation', () => {
    render(<Attribution snapshotId={12} snapshotDate="2026-11-11" />);
    const text = screen.getByTestId('attribution').textContent ?? '';
    expect(text).toContain('SERCOP');
    expect(text).toContain('CC BY 3.0 Ecuador');
    expect(text).toContain('transformados por LUPA');
    expect(text).toContain('Instantánea 12');
  });
});

describe('CookieNotice', () => {
  beforeEach(() => window.localStorage.clear());

  it('informs that no cookies are used and remembers dismissal locally', () => {
    render(<CookieNotice />);
    expect(screen.getByText(/no usa cookies/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', {name: /cerrar aviso/i}));
    expect(window.localStorage.getItem(NOTICE_KEY)).toBe('1');
    expect(screen.queryByText(/no usa cookies/i)).toBeNull();
  });

  it('stays hidden once dismissed', () => {
    window.localStorage.setItem(NOTICE_KEY, '1');
    render(<CookieNotice />);
    expect(screen.queryByText(/no usa cookies/i)).toBeNull();
  });
});

describe('legal texts', () => {
  it('cover the required pages and state contact options', () => {
    const pages = legalPages('contacto@ejemplo.ec');
    expect(Object.keys(pages).sort()).toEqual(['aviso-legal', 'cookies', 'correcciones', 'derecho-de-respuesta', 'privacidad']);
    expect(JSON.stringify(pages.privacidad)).toContain('LOPDP');
    expect(JSON.stringify(pages['derecho-de-respuesta'])).toContain('contacto@ejemplo.ec');
    expect(JSON.stringify(legalPages(null)['aviso-legal'])).toContain('se publicará en esta página');
  });

  it('use no accusatory words (T-06)', () => {
    const words = loadWords();
    for (const page of Object.values(legalPages('x@y.ec'))) {
      expect(findForbidden(JSON.stringify(page), words)).toEqual([]);
    }
  });
});

describe('language checker', () => {
  it('detects whole words regardless of accents and case', () => {
    expect(findForbidden('Hubo CORRUPCION en el texto', ['corrupción'])).toEqual(['corrupción']);
    expect(findForbidden('sobrepreciosa no es palabra', ['sobreprecio'])).toEqual([]);
  });
});

describe('RSS feeds', () => {
  it('escapes XML and renders valid items', () => {
    expect(xmlEscape('A & B <C> "d"')).toBe('A &amp; B &lt;C&gt; &quot;d&quot;');
    const xml = renderFeed(
      {tipo: 'entidad', id: 'EC-1', nombre: 'HOSPITAL & CLÍNICA', items: [{ocid: 'o1', fecha: '2025-01-02', monto: 100, procedimiento: 'Licitación', proveedor: 'Persona natural'}]},
      'https://example.org/',
    );
    expect(xml).toContain('<rss version="2.0">');
    expect(xml).toContain('HOSPITAL &amp; CLÍNICA');
    expect(xml).toContain('CC BY 3.0 Ecuador');
    expect(xml).toContain('https://example.org/#/entidad/EC-1');
  });
});
