-- Intermediate (real identifiers, internal) and marts (public identifiers, published).

-- One row per organization identifier seen anywhere.
CREATE OR REPLACE TABLE int.organizacion AS
WITH ids AS (
    SELECT party_id AS org_id, ruc, nombre, provincia, roles FROM stg.party
    UNION ALL SELECT buyer_id, NULL, buyer_name, NULL, ['buyer'] FROM stg.process WHERE buyer_id IS NOT NULL
    UNION ALL SELECT supplier_id, NULL, supplier_name, NULL, ['supplier'] FROM stg.award_supplier
    UNION ALL SELECT tenderer_id, NULL, tenderer_name, NULL, ['tenderer'] FROM stg.tenderer
)
SELECT org_id,
       coalesce(max(ruc), nullif(regexp_extract(org_id, 'EC-RUC-([0-9]+)', 1), '')) AS ruc,
       nullif(regexp_extract(org_id, 'EC-RUC-([0-9]+)', 1), '') AS ruc_en_id,
       mode(nombre) AS nombre,
       mode(provincia) AS provincia,
       list_distinct(flatten(list(roles))) AS roles
FROM ids
GROUP BY org_id;

-- Conservative rule: if either the identifier's RUC or the RUC embedded in the id looks
-- like a natural person's, the organization is treated as a natural person.
CREATE OR REPLACE TABLE int.organizacion_publica AS
WITH t AS (
    SELECT *,
           CASE WHEN ruc_tipo(ruc) = 'natural' OR (ruc_en_id IS NOT NULL AND ruc_tipo(ruc_en_id) = 'natural')
                THEN 'natural' ELSE ruc_tipo(ruc) END AS tipo
    FROM int.organizacion
)
SELECT org_id, tipo,
       CASE WHEN tipo = 'natural'
            THEN 'NAT-' || substr(sha256(coalesce(ruc, org_id) || getvariable('lupa_salt')), 1, 12)
            ELSE org_id END AS publico_id,
       CASE WHEN tipo = 'natural' THEN 'Persona natural' ELSE nombre END AS nombre_publico,
       CASE WHEN tipo = 'natural' THEN NULL ELSE ruc END AS ruc_publico,
       provincia,
       roles
FROM t;

CREATE OR REPLACE TABLE mart.dim_territorio AS
SELECT provincia, region_natural FROM ref.provincia
UNION ALL SELECT 'SIN PROVINCIA', NULL;

CREATE OR REPLACE TABLE mart.dim_entidad AS
SELECT o.publico_id AS entidad_id, o.nombre_publico AS nombre, o.ruc_publico AS ruc, o.tipo,
       CASE WHEN o.provincia IN (SELECT provincia FROM ref.provincia) THEN o.provincia ELSE 'SIN PROVINCIA' END AS provincia
FROM int.organizacion_publica o
WHERE o.org_id IN (SELECT buyer_id FROM stg.process);

CREATE OR REPLACE TABLE mart.dim_proveedor AS
SELECT o.publico_id AS proveedor_id, o.nombre_publico AS nombre, o.ruc_publico AS ruc, o.tipo,
       CASE WHEN o.provincia IN (SELECT provincia FROM ref.provincia) THEN o.provincia ELSE 'SIN PROVINCIA' END AS provincia
FROM int.organizacion_publica o
WHERE o.org_id IN (SELECT supplier_id FROM stg.award_supplier UNION SELECT tenderer_id FROM stg.tenderer)
QUALIFY row_number() OVER (PARTITION BY o.publico_id ORDER BY o.org_id) = 1;

CREATE OR REPLACE TABLE mart.dim_procedimiento AS
SELECT p.procurement_method_details AS procedimiento, p.familia, f.orden, f.descripcion_clara,
       count(*) AS procesos
FROM stg.process p
LEFT JOIN ref.procedimiento_familia f USING (familia)
GROUP BY ALL;

CREATE OR REPLACE TABLE mart.hecho_proceso AS
SELECT p.ocid, b.publico_id AS entidad_id, p.anio, p.fecha_publicacion, p.familia, p.procurement_method,
       p.procurement_method_details AS procedimiento, p.main_category AS categoria, p.monto_referencial,
       p.fecha_inicio_ofertas, p.fecha_fin_ofertas, p.number_of_tenderers AS numero_oferentes,
       p.tender_status AS estado
FROM stg.process p
LEFT JOIN int.organizacion_publica b ON b.org_id = p.buyer_id;

