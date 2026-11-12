-- T-01: processes per year in the lake equal the lines parsed from the source file.
WITH m AS (
    SELECT source_year, parsed FROM lake.load_manifest WHERE status = 'fresh'
    QUALIFY row_number() OVER (PARTITION BY source_year ORDER BY loaded_at DESC) = 1
), l AS (SELECT source_year, count(*) AS n FROM lake.process GROUP BY 1)
SELECT 'T-01 year ' || m.source_year || ': source ' || m.parsed || ' vs lake ' || coalesce(l.n, 0)
FROM m LEFT JOIN l USING (source_year)
WHERE m.parsed IS DISTINCT FROM l.n;
