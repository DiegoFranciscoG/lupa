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
import {INDICATOR_TEXT, SITE} from '../content/site';

/** File-safe slug for RSS feeds (same rule as scripts/build-feeds.mjs). */
export function feedSlug(id: string): string {
  return id.replace(/[^A-Za-z0-9-]/g, '_');
}

export function EntidadesPage({initial = ''}: {initial?: string}) {
  const [term, setTerm] = useState(initial);
  const [submitted, setSubmitted] = useState(initial);
  const state = useAsync(() => {
    const t = cleanTerm(submitted).toUpperCase();
    if (!t) {
      return query(
        `SELECT e.entidad_id, e.nombre, e.provincia, sum(c.monto_total) AS monto, sum(c.adjudicaciones) AS adjudicaciones
         FROM concentracion c JOIN entidades e USING (entidad_id)
         WHERE e.tipo <> 'natural'
         GROUP BY ALL ORDER BY monto DESC LIMIT 25`,
      );
    }
    return query(
      `SELECT e.entidad_id, e.nombre, e.provincia, sum(c.monto_total) AS monto, sum(c.adjudicaciones) AS adjudicaciones
       FROM entidades e LEFT JOIN concentracion c USING (entidad_id)
       WHERE e.tipo <> 'natural' AND e.nombre LIKE ?
       GROUP BY ALL ORDER BY monto DESC NULLS LAST LIMIT 50`,
      [`%${t}%`],
    );
  }, [submitted]);
  return (
    <VStack gap={5}>
      <PageHeader title="Entidades compradoras" lead="Qué compró cada entidad pública, a quién y cómo se compara con entidades parecidas." />
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(term);
        }}
      >
        <HStack gap={2} vAlign="end" wrap="wrap">
          <div style={{minWidth: 260, flex: '1 1 320px'}}>
            <TextInput label="Nombre de la entidad" value={term} onChange={setTerm} placeholder="Por ejemplo: hospital, municipio de Cuenca" />
          </div>
          <Button type="submit" label="Buscar" variant="primary" />
        </HStack>
      </form>
      <Loaded state={state}>
        {(rows) =>
          rows.length === 0 ? (
            <Banner status="info" title="Sin resultados" description="No hay entidades con ese nombre." />
          ) : (
            <VStack gap={2}>
              <Text color="secondary">{submitted ? `Resultados para «${cleanTerm(submitted)}».` : 'Las 25 entidades con mayor monto adjudicado en todo el periodo.'}</Text>
              <DataTable
                rows={rows}
                columns={[
                  {key: 'nombre', header: 'Entidad', render: (r) => <Link href={href('entidad', String(r.entidad_id))}>{String(r.nombre)}</Link>},
                  {key: 'provincia', header: 'Provincia'},
                  {key: 'monto', header: 'Monto adjudicado', align: 'end', render: (r) => fmtUsd(r.monto)},
                  {key: 'adjudicaciones', header: 'Adjudicaciones', align: 'end', render: (r) => fmtInt(r.adjudicaciones)},
                ]}
              />
            </VStack>
          )
        }
      </Loaded>
    </VStack>
  );
}

