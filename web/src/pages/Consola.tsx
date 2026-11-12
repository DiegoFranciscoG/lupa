import {useState} from 'react';
import {Text} from '@astryxdesign/core/Text';
import {VStack} from '@astryxdesign/core/VStack';
import {HStack} from '@astryxdesign/core/HStack';
import {Button} from '@astryxdesign/core/Button';
import {Banner} from '@astryxdesign/core/Banner';
import {runConsole, type Row} from '../lib/db';
import {DataTable} from '../components/DataTable';
import {PageHeader} from '../components/PageHeader';
import {SITE} from '../content/site';

export const EXAMPLES: Array<{label: string; sql: string}> = [
  {
    label: 'Monto por año',
    sql: 'SELECT anio, round(sum(monto)) AS monto, count(*) AS adjudicaciones\nFROM adjudicaciones\nWHERE vigente\nGROUP BY anio\nORDER BY anio;',
  },
  {
    label: 'Medicamentos más comprados en 2025',
    sql: "SELECT cpc, any_value(cpc_descripcion) AS item, sum(compras) AS compras, round(avg(mediana), 4) AS mediana\nFROM precio_grupo\nWHERE anio = 2025 AND cpc LIKE '352%'\nGROUP BY cpc\nORDER BY compras DESC\nLIMIT 20;",
  },
  {
    label: 'Entidades con más concentración',
    sql: 'SELECT e.nombre, c.anio, c.hhi, c.adjudicaciones\nFROM concentracion c JOIN entidades e USING (entidad_id)\nWHERE c.adjudicaciones >= 50\nORDER BY c.hhi DESC\nLIMIT 20;',
  },
  {
    label: 'Tablas disponibles',
    sql: "SELECT table_name FROM information_schema.tables ORDER BY 1;",
  },
];

export function ConsolaPage() {
  const [sql, setSql] = useState(EXAMPLES[0].sql);
  const [result, setResult] = useState<{rows: Row[]; columns: string[]; truncated: boolean; ms: number} | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const run = async () => {
    setRunning(true);
    setError(null);
    const t0 = performance.now();
    try {
      const r = await runConsole(sql);
      setResult({...r, ms: Math.round(performance.now() - t0)});
    } catch (e) {
      setResult(null);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  };

  return (
    <VStack gap={4}>
      <PageHeader
        title="Consola SQL"
        lead="Consulta los más de dos millones de procesos con SQL, dentro de tu navegador y sin servidor. Tablas: adjudicaciones, items, procesos, entidades, proveedores, senales, concentracion, precio_grupo, grafo_nodos, grafo_adjudico, grafo_compitio, procedimientos."
      />
      <Banner status="info" title="Recomendada en computadora" description={SITE.consoleMobile} />
      <HStack gap={2} wrap="wrap">
        {EXAMPLES.map((ex) => (
          <Button key={ex.label} label={ex.label} variant="secondary" size="sm" onClick={() => setSql(ex.sql)} />
        ))}
      </HStack>
      <label htmlFor="sql-input">
        <Text type="label">Consulta</Text>
      </label>
      <textarea
        id="sql-input"
        className="lupa-sql"
        value={sql}
        spellCheck={false}
        onChange={(e) => setSql(e.target.value)}
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') void run();
        }}
      />
      <HStack gap={3} vAlign="center">
        <Button label="Ejecutar" variant="primary" isLoading={running} onClick={() => void run()} />
        <Text type="supporting" color="secondary">
          Ctrl + Enter también ejecuta.
        </Text>
      </HStack>
      {error ? <Banner status="error" title="La consulta no se pudo ejecutar" description={error} /> : null}
      {result ? (
        <VStack gap={2}>
          <Text type="supporting" color="secondary" hasTabularNumbers>
            {result.rows.length} filas en {result.ms} ms{result.truncated ? ' (se muestran las primeras 1000)' : ''}.
          </Text>
          <DataTable rows={result.rows} columns={result.columns.map((c) => ({key: c, header: c}))} />
        </VStack>
      ) : null}
    </VStack>
  );
}
