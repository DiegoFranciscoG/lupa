import {Text} from '@astryxdesign/core/Text';
import {VStack} from '@astryxdesign/core/VStack';
import {getJson, sumBy, type Panorama} from '../lib/data';
import {fmtInt} from '../lib/format';
import {Loaded, useAsync} from '../components/Async';
import {BarChart} from '../components/BarChart';
import {DataTable} from '../components/DataTable';
import {PageHeader} from '../components/PageHeader';

export const ISSUE_TEXT: Record<string, string> = {
  fecha_adjudicacion_anterior_a_publicacion: 'Fecha de adjudicación anterior a la fecha de publicación (problema conocido de la fuente)',
  adjudicacion_sin_proveedor: 'Adjudicación sin proveedor identificado',
  adjudicacion_moneda_no_usd: 'Adjudicación sin moneda o en moneda distinta al dólar (no se suma)',
  adjudicacion_varios_proveedores: 'Adjudicación con varios proveedores (se toma el primero)',
  item_sin_precio_unitario: 'Ítem sin precio unitario (no entra al precio comparado)',
  item_id_repetido: 'Identificador de ítem repetido en la misma adjudicación (problema conocido de la fuente)',
  proceso_sin_entidad: 'Proceso sin entidad compradora',
};

export function CalidadPage() {
  const state = useAsync(() => getJson<Panorama>('panorama.json'), []);
  return (
    <Loaded state={state}>
      {(p) => {
        const totals = sumBy(p.calidad, (r) => ISSUE_TEXT[r.tipo] ?? r.tipo, (r) => r.casos);
        return (
          <VStack gap={5}>
            <PageHeader
              title="Calidad de datos"
              lead="Cada problema detectado en los datos se cuenta y se publica. Un indicador no se calcula sobre datos que se sabe que están mal."
            />
            <BarChart title="Casos por tipo de problema, todo el periodo" orientation="horizontal" format={fmtInt} bars={totals} />
            <DataTable
              rows={p.calidad.map((r) => ({...r, descripcion: ISSUE_TEXT[r.tipo] ?? r.tipo}))}
              columns={[
                {key: 'anio', header: 'Año'},
                {key: 'descripcion', header: 'Problema'},
                {key: 'casos', header: 'Casos', align: 'end', render: (r) => fmtInt(r.casos)},
              ]}
            />
            <Text type="supporting" color="secondary">
              Además, antes de cada publicación corren pruebas que deben devolver cero filas: conteos y montos que cuadran con la fuente, claves únicas, integridad entre tablas y ningún dato de persona natural publicado. Si una falla, la publicación se detiene.
            </Text>
          </VStack>
        );
      }}
    </Loaded>
  );
}
