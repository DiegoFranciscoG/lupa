//! Integration tests T-01 (counts), T-02 (amounts) and T-10 (source down).

use std::fs::File;
use std::io::Write;
use std::path::Path;
use std::time::Duration;

use arrow_array::{Array, Float64Array};
use flate2::Compression;
use flate2::write::GzEncoder;
use lupa_ingest::download::RetryPolicy;
use lupa_ingest::pipeline::{Config, Status, run};
use parquet::arrow::arrow_reader::ParquetRecordBatchReaderBuilder;

const FIXTURE: &str = include_str!("fixtures/sample.jsonl");

fn gzip_fixture(dir: &Path, year: i64) {
    std::fs::create_dir_all(dir).unwrap();
    let f = File::create(dir.join(format!("{year}.jsonl.gz"))).unwrap();
    let mut gz = GzEncoder::new(f, Compression::default());
    gz.write_all(FIXTURE.as_bytes()).unwrap();
    gz.finish().unwrap();
}

fn rows(path: &Path) -> usize {
    let reader = ParquetRecordBatchReaderBuilder::try_new(File::open(path).unwrap())
        .unwrap()
        .build()
        .unwrap();
    reader.map(|b| b.unwrap().num_rows()).sum()
}

fn sum_usd_awards(path: &Path) -> f64 {
    let reader = ParquetRecordBatchReaderBuilder::try_new(File::open(path).unwrap())
        .unwrap()
        .build()
        .unwrap();
    let mut total = 0.0;
    for batch in reader {
        let b = batch.unwrap();
        let amount = b
            .column_by_name("amount")
            .unwrap()
            .as_any()
            .downcast_ref::<Float64Array>()
            .unwrap();
        let currency = b
            .column_by_name("currency")
            .unwrap()
            .as_any()
            .downcast_ref::<arrow_array::StringArray>()
            .unwrap();
        for i in 0..b.num_rows() {
            if !currency.is_null(i) && currency.value(i) == "USD" && !amount.is_null(i) {
                total += amount.value(i);
            }
        }
    }
    total
}

fn config(root: &Path, offline: bool, base_url: &str) -> Config {
    Config {
        base_url: base_url.to_string(),
        raw_dir: root.join("raw"),
        out_dir: root.join("parquet"),
        offline,
        retry: RetryPolicy {
            attempts: 1,
            base_delay: Duration::from_millis(1),
            timeout: Duration::from_secs(2),
        },
    }
}

fn table(root: &Path, name: &str, year: i64) -> std::path::PathBuf {
    root.join("parquet")
        .join(name)
        .join(format!("year={year}"))
        .join("data.parquet")
}

#[test]
fn t01_counts_match_source_lines() {
    let dir = tempfile::tempdir().unwrap();
    gzip_fixture(&dir.path().join("raw"), 2025);
    let outcomes = run(&config(dir.path(), true, "http://unused"), &[2025]).unwrap();
    let report = outcomes[0].report.as_ref().unwrap();

    let source_lines = FIXTURE.lines().filter(|l| !l.trim().is_empty()).count() as u64;
    assert_eq!(report.lines, source_lines);
    assert_eq!(report.parsed + report.parse_errors, source_lines);
    assert_eq!(
        report.parse_errors, 1,
        "the broken line is counted, not dropped silently"
    );
    assert_eq!(rows(&table(dir.path(), "process", 2025)) as u64, report.parsed);
    assert_eq!(rows(&table(dir.path(), "award", 2025)), 5);
    assert_eq!(rows(&table(dir.path(), "award_item", 2025)), 2);
    assert_eq!(rows(&table(dir.path(), "party", 2025)), 4);
    assert_eq!(rows(&table(dir.path(), "tenderer", 2025)), 1);
    assert!(dir.path().join("parquet/_manifest/run.json").exists());
    assert!(dir.path().join("parquet/_manifest/year=2025.json").exists());
}

#[test]
fn t02_award_amounts_match_source() {
    let dir = tempfile::tempdir().unwrap();
    gzip_fixture(&dir.path().join("raw"), 2025);
    let outcomes = run(&config(dir.path(), true, "http://unused"), &[2025]).unwrap();
    let report = outcomes[0].report.as_ref().unwrap();
    // 11 500.50 + 2 500 (string amount) + 1 000 + 999.50; the EUR award is excluded.
    let expected = 16_000.0;
    assert!((report.awards_amount_usd - expected).abs() < 0.005);
    assert!((sum_usd_awards(&table(dir.path(), "award", 2025)) - expected).abs() < 0.005);
}

#[test]
fn t10_source_down_keeps_previous_snapshot() {
    let dir = tempfile::tempdir().unwrap();
    gzip_fixture(&dir.path().join("raw"), 2025);
    run(&config(dir.path(), true, "http://unused"), &[2025]).unwrap();
    let before = rows(&table(dir.path(), "process", 2025));

    // Second run: the source is unreachable.
    let outcomes = run(&config(dir.path(), false, "http://127.0.0.1:9/download"), &[2025]).unwrap();
    assert_eq!(outcomes[0].status, Status::Stale);
    assert!(outcomes[0].error.is_some());
    assert_eq!(
        rows(&table(dir.path(), "process", 2025)),
        before,
        "previous data must remain"
    );
    assert!(dir.path().join("raw/2025.jsonl.gz").exists());
}

#[test]
fn t10_source_down_without_previous_data_is_failed() {
    let dir = tempfile::tempdir().unwrap();
    let outcomes = run(&config(dir.path(), false, "http://127.0.0.1:9/download"), &[2024]).unwrap();
    assert_eq!(outcomes[0].status, Status::Failed);
    assert!(!table(dir.path(), "process", 2024).exists());
}

#[test]
fn corrupt_gzip_keeps_previous_data() {
    let dir = tempfile::tempdir().unwrap();
    gzip_fixture(&dir.path().join("raw"), 2025);
    run(&config(dir.path(), true, "http://unused"), &[2025]).unwrap();
    // Replace the raw file with garbage and re-run offline.
    std::fs::write(dir.path().join("raw/2025.jsonl.gz"), b"not a gzip file").unwrap();
    let outcomes = run(&config(dir.path(), true, "http://unused"), &[2025]).unwrap();
    assert_eq!(outcomes[0].status, Status::Stale);
    assert_eq!(rows(&table(dir.path(), "process", 2025)), 5);
    assert!(!dir.path().join("parquet/.staging/2025").exists());
}

#[test]
fn identical_source_is_unchanged_and_not_reloaded() {
    let dir = tempfile::tempdir().unwrap();
    gzip_fixture(&dir.path().join("raw"), 2025);
    let first = run(&config(dir.path(), true, "http://unused"), &[2025]).unwrap();
    assert_eq!(first[0].status, Status::Fresh);
    let second = run(&config(dir.path(), true, "http://unused"), &[2025]).unwrap();
    assert_eq!(second[0].status, Status::Unchanged);
    assert_eq!(second[0].sha256, first[0].sha256);
    assert!(second[0].report.is_none());
    assert_eq!(rows(&table(dir.path(), "process", 2025)), 5);
}
