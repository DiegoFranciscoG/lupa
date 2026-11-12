-- Loads the years that changed into the lake as ONE new DuckLake snapshot.
-- A year is loaded when this run marked it "fresh" or when the lake does not have it yet.
CREATE OR REPLACE TEMP TABLE run_manifest AS
SELECT * FROM read_json('data/parquet/_manifest/run.json', format = 'array');

CREATE OR REPLACE TEMP TABLE years_to_load AS
SELECT DISTINCT source_year AS load_year
FROM read_parquet('data/parquet/process/*/data.parquet', hive_partitioning = false)
WHERE source_year IN (SELECT "year" FROM run_manifest WHERE status = 'fresh')
   OR source_year NOT IN (SELECT DISTINCT source_year FROM lake.process);

BEGIN TRANSACTION;
DELETE FROM lake.process        WHERE source_year IN (SELECT load_year FROM years_to_load);
DELETE FROM lake.award          WHERE source_year IN (SELECT load_year FROM years_to_load);
DELETE FROM lake.award_supplier WHERE source_year IN (SELECT load_year FROM years_to_load);
DELETE FROM lake.award_item     WHERE source_year IN (SELECT load_year FROM years_to_load);
DELETE FROM lake.party          WHERE source_year IN (SELECT load_year FROM years_to_load);
DELETE FROM lake.tenderer       WHERE source_year IN (SELECT load_year FROM years_to_load);

INSERT INTO lake.process BY NAME
SELECT * FROM read_parquet('data/parquet/process/*/data.parquet', hive_partitioning = false) WHERE source_year IN (SELECT load_year FROM years_to_load);
INSERT INTO lake.award BY NAME
SELECT * FROM read_parquet('data/parquet/award/*/data.parquet', hive_partitioning = false) WHERE source_year IN (SELECT load_year FROM years_to_load);
INSERT INTO lake.award_supplier BY NAME
SELECT * FROM read_parquet('data/parquet/award_supplier/*/data.parquet', hive_partitioning = false) WHERE source_year IN (SELECT load_year FROM years_to_load);
INSERT INTO lake.award_item BY NAME
SELECT * FROM read_parquet('data/parquet/award_item/*/data.parquet', hive_partitioning = false) WHERE source_year IN (SELECT load_year FROM years_to_load);
INSERT INTO lake.party BY NAME
SELECT * FROM read_parquet('data/parquet/party/*/data.parquet', hive_partitioning = false) WHERE source_year IN (SELECT load_year FROM years_to_load);
INSERT INTO lake.tenderer BY NAME
SELECT * FROM read_parquet('data/parquet/tenderer/*/data.parquet', hive_partitioning = false) WHERE source_year IN (SELECT load_year FROM years_to_load);

INSERT INTO lake.load_manifest
SELECT "year", status, source_url, sha256, bytes,
       report.lines, report.parsed, report.parse_errors, report.awards, report.awards_amount_usd,
       make_timestamp(finished_at_unix * 1000000)
FROM run_manifest;

SET VARIABLE load_message = 'monthly load: ' || (SELECT coalesce(string_agg(load_year::VARCHAR, ',' ORDER BY load_year), 'no changes') FROM years_to_load);
CALL lake.set_commit_message('lupa', getvariable('load_message'));
COMMIT;