-- Grain: one award. When an award lists several suppliers, the first one by id is kept
-- and the case is recorded in calidad_dato.
CREATE OR REPLACE TABLE int.adjudicacion AS
SELECT a.ocid, a.award_id, p.buyer_id, s.supplier_id,
       CASE WHEN a.currency = 'USD' AND a.amount >= 0 THEN a.amount::DECIMAL(18, 2) END AS monto,
       a.currency AS moneda,
       coalesce(a.fecha_adjudicacion, p.fecha_publicacion) AS fecha,
       a.anio, p.familia, p.procurement_method_details AS procedimiento, p.main_category AS categoria,
       a.status AS estado,
       coalesce(a.status, 'active') NOT IN ('cancelled', 'unsuccessful') AS vigente
FROM stg.award a
JOIN stg.process p USING (ocid)
LEFT JOIN (
    SELECT ocid, award_id, min(supplier_id) AS supplier_id FROM stg.award_supplier GROUP BY ALL
) s USING (ocid, award_id);

CREATE OR REPLACE TABLE mart.hecho_adjudicacion AS
SELECT a.ocid, a.award_id, e.publico_id AS entidad_id, s.publico_id AS proveedor_id,
       coalesce(s.tipo, 'natural') AS proveedor_tipo, a.monto, a.moneda, a.fecha, a.anio, a.familia,
       a.procedimiento, a.categoria, a.estado, a.vigente,
       (SELECT max(snapshot_id) FROM lake.snapshots()) AS snapshot_id
FROM int.adjudicacion a
LEFT JOIN int.organizacion_publica e ON e.org_id = a.buyer_id
LEFT JOIN int.organizacion_publica s ON s.org_id = a.supplier_id;

CREATE OR REPLACE TABLE mart.hecho_item AS
SELECT i.ocid, i.award_id, i.item_key, a.entidad_id, a.proveedor_id, a.proveedor_tipo, a.fecha, i.anio,
       i.cpc, i.cpc_descripcion, i.descripcion, i.unidad, i.cantidad, i.precio_unitario,
       (i.cantidad * i.precio_unitario)::DECIMAL(18, 2) AS total
FROM stg.award_item i
JOIN mart.hecho_adjudicacion a USING (ocid, award_id);

CREATE OR REPLACE TABLE mart.hecho_oferente AS
SELECT DISTINCT t.ocid, o.publico_id AS proveedor_id, o.tipo AS proveedor_tipo
FROM stg.tenderer t
JOIN int.organizacion_publica o ON o.org_id = t.tenderer_id;

CREATE OR REPLACE TABLE mart.dim_tiempo AS
SELECT d::DATE AS fecha, year(d) AS anio, month(d) AS mes, quarter(d) AS trimestre
FROM range(DATE '2015-01-01', DATE '2027-01-01', INTERVAL 1 DAY) t(d);

CREATE OR REPLACE TABLE mart.parametro_normativo AS SELECT * FROM ref.parametro_normativo;

-- Data quality: every known issue is recorded, not hidden.
CREATE OR REPLACE TABLE mart.calidad_dato AS
SELECT a.ocid, 'fecha_adjudicacion_anterior_a_publicacion' AS tipo, a.anio
FROM stg.award a JOIN stg.process p USING (ocid)
WHERE a.fecha_adjudicacion < p.fecha_publicacion
UNION ALL
SELECT ocid, 'adjudicacion_sin_proveedor', anio FROM int.adjudicacion WHERE supplier_id IS NULL
UNION ALL
SELECT ocid, 'adjudicacion_moneda_no_usd', anio FROM int.adjudicacion WHERE moneda IS DISTINCT FROM 'USD'
UNION ALL
SELECT ocid, 'adjudicacion_varios_proveedores', any_value(anio)
FROM (SELECT s.ocid, s.award_id, a.anio FROM stg.award_supplier s JOIN stg.award a USING (ocid, award_id))
GROUP BY ocid, award_id HAVING count(*) > 1
UNION ALL
SELECT ocid, 'item_sin_precio_unitario', anio FROM stg.award_item WHERE precio_unitario IS NULL
UNION ALL
SELECT ocid, 'item_id_repetido', any_value(anio) FROM stg.award_item
WHERE item_id IS NOT NULL GROUP BY ocid, award_id, item_id HAVING count(*) > 1
UNION ALL
SELECT ocid, 'proceso_sin_entidad', anio FROM stg.process WHERE buyer_id IS NULL;

CREATE OR REPLACE TABLE mart.calidad_resumen AS
SELECT anio, tipo, count(*) AS casos FROM mart.calidad_dato GROUP BY ALL ORDER BY anio, tipo;
