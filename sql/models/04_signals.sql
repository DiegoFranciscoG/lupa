-- Risk signals. A signal describes a verifiable fact; it is not an accusation.
-- The methodology version changes whenever a rule or a threshold changes.
CREATE OR REPLACE MACRO metodologia_version() AS '2026.11';

-- Comparable price groups: same CPC, same normalized unit, same year.
CREATE OR REPLACE TABLE mart.precio_grupo AS
SELECT cpc, unidad, anio,
       any_value(cpc_descripcion) AS cpc_descripcion,
       count(*) AS compras,
       count(DISTINCT entidad_id) AS entidades,
       quantile_cont(precio_unitario, 0.25)::DOUBLE AS p25,
       median(precio_unitario)::DOUBLE AS mediana,
       quantile_cont(precio_unitario, 0.75)::DOUBLE AS p75,
       min(precio_unitario)::DOUBLE AS minimo,
       max(precio_unitario)::DOUBLE AS maximo
FROM mart.hecho_item
WHERE precio_unitario IS NOT NULL AND cpc IS NOT NULL
GROUP BY cpc, unidad, anio;

CREATE OR REPLACE TABLE mart.precio_grupo_mad AS
SELECT g.cpc, g.unidad, g.anio, median(abs(i.precio_unitario::DOUBLE - g.mediana)) AS mad
FROM mart.hecho_item i
JOIN mart.precio_grupo g USING (cpc, unidad, anio)
WHERE i.precio_unitario IS NOT NULL
GROUP BY ALL;

-- Ratio of each item against its group. Groups below the minimum size get no ratio and
-- the reason is stated instead.
CREATE OR REPLACE TABLE mart.precio_comparado AS
SELECT i.ocid, i.award_id, i.item_key, i.entidad_id, i.proveedor_id, i.proveedor_tipo, i.fecha, i.anio, i.cpc,
       i.unidad, i.descripcion, i.cantidad, i.precio_unitario::DOUBLE AS precio_unitario, g.compras, g.mediana, m.mad,
       CASE WHEN g.compras >= umbral('PRECIO_MIN_COMPARABLES')
            THEN round(i.precio_unitario::DOUBLE / g.mediana, 2) END AS razon_mediana,
       CASE WHEN g.compras < umbral('PRECIO_MIN_COMPARABLES')
            THEN 'No se calcula: solo ' || g.compras || ' compras comparables (mínimo '
                 || umbral('PRECIO_MIN_COMPARABLES')::INTEGER || ').'
       END AS motivo_no_calculado
FROM mart.hecho_item i
JOIN mart.precio_grupo g USING (cpc, unidad, anio)
JOIN mart.precio_grupo_mad m USING (cpc, unidad, anio)
WHERE i.precio_unitario IS NOT NULL;

CREATE OR REPLACE TABLE mart.senal_riesgo (
    ocid VARCHAR NOT NULL,
    item_key VARCHAR,
    indicador VARCHAR NOT NULL,
    entidad_id VARCHAR,
    proveedor_id VARCHAR,
    anio INTEGER,
    valor DOUBLE,
    umbral DOUBLE,
    explicacion VARCHAR NOT NULL,
    metodologia_version VARCHAR NOT NULL
);

-- PRECIO_ATIPICO: price above median + k x 1.4826 x MAD and at least RATIO_MIN x median.
INSERT INTO mart.senal_riesgo
SELECT ocid, item_key, 'PRECIO_ATIPICO', entidad_id, proveedor_id, anio, razon_mediana,
       round(mediana + umbral('PRECIO_MAD_K') * 1.4826 * mad, 4),
       format('Precio unitario {} veces la mediana de {} compras comparables del mismo ítem (CPC {}, {}) en {}.',
              replace(razon_mediana::VARCHAR, '.', ','), compras, cpc, lower(unidad), anio),
       metodologia_version()
FROM mart.precio_comparado
WHERE razon_mediana IS NOT NULL
  AND mad > 0
  AND precio_unitario > mediana + umbral('PRECIO_MAD_K') * 1.4826 * mad
  AND razon_mediana >= umbral('PRECIO_RATIO_MIN');

-- CONCENTRACION: Herfindahl-Hirschman index of each entity's suppliers per year (0 to 10 000).
CREATE OR REPLACE TABLE mart.concentracion AS
WITH gasto AS (
    SELECT entidad_id, anio, proveedor_id, sum(monto) AS monto, count(*) AS adjudicaciones
    FROM mart.hecho_adjudicacion
    WHERE vigente AND monto > 0 AND entidad_id IS NOT NULL AND proveedor_id IS NOT NULL
    GROUP BY ALL
), cuota AS (
    SELECT *, monto / sum(monto) OVER (PARTITION BY entidad_id, anio) AS participacion FROM gasto
)
SELECT entidad_id, anio,
       round(sum(power(participacion * 100, 2)))::INTEGER AS hhi,
       sum(adjudicaciones)::INTEGER AS adjudicaciones,
       count(*)::INTEGER AS proveedores,
       round(max(participacion), 4)::DOUBLE AS participacion_mayor,
       arg_max(proveedor_id, participacion) AS proveedor_mayor,
       sum(monto)::DECIMAL(18, 2) AS monto_total
