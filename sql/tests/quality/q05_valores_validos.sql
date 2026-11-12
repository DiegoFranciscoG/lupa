-- No negative amounts, no zero or negative unit prices, years inside the published range.
SELECT 'negative amount ' || ocid FROM mart.hecho_adjudicacion WHERE monto < 0
UNION ALL SELECT 'non-positive unit price ' || ocid FROM mart.hecho_item WHERE precio_unitario <= 0
UNION ALL SELECT 'year out of range ' || ocid FROM mart.hecho_adjudicacion WHERE anio NOT BETWEEN 2015 AND 2026
UNION ALL SELECT 'ratio computed below minimum comparables ' || ocid FROM mart.precio_comparado
          WHERE razon_mediana IS NOT NULL AND compras < umbral('PRECIO_MIN_COMPARABLES')
UNION ALL SELECT 'ratio missing without reason ' || ocid FROM mart.precio_comparado
          WHERE razon_mediana IS NULL AND motivo_no_calculado IS NULL
LIMIT 20;
