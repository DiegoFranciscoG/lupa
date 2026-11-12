import {useState} from 'react';
import {Heading} from '@astryxdesign/core/Heading';
import {Text} from '@astryxdesign/core/Text';
import {VStack} from '@astryxdesign/core/VStack';
import {HStack} from '@astryxdesign/core/HStack';
import {Link} from '@astryxdesign/core/Link';
import {Button} from '@astryxdesign/core/Button';
import {TextInput} from '@astryxdesign/core/TextInput';
import {Banner} from '@astryxdesign/core/Banner';
import {query, type Row} from '../lib/db';
import {fmtInt, fmtPrice, fmtRatio, fmtDate, toNumber} from '../lib/format';
import {href} from '../lib/router';
import {Loaded, useAsync} from '../components/Async';
import {BarChart} from '../components/BarChart';
import {DataTable} from '../components/DataTable';
import {PageHeader, Stat} from '../components/PageHeader';

const MIN_COMPARABLES = 10;

export function PreciosPage({cpc, unidad, anio}: {cpc?: string; unidad?: string; anio?: string}) {
  if (cpc && unidad && anio) return <GrupoPrecio cpc={cpc} unidad={unidad} anio={Number(anio)} />;
  return <BuscarPrecio />;
}

/** Normalizes a search term: trims, collapses spaces, caps length (input validation). */
export function cleanTerm(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim().slice(0, 80);
}

function BuscarPrecio() {
  const [term, setTerm] = useState('');
  const [submitted, setSubmitted] = useState('ALCOHOL');
  const state = useAsync(() => {
    const t = cleanTerm(submitted).toUpperCase();
    return query(
      `SELECT cpc, unidad, anio, cpc_descripcion, compras, entidades, mediana, p25, p75
       FROM precio_grupo
       WHERE compras >= ? AND (cpc_descripcion LIKE ? OR cpc = ?)
       ORDER BY anio DESC, compras DESC
       LIMIT 60`,
      [MIN_COMPARABLES, `%${t}%`, t],
    );
  }, [submitted]);

  return (
    <VStack gap={5}>
      <PageHeader
        title="Precio comparado"
        lead="Cuánto pagó cada entidad por el mismo ítem, con la misma unidad y en el mismo año. Solo se compara cuando hay al menos 10 compras."
      />
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          if (cleanTerm(term)) setSubmitted(term);
        }}
      >
        <HStack gap={2} vAlign="end" wrap="wrap">
          <div style={{minWidth: 260, flex: '1 1 320px'}}>
            <TextInput label="Ítem o código CPC" value={term} onChange={setTerm} placeholder="Por ejemplo: paracetamol, guantes, 352900011" />
          </div>
          <Button type="submit" label="Buscar" variant="primary" />
        </HStack>
      </form>
      <Loaded state={state}>
        {(rows) =>
          rows.length === 0 ? (
            <Banner status="info" title="Sin grupos comparables" description="No hay ítems con ese nombre y al menos 10 compras en un mismo año. Prueba otra palabra." />
          ) : (
            <VStack gap={2}>
              <Text color="secondary">
                Resultados para «{cleanTerm(submitted)}». Elige un grupo para ver cada compra.
              </Text>
              <DataTable
                rows={rows}
                columns={[
                  {
                    key: 'cpc_descripcion',
                    header: 'Ítem',
                    render: (r) => (
                      <Link href={href('precios', String(r.cpc), String(r.unidad), String(r.anio))}>{String(r.cpc_descripcion ?? r.cpc)}</Link>
                    ),
                  },
                  {key: 'unidad', header: 'Unidad', render: (r) => String(r.unidad).toLowerCase()},
                  {key: 'anio', header: 'Año'},
                  {key: 'compras', header: 'Compras', align: 'end', render: (r) => fmtInt(r.compras)},
                  {key: 'mediana', header: 'Mediana', align: 'end', render: (r) => fmtPrice(r.mediana)},
                  {key: 'p75', header: 'Rango típico', align: 'end', render: (r) => `${fmtPrice(r.p25)} a ${fmtPrice(r.p75)}`},
                ]}
              />
            </VStack>
          )
        }
      </Loaded>
    </VStack>
  );
}

