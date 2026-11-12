-- Publication: marts to Parquet (sorted, with page statistics, Parquet format V1 so that
-- any reader, including DuckDB-Wasm 1.x, can open them) and small JSON aggregates.
-- Natural persons never appear with their RUC or name in these files (test T-07).

-- Process codes that embed a natural person's ID number are published with that number
-- replaced (found by test T-07: some codes include the buyer's own RUC).
CREATE OR REPLACE TEMP TABLE ocid_privado AS
SELECT DISTINCT ocid
FROM (SELECT ocid, unnest(regexp_extract_all(ocid, '[0-9]{10,14}')) AS n FROM mart.hecho_proceso)
WHERE substr(n, 1, 10) IN (
    SELECT substr(r, 1, 10) FROM (SELECT unnest([ruc, ruc_en_id]) AS r FROM int.organizacion) WHERE r IS NOT NULL AND ruc_tipo(r) = 'natural'
);
CREATE OR REPLACE MACRO pub_ocid(o) AS
    CASE WHEN o IN (SELECT ocid FROM ocid_privado) THEN regexp_replace(o, '[0-9]{10,14}', 'RESERVADO', 'g') ELSE o END;

COPY (
    SELECT pub_ocid(ocid) AS ocid, CASE WHEN ocid IN (SELECT ocid FROM ocid_privado) THEN regexp_replace(award_id, '[0-9]{10,14}', 'RESERVADO', 'g') ELSE award_id END AS award_id, entidad_id, proveedor_id, proveedor_tipo, monto, fecha, anio, familia, procedimiento,
           categoria, estado, vigente
    FROM mart.hecho_adjudicacion ORDER BY anio, entidad_id, proveedor_id, fecha
) TO 'web/public/data/adjudicaciones' (FORMAT parquet, PARTITION_BY (anio), COMPRESSION zstd,
     PARQUET_VERSION V1, ROW_GROUP_SIZE 100000, OVERWRITE_OR_IGNORE true, FILENAME_PATTERN 'datos');

COPY (
    SELECT pub_ocid(ocid) AS ocid, item_key, entidad_id, proveedor_id, proveedor_tipo, fecha, anio, cpc, unidad, descripcion, cantidad,
           precio_unitario, compras, mediana, razon_mediana, motivo_no_calculado
    FROM mart.precio_comparado ORDER BY anio, cpc, unidad, precio_unitario
) TO 'web/public/data/items' (FORMAT parquet, PARTITION_BY (anio), COMPRESSION zstd,
     PARQUET_VERSION V1, ROW_GROUP_SIZE 100000, OVERWRITE_OR_IGNORE true, FILENAME_PATTERN 'datos');

COPY (SELECT * REPLACE (pub_ocid(ocid) AS ocid) FROM mart.hecho_proceso ORDER BY anio, entidad_id)
TO 'web/public/data/procesos' (FORMAT parquet, PARTITION_BY (anio), COMPRESSION zstd, PARQUET_VERSION V1,
     ROW_GROUP_SIZE 100000, OVERWRITE_OR_IGNORE true, FILENAME_PATTERN 'datos');

COPY (SELECT * FROM mart.precio_grupo ORDER BY cpc, unidad, anio)
TO 'web/public/data/precio_grupo.parquet' (FORMAT parquet, COMPRESSION zstd, PARQUET_VERSION V1, ROW_GROUP_SIZE 16384);
COPY (
    SELECT s.* REPLACE (pub_ocid(s.ocid) AS ocid), e.nombre AS entidad_nombre
    FROM mart.senal_riesgo s LEFT JOIN mart.dim_entidad e ON e.entidad_id = s.entidad_id AND e.tipo <> 'natural'
    ORDER BY s.indicador, s.anio, s.valor DESC
)
TO 'web/public/data/senales.parquet' (FORMAT parquet, COMPRESSION zstd, PARQUET_VERSION V1, ROW_GROUP_SIZE 8192);
COPY (SELECT * FROM mart.concentracion ORDER BY entidad_id, anio)
TO 'web/public/data/concentracion.parquet' (FORMAT parquet, COMPRESSION zstd, PARQUET_VERSION V1, ROW_GROUP_SIZE 16384);
COPY (SELECT * FROM mart.dim_entidad ORDER BY entidad_id)
TO 'web/public/data/entidades.parquet' (FORMAT parquet, COMPRESSION zstd, PARQUET_VERSION V1);
COPY (SELECT * FROM mart.dim_proveedor WHERE tipo <> 'natural' ORDER BY proveedor_id)
TO 'web/public/data/proveedores.parquet' (FORMAT parquet, COMPRESSION zstd, PARQUET_VERSION V1);
COPY (SELECT * FROM mart.grafo_metrica ORDER BY nodo_id)
TO 'web/public/data/grafo_nodos.parquet' (FORMAT parquet, COMPRESSION zstd, PARQUET_VERSION V1);
COPY (SELECT * FROM mart.grafo_adjudico ORDER BY origen, destino)
TO 'web/public/data/grafo_adjudico.parquet' (FORMAT parquet, COMPRESSION zstd, PARQUET_VERSION V1);
COPY (SELECT * FROM mart.grafo_compitio ORDER BY origen, destino)
TO 'web/public/data/grafo_compitio.parquet' (FORMAT parquet, COMPRESSION zstd, PARQUET_VERSION V1);
COPY (SELECT * FROM mart.dim_procedimiento ORDER BY orden, procesos DESC)
TO 'web/public/data/procedimientos.parquet' (FORMAT parquet, COMPRESSION zstd, PARQUET_VERSION V1);

-- Small aggregates for the first view (kept under the 300 kB budget, test T-11).
COPY (
    SELECT
        (SELECT list({'anio': anio, 'monto': monto, 'adjudicaciones': n} ORDER BY anio) FROM (
            SELECT anio, round(sum(monto))::BIGINT AS monto, count(*) AS n FROM mart.hecho_adjudicacion WHERE vigente GROUP BY anio)) AS por_anio,
        (SELECT list({'anio': anio, 'familia': familia, 'monto': monto, 'adjudicaciones': n} ORDER BY anio, familia) FROM (
            SELECT anio, familia, round(sum(monto))::BIGINT AS monto, count(*) AS n FROM mart.hecho_adjudicacion WHERE vigente GROUP BY ALL)) AS por_familia,
        (SELECT list({'anio': anio, 'categoria': categoria, 'monto': monto} ORDER BY anio, categoria) FROM (
            SELECT anio, coalesce(categoria, 'sin dato') AS categoria, round(sum(monto))::BIGINT AS monto FROM mart.hecho_adjudicacion WHERE vigente GROUP BY ALL)) AS por_categoria,
        (SELECT list({'anio': anio, 'provincia': provincia, 'monto': monto} ORDER BY anio, provincia) FROM (
            SELECT a.anio, coalesce(e.provincia, 'SIN PROVINCIA') AS provincia, round(sum(a.monto))::BIGINT AS monto
            FROM mart.hecho_adjudicacion a LEFT JOIN mart.dim_entidad e USING (entidad_id) WHERE a.vigente GROUP BY ALL)) AS por_provincia,
        (SELECT list({'anio': anio, 'tipo': proveedor_tipo, 'monto': monto} ORDER BY anio, proveedor_tipo) FROM (
            SELECT anio, proveedor_tipo, round(sum(monto))::BIGINT AS monto FROM mart.hecho_adjudicacion WHERE vigente GROUP BY ALL)) AS por_tipo_proveedor,
        (SELECT list({'indicador': indicador, 'nombre': nombre, 'origen': origen, 'senales': senales, 'disponibilidad': disponibilidad}) FROM mart.indicador_estado) AS indicadores,
        (SELECT list({'anio': anio, 'tipo': tipo, 'casos': casos}) FROM mart.calidad_resumen) AS calidad
) TO 'web/public/data/panorama.json' (FORMAT json);

COPY (
    SELECT
        (SELECT max(snapshot_id) FROM lake.snapshots()) AS snapshot_id,
        (SELECT strftime(max(snapshot_time), '%Y-%m-%d') FROM lake.snapshots()) AS snapshot_fecha,
        (SELECT metodologia_version()) AS metodologia_version,
        (SELECT list({'anio': source_year, 'estado': status, 'sha256': sha256, 'procesos': parsed, 'cargado': strftime(loaded_at, '%Y-%m-%d')} ORDER BY source_year)
           FROM (SELECT * FROM lake.load_manifest QUALIFY row_number() OVER (PARTITION BY source_year ORDER BY status = 'fresh' DESC, loaded_at DESC) = 1)) AS cargas,
        (SELECT list(DISTINCT anio ORDER BY anio) FROM mart.hecho_adjudicacion) AS anios,
        (SELECT count(*) FROM mart.hecho_proceso) AS procesos,
        (SELECT count(*) FROM mart.hecho_adjudicacion) AS adjudicaciones,
        (SELECT count(*) FROM mart.precio_comparado) AS items_con_precio,
        (SELECT list({'codigo': codigo, 'descripcion': descripcion, 'vigente_desde': vigente_desde, 'vigente_hasta': vigente_hasta, 'valor': valor, 'fuente_url': fuente_url}) FROM ref.parametro_normativo) AS parametros,
        (SELECT list({'codigo': codigo, 'descripcion': descripcion, 'valor': valor, 'fuente': fuente}) FROM ref.umbral) AS umbrales,
        'Fuente: Servicio Nacional de Contratación Pública (SERCOP), publicado por Open Contracting Partnership. Licencia CC BY 3.0 Ecuador. Datos transformados por LUPA (aplanados, normalizados y agregados).' AS atribucion,
        'https://creativecommons.org/licenses/by/3.0/ec/' AS licencia_url
) TO 'web/public/data/meta.json' (FORMAT json);

-- RSS input: latest awards per public entity and per legal-person supplier with activity.
COPY (
    WITH ranked AS (
        SELECT a.*, row_number() OVER (PARTITION BY a.entidad_id ORDER BY a.fecha DESC, a.ocid) AS rn
        FROM mart.hecho_adjudicacion a WHERE a.vigente AND a.entidad_id IS NOT NULL
    )
    SELECT 'entidad' AS tipo, r.entidad_id AS id, any_value(e.nombre) AS nombre,
           list({'ocid': pub_ocid(r.ocid), 'fecha': r.fecha, 'monto': r.monto, 'procedimiento': r.procedimiento,
                 'proveedor': CASE WHEN r.proveedor_tipo = 'natural' THEN 'Persona natural' ELSE p.nombre END} ORDER BY r.fecha DESC) AS items
    FROM ranked r
    JOIN mart.dim_entidad e ON e.entidad_id = r.entidad_id
    LEFT JOIN mart.dim_proveedor p ON p.proveedor_id = r.proveedor_id
    WHERE r.rn <= 20 AND e.tipo <> 'natural'
    GROUP BY r.entidad_id
    UNION ALL
    SELECT 'proveedor', r.proveedor_id, any_value(p.nombre),
           list({'ocid': pub_ocid(r.ocid), 'fecha': r.fecha, 'monto': r.monto, 'procedimiento': r.procedimiento, 'entidad': e.nombre} ORDER BY r.fecha DESC)
    FROM (
        SELECT a.*, row_number() OVER (PARTITION BY a.proveedor_id ORDER BY a.fecha DESC, a.ocid) AS rn,
               count(*) OVER (PARTITION BY a.proveedor_id) AS total
        FROM mart.hecho_adjudicacion a WHERE a.vigente AND a.proveedor_tipo = 'juridica'
    ) r
    JOIN mart.dim_proveedor p ON p.proveedor_id = r.proveedor_id
    LEFT JOIN mart.dim_entidad e ON e.entidad_id = r.entidad_id
    WHERE r.rn <= 20 AND r.total >= 25
    GROUP BY r.proveedor_id
) TO 'data/export/feeds.json' (FORMAT json, ARRAY true);

-- Home feed: the most relevant signals as ready-to-read posts (no engine needed on first view).
-- Price posts are ranked by the extra amount paid against the median, not by the ratio alone.
COPY (
    WITH ultimo AS (SELECT max(anio) - 1 AS desde FROM mart.hecho_adjudicacion),
    precio AS (
        SELECT 'PRECIO_ATIPICO' AS indicador, pub_ocid(s.ocid) AS ocid, s.anio, c.fecha, s.valor, s.umbral, s.explicacion,
               s.entidad_id, e.nombre AS entidad,
               CASE WHEN c.proveedor_tipo = 'natural' THEN 'Persona natural' ELSE p.nombre END AS proveedor,
               c.proveedor_tipo, c.descripcion AS item, c.cpc, c.unidad, c.precio_unitario, c.mediana, c.compras,
               round(c.cantidad * (c.precio_unitario - c.mediana), 2) AS monto
        FROM mart.senal_riesgo s
        JOIN mart.precio_comparado c USING (ocid, item_key)
        JOIN mart.dim_entidad e ON e.entidad_id = s.entidad_id AND e.tipo <> 'natural'
        LEFT JOIN mart.dim_proveedor p ON p.proveedor_id = c.proveedor_id
        WHERE s.indicador = 'PRECIO_ATIPICO' AND s.anio >= (SELECT desde FROM ultimo)
        ORDER BY monto DESC NULLS LAST LIMIT 40
    ),
    otras AS (
        SELECT s.indicador, pub_ocid(s.ocid) AS ocid, s.anio, a.fecha, s.valor, s.umbral, s.explicacion, s.entidad_id,
               e.nombre AS entidad,
               CASE WHEN p.tipo = 'natural' OR p.tipo IS NULL THEN 'Persona natural' ELSE p.nombre END AS proveedor,
               p.tipo AS proveedor_tipo, NULL AS item, NULL AS cpc, NULL AS unidad, NULL::DOUBLE AS precio_unitario,
               NULL::DOUBLE AS mediana, NULL::BIGINT AS compras, a.monto::DOUBLE AS monto,
               row_number() OVER (PARTITION BY s.indicador ORDER BY s.anio DESC, a.monto DESC NULLS LAST) AS rn
        FROM mart.senal_riesgo s
        JOIN mart.dim_entidad e ON e.entidad_id = s.entidad_id AND e.tipo <> 'natural'
        LEFT JOIN mart.hecho_adjudicacion a ON a.ocid = s.ocid
        LEFT JOIN mart.dim_proveedor p ON p.proveedor_id = s.proveedor_id
        WHERE s.indicador IN ('FRAGMENTACION', 'PROVEEDOR_NUEVO') AND s.anio >= (SELECT desde FROM ultimo)
        QUALIFY rn <= 15
    ),
    conc AS (
        SELECT 'CONCENTRACION' AS indicador, NULL AS ocid, c.anio, NULL::DATE AS fecha, c.hhi::DOUBLE AS valor, 1800::DOUBLE AS umbral,
               s.explicacion, c.entidad_id, e.nombre AS entidad,
               CASE WHEN p.tipo = 'natural' OR p.tipo IS NULL THEN 'Persona natural' ELSE p.nombre END AS proveedor,
               p.tipo AS proveedor_tipo, NULL AS item, NULL AS cpc, NULL AS unidad, NULL::DOUBLE AS precio_unitario,
               NULL::DOUBLE AS mediana, c.adjudicaciones::BIGINT AS compras, c.monto_total::DOUBLE AS monto
        FROM mart.concentracion c
        JOIN mart.senal_riesgo s ON s.indicador = 'CONCENTRACION' AND s.entidad_id = c.entidad_id AND s.anio = c.anio
        JOIN mart.dim_entidad e ON e.entidad_id = c.entidad_id AND e.tipo <> 'natural'
        LEFT JOIN mart.dim_proveedor p ON p.proveedor_id = c.proveedor_mayor
        WHERE c.anio = (SELECT desde FROM ultimo)
        ORDER BY c.monto_total DESC LIMIT 15
    )
    SELECT * FROM precio
    UNION ALL BY NAME SELECT * EXCLUDE (rn) FROM otras
    UNION ALL BY NAME SELECT * FROM conc
) TO 'web/public/data/feed.json' (FORMAT json, ARRAY true);

-- Right rail: entities and suppliers with the largest amounts in the last full year.
COPY (
    WITH ultimo AS (SELECT max(anio) - 1 AS anio FROM mart.hecho_adjudicacion)
    SELECT
        (SELECT anio FROM ultimo) AS anio,
        (SELECT list({'id': entidad_id, 'nombre': nombre, 'monto': monto} ORDER BY monto DESC) FROM (
            SELECT a.entidad_id, e.nombre, round(sum(a.monto))::BIGINT AS monto
            FROM mart.hecho_adjudicacion a JOIN mart.dim_entidad e USING (entidad_id)
            WHERE a.vigente AND a.anio = (SELECT anio FROM ultimo) AND e.tipo <> 'natural'
            GROUP BY ALL ORDER BY monto DESC LIMIT 6)) AS entidades,
        (SELECT list({'id': proveedor_id, 'nombre': nombre, 'monto': monto} ORDER BY monto DESC) FROM (
            SELECT a.proveedor_id, p.nombre, round(sum(a.monto))::BIGINT AS monto
            FROM mart.hecho_adjudicacion a JOIN mart.dim_proveedor p USING (proveedor_id)
            WHERE a.vigente AND a.anio = (SELECT anio FROM ultimo) AND p.tipo = 'juridica'
            GROUP BY ALL ORDER BY monto DESC LIMIT 6)) AS proveedores
) TO 'web/public/data/tendencias.json' (FORMAT json);

-- Materialized view for the signals page: top 100 per indicator and year, a single row group,
-- so a filter change costs a handful of HTTP round trips (test T-11). Full data: senales.parquet.
COPY (
    SELECT indicador, anio, valor,
           to_json({'ocid': pub_ocid(s.ocid), 'explicacion': explicacion, 'entidad_id': s.entidad_id, 'entidad': e.nombre})::VARCHAR AS datos
    FROM mart.senal_riesgo s
    LEFT JOIN mart.dim_entidad e ON e.entidad_id = s.entidad_id AND e.tipo <> 'natural'
    QUALIFY row_number() OVER (PARTITION BY indicador, anio ORDER BY valor DESC) <= 100
    ORDER BY indicador, anio, valor DESC
) TO 'web/public/data/senales_top.parquet' (FORMAT parquet, COMPRESSION zstd, PARQUET_VERSION V1, ROW_GROUP_SIZE 1000000);
