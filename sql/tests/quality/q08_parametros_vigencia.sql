-- Normative parameters: every row has a source and validity periods of a code never overlap.
SELECT 'parameter without source: ' || codigo FROM ref.parametro_normativo WHERE fuente_url IS NULL OR fuente_url = ''
UNION ALL
SELECT 'overlapping validity for ' || a.codigo
FROM ref.parametro_normativo a JOIN ref.parametro_normativo b
  ON a.codigo = b.codigo AND a.vigente_desde < b.vigente_desde
 AND (a.vigente_hasta IS NULL OR a.vigente_hasta >= b.vigente_desde);
