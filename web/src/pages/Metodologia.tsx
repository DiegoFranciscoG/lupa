// The only page allowed to name the forbidden words, because it lists them as forbidden
// (see scripts/check-language.mjs, test T-06).
import {Heading} from '@astryxdesign/core/Heading';
import {Text} from '@astryxdesign/core/Text';
import {VStack} from '@astryxdesign/core/VStack';
import {Link} from '@astryxdesign/core/Link';
import {getJson, type Meta, type Panorama} from '../lib/data';
import {fmtInt, fmtPrice} from '../lib/format';
import {Loaded, useAsync} from '../components/Async';
import {DataTable} from '../components/DataTable';
import {PageHeader} from '../components/PageHeader';
import {INDICATOR_TEXT, SITE} from '../content/site';

const METHOD: Record<string, string> = {
  PRECIO_ATIPICO:
    'Grupo de comparación: mismo código CPC, misma unidad normalizada y mismo año. Con al menos 10 compras se calcula la mediana y la desviación absoluta mediana (MAD). Se marca un precio si supera la mediana más 3,5 × 1,4826 × MAD (puntaje Z modificado de Iglewicz y Hoaglin) y además es al menos el doble de la mediana. Con menos de 10 compras no se calcula y se informa el motivo.',
  CONCENTRACION:
    'Índice Herfindahl-Hirschman: suma de los cuadrados de la participación (en %) de cada proveedor en el monto adjudicado por la entidad en el año. Va de 0 a 10 000. Se marca desde 1 800, el umbral de mercado altamente concentrado de las guías de fusiones de EE. UU. de 2023, solo con al menos 20 adjudicaciones en el año.',
  FRAGMENTACION:
    'Tres o más adjudicaciones de la misma entidad al mismo proveedor en 30 días, cada una entre el 80 % y el 100 % de un límite de procedimiento vigente en su fecha, que juntas superan ese límite. Los límites salen de la tabla de parámetros normativos con su vigencia. Sin límite verificado para una fecha, no se calcula.',
  PROVEEDOR_NUEVO:
    'Adjudicación dentro del 5 % de montos más altos del año a un proveedor cuya primera adjudicación en los datos ocurrió 90 días antes o menos. Se evalúa a partir del segundo año de datos.',
  EMERGENCIA:
    'Proporción del gasto de la entidad por régimen de emergencia. Solo se calcula si la fuente identifica esos procedimientos; en los datos actuales no los identifica.',
  R018_OFERTA_UNICA:
    'Definición de Cardinal (Open Contracting Partnership): proceso abierto o selectivo con un solo oferente registrado. Se excluye el catálogo electrónico, que no tiene competencia por diseño. Solo una parte de los procesos publica el número de oferentes.',
  R003_PLAZO_CORTO:
    'Definición de Cardinal: plazo entre el inicio y el fin de la presentación de ofertas menor a 15 días corridos, en procedimientos abiertos con ambas fechas.',
};

export function MetodologiaPage() {
  const state = useAsync(() => Promise.all([getJson<Meta>('meta.json'), getJson<Panorama>('panorama.json')]), []);
  return (
    <Loaded state={state}>
      {([meta, pano]) => (
        <VStack gap={5}>
          <PageHeader title="Metodología" lead={`Versión ${meta.metodologia_version}. Cada cifra sale de un cálculo SQL publicado en el repositorio y probado con datos sintéticos.`} />
          <section aria-labelledby="h-principios">
            <VStack gap={2}>
              <Heading level={2} id="h-principios">Principios</Heading>
              <div className="lupa-measure">
                <VStack gap={2}>
                  <Text as="p">{SITE.signalNotice}</Text>
                  <Text as="p">
                    Si un dato no existe en la fuente, no se estima ni se rellena: se informa. Los umbrales y límites viven en tablas versionadas con su fuente, no en el código.
                  </Text>
                  <Text as="p">
                    El lenguaje describe hechos verificables. LUPA no usa palabras como corrupción, fraude, robo, sobreprecio o culpable para referirse a un proceso, una entidad o un proveedor, y una prueba automática lo impide.
                  </Text>
                  <Text as="p">
                    Para revisar un proceso en la fuente oficial, busca su código en el portal del SERCOP: es la parte del ocid que sigue al prefijo «ocds-5wno2w-».
                  </Text>
                </VStack>
              </div>
            </VStack>
          </section>
          <section aria-labelledby="h-ind">
            <VStack gap={3}>
              <Heading level={2} id="h-ind">Indicadores</Heading>
              {pano.indicadores.map((i) => (
                <VStack key={i.indicador} gap={1}>
                  <Heading level={3}>{INDICATOR_TEXT[i.indicador]?.title ?? i.nombre}</Heading>
                  <div className="lupa-measure">
                    <Text as="p">{METHOD[i.indicador]}</Text>
                    <Text as="p" type="supporting" color="secondary">
                      Origen: {i.origen}. {fmtInt(i.senales)} señales. {i.disponibilidad}
                    </Text>
                  </div>
                </VStack>
              ))}
              <Text type="supporting" color="secondary">
                Los demás indicadores de Cardinal (R024, R025, R028, R030, R035, R036, R038, R048, R058) necesitan el detalle de las ofertas, que la fuente publica en menos del 1 % de los procesos. No se calculan.
              </Text>
            </VStack>
          </section>
          <section aria-labelledby="h-umb">
            <VStack gap={2}>
              <Heading level={2} id="h-umb">Umbrales de la metodología</Heading>
              <DataTable
                rows={meta.umbrales.map((u) => ({...u}))}
                columns={[
                  {key: 'descripcion', header: 'Parámetro'},
                  {key: 'valor', header: 'Valor', align: 'end'},
                  {key: 'fuente', header: 'Fuente'},
                ]}
              />
            </VStack>
          </section>
          <section aria-labelledby="h-par">
            <VStack gap={2}>
              <Heading level={2} id="h-par">Límites de procedimiento con vigencia</Heading>
              <Text color="secondary">
                Los límites cambian cada año con el Presupuesto Inicial del Estado y cambiaron a mitad de 2025 con la Ley Orgánica de Integridad Pública.
              </Text>
              <DataTable
                rows={meta.parametros.map((p) => ({...p}))}
                columns={[
                  {key: 'descripcion', header: 'Límite'},
                  {key: 'vigente_desde', header: 'Desde'},
                  {key: 'vigente_hasta', header: 'Hasta', render: (r) => String(r.vigente_hasta ?? 'vigente')},
                  {key: 'valor', header: 'Monto', align: 'end', render: (r) => fmtPrice(r.valor)},
                  {key: 'fuente_url', header: 'Fuente', render: (r) => <Link href={String(r.fuente_url)} isExternalLink>documento oficial</Link>},
                ]}
              />
            </VStack>
          </section>
        </VStack>
      )}
    </Loaded>
  );
}
