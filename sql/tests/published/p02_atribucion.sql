-- T-08 (data side): the metadata that every page and download shows carries the license.
SELECT 'missing attribution in meta.json'
FROM read_json('web/public/data/meta.json')
WHERE atribucion NOT LIKE '%SERCOP%' OR atribucion NOT LIKE '%CC BY 3.0 Ecuador%'
   OR atribucion NOT LIKE '%transformados%' OR licencia_url <> 'https://creativecommons.org/licenses/by/3.0/ec/';