FROM cuota
GROUP BY ALL;

INSERT INTO mart.senal_riesgo
SELECT 'ENTIDAD:' || entidad_id || ':' || anio, NULL, 'CONCENTRACION', entidad_id, proveedor_mayor, anio, hhi,
       umbral('HHI_ALTO'),
       format('Índice de concentración {} (escala de 0 a 10 000) en {}: el proveedor principal recibió el {} % del monto adjudicado, en {} adjudicaciones.',
              hhi, anio, replace(round(participacion_mayor * 100, 1)::VARCHAR, '.', ','), adjudicaciones),
       metodologia_version()
FROM mart.concentracion
WHERE adjudicaciones >= umbral('HHI_MIN_ADJUDICACIONES') AND hhi >= umbral('HHI_ALTO');

-- FRAGMENTACION: repeated awards from the same entity to the same supplier within the window,
-- each just under a limit in force on its date, that together exceed that limit.
CREATE OR REPLACE TABLE mart.fragmentacion AS
WITH bajo_umbral AS (
    SELECT a.ocid, a.entidad_id, a.proveedor_id, a.fecha, a.anio, a.monto, p.codigo, p.valor::DOUBLE AS umbral_valor
    FROM mart.hecho_adjudicacion a
    JOIN ref.parametro_normativo p
      ON a.fecha >= p.vigente_desde AND (p.vigente_hasta IS NULL OR a.fecha <= p.vigente_hasta)
    WHERE a.vigente AND a.monto IS NOT NULL AND a.entidad_id IS NOT NULL AND a.proveedor_id IS NOT NULL
      AND a.monto <= p.valor AND a.monto >= p.valor * umbral('FRAG_BANDA_INFERIOR')
), ventanas AS (
    SELECT b1.ocid, b1.entidad_id, b1.proveedor_id, b1.codigo, b1.umbral_valor, b1.fecha, b1.anio,
           count(*) AS compras, sum(b2.monto)::DOUBLE AS suma, list(b2.ocid ORDER BY b2.fecha) AS procesos
    FROM bajo_umbral b1
    JOIN bajo_umbral b2
      ON b1.entidad_id = b2.entidad_id AND b1.proveedor_id = b2.proveedor_id AND b1.codigo = b2.codigo
     AND b2.fecha BETWEEN b1.fecha AND b1.fecha + to_days(umbral('FRAG_VENTANA_DIAS')::INTEGER)
    GROUP BY ALL
)
SELECT * FROM ventanas
WHERE compras >= umbral('FRAG_MIN_COMPRAS') AND suma > umbral_valor;

INSERT INTO mart.senal_riesgo
SELECT ocid, NULL, 'FRAGMENTACION', entidad_id, proveedor_id, anio, compras, umbral_valor,
       format('{} adjudicaciones al mismo proveedor en {} días, cada una entre el {} % y el 100 % del límite vigente de {} (USD {}); juntas suman USD {}.',
              compras, umbral('FRAG_VENTANA_DIAS')::INTEGER, (umbral('FRAG_BANDA_INFERIOR') * 100)::INTEGER,
              lower(replace(codigo, '_', ' ')), umbral_valor, round(suma, 2)),
       metodologia_version()
FROM mart.fragmentacion
QUALIFY row_number() OVER (PARTITION BY ocid ORDER BY compras DESC) = 1;

-- PROVEEDOR_NUEVO: a large award soon after the supplier first appears. Evaluated only
-- after one full year of history, so the first year of data does not count as "new".
CREATE OR REPLACE TABLE int.primera_adjudicacion AS
SELECT proveedor_id, min(fecha) AS primera_fecha
FROM mart.hecho_adjudicacion
WHERE proveedor_id IS NOT NULL
GROUP BY 1;

INSERT INTO mart.senal_riesgo
WITH rango AS (
    SELECT ocid, award_id, percent_rank() OVER (PARTITION BY anio ORDER BY monto) AS pr
    FROM mart.hecho_adjudicacion WHERE vigente AND monto > 0
), corte AS (
    SELECT a.anio, min(a.monto)::DOUBLE AS corte
    FROM mart.hecho_adjudicacion a JOIN rango r USING (ocid, award_id)
    WHERE r.pr >= umbral('NUEVO_PERCENTIL') GROUP BY a.anio
), inicio AS (SELECT min(fecha) AS f FROM mart.hecho_adjudicacion)
SELECT a.ocid, NULL, 'PROVEEDOR_NUEVO', a.entidad_id, a.proveedor_id, a.anio, (a.fecha - f.primera_fecha), c.corte,
       format('Adjudicación de USD {} a un proveedor cuya primera adjudicación en los datos fue {} días antes.',
              a.monto, (a.fecha - f.primera_fecha)),
       metodologia_version()