export function EntidadPage({id}: {id: string}) {
  const state = useAsync(async () => {
    const [entidad] = await query('SELECT * FROM entidades WHERE entidad_id = ?', [id]);
    if (!entidad || entidad.tipo === 'natural') return null;
    const anios = await query('SELECT * FROM concentracion WHERE entidad_id = ? ORDER BY anio', [id]);
    const proveedores = await query(
      `SELECT a.proveedor_id, a.proveedor_tipo,
              CASE WHEN a.proveedor_tipo = 'natural' THEN 'Persona natural' ELSE coalesce(p.nombre, 'Sin dato') END AS nombre,
              sum(a.monto) AS monto, count(*) AS adjudicaciones
       FROM adjudicaciones a LEFT JOIN proveedores p USING (proveedor_id)
       WHERE a.entidad_id = ? AND a.vigente
       GROUP BY ALL ORDER BY monto DESC NULLS LAST LIMIT 15`,
      [id],
    );
    const senales = await query(
      'SELECT indicador, anio, valor, umbral, explicacion, ocid FROM senales WHERE entidad_id = ? ORDER BY anio DESC, indicador LIMIT 60',
      [id],
    );
    const ultimo = anios.at(-1);
    const pares = ultimo
      ? await query(
          `SELECT median(c.hhi) AS hhi_mediana, count(*) AS entidades
           FROM concentracion c JOIN entidades e USING (entidad_id)
           WHERE c.anio = ? AND e.provincia = ? AND e.tipo = ? AND c.adjudicaciones >= 20`,
          [ultimo.anio, entidad.provincia, entidad.tipo],
        )
      : [];
    return {entidad, anios, proveedores, senales, pares: pares[0]};
  }, [id]);

  return (
    <Loaded state={state}>
      {(d) =>
        !d ? (
          <Banner status="info" title="Entidad no disponible" description="No existe o se trata de una persona natural, que no tiene ficha pública." />
        ) : (
          <VStack gap={5}>
            <PageHeader title={String(d.entidad.nombre)} lead={`${d.entidad.provincia} · RUC ${d.entidad.ruc ?? 'sin dato'}`}>
              <HStack gap={3} wrap="wrap">
                <Link href={href('entidades')}>Volver a entidades</Link>
                <Link href={`./rss/entidad/${feedSlug(String(d.entidad.entidad_id))}.xml`}>Seguir por RSS</Link>
              </HStack>
            </PageHeader>
            <div className="lupa-stats">
              <Stat label="Monto adjudicado, todo el periodo" value={fmtUsdShort(d.anios.reduce((s, r) => s + (toNumber(r.monto_total) ?? 0), 0))} />
              <Stat label="Adjudicaciones" value={fmtInt(d.anios.reduce((s, r) => s + (toNumber(r.adjudicaciones) ?? 0), 0))} />
              {d.anios.at(-1) ? (
                <Stat
                  label={`Concentración en ${d.anios.at(-1)!.anio}`}
                  value={fmtInt(d.anios.at(-1)!.hhi)}
                  note={
                    d.pares && toNumber(d.pares.entidades)
                      ? `Mediana de ${fmtInt(d.pares.entidades)} entidades parecidas de ${d.entidad.provincia}: ${fmtInt(d.pares.hhi_mediana)}`
                      : 'Escala de 0 a 10 000'
                  }
                />
              ) : null}
            </div>
            <section aria-labelledby="h-anios">
              <VStack gap={2}>
                <Heading level={2} id="h-anios">Monto adjudicado por año</Heading>
                <BarChart title="Monto adjudicado por año" bars={d.anios.map((r) => ({label: String(r.anio), value: toNumber(r.monto_total) ?? 0}))} />
              </VStack>
            </section>
            <section aria-labelledby="h-prov">
              <VStack gap={2}>
                <Heading level={2} id="h-prov">Proveedores con mayor monto</Heading>
                <DataTable
                  rows={d.proveedores}
                  columns={[
                    {
                      key: 'nombre',
                      header: 'Proveedor',
                      render: (r) =>
                        r.proveedor_tipo === 'juridica' ? <Link href={href('proveedor', String(r.proveedor_id))}>{String(r.nombre)}</Link> : String(r.nombre),
                    },
                    {key: 'monto', header: 'Monto', align: 'end', render: (r) => fmtUsd(r.monto)},
                    {key: 'adjudicaciones', header: 'Adjudicaciones', align: 'end', render: (r) => fmtInt(r.adjudicaciones)},
                  ]}
                />
              </VStack>
            </section>
            <section aria-labelledby="h-senales">
              <VStack gap={2}>
                <Heading level={2} id="h-senales">Señales</Heading>
                <Text color="secondary">{SITE.signalNotice}</Text>
                {d.senales.length === 0 ? (
                  <Text>No hay señales para esta entidad.</Text>
                ) : (
                  <DataTable
                    rows={d.senales}
                    columns={[
                      {key: 'indicador', header: 'Indicador', render: (r) => INDICATOR_TEXT[String(r.indicador)]?.title ?? String(r.indicador)},
                      {key: 'anio', header: 'Año'},
                      {key: 'explicacion', header: 'Dato'},
                      {key: 'ocid', header: 'Proceso (ocid)'},
                    ]}
                  />
                )}
                <Link href={href('metodologia')}>Cómo se calcula cada señal</Link>
              </VStack>
            </section>
          </VStack>
        )
      }
    </Loaded>
  );
}
