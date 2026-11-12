import {Component, lazy, Suspense, useEffect, useState, type ReactNode} from 'react';
import {warmUpWhenIdle} from './lib/engine';
import {Spinner} from '@astryxdesign/core/Spinner';
import {Banner} from '@astryxdesign/core/Banner';
import {Button} from '@astryxdesign/core/Button';
import {useRoute, href} from './lib/router';
import {getJson, type Meta} from './lib/data';
import {fmtUsdShort} from './lib/format';
import {useAsync} from './components/Async';
import {Attribution} from './components/Attribution';
import {CookieNotice} from './components/CookieNotice';
import {Icon, Logo} from './components/Icons';
import {NAV, FOOTER_LINKS, SITE, SOURCE_LINKS} from './content/site';
import {InicioPage} from './pages/Inicio';
import {LegalPage, isLegalSlug} from './pages/Legal';
import {NotFoundPage} from './pages/NotFound';

const PanoramaPage = lazy(() => import('./pages/Panorama').then((m) => ({default: m.PanoramaPage})));
const PreciosPage = lazy(() => import('./pages/Precios').then((m) => ({default: m.PreciosPage})));
const EntidadesPage = lazy(() => import('./pages/Entidades').then((m) => ({default: m.EntidadesPage})));
const EntidadPage = lazy(() => import('./pages/Entidades').then((m) => ({default: m.EntidadPage})));
const ProveedoresPage = lazy(() => import('./pages/Proveedores').then((m) => ({default: m.ProveedoresPage})));
const ProveedorPage = lazy(() => import('./pages/Proveedores').then((m) => ({default: m.ProveedorPage})));
const SenalesPage = lazy(() => import('./pages/Senales').then((m) => ({default: m.SenalesPage})));
const RedPage = lazy(() => import('./pages/Red').then((m) => ({default: m.RedPage})));
const ConsolaPage = lazy(() => import('./pages/Consola').then((m) => ({default: m.ConsolaPage})));
const DatosPage = lazy(() => import('./pages/Datos').then((m) => ({default: m.DatosPage})));
const MetodologiaPage = lazy(() => import('./pages/Metodologia').then((m) => ({default: m.MetodologiaPage})));
const CalidadPage = lazy(() => import('./pages/Calidad').then((m) => ({default: m.CalidadPage})));

interface Tendencias {
  anio: number;
  entidades: Array<{id: string; nombre: string; monto: number}>;
  proveedores: Array<{id: string; nombre: string; monto: number}>;
}

function Page() {
  const route = useRoute();
  const [a, b, c] = route.params;
  switch (route.path) {
    case '':
      return <InicioPage />;
    case 'cifras':
      return <PanoramaPage />;
    case 'precios':
      return <PreciosPage cpc={a} unidad={b} anio={c} />;
    case 'entidades':
      return <EntidadesPage initial={route.query.get('q') ?? ''} />;
    case 'entidad':
      return a ? <EntidadPage id={a} /> : <EntidadesPage initial="" />;
    case 'proveedores':
      return <ProveedoresPage />;
    case 'proveedor':
      return a ? <ProveedorPage id={a} /> : <ProveedoresPage />;
    case 'senales':
      return <SenalesPage indicador={a} />;
    case 'red':
      return <RedPage />;
    case 'consola':
      return <ConsolaPage />;
    case 'datos':
      return <DatosPage />;
    case 'metodologia':
      return <MetodologiaPage />;
    case 'calidad':
      return <CalidadPage />;
    default:
      return isLegalSlug(route.path) ? <LegalPage slug={route.path} /> : <NotFoundPage />;
  }
}

