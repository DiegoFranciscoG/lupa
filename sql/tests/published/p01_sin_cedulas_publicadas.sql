-- T-07 (published files): no natural person's RUC or ID number (first 10 digits) appears
-- anywhere in the exported Parquet or JSON files.
CREATE OR REPLACE TEMP TABLE cedula AS
SELECT DISTINCT substr(r, 1, 10) AS c FROM (SELECT unnest([ruc, ruc_en_id]) AS r FROM int.organizacion) WHERE r IS NOT NULL AND ruc_tipo(r) = 'natural';

CREATE OR REPLACE TEMP TABLE texto_publicado AS
SELECT concat_ws('|', *COLUMNS(*)) AS t FROM read_parquet('web/public/data/**/*.parquet', union_by_name = true)
UNION ALL SELECT content FROM read_text('web/public/data/*.json')
UNION ALL SELECT content FROM read_text('data/export/feeds.json');

SELECT 'natural person ID found in published data: ' || left(n, 3) || '…'
FROM (SELECT unnest(regexp_extract_all(t, '(?:^|[^0-9.])([0-9]{10,14})', 1)) AS n FROM texto_publicado)
WHERE substr(n, 1, 10) IN (SELECT c FROM cedula)
LIMIT 5;
