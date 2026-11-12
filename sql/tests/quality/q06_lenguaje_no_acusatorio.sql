-- T-06 (data side): signal explanations never use accusatory words.
SELECT 'forbidden word "' || w.palabra || '" in ' || s.indicador || ' ' || s.ocid
FROM mart.senal_riesgo s
JOIN read_csv('sql/seeds/palabras_prohibidas.csv', header = true) w
  ON lower(strip_accents(s.explicacion)) LIKE '%' || lower(strip_accents(w.palabra)) || '%'
LIMIT 20;
