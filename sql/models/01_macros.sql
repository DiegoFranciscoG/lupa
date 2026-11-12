-- Reusable rules. Each one documented in docs/metodologia.md.
CREATE SCHEMA IF NOT EXISTS ref;
CREATE SCHEMA IF NOT EXISTS stg;
CREATE SCHEMA IF NOT EXISTS int;
CREATE SCHEMA IF NOT EXISTS mart;

-- Text normalization: upper case, no accents, single spaces.
CREATE OR REPLACE MACRO norm_text(s) AS
    nullif(trim(regexp_replace(upper(strip_accents(s)), '\s+', ' ', 'g')), '');

-- Unit names come in free text ("Metro Cúbico", "Metro Cubico"). Missing → 'SIN UNIDAD'.
CREATE OR REPLACE MACRO norm_unit(s) AS
    coalesce(norm_text(replace(s, '*', '')), 'SIN UNIDAD');

-- RUC type by its third digit (SUPUESTO-01). Anything that is not 6 or 9 is treated
-- as a natural person, which is the conservative choice for privacy.
CREATE OR REPLACE MACRO ruc_tipo(ruc) AS
    CASE
        WHEN ruc IS NOT NULL AND substr(ruc, 3, 1) = '6' THEN 'publica'
        WHEN ruc IS NOT NULL AND substr(ruc, 3, 1) = '9' THEN 'juridica'
        ELSE 'natural'
    END;

-- Procedure family from the free-text procurementMethodDetails.
CREATE OR REPLACE MACRO procedimiento_familia(d) AS
    CASE
        WHEN d IS NULL THEN 'Otro'
        WHEN norm_text(d) LIKE '%EMERGENCIA%' THEN 'Emergencia'
        WHEN norm_text(d) LIKE 'CATALOGO%' THEN 'Catálogo electrónico'
        WHEN norm_text(d) LIKE '%SUBASTA%' THEN 'Subasta inversa electrónica'
        WHEN norm_text(d) LIKE '%INFIMA%' THEN 'Ínfima cuantía'
        WHEN norm_text(d) LIKE '%MENOR CUANTIA%' THEN 'Menor cuantía'
        WHEN norm_text(d) LIKE '%COTIZACION%' THEN 'Cotización'
        WHEN norm_text(d) LIKE '%LICITACION%' THEN 'Licitación'
        WHEN norm_text(d) LIKE '%LISTA CORTA%' OR norm_text(d) LIKE '%CONCURSO PUBLICO%' OR norm_text(d) LIKE '%CONSULTORIA%' THEN 'Consultoría'
        WHEN norm_text(d) LIKE '%CONTRATACION DIRECTA%' OR norm_text(d) LIKE 'BIENES Y SERVICIOS UNICOS%' THEN 'Contratación directa'
        WHEN norm_text(d) LIKE '%COMUNICACION SOCIAL%' OR norm_text(d) LIKE '%ASESORIA Y PATROCINIO%'
          OR norm_text(d) LIKE '%OBRA ARTISTICA%' OR norm_text(d) LIKE '%ENTRE ENTIDADES PUBLICAS%'
          OR norm_text(d) LIKE '%SEGUROS%' OR norm_text(d) LIKE '%REPUESTOS%' OR norm_text(d) LIKE '%TRANSPORTE DE CORREO%'
          OR norm_text(d) LIKE '%EMPRESAS PUBLICAS%' OR norm_text(d) LIKE '%REGIMEN ESPECIAL%' THEN 'Régimen especial'
        ELSE 'Otro'
    END;

-- First ten characters of an ISO date as DATE (local date as published by SERCOP).
CREATE OR REPLACE MACRO iso_date(s) AS try_cast(substr(s, 1, 10) AS DATE);