/** Secondary panels must never take the page down: on error they simply disappear. */
class QuietBoundary extends Component<{children: ReactNode}, {failed: boolean}> {
  state = {failed: false};
  static getDerivedStateFromError() {
    return {failed: true};
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/** After a new deployment an old tab may ask for page files that no longer exist. */
class PageErrorBoundary extends Component<{children: ReactNode; resetKey: string}, {failed: boolean}> {
  state = {failed: false};
  static getDerivedStateFromError() {
    return {failed: true};
  }
  componentDidUpdate(prev: {resetKey: string}) {
    if (prev.resetKey !== this.props.resetKey && this.state.failed) this.setState({failed: false});
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="feed-body">
        <Banner
          status="warning"
          title="No se pudo abrir esta página"
          description="Puede que el sitio se haya actualizado mientras lo tenías abierto."
          endContent={<Button label="Recargar" variant="primary" onClick={() => window.location.reload()} />}
        />
      </div>
    );
  }
}

function isActive(current: string, path: string): boolean {
  if (path === 'entidades') return current === 'entidades' || current === 'entidad';
  if (path === 'proveedores') return current === 'proveedores' || current === 'proveedor';
  return current === path;
}

function SideNav() {
  const route = useRoute();
  return (
    <nav className="side-nav" aria-label="Secciones">
      <ul>
        {NAV.map((item) => (
          <li key={item.path}>
            <a href={href(item.path)} aria-current={isActive(route.path, item.path) ? 'page' : undefined}>
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function BottomNav() {
  const route = useRoute();
  const items = NAV.filter((n) => n.mobile);
  return (
    <nav className="bottom-nav" aria-label="Secciones principales">
      <ul>
        {items.map((item) => (
          <li key={item.path}>
            <a href={href(item.path)} aria-current={isActive(route.path, item.path) ? 'page' : undefined}>
              <Icon name={item.icon} />
              {item.short ?? item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function SearchBox() {
  const [q, setQ] = useState('');
  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        const term = q.trim().slice(0, 80);
        if (term) window.location.hash = `#/entidades?q=${encodeURIComponent(term)}`;
      }}
    >
      <label className="search-pill">
        <Icon name="buscar" />
        <span className="visually-hidden">Buscar una entidad</span>
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar una entidad" />
      </label>
    </form>
  );
}

function RightRail() {
  const meta = useAsync(() => Promise.all([getJson<Meta>('meta.json'), getJson<Tendencias>('tendencias.json')]), []);
  const ready = meta.status === 'ready' ? meta.data : null;
  return (
    <aside className="rail-right" aria-label="Tendencias y fuente">
      <SearchBox />
      {ready ? (
        <>
          <section className="panel" aria-labelledby="h-tend-ent">
            <h2 id="h-tend-ent">Más adjudicado en {ready[1].anio}</h2>
            {(ready[1].entidades ?? []).map((e, i) => (
              <a key={e.id} className="panel-row" href={href('entidad', e.id)}>
                <small>{i + 1} · Entidad</small>
                <strong>{e.nombre}</strong>
                <small>{fmtUsdShort(e.monto)}</small>
              </a>
            ))}
          </section>
          <section className="panel" aria-labelledby="h-tend-prov">
            <h2 id="h-tend-prov">Empresas con más adjudicaciones</h2>
            {(ready[1].proveedores ?? []).map((p, i) => (
              <a key={p.id} className="panel-row" href={href('proveedor', p.id)}>
                <small>{i + 1} · Empresa</small>
                <strong>{p.nombre}</strong>
                <small>{fmtUsdShort(p.monto)}</small>
              </a>
            ))}
          </section>
        </>
      ) : null}
      <section className="panel" aria-label="Fuente y avisos">
        <div className="panel-foot">
          <Attribution snapshotId={ready?.[0].snapshot_id} snapshotDate={ready?.[0].snapshot_fecha} />
          <ul>
            {FOOTER_LINKS.map((l) => (
              <li key={l.path}>
                <a href={href(l.path)}>{l.label}</a>
              </li>
            ))}
            <li>
              <a href={SOURCE_LINKS.repo} rel="noopener noreferrer" target="_blank">
                Código fuente
              </a>
            </li>
          </ul>
        </div>
      </section>
    </aside>
  );
}

/** Attribution and legal links at the end of the column, visible when the right rail is hidden. */
function ColumnFooter() {
  const meta = useAsync(() => getJson<Meta>('meta.json'), []);
  const ready = meta.status === 'ready' ? meta.data : null;
  return (
    <footer className="panel-foot" style={{borderTop: '1px solid var(--lupa-rule)'}}>
      <Attribution snapshotId={ready?.snapshot_id} snapshotDate={ready?.snapshot_fecha} />
      <ul>
        {FOOTER_LINKS.map((l) => (
          <li key={l.path}>
            <a href={href(l.path)}>{l.label}</a>
          </li>
        ))}
      </ul>
    </footer>
  );
}

export function App() {
  const route = useRoute();
  useEffect(() => warmUpWhenIdle(), []);
  return (
    <>
      <a className="skip-link" href="#contenido">
        Saltar al contenido
      </a>
      <div className="mobile-top">
        <a className="brand" href={href('')} aria-label="LUPA, inicio">
          <Logo />
          LUPA
        </a>
        <a href={href('metodologia')}>Método</a>
      </div>
      <div className="shell">
        <header className="rail-left">
          <a className="brand" href={href('')} aria-label="LUPA, inicio">
            <Logo />
            <span>LUPA</span>
          </a>
          <SideNav />
          <p className="rail-note">{SITE.railNote}</p>
        </header>
        <main id="contenido" className="feed-col" tabIndex={-1}>
          <PageErrorBoundary resetKey={`${route.path}/${route.params.join('/')}`}>
            <Suspense fallback={<div className="feed-body"><Spinner label="Cargando página" /></div>}>
              <div className="page">
                <Page />
              </div>
            </Suspense>
          </PageErrorBoundary>
          <ColumnFooter />
        </main>
        <QuietBoundary>
          <RightRail />
        </QuietBoundary>
      </div>
      <BottomNav />
      <CookieNotice />
    </>
  );
}
