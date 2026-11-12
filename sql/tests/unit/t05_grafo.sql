-- T-05: graph on a small synthetic network with known structure.
--   E1 -> S1, E1 -> S2, E2 -> S2   (component A: 4 nodes)
--   E3 -> S3                       (component B: 2 nodes)
--   E3 -> N1 (natural person)      (must not enter the graph)
INSERT INTO lake.process VALUES
    ('g1', 'r', '2025-01-10', 'EC-RUC-0960000001001-1', 'ENTIDAD UNO', NULL, NULL, 'complete', 'open', 'Licitación', 'goods', NULL, NULL, NULL, NULL, NULL, 2025),
    ('g2', 'r', '2025-01-10', 'EC-RUC-0960000001001-1', 'ENTIDAD UNO', NULL, NULL, 'complete', 'open', 'Licitación', 'goods', NULL, NULL, NULL, NULL, NULL, 2025),
    ('g3', 'r', '2025-01-10', 'EC-RUC-0960000002001-2', 'ENTIDAD DOS', NULL, NULL, 'complete', 'open', 'Licitación', 'goods', NULL, NULL, NULL, NULL, NULL, 2025),
    ('g4', 'r', '2025-01-10', 'EC-RUC-0960000003001-3', 'ENTIDAD TRES', NULL, NULL, 'complete', 'open', 'Licitación', 'goods', NULL, NULL, NULL, NULL, NULL, 2025),
    ('g5', 'r', '2025-01-10', 'EC-RUC-0960000003001-3', 'ENTIDAD TRES', NULL, NULL, 'complete', 'open', 'Licitación', 'goods', NULL, NULL, NULL, NULL, NULL, 2025);
INSERT INTO lake.award VALUES
    ('g1', 'a1', '2025-01-11', 'active', 100, 'USD', 2025),
    ('g2', 'a2', '2025-01-11', 'active', 100, 'USD', 2025),
    ('g3', 'a3', '2025-01-11', 'active', 100, 'USD', 2025),
    ('g4', 'a4', '2025-01-11', 'active', 100, 'USD', 2025),
    ('g5', 'a5', '2025-01-11', 'active', 100, 'USD', 2025);
INSERT INTO lake.award_supplier VALUES
    ('g1', 'a1', 'EC-RUC-1790000011001-11', 'PROVEEDOR S1 S.A.', 2025),
    ('g2', 'a2', 'EC-RUC-1790000012001-12', 'PROVEEDOR S2 S.A.', 2025),
    ('g3', 'a3', 'EC-RUC-1790000012001-12', 'PROVEEDOR S2 S.A.', 2025),
    ('g4', 'a4', 'EC-RUC-1790000013001-13', 'PROVEEDOR S3 S.A.', 2025),
    ('g5', 'a5', 'EC-RUC-0100000099001-99', 'PERSONA FICTICIA', 2025);
INSERT INTO lake.tenderer VALUES
    ('g2', 'EC-RUC-1790000012001-12', 'PROVEEDOR S2 S.A.', 2025),
    ('g2', 'EC-RUC-1790000011001-11', 'PROVEEDOR S1 S.A.', 2025),
    ('g2', 'EC-RUC-0100000099001-99', 'PERSONA FICTICIA', 2025);
-- @assert
SELECT 'expected 6 nodes, got ' || count(*) FROM mart.grafo_nodo HAVING count(*) <> 6;

SELECT 'natural person must not be in the graph' FROM mart.grafo_nodo WHERE ref_id LIKE 'NAT-%';

SELECT 'expected 2 components, got ' || count(*) FROM mart.grafo_componente HAVING count(*) <> 2;

SELECT 'expected component sizes [2, 4], got ' || list(nodos ORDER BY nodos)::VARCHAR
FROM mart.grafo_componente HAVING list(nodos ORDER BY nodos) <> [2, 4];

SELECT 'E1, S1, E2 and S2 must share a component'
FROM mart.grafo_metrica
WHERE ref_id IN ('EC-RUC-0960000001001-1', 'EC-RUC-1790000011001-11', 'EC-RUC-0960000002001-2', 'EC-RUC-1790000012001-12')
HAVING count(DISTINCT componente) <> 1;

-- PageRank: S2 (two incoming edges) ranks above S1; S3 (sole edge of E3) ranks above S1
-- (one of two edges of E1); every value is positive.
WITH r AS (SELECT ref_id, pagerank FROM mart.grafo_metrica)
SELECT 'pagerank order is wrong'
FROM (SELECT
        (SELECT pagerank FROM r WHERE ref_id = 'EC-RUC-1790000011001-11') AS s1,
        (SELECT pagerank FROM r WHERE ref_id = 'EC-RUC-1790000012001-12') AS s2,
        (SELECT pagerank FROM r WHERE ref_id = 'EC-RUC-1790000013001-13') AS s3)
WHERE NOT (s2 > s1 AND s3 > s1);

SELECT 'pagerank must be positive' FROM mart.grafo_metrica WHERE pagerank <= 0;

SELECT 'competition edge S1-S2 expected once, natural person excluded'
FROM mart.grafo_compitio HAVING count(*) <> 1 OR sum(procesos) <> 1;
