-- Raw tables in the DuckLake catalog (attached as "lake"). Types mirror the Parquet
-- written by lupa-ingest; dates stay as text and are typed in staging.
CREATE TABLE IF NOT EXISTS lake.process (
    ocid VARCHAR, release_id VARCHAR, release_date VARCHAR, buyer_id VARCHAR, buyer_name VARCHAR,
    tender_id VARCHAR, title VARCHAR, tender_status VARCHAR, procurement_method VARCHAR,
    procurement_method_details VARCHAR, main_category VARCHAR, tender_amount DOUBLE,
    tender_currency VARCHAR, tender_start VARCHAR, tender_end VARCHAR, number_of_tenderers BIGINT,
    source_year BIGINT
);
CREATE TABLE IF NOT EXISTS lake.award (
    ocid VARCHAR, award_id VARCHAR, award_date VARCHAR, status VARCHAR, amount DOUBLE,
    currency VARCHAR, source_year BIGINT
);
CREATE TABLE IF NOT EXISTS lake.award_supplier (
    ocid VARCHAR, award_id VARCHAR, supplier_id VARCHAR, supplier_name VARCHAR, source_year BIGINT
);
CREATE TABLE IF NOT EXISTS lake.award_item (
    ocid VARCHAR, award_id VARCHAR, item_id VARCHAR, item_index BIGINT, cpc_code VARCHAR,
    cpc_scheme VARCHAR, cpc_description VARCHAR, description VARCHAR, quantity DOUBLE,
    unit_name VARCHAR, unit_price DOUBLE, currency VARCHAR, source_year BIGINT
);
CREATE TABLE IF NOT EXISTS lake.party (
    ocid VARCHAR, party_id VARCHAR, ruc VARCHAR, name VARCHAR, roles VARCHAR, region VARCHAR,
    source_year BIGINT
);
CREATE TABLE IF NOT EXISTS lake.tenderer (
    ocid VARCHAR, tenderer_id VARCHAR, tenderer_name VARCHAR, source_year BIGINT
);
CREATE TABLE IF NOT EXISTS lake.load_manifest (
    source_year BIGINT, status VARCHAR, source_url VARCHAR, sha256 VARCHAR, bytes BIGINT,
    lines BIGINT, parsed BIGINT, parse_errors BIGINT, awards BIGINT, awards_amount_usd DOUBLE,
    loaded_at TIMESTAMP
);
