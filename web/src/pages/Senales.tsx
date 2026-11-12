import {useState} from 'react';
import {Text} from '@astryxdesign/core/Text';
import {VStack} from '@astryxdesign/core/VStack';
import {HStack} from '@astryxdesign/core/HStack';
import {Link} from '@astryxdesign/core/Link';
import {Banner} from '@astryxdesign/core/Banner';
import {query} from '../lib/db';
import {getJson, type Panorama} from '../lib/data';
import {fmtInt} from '../lib/format';
import {href} from '../lib/router';
import {Loaded, useAsync} from '../components/Async';
import {DataTable} from '../components/DataTable';
import {PageHeader, SelectField} from '../components/PageHeader';
import {INDICATOR_TEXT, SITE} from '../content/site';

const ORDER = ['PRECIO_ATIPICO', 'FRAGMENTACION', 'CONCENTRACION', 'PROVEEDOR_NUEVO', 'R018_OFERTA_UNICA', 'R003_PLAZO_CORTO', 'EMERGENCIA'];

export function SenalesPage({indicador}: {indicador?: string}) {
  const [ind, setInd] = useState(indicador && ORDER.includes(indicador) ? indicador : 'PRECIO_ATIPICO');
  const [anio, setAnio] = useState('todos');
  const pano = useAsync(() => getJson<Panorama>('panorama.json'), []);
  const state = useAsync(async () => {
    // senales_top keeps the post text in one JSON column: fewer HTTP range requests per query.
    const base = 'SELECT anio, valor, datos FROM senales_top WHERE indicador = ?';
    const rows =
      anio === 'todos'
        ? await query(`${base} ORDER BY valor DESC LIMIT 100`, [ind])
        : await query(`${base} AND anio = ? ORDER BY valor DESC LIMIT 100`, [ind, Number(anio)]);
    return rows.map((r) => {
      const d = JSON.parse(String(r.datos)) as {ocid: string | null; explicacion: string; entidad_id: string | null; entidad: string | null};
      return {anio: r.anio, valor: r.valor, ocid: d.ocid, explicacion: d.explicacion, entidad_id: d.entidad_id, entidad: d.entidad ?? 'Sin dato'};
    });
  }, [ind, anio]);
  const info = INDICATOR_TEXT[ind];
  const estado = pano.status === 'ready' ? pano.data.indicadores.find((i) => i.indicador === ind) : undefined;

  return (
    <VStack gap={5}>
      <PageHeader title="Señales" lead={SITE.signalNotice} />
      <HStack gap={4} wrap="wrap">
        <div style={{minWidth: 260}}>
          <SelectField
            label="Indicador"
            value={ind}
            options={ORDER.map((k) => ({value: k, label: INDICATOR_TEXT[k]?.title ?? k}))}
            onChange={setInd}
          />
        </div>
        <div style={{minWidth: 160}}>
          <SelectField
            label="Año"
            value={anio}
            options={[{value: 'todos', label: 'Todos'}, ...Array.from({length: 12}, (_, i) => 2026 - i).map((y) => ({value: String(y), label: String(y)}))]}
            onChange={setAnio}
          />
        </div>
      </HStack>
      <VStack gap={1}>
        <Text weight="bold">{info?.title}</Text>
        <Text color="secondary">{info?.what}</Text>
        {estado ? (
          <Text type="supporting" color="secondary">
            {fmtInt(estado.senales)} señales en total. {estado.disponibilidad}
          </Text>
        ) : null}
        <Link href={href('metodologia')}>Metodología y umbrales</Link>
      </VStack>
      <Loaded state={state}>
        {(rows) =>
          rows.length === 0 ? (
            <Banner status="info" title="Sin señales para este filtro" description={estado?.disponibilidad ?? 'Prueba con otro año.'} />
          ) : (
            <VStack gap={2}>
              <Text type="supporting" color="secondary">
                Ordenadas por el valor del indicador. Se muestran hasta 100.
              </Text>
              <DataTable
                rows={rows}
                columns={[
                  {key: 'explicacion', header: 'Dato'},
                  {
                    key: 'entidad',
                    header: 'Entidad',
                    render: (r) => (r.entidad_id && !String(r.entidad_id).startsWith('NAT-') ? <Link href={href('entidad', String(r.entidad_id))}>{String(r.entidad)}</Link> : 'Sin ficha'),
                  },
                  {key: 'anio', header: 'Año'},
                  {key: 'ocid', header: 'Proceso (ocid)'},
                ]}
              />
            </VStack>
          )
        }
      </Loaded>
    </VStack>
  );
}
