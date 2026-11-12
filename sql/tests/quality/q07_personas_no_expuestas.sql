-- T-07 (mart side): no natural person keeps a RUC or a name in the public dimensions.
SELECT 'natural person exposed: ' || proveedor_id FROM mart.dim_proveedor
WHERE tipo = 'natural' AND (ruc IS NOT NULL OR nombre <> 'Persona natural' OR proveedor_id NOT LIKE 'NAT-%')
UNION ALL
SELECT 'natural entity exposed: ' || entidad_id FROM mart.dim_entidad
WHERE tipo = 'natural' AND (ruc IS NOT NULL OR entidad_id NOT LIKE 'NAT-%')
UNION ALL
SELECT 'natural person in graph: ' || ref_id FROM mart.grafo_nodo WHERE ref_id LIKE 'NAT-%'
LIMIT 20;
