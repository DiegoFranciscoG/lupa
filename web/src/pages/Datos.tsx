import {Heading} from '@astryxdesign/core/Heading';
import {Text} from '@astryxdesign/core/Text';
import {VStack} from '@astryxdesign/core/VStack';
import {Link} from '@astryxdesign/core/Link';
import {getJson, dataUrl, type Meta} from '../lib/data';
import {SINGLE_TABLES} from '../lib/db';
import {fmtInt} from '../lib/format';
import {Loaded, useAsync} from '../components/Async';
import {Attribution} from '../components/Attribution';
import {DataTable} from '../components/DataTable';
import {PageHeader} from '../components/PageHeader';

const DESCRIPTIONS: Record<string, string> = {
  adjudicaciones: 'Una fila por adjudicación: entidad, proveedor, monto, fecha y procedimiento.',
  items: 'Ítems adjudicados con precio unitario, su grupo de comparación y la razón frente a la mediana.',
  procesos: 'Una fila por proceso: procedimiento, categoría, plazos y número de oferentes.',
  entidades: 'Entidades compradoras.',
  proveedores: 'Proveedores que son personas jurídicas o entidades públicas.',
  senales: 'Señales calculadas, con valor, umbral, explicación y versión de la metodología.',
  concentracion: 'Índice de concentración de proveedores por entidad y año.',
  precio_grupo: 'Grupos de comparación de precios: mediana y cuartiles por ítem, unidad y año.',
  grafo_nodos: 'Nodos de la red con PageRank y componente.',
  grafo_adjudico: 'Relaciones entidad a empresa con monto y años.',
  grafo_compitio: 'Pares de empresas que participaron en los mismos procesos.',
  procedimientos: 'Procedimientos de contratación con su familia y descripción.',
};

export function DatosPage() {
  const state = useAsync(() => Promise.all([getJson<Meta>('meta.json'), getJson<string[]>('files.json')]), []);
  return (
    <Loaded state={state}>
      {([meta, files]) => {
        const rows = [
          ...Object.entries(SINGLE_TABLES).map(([name, file]) => ({tabla: name, archivo: file, descripcion: DESCRIPTIONS[name] ?? ''})),
          ...files.map((f) => ({tabla: f.split('/')[0], archivo: f, descripcion: DESCRIPTIONS[f.split('/')[0]] ?? ''})),
        ];
        return (
          <VStack gap={5}>
            <PageHeader
              title="Datos abiertos"
              lead="Todo lo que muestra LUPA se puede descargar en formato Parquet, que se abre con DuckDB, Python, R o Excel con Power Query."
            />
            <Attribution snapshotId={meta.snapshot_id} snapshotDate={meta.snapshot_fecha} />
            <section aria-labelledby="h-arch">
              <VStack gap={2}>
                <Heading level={2} id="h-arch">Archivos de la instantánea {meta.snapshot_id}</Heading>
                <DataTable
                  rows={rows}
                  columns={[
                    {key: 'archivo', header: 'Archivo', render: (r) => <Link href={dataUrl(String(r.archivo))} download>{String(r.archivo)}</Link>},
                    {key: 'descripcion', header: 'Contenido'},
                  ]}
                />
              </VStack>
            </section>
            <section aria-labelledby="h-cargas">
              <VStack gap={2}>
                <Heading level={2} id="h-cargas">Cargas por año</Heading>
                <Text color="secondary">
                  Cada archivo de origen se identifica por su huella SHA-256. Si una descarga falla, se conserva la carga anterior y aquí se indica.
                </Text>
                <DataTable
                  rows={meta.cargas.map((c) => ({...c}))}
                  columns={[
                    {key: 'anio', header: 'Año'},
                    {key: 'estado', header: 'Estado', render: (r) => (r.estado === 'fresh' ? 'actualizado' : r.estado === 'stale' ? 'se conserva la carga anterior' : String(r.estado))},
                    {key: 'procesos', header: 'Procesos', align: 'end', render: (r) => fmtInt(r.procesos)},
                    {key: 'cargado', header: 'Cargado'},
                    {key: 'sha256', header: 'SHA-256', render: (r) => (r.sha256 ? `${String(r.sha256).slice(0, 16)}…` : 'sin dato')},
                  ]}
                />
              </VStack>
            </section>
          </VStack>
        );
      }}
    </Loaded>
  );
}
