-- Reproducibility fingerprint (T-09): the same snapshot must always produce the same hash.
SELECT md5(string_agg(x, '|' ORDER BY x)) FROM (
    SELECT 'adj|' || anio || '|' || count(*) || '|' || coalesce(sum(monto), 0) AS x FROM mart.hecho_adjudicacion GROUP BY anio
    UNION ALL SELECT 'item|' || anio || '|' || count(*) || '|' || coalesce(sum(precio_unitario), 0) FROM mart.hecho_item GROUP BY anio
    UNION ALL SELECT 'sig|' || indicador || '|' || count(*) FROM mart.senal_riesgo GROUP BY indicador
    UNION ALL SELECT 'hhi|' || count(*) || '|' || sum(hhi) FROM mart.concentracion
);
