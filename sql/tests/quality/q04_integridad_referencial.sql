-- Every fact points to an existing dimension row.
SELECT 'award without entidad dim: ' || ocid FROM mart.hecho_adjudicacion
WHERE entidad_id IS NOT NULL AND entidad_id NOT IN (SELECT entidad_id FROM mart.dim_entidad)
UNION ALL
SELECT 'award without proveedor dim: ' || ocid FROM mart.hecho_adjudicacion
WHERE proveedor_id IS NOT NULL AND proveedor_id NOT IN (SELECT proveedor_id FROM mart.dim_proveedor)
UNION ALL
SELECT 'process without procedimiento dim: ' || ocid FROM mart.hecho_proceso
WHERE procedimiento IS NOT NULL AND procedimiento NOT IN (SELECT procedimiento FROM mart.dim_procedimiento WHERE procedimiento IS NOT NULL)
LIMIT 20;
