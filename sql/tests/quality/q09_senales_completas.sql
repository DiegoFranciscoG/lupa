-- Every signal states its value, threshold, explanation and methodology version.
SELECT 'incomplete signal ' || indicador || ' ' || ocid FROM mart.senal_riesgo
WHERE valor IS NULL OR umbral IS NULL OR explicacion IS NULL OR metodologia_version IS NULL
LIMIT 20;
