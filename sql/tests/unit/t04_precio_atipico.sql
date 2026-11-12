-- T-04: robust unit-price outlier. Synthetic data with one known outlier.
-- TEST1: 13 purchases around USD 10 plus one at USD 45 (must be the only signal).
-- TEST2: 5 purchases, one at USD 100: fewer than 10 comparables, so nothing is computed.
INSERT INTO lake.process
SELECT 'p' || i, 'r' || i, '2025-03-01T00:00:00-05:00', 'EC-RUC-0960000001001-1', 'HOSPITAL DE PRUEBA NORTE', NULL, NULL,
       'complete', 'open', 'Subasta Inversa Electrónica', 'goods', NULL, NULL, NULL, NULL, NULL, 2025
FROM range(1, 19) t(i);

INSERT INTO lake.award
SELECT 'p' || i, 'a' || i, '2025-03-02T00:00:00-05:00', 'active', 100.0, 'USD', 2025 FROM range(1, 19) t(i);

INSERT INTO lake.award_supplier
SELECT 'p' || i, 'a' || i, 'EC-RUC-1790000001001-9', 'PROVEEDORA DEMO S.A.', 2025 FROM range(1, 19) t(i);

INSERT INTO lake.award_item
SELECT 'p' || i, 'a' || i, '1', 0, CASE WHEN i <= 13 THEN 'TEST1' ELSE 'TEST2' END, 'CPC', 'ITEM DE PRUEBA',
       'ITEM DE PRUEBA', 1, 'Unidad',
       CASE WHEN i <= 12 THEN [10, 10, 10.5, 9.5, 10, 10.2, 9.8, 10, 10.1, 9.9, 10, 10][i]
            WHEN i = 13 THEN 45
            WHEN i = 18 THEN 100
            ELSE 10 END,
       'USD', 2025
FROM range(1, 19) t(i);

INSERT INTO lake.party VALUES
    ('p1', 'EC-RUC-0960000001001-1', '0960000001001', 'HOSPITAL DE PRUEBA NORTE', 'buyer|procuringEntity', 'GUAYAS', 2025),
    ('p1', 'EC-RUC-1790000001001-9', '1790000001001', 'PROVEEDORA DEMO S.A.', 'supplier', 'PICHINCHA', 2025);
-- @assert
SELECT 'expected exactly 1 price outlier, got ' || count(*)
FROM mart.senal_riesgo WHERE indicador = 'PRECIO_ATIPICO' HAVING count(*) <> 1;

SELECT 'the outlier must be p13 at 4.5 times the median, got ' || ocid || ' ' || valor
FROM mart.senal_riesgo WHERE indicador = 'PRECIO_ATIPICO' AND (ocid <> 'p13' OR valor <> 4.5);

SELECT 'TEST2 has fewer than 10 comparables and must not be computed'
FROM mart.precio_comparado WHERE cpc = 'TEST2' AND (razon_mediana IS NOT NULL OR motivo_no_calculado IS NULL);

SELECT 'TEST1 median must be 10, got ' || mediana FROM mart.precio_grupo WHERE cpc = 'TEST1' AND mediana <> 10;

SELECT 'explanation must state the fact: ' || explicacion
FROM mart.senal_riesgo
WHERE indicador = 'PRECIO_ATIPICO' AND explicacion NOT LIKE 'Precio unitario 4,5 veces la mediana de 13 compras comparables%';
