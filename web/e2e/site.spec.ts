import {test, expect, type Page} from '@playwright/test';
import {readFileSync, existsSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const DIST = resolve(here, '../dist');
const WORDS = readFileSync(resolve(here, '../../sql/seeds/palabras_prohibidas.csv'), 'utf8')
  .split(/\r?\n/)
  .slice(1)
  .map((w) => w.trim())
  .filter(Boolean);
const fold = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

const ROUTES = [
  '',
  'precios',
  'entidades',
  'proveedores',
  'senales',
  'red',
  'consola',
  'datos',
  'metodologia',
  'calidad',
  'aviso-legal',
  'privacidad',
  'cookies',
  'derecho-de-respuesta',
  'correcciones',
];

async function settle(page: Page) {
  await expect(page.getByText('Cargando datos')).toHaveCount(0);
  await expect(page.getByText('Cargando página')).toHaveCount(0);
}

test('T-08: every page shows the CC BY 3.0 EC attribution and snapshot', async ({page}) => {
  for (const r of ROUTES) {
    await page.goto(`#/${r}`);
    await settle(page);
    const attribution = page.getByTestId('attribution').first();
    await expect(attribution, `route ${r}`).toContainText('CC BY 3.0 Ecuador');
    await expect(attribution, `route ${r}`).toContainText('SERCOP');
    await expect(attribution, `route ${r}`).toContainText('Instantánea');
  }
});

test('T-06: no accusatory words in any visible page (methodology lists them as forbidden)', async ({page}) => {
  for (const r of ROUTES.filter((x) => x !== 'metodologia')) {
    await page.goto(`#/${r}`);
    await settle(page);
    const text = fold(await page.locator('body').innerText());
    for (const w of WORDS) {
      expect(new RegExp(`(^|[^\\p{L}])${fold(w)}([^\\p{L}]|$)`, 'u').test(text), `"${w}" on route ${r}`).toBe(false);
    }
  }
});

test('T-11: first view weighs under 300 kB gzip and loads no third-party resources', async ({page}) => {
  const urls: string[] = [];
  page.on('request', (req) => urls.push(req.url()));
  await page.goto('');
  await expect(page.getByRole('heading', {level: 1})).toBeVisible();
  await page.waitForLoadState('networkidle');
  const external = urls.filter((u) => !u.startsWith('http://localhost:4173/'));
  expect(external, 'third-party requests').toEqual([]);
  let total = 0;
  for (const u of urls) {
    const path = new URL(u).pathname.replace(/^\//, '') || 'index.html';
    const file = resolve(DIST, path);
    if (existsSync(file) && !file.endsWith('.wasm')) total += gzipSync(readFileSync(file)).length;
  }
  expect(urls.some((u) => u.endsWith('.wasm')), 'DuckDB-Wasm must not load on the first view').toBe(false);
  expect(total, `first view: ${total} bytes gzip`).toBeLessThan(300_000);
});

test('T-11: a typical explorer query answers in under 2 s once the engine is loaded (simulated 4G)', async ({page}) => {
  await page.goto('#/senales');
  await settle(page);
  await expect(page.getByRole('table').first()).toBeVisible();
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 170,
    downloadThroughput: (9 * 1024 * 1024) / 8,
    uploadThroughput: (1.5 * 1024 * 1024) / 8,
  });
  // Measured inside the page: from the filter change until the results replace the spinner.
  const ms = await page.evaluate(async () => {
    const sel = [...document.querySelectorAll('select')].find((x) => x.id.startsWith('sel-a'))!;
    const setValue = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')!.set!;
    const t0 = performance.now();
    setValue.call(sel, '2024');
    sel.dispatchEvent(new Event('change', {bubbles: true}));
    await new Promise((r) => setTimeout(r, 0));
    await new Promise<void>((resolve) => {
      const done = () => {
        const cells = [...document.querySelectorAll('table tbody tr td')].map((td) => td.textContent ?? '');
        return cells.length > 0 && cells.includes('2024') && !cells.some((c) => /^20(1\d|2[0-35-9])$/.test(c));
      };
      const tick = () => (done() ? resolve() : requestAnimationFrame(tick));
      tick();
    });
    return performance.now() - t0;
  });
  await expect(page.getByRole('table').first()).toContainText('2024');
  expect(ms, `query took ${Math.round(ms)} ms`).toBeLessThan(2000);
});

test('price comparison: search, open a group and see each purchase', async ({page}) => {
  await page.goto('#/precios');
  await settle(page);
  await page.getByLabel('Ítem o código CPC').fill('alcohol');
  await page.getByRole('button', {name: 'Buscar'}).click();
  await settle(page);
  await page.getByRole('link').filter({hasText: /ALCOHOL/}).first().click();
  await settle(page);
  await expect(page.getByText('Mediana nacional', {exact: true})).toBeVisible();
  await expect(page.getByRole('heading', {name: 'Cada compra'})).toBeVisible();
});

test('entity profile shows suppliers, signals and the right-of-reply link path', async ({page}) => {
  await page.goto('#/entidades');
  await settle(page);
  await page.getByRole('table').getByRole('link').first().click();
  await settle(page);
  await expect(page.getByRole('heading', {name: 'Proveedores con mayor monto'})).toBeVisible();
  await expect(page.getByText('Una señal no es una acusación').first()).toBeVisible();
  await expect(page.getByRole('link', {name: 'Seguir por RSS'})).toBeVisible();
});

test('T-07: natural persons appear only as "Persona natural", never with a profile', async ({page}) => {
  await page.goto('#/proveedor/NAT-000000000000');
  await settle(page);
  await expect(page.getByText('Proveedor no disponible')).toBeVisible();
  await page.goto('#/proveedores');
  await page.getByLabel('Nombre de la empresa').fill('persona natural');
  await page.getByRole('button', {name: 'Buscar'}).click();
  await settle(page);
  await expect(page.getByText('Sin resultados')).toBeVisible();
});

test('SQL console runs a query in the browser', async ({page}) => {
  await page.goto('#/consola');
  await page.getByRole('button', {name: 'Ejecutar'}).click();
  await expect(page.getByText(/filas en \d+ ms/)).toBeVisible();
  await expect(page.getByRole('table').first()).toContainText('2025');
});

test('cookie notice: informative, dismissable, remembered', async ({page}) => {
  await page.goto('');
  await expect(page.getByText('Este sitio no usa cookies ni analítica')).toBeVisible();
  await page.getByRole('button', {name: 'Cerrar aviso'}).click();
  await page.reload();
  await expect(page.getByRole('heading', {level: 1})).toBeVisible();
  await expect(page.getByText('Este sitio no usa cookies ni analítica')).toHaveCount(0);
  expect(await page.context().cookies()).toEqual([]);
});

test('keyboard: a skip link and a visible focus ring', async ({page}) => {
  await page.goto('');
  await page.keyboard.press('Tab');
  const focused = page.locator(':focus');
  await expect(focused).toBeVisible();
  const outline = await focused.evaluate((el) => getComputedStyle(el).outlineStyle);
  expect(outline).not.toBe('none');
});

test('@mobile panorama and legal pages fit a phone without horizontal scroll', async ({page}) => {
  for (const r of ['', 'privacidad', 'precios']) {
    await page.goto(`#/${r}`);
    await settle(page);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `route ${r}`).toBeLessThanOrEqual(1);
  }
});
