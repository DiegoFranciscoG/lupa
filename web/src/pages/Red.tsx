import {Heading} from '@astryxdesign/core/Heading';
import {Text} from '@astryxdesign/core/Text';
import {VStack} from '@astryxdesign/core/VStack';
import {Link} from '@astryxdesign/core/Link';
import {query} from '../lib/db';
import {fmtInt, fmtUsd} from '../lib/format';
import {href} from '../lib/router';
import {Loaded, useAsync} from '../components/Async';
import {DataTable} from '../components/DataTable';
import {PageHeader, Stat} from '../components/PageHeader';

export function RedPage() {
  const state = useAsync(async () => {
    const [resumen] = await query(
      `SELECT count(*) AS nodos, count(*) FILTER (WHERE tipo = 'entidad') AS entidades,
              count(*) FILTER (WHERE tipo = 'proveedor') AS proveedores, count(DISTINCT componente) AS componentes,
              (SELECT count(*) FROM grafo_adjudico) AS aristas
       FROM grafo_nodos`,
    );
    const centrales = await query(
      `SELECT n.ref_id, p.nombre, n.pagerank,
              count(g.origen) AS entidades, sum(g.monto) AS monto
       FROM grafo_nodos n
       JOIN proveedores p ON p.proveedor_id = n.ref_id
       LEFT JOIN grafo_adjudico g ON g.destino = n.nodo_id
       WHERE n.tipo = 'proveedor'
       GROUP BY ALL ORDER BY n.pagerank DESC LIMIT 25`,
    );
    const pares = await query(
      `SELECT pa.nombre AS a, pb.nombre AS b, c.procesos, na.ref_id AS id_a, nb.ref_id AS id_b
       FROM grafo_compitio c
       JOIN grafo_nodos na ON na.nodo_id = c.origen JOIN proveedores pa ON pa.proveedor_id = na.ref_id
       JOIN grafo_nodos nb ON nb.nodo_id = c.destino JOIN proveedores pb ON pb.proveedor_id = nb.ref_id
       ORDER BY c.procesos DESC LIMIT 20`,
    );
    return {resumen, centrales, pares};
  }, []);
  return (
    <Loaded state={state}>
      {({resumen, centrales, pares}) => (
        <VStack gap={5}>
          <PageHeader
            title="Red de relaciones"
            lead="Entidades y empresas unidas por adjudicaciones, consultadas como un grafo con el estándar SQL/PGQ. Las personas naturales no forman parte de la red."
          />
          <div className="lupa-stats">
            <Stat label="Entidades" value={fmtInt(resumen.entidades)} />
            <Stat label="Empresas" value={fmtInt(resumen.proveedores)} />
            <Stat label="Relaciones de adjudicación" value={fmtInt(resumen.aristas)} />
            <Stat label="Componentes conexos" value={fmtInt(resumen.componentes)} note="Grupos de actores sin relación entre sí" />
          </div>
          <section aria-labelledby="h-centrales">
            <VStack gap={2}>
              <Heading level={2} id="h-centrales">Empresas con más peso en la red</Heading>
              <Text color="secondary">
                Ordenadas por PageRank: pesa más una empresa que recibe adjudicaciones de muchas entidades distintas. Es una medida de alcance, no de desempeño.
              </Text>
              <DataTable
                rows={centrales}
                columns={[
                  {key: 'nombre', header: 'Empresa', render: (r) => <Link href={href('proveedor', String(r.ref_id))}>{String(r.nombre)}</Link>},
                  {key: 'entidades', header: 'Entidades compradoras', align: 'end', render: (r) => fmtInt(r.entidades)},
                  {key: 'monto', header: 'Monto', align: 'end', render: (r) => fmtUsd(r.monto)},
                ]}
              />
            </VStack>
          </section>
          <section aria-labelledby="h-comp">
            <VStack gap={2}>
              <Heading level={2} id="h-comp">Empresas que participan juntas con más frecuencia</Heading>
              <Text color="secondary">
                Pares de empresas que se presentaron en los mismos procesos. Dato parcial: solo una parte de los procesos publica a sus oferentes.
              </Text>
              <DataTable
                rows={pares}
                columns={[
                  {key: 'a', header: 'Empresa', render: (r) => <Link href={href('proveedor', String(r.id_a))}>{String(r.a)}</Link>},
                  {key: 'b', header: 'Empresa', render: (r) => <Link href={href('proveedor', String(r.id_b))}>{String(r.b)}</Link>},
                  {key: 'procesos', header: 'Procesos en común', align: 'end', render: (r) => fmtInt(r.procesos)},
                ]}
              />
            </VStack>
          </section>
        </VStack>
      )}
    </Loaded>
  );
}