function GrupoPrecio({cpc, unidad, anio}: {cpc: string; unidad: string; anio: number}) {
  const state = useAsync(async () => {
    const [grupo] = await query(
      'SELECT * FROM precio_grupo WHERE cpc = ? AND unidad = ? AND anio = ?',
      [cpc, unidad, anio],
    );
    const items = await query(
      `SELECT i.ocid, i.entidad_id, coalesce(e.nombre, 'Entidad sin dato') AS entidad, i.precio_unitario, i.cantidad,
              i.razon_mediana, i.fecha, i.descripcion
       FROM items i LEFT JOIN entidades e USING (entidad_id)
       WHERE i.anio = ? AND i.cpc = ? AND i.unidad = ?
       ORDER BY i.precio_unitario DESC
       LIMIT 300`,
      [anio, cpc, unidad],
    );
    return {grupo, items};
  }, [cpc, unidad, anio]);

  return (
    <Loaded state={state}>
      {({grupo, items}) =>
        !grupo ? (
          <Banner status="info" title="Grupo no encontrado" description="Vuelve a la búsqueda de precios." />
        ) : (
          <GrupoView grupo={grupo} items={items} />
        )
      }
    </Loaded>
  );
}

/** Median unit price paid by each entity in the group, highest first. */
export function medianByEntity(items: Row[]): Array<{label: string; value: number; n: number}> {
  const by = new Map<string, number[]>();
  for (const it of items) {
    const p = toNumber(it.precio_unitario);
    if (p === null) continue;
    const k = String(it.entidad);
    by.set(k, [...(by.get(k) ?? []), p]);
  }
  return [...by.entries()]
    .map(([label, ps]) => {
      const s = [...ps].sort((a, b) => a - b);
      const mid = Math.floor(s.length / 2);
      const med = s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
      return {label, value: med, n: s.length};
    })
    .sort((a, b) => b.value - a.value);
}

function GrupoView({grupo, items}: {grupo: Row; items: Row[]}) {
  const mediana = toNumber(grupo.mediana) ?? 0;
  const top = items[0];
  const byEntity = medianByEntity(items).slice(0, 15);
  return (
    <VStack gap={5}>
      <PageHeader title={String(grupo.cpc_descripcion ?? grupo.cpc)} lead={`CPC ${grupo.cpc} · unidad: ${String(grupo.unidad).toLowerCase()} · año ${grupo.anio}`}>
        <Link href={href('precios')}>Volver a la búsqueda</Link>
      </PageHeader>
      <div className="lupa-stats">
        <Stat label="Mediana nacional" value={fmtPrice(mediana)} note={`${fmtInt(grupo.compras)} compras de ${fmtInt(grupo.entidades)} entidades`} />
        <Stat label="Rango típico (p25 a p75)" value={`${fmtPrice(grupo.p25)} a ${fmtPrice(grupo.p75)}`} />
        {top ? <Stat label="Precio más alto" value={fmtPrice(top.precio_unitario)} note={`${fmtRatio(top.razon_mediana)} la mediana`} /> : null}
      </div>
      <section aria-labelledby="h-entidad">
        <VStack gap={2}>
          <Heading level={2} id="h-entidad">Mediana pagada por entidad</Heading>
          <Text type="supporting" color="secondary">
            Resaltadas las entidades cuya mediana supera el doble de la mediana nacional. Las 15 de mayor precio.
          </Text>
          <BarChart
            title="Mediana del precio unitario por entidad"
            orientation="horizontal"
            format={(v) => fmtPrice(v)}
            bars={byEntity.map((b) => ({label: b.label, value: b.value, isAccent: b.value >= 2 * mediana}))}
          />
        </VStack>
      </section>
      <section aria-labelledby="h-compras">
        <VStack gap={2}>
          <Heading level={2} id="h-compras">Cada compra</Heading>
          <DataTable
            rows={items}
            columns={[
              {key: 'entidad', header: 'Entidad', render: (r) => <Link href={href('entidad', String(r.entidad_id))}>{String(r.entidad)}</Link>},
              {key: 'precio_unitario', header: 'Precio unitario', align: 'end', render: (r) => fmtPrice(r.precio_unitario)},
              {key: 'razon_mediana', header: 'Frente a la mediana', align: 'end', render: (r) => fmtRatio(r.razon_mediana)},
              {key: 'cantidad', header: 'Cantidad', align: 'end', render: (r) => fmtInt(r.cantidad)},
              {key: 'fecha', header: 'Fecha', render: (r) => fmtDate(r.fecha)},
              {key: 'ocid', header: 'Proceso (ocid)'},
            ]}
          />
          {items.length >= 300 ? (
            <Text type="supporting" color="secondary">
              Se muestran las 300 compras de mayor precio. La consola SQL permite ver todas.
            </Text>
          ) : null}
        </VStack>
      </section>
    </VStack>
  );
}