FROM mart.hecho_adjudicacion a
JOIN int.primera_adjudicacion f USING (proveedor_id)
JOIN corte c USING (anio)
CROSS JOIN inicio
WHERE a.vigente AND a.monto >= c.corte
  AND (a.fecha - f.primera_fecha) BETWEEN 0 AND umbral('NUEVO_DIAS')
  AND f.primera_fecha >= inicio.f + INTERVAL 365 DAY;

-- R018 (Cardinal definition): a single tenderer in an open or selective procedure.
-- Electronic catalogue purchases are excluded: they have no competition by design.
INSERT INTO mart.senal_riesgo
SELECT ocid, NULL, 'R018_OFERTA_UNICA', entidad_id, NULL, anio, numero_oferentes, 1,
       'Se registró un solo oferente en un procedimiento '
       || CASE procurement_method WHEN 'open' THEN 'abierto' ELSE 'selectivo' END || '.',
       metodologia_version()
FROM mart.hecho_proceso
WHERE numero_oferentes = 1 AND procurement_method IN ('open', 'selective') AND familia <> 'Catálogo electrónico';

-- R003 (Cardinal definition): submission period shorter than the threshold, open procedures.
INSERT INTO mart.senal_riesgo
SELECT ocid, NULL, 'R003_PLAZO_CORTO', entidad_id, NULL, anio, (fecha_fin_ofertas - fecha_inicio_ofertas),
       umbral('R003_DIAS'),
       format('El plazo para presentar ofertas fue de {} días (referencia: {} días).',
              (fecha_fin_ofertas - fecha_inicio_ofertas), umbral('R003_DIAS')::INTEGER),
       metodologia_version()
FROM mart.hecho_proceso
WHERE procurement_method = 'open' AND fecha_inicio_ofertas IS NOT NULL AND fecha_fin_ofertas IS NOT NULL
  AND (fecha_fin_ofertas - fecha_inicio_ofertas) BETWEEN 0 AND umbral('R003_DIAS') - 1;

-- EMERGENCIA: share of each entity's spending under the emergency regime. Only computed
-- when the source labels procedures as emergency (see docs/verificacion.md).
CREATE OR REPLACE TABLE mart.emergencia AS
SELECT entidad_id, anio,
       sum(monto) FILTER (WHERE familia = 'Emergencia')::DECIMAL(18, 2) AS monto_emergencia,
       sum(monto)::DECIMAL(18, 2) AS monto_total,
       round(coalesce(sum(monto) FILTER (WHERE familia = 'Emergencia'), 0) / nullif(sum(monto), 0), 4)::DOUBLE AS proporcion
FROM mart.hecho_adjudicacion
WHERE vigente AND monto > 0
GROUP BY ALL
HAVING sum(monto) FILTER (WHERE familia = 'Emergencia') > 0;

-- Indicator catalog with availability, shown on the methodology page.
CREATE OR REPLACE TABLE mart.indicador AS
SELECT * FROM (VALUES
    ('PRECIO_ATIPICO', 'Precio unitario atípico', 'propio'),
    ('CONCENTRACION', 'Concentración de proveedores (HHI)', 'propio'),
    ('FRAGMENTACION', 'Compras repetidas bajo el límite', 'propio'),
    ('PROVEEDOR_NUEVO', 'Proveedor reciente con adjudicación grande', 'propio'),
    ('EMERGENCIA', 'Peso del régimen de emergencia', 'propio'),
    ('R018_OFERTA_UNICA', 'Un solo oferente', 'Cardinal'),
    ('R003_PLAZO_CORTO', 'Plazo corto para ofertar', 'Cardinal')
) t(indicador, nombre, origen);

CREATE OR REPLACE TABLE mart.indicador_estado AS
SELECT i.indicador, i.nombre, i.origen, count(s.ocid) AS senales,
       CASE WHEN i.indicador = 'EMERGENCIA' AND (SELECT count(*) FROM mart.emergencia) = 0
                THEN 'No disponible: los datos publicados no identifican compras por emergencia.'
            WHEN i.indicador = 'EMERGENCIA'
                THEN 'Calculado como proporción del gasto; ver tabla de emergencia.'
            WHEN i.indicador = 'FRAGMENTACION'
                THEN 'Solo para fechas con límite verificado ('
                     || (SELECT string_agg(DISTINCT year(vigente_desde)::VARCHAR, ', ') FROM ref.parametro_normativo) || ').'
            ELSE 'Calculado.'
       END AS disponibilidad
FROM mart.indicador i
LEFT JOIN mart.senal_riesgo s USING (indicador)
GROUP BY ALL
ORDER BY i.indicador;
