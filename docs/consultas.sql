-- Consultas de ejemplo sobre los datos publicados de LUPA.
-- LUPA no tiene API REST: los datos son archivos Parquet que se consultan con SQL.
-- Funcionan en la consola del sitio (#/consola) o en DuckDB local:
--   duckdb -c "CREATE VIEW senales AS FROM 'https://<sitio>/data/senales.parquet'; FROM senales LIMIT 5;"

-- 1. Monto adjudicado por año
SELECT anio, round(sum(monto)) AS monto, count(*) AS adjudicaciones
FROM adjudicaciones WHERE vigente GROUP BY anio ORDER BY anio;

-- 2. Cuánto pagó cada entidad por el mismo ítem (precio comparado)
SELECT i.anio, e.nombre AS entidad, i.precio_unitario, i.mediana, i.razon_mediana
FROM items i JOIN entidades e USING (entidad_id)
WHERE i.cpc = '35260307647' AND i.anio = 2025
ORDER BY i.precio_unitario DESC;

-- 3. Señales de una entidad
SELECT indicador, anio, explicacion FROM senales
WHERE entidad_id = 'EC-RUC-0960000220001-44856' ORDER BY anio DESC;

-- 4. Entidades con mayor concentración de proveedores (con al menos 50 adjudicaciones)
SELECT e.nombre, c.anio, c.hhi, c.adjudicaciones, c.participacion_mayor
FROM concentracion c JOIN entidades e USING (entidad_id)
WHERE c.adjudicaciones >= 50 ORDER BY c.hhi DESC LIMIT 20;

-- 5. Empresas con más alcance en la red (PageRank)
SELECT p.nombre, n.pagerank FROM grafo_nodos n JOIN proveedores p ON p.proveedor_id = n.ref_id
WHERE n.tipo = 'proveedor' ORDER BY n.pagerank DESC LIMIT 20;

-- 6. Viaje en el tiempo (solo con el lago DuckLake local, no en el navegador)
--   ATTACH 'ducklake:data/lake/catalog.ducklake' AS lake (READ_ONLY);
--   FROM lake.snapshots();
--   SELECT count(*) FROM lake.process AT (VERSION => 3) WHERE source_year = 2025;
