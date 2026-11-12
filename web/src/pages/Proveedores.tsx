import {useState} from 'react';
import {Heading} from '@astryxdesign/core/Heading';
import {Text} from '@astryxdesign/core/Text';
import {VStack} from '@astryxdesign/core/VStack';
import {HStack} from '@astryxdesign/core/HStack';
import {Link} from '@astryxdesign/core/Link';
import {Button} from '@astryxdesign/core/Button';
import {TextInput} from '@astryxdesign/core/TextInput';
import {Banner} from '@astryxdesign/core/Banner';
import {query} from '../lib/db';
import {fmtInt, fmtUsd, fmtUsdShort, toNumber} from '../lib/format';
import {href} from '../lib/router';
import {Loaded, useAsync} from '../components/Async';
import {BarChart} from '../components/BarChart';
import {DataTable} from '../components/DataTable';
import {PageHeader, Stat} from '../components/PageHeader';
import {cleanTerm} from './Precios';
import {feedSlug} from './Entidades';

// Only legal persons (companies) have a public profile. Natural persons never do (LOPDP).
export function ProveedoresPage() {
  const [term, setTerm] = useState('');
  const [submitted, setSubmitted] = useState('');
  const state = useAsync(() => {
    const t = cleanTerm(submitted).toUpperCase();
    if (t.length < 3) return Promise.resolve(null);
    return query(
      `SELECT proveedor_id, nombre, provincia FROM proveedores
       WHERE tipo = 'juridica' AND nombre LIKE ? ORDER BY nombre LIMIT 50`,
      [`%${t}%`],
    );
  }, [submitted]);
  return (
    <VStack gap={5}>
      <PageHeader
        title="Proveedores"
        lead="Qué contratos ganó cada empresa, con qué entidades y en qué años. Las personas naturales no tienen ficha pública."
      />
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(term);
        }}
      >
        <HStack gap={2} vAlign="end" wrap="wrap">
          <div style={{minWidth: 260, flex: '1 1 320px'}}>
            <TextInput label="Nombre de la empresa" description="Al menos 3 letras" value={term} onChange={setTerm} />
          </div>
          <Button type="submit" label="Buscar" variant="primary" />
        </HStack>
      </form>
      <Loaded state={state}>
        {(rows) =>
          rows === null ? (
            <Text color="secondary">Escribe el nombre de una empresa para empezar.</Text>
          ) : rows.length === 0 ? (
            <Banner status="info" title="Sin resultados" description="No hay empresas con ese nombre." />
          ) : (
            <DataTable
              rows={rows}
              columns={[
                {key: 'nombre', header: 'Empresa', render: (r) => <Link href={href('proveedor', String(r.proveedor_id))}>{String(r.nombre)}</Link>},
                {key: 'provincia', header: 'Provincia'},
              ]}
            />
          )
        }
      </Loaded>
    </VStack>
  );
}

export function ProveedorPage({id}: {id: string}) {
  const state = useAsync(async () => {
    const [p] = await query("SELECT * FROM proveedores WHERE proveedor_id = ? AND tipo = 'juridica'", [id]);
    if (!p) return null;
    const anios = await query(
      `SELECT anio, sum(monto) AS monto, count(*) AS adjudicaciones FROM adjudicaciones
       WHERE proveedor_id = ? AND vigente GROUP BY anio ORDER BY anio`,
      [id],
    );
    const entidades = await query(
      `SELECT a.entidad_id, coalesce(e.nombre, 'Sin dato') AS nombre, sum(a.monto) AS monto, count(*) AS adjudicaciones,
              min(a.anio) AS desde, max(a.anio) AS hasta
       FROM adjudicaciones a LEFT JOIN entidades e USING (entidad_id)
       WHERE a.proveedor_id = ? AND a.vigente GROUP BY ALL ORDER BY monto DESC NULLS LAST LIMIT 20`,
      [id],
    );
    return {p, anios, entidades};
  }, [id]);
  return (
    <Loaded state={state}>
      {(d) =>
        !d ? (
          <Banner status="info" title="Proveedor no disponible" description="No existe o no es una persona jurídica." />
        ) : (
          <VStack gap={5}>
            <PageHeader title={String(d.p.nombre)} lead={`${d.p.provincia} · RUC ${d.p.ruc ?? 'sin dato'}`}>
              <HStack gap={3} wrap="wrap">
                <Link href={href('proveedores')}>Volver a proveedores</Link>
                <Link href={`./rss/proveedor/${feedSlug(String(d.p.proveedor_id))}.xml`}>Seguir por RSS</Link>
              </HStack>
            </PageHeader>
            <div className="lupa-stats">
              <Stat label="Monto adjudicado" value={fmtUsdShort(d.anios.reduce((s, r) => s + (toNumber(r.monto) ?? 0), 0))} />
              <Stat label="Adjudicaciones" value={fmtInt(d.anios.reduce((s, r) => s + (toNumber(r.adjudicaciones) ?? 0), 0))} />
              <Stat label="Entidades compradoras" value={d.entidades.length >= 20 ? '20 o más' : fmtInt(d.entidades.length)} />
            </div>
            <section aria-labelledby="h-anios">
              <VStack gap={2}>
                <Heading level={2} id="h-anios">Monto adjudicado por año</Heading>
                <BarChart title="Monto adjudicado por año" bars={d.anios.map((r) => ({label: String(r.anio), value: toNumber(r.monto) ?? 0}))} />
              </VStack>
            </section>
            <section aria-labelledby="h-ent">
              <VStack gap={2}>
                <Heading level={2} id="h-ent">Entidades que le adjudicaron</Heading>
                <DataTable
                  rows={d.entidades}
                  columns={[
                    {key: 'nombre', header: 'Entidad', render: (r) => <Link href={href('entidad', String(r.entidad_id))}>{String(r.nombre)}</Link>},
                    {key: 'monto', header: 'Monto', align: 'end', render: (r) => fmtUsd(r.monto)},
                    {key: 'adjudicaciones', header: 'Adjudicaciones', align: 'end', render: (r) => fmtInt(r.adjudicaciones)},
                    {key: 'desde', header: 'Años', render: (r) => (r.desde === r.hasta ? String(r.desde) : `${r.desde} a ${r.hasta}`)},
                  ]}
                />
                <Text type="supporting" color="secondary">
                  Las 20 entidades con mayor monto.
                </Text>
              </VStack>
            </section>
          </VStack>
        )
      }
    </Loaded>
  );
}
