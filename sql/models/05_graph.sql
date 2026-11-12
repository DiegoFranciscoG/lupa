-- Property graph (SQL/PGQ, duckpgq) over entities and legal-person suppliers.
-- Natural persons are left out of the network: no profiles or rankings of people (LOPDP).
SET active_grammar_extensions = ['duckpgq'];

CREATE OR REPLACE TABLE mart.grafo_nodo AS
WITH n AS (
    SELECT DISTINCT entidad_id AS ref_id, 'entidad' AS tipo
    FROM mart.hecho_adjudicacion
    WHERE entidad_id IS NOT NULL AND entidad_id NOT LIKE 'NAT-%' AND proveedor_tipo <> 'natural'
    UNION
    SELECT DISTINCT proveedor_id, 'proveedor'
    FROM mart.hecho_adjudicacion
    WHERE proveedor_id IS NOT NULL AND proveedor_tipo <> 'natural' AND entidad_id NOT LIKE 'NAT-%'
)
SELECT (row_number() OVER (ORDER BY tipo, ref_id) - 1)::BIGINT AS nodo_id, ref_id, tipo FROM n;

-- Edge entity -> supplier, aggregated over all years.
CREATE OR REPLACE TABLE mart.grafo_adjudico AS
SELECT e.nodo_id AS origen, p.nodo_id AS destino, count(*) AS adjudicaciones,
       sum(a.monto)::DECIMAL(18, 2) AS monto, min(a.anio) AS primer_anio, max(a.anio) AS ultimo_anio
FROM mart.hecho_adjudicacion a
JOIN mart.grafo_nodo e ON e.ref_id = a.entidad_id AND e.tipo = 'entidad'
JOIN mart.grafo_nodo p ON p.ref_id = a.proveedor_id AND p.tipo = 'proveedor'
WHERE a.vigente
GROUP BY ALL;

-- Edge supplier -- supplier: both took part in the same process (partial: only 24 % of
-- processes list their tenderers).
CREATE OR REPLACE TABLE mart.grafo_compitio AS
SELECT a.nodo_id AS origen, b.nodo_id AS destino, count(DISTINCT o1.ocid) AS procesos
FROM mart.hecho_oferente o1
JOIN mart.hecho_oferente o2 ON o1.ocid = o2.ocid AND o1.proveedor_id < o2.proveedor_id
JOIN mart.grafo_nodo a ON a.ref_id = o1.proveedor_id AND a.tipo = 'proveedor'
JOIN mart.grafo_nodo b ON b.ref_id = o2.proveedor_id AND b.tipo = 'proveedor'
WHERE o1.proveedor_tipo <> 'natural' AND o2.proveedor_tipo <> 'natural'
GROUP BY ALL;

DROP PROPERTY GRAPH IF EXISTS red_compras;
CREATE PROPERTY GRAPH red_compras
VERTEX TABLES (mart.grafo_nodo LABEL nodo)
EDGE TABLES (
    mart.grafo_adjudico SOURCE KEY (origen) REFERENCES mart.grafo_nodo (nodo_id)
                        DESTINATION KEY (destino) REFERENCES mart.grafo_nodo (nodo_id)
                        LABEL adjudico_a
);

-- PageRank on entity -> supplier edges: suppliers that receive awards from many entities
-- (which in turn award widely) rank higher. Weakly connected components group actors.
-- Each algorithm runs in its own statement: combining both table functions in one
-- query triggers an internal error in duckpgq with DuckDB 2.0.0.
CREATE OR REPLACE TEMP TABLE pr AS SELECT * FROM pagerank('red_compras', 'nodo', 'adjudico_a');
CREATE OR REPLACE TEMP TABLE wcc AS SELECT * FROM weakly_connected_component('red_compras', 'nodo', 'adjudico_a');

CREATE OR REPLACE TABLE mart.grafo_metrica AS
SELECT n.nodo_id, n.ref_id, n.tipo, pr.pagerank, wcc.componentid AS componente
FROM mart.grafo_nodo n
JOIN pr ON pr.nodo_id = n.nodo_id
JOIN wcc ON wcc.nodo_id = n.nodo_id;

CREATE OR REPLACE TABLE mart.grafo_componente AS
SELECT componente, count(*) AS nodos,
       count(*) FILTER (WHERE tipo = 'entidad') AS entidades,
       count(*) FILTER (WHERE tipo = 'proveedor') AS proveedores
FROM mart.grafo_metrica
GROUP BY componente;
