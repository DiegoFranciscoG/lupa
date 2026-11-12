-- Primary keys of the marts are unique.
SELECT 'duplicated award ' || ocid || ' ' || award_id FROM mart.hecho_adjudicacion GROUP BY ocid, award_id HAVING count(*) > 1
UNION ALL SELECT 'duplicated entidad ' || entidad_id FROM mart.dim_entidad GROUP BY entidad_id HAVING count(*) > 1
UNION ALL SELECT 'duplicated proveedor ' || proveedor_id FROM mart.dim_proveedor GROUP BY proveedor_id HAVING count(*) > 1
UNION ALL SELECT 'duplicated proceso ' || ocid FROM mart.hecho_proceso GROUP BY ocid HAVING count(*) > 1
UNION ALL SELECT 'duplicated item ' || ocid || ' ' || item_key FROM mart.hecho_item GROUP BY ocid, award_id, item_key HAVING count(*) > 1;
