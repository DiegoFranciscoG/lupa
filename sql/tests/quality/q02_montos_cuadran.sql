-- T-02: sum of USD awards per year in the lake equals the sum read from the source.
-- Declared tolerance: USD 1 per year (floating point accumulation).
WITH m AS (
    SELECT source_year, awards_amount_usd FROM lake.load_manifest WHERE status = 'fresh'
    QUALIFY row_number() OVER (PARTITION BY source_year ORDER BY loaded_at DESC) = 1
), l AS (SELECT source_year, sum(amount) FILTER (WHERE currency = 'USD') AS s FROM lake.award GROUP BY 1)
SELECT 'T-02 year ' || m.source_year || ': source ' || m.awards_amount_usd || ' vs lake ' || coalesce(l.s, 0)
FROM m LEFT JOIN l USING (source_year)
WHERE abs(coalesce(m.awards_amount_usd, 0) - coalesce(l.s, 0)) > 1;
