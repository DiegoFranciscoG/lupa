-- Staging: typing and cleaning, straight from the lake. No business rules here.
CREATE OR REPLACE TABLE ref.parametro_normativo AS
SELECT codigo, descripcion, aplica_a, vigente_desde::DATE AS vigente_desde,
       try_cast(vigente_hasta AS DATE) AS vigente_hasta, valor::DECIMAL(18, 2) AS valor,
       base_calculo, fuente_url
FROM read_csv('sql/seeds/parametro_normativo.csv', header = true, all_varchar = true);

CREATE OR REPLACE TABLE ref.umbral AS
SELECT codigo, descripcion, valor::DOUBLE AS valor, fuente
FROM read_csv('sql/seeds/umbral_metodologia.csv', header = true, all_varchar = true);

CREATE OR REPLACE TABLE ref.procedimiento_familia AS
SELECT familia, orden::INTEGER AS orden, descripcion_clara
FROM read_csv('sql/seeds/procedimiento_familia.csv', header = true, all_varchar = true);

CREATE OR REPLACE TABLE ref.provincia AS
SELECT provincia, region_natural FROM read_csv('sql/seeds/provincia.csv', header = true, all_varchar = true);

CREATE OR REPLACE MACRO umbral(c) AS (SELECT valor FROM ref.umbral WHERE codigo = c);

CREATE OR REPLACE TABLE stg.process AS
SELECT ocid,
       iso_date(release_date) AS fecha_publicacion,
       buyer_id,
       norm_text(buyer_name) AS buyer_name,
       title,
       tender_status,
       procurement_method,
       procurement_method_details,
       procedimiento_familia(procurement_method_details) AS familia,
       main_category,
       CASE WHEN tender_currency = 'USD' THEN tender_amount END AS monto_referencial,
       iso_date(tender_start) AS fecha_inicio_ofertas,
       iso_date(tender_end) AS fecha_fin_ofertas,
       number_of_tenderers,
       source_year::INTEGER AS anio
FROM lake.process
WHERE ocid IS NOT NULL
QUALIFY row_number() OVER (PARTITION BY ocid ORDER BY release_date DESC NULLS LAST) = 1;

CREATE OR REPLACE TABLE stg.award AS
SELECT ocid, award_id,
       iso_date(award_date) AS fecha_adjudicacion,
       status,
       amount,
       currency,
       source_year::INTEGER AS anio
FROM lake.award
WHERE ocid IS NOT NULL AND award_id IS NOT NULL
QUALIFY row_number() OVER (PARTITION BY ocid, award_id ORDER BY amount DESC NULLS LAST) = 1;

CREATE OR REPLACE TABLE stg.award_supplier AS
SELECT DISTINCT ocid, award_id, supplier_id, norm_text(supplier_name) AS supplier_name
FROM lake.award_supplier
WHERE supplier_id IS NOT NULL;

CREATE OR REPLACE TABLE stg.award_item AS
SELECT ocid, award_id,
       coalesce(item_id, item_index::VARCHAR) || '#' || item_index::VARCHAR AS item_key,
       item_id,
       nullif(trim(cpc_code), '') AS cpc,
       norm_text(cpc_description) AS cpc_descripcion,
       norm_text(description) AS descripcion,
       CASE WHEN quantity > 0 THEN quantity END AS cantidad,
       norm_unit(unit_name) AS unidad,
       CASE WHEN unit_price > 0 AND coalesce(currency, 'USD') = 'USD' THEN unit_price END AS precio_unitario,
       source_year::INTEGER AS anio
FROM lake.award_item
WHERE ocid IS NOT NULL;

CREATE OR REPLACE TABLE stg.party AS
SELECT ocid, party_id, ruc, norm_text(name) AS nombre, string_split(roles, '|') AS roles,
       norm_text(region) AS provincia
FROM lake.party
WHERE party_id IS NOT NULL;

CREATE OR REPLACE TABLE stg.tenderer AS
SELECT DISTINCT ocid, tenderer_id, norm_text(tenderer_name) AS tenderer_name
FROM lake.tenderer
WHERE tenderer_id IS NOT NULL;
