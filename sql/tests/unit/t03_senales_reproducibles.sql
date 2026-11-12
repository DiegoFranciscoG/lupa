-- T-03: reproducible signals. A synthetic set of processes reviewed by hand, each with
-- the signals it must (and must not) produce. The test compares both directions.
--
--   f1..f3  same entity and supplier, 3 awards of USD 9 000 within 20 days after 2025-06-26
--           (limit USD 10 000)                      -> FRAGMENTACION on f1 only
--   r1      open, 1 tenderer, 4-day period          -> R018_OFERTA_UNICA, R003_PLAZO_CORTO
--   r2      open, 3 tenderers, 30-day period        -> nothing
--   c1      electronic catalogue, 1 tenderer        -> nothing (no competition by design)
--   x1..x20 20 more awards from E to S1             -> CONCENTRACION for E in 2025 (HHI 10 000)
--   y1..y20 E2 to 20 different suppliers, equal     -> nothing (HHI 500)
--   old     E2 to S9 in 2023                        -> sets the start of the data
--   sn1     E3 to a supplier first seen that day, USD 1 000 000 -> PROVEEDOR_NUEVO
CREATE OR REPLACE TEMP TABLE fx AS
SELECT * FROM (VALUES
    ('f1', 'E',  'S1',  '2025-07-01', 9000.0,    NULL,        NULL,                          NULL, NULL,         NULL),
    ('f2', 'E',  'S1',  '2025-07-10', 9000.0,    NULL,        NULL,                          NULL, NULL,         NULL),
    ('f3', 'E',  'S1',  '2025-07-20', 9000.0,    NULL,        NULL,                          NULL, NULL,         NULL),
    ('r1', 'E',  'S1',  '2025-02-10', 100.0,     'open',      'Subasta Inversa Electrónica', 1,    '2025-02-01', '2025-02-05'),
    ('r2', 'E',  'S1',  '2025-02-10', 100.0,     'open',      'Subasta Inversa Electrónica', 3,    '2025-02-01', '2025-03-03'),
    ('c1', 'E',  'S1',  '2025-02-10', 100.0,     'selective', 'Catálogo electrónico - Mejor oferta', 1, NULL,   NULL),
    ('old', 'E2', 'S9', '2023-01-01', 1000.0,    NULL,        NULL,                          NULL, NULL,         NULL),
    ('sn1', 'E3', 'SN', '2025-03-01', 1000000.0, NULL,        NULL,                          NULL, NULL,         NULL)
) t(ocid, ent, sup, fecha, monto, method, details, ntend, tstart, tend)
UNION ALL
SELECT 'x' || i, 'E', 'S1', '2025-04-01', 500.0, 'selective', 'Catálogo electrónico - Compra directa', NULL, NULL, NULL FROM range(1, 21) t(i)
UNION ALL
SELECT 'y' || i, 'E2', 'Y' || i, '2025-05-01', 1000.0, NULL, NULL, NULL, NULL, NULL FROM range(1, 21) t(i);

CREATE OR REPLACE TEMP MACRO ent_id(e) AS CASE e WHEN 'E' THEN 'EC-RUC-0960000001001-1' WHEN 'E2' THEN 'EC-RUC-0960000002001-2' ELSE 'EC-RUC-0960000003001-3' END;
CREATE OR REPLACE TEMP MACRO sup_id(s) AS 'EC-RUC-17900' || lpad((hash(s) % 100000)::VARCHAR, 5, '0') || '001-' || s;

INSERT INTO lake.process
SELECT ocid, 'r', fecha, ent_id(ent), 'ENTIDAD ' || ent, NULL, NULL, 'complete', method, details, 'goods', NULL, NULL,
       tstart, tend, ntend, year(fecha::DATE)
FROM fx;
INSERT INTO lake.award SELECT ocid, 'a-' || ocid, fecha, 'active', monto, 'USD', year(fecha::DATE) FROM fx;
INSERT INTO lake.award_supplier SELECT ocid, 'a-' || ocid, sup_id(sup), 'PROVEEDOR ' || sup || ' S.A.', year(fecha::DATE) FROM fx;
-- @assert
WITH expected(ocid, indicador) AS (VALUES
    ('f1', 'FRAGMENTACION'),
    ('r1', 'R018_OFERTA_UNICA'),
    ('r1', 'R003_PLAZO_CORTO'),
    ('ENTIDAD:EC-RUC-0960000001001-1:2025', 'CONCENTRACION'),
    ('sn1', 'PROVEEDOR_NUEVO')
), actual AS (SELECT ocid, indicador FROM mart.senal_riesgo)
SELECT 'missing signal ' || indicador || ' on ' || ocid FROM (SELECT * FROM expected EXCEPT SELECT * FROM actual)
UNION ALL
SELECT 'unexpected signal ' || indicador || ' on ' || ocid FROM (SELECT * FROM actual EXCEPT SELECT * FROM expected);

SELECT 'concentration of E in 2025 must be 10000, got ' || hhi
FROM mart.concentracion WHERE entidad_id = 'EC-RUC-0960000001001-1' AND anio = 2025 AND hhi <> 10000;

SELECT 'concentration of E2 in 2025 must be 500, got ' || hhi
FROM mart.concentracion WHERE entidad_id = 'EC-RUC-0960000002001-2' AND anio = 2025 AND hhi <> 500;

SELECT 'fragmentation must cite the USD 10 000 limit' FROM mart.senal_riesgo
WHERE indicador = 'FRAGMENTACION' AND umbral <> 10000;
