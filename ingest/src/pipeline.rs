//! One ingest run: download each year, flatten it and swap the result in atomically.
//! If a year fails, the previous Parquet files stay in place (test T-10).

use std::fs::File;
use std::io::BufReader;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

use anyhow::{Context, Result};
use flate2::read::MultiGzDecoder;
use serde::Serialize;

use crate::download::{RetryPolicy, download, sha256_file};
use crate::flatten::{FlattenReport, TABLES, flatten};

#[derive(Debug, Clone)]
pub struct Config {
    pub base_url: String,
    pub raw_dir: PathBuf,
    pub out_dir: PathBuf,
    pub offline: bool,
    pub retry: RetryPolicy,
}

#[derive(Debug, Serialize, Clone, Copy, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Status {
    /// New data loaded in this run.
    Fresh,
    /// The source file is byte-identical to the last load (same SHA-256): nothing to reload.
    Unchanged,
    /// The source failed; the previous data for this year is kept.
    Stale,
    /// The source failed and there was no previous data.
    Failed,
}

#[derive(Debug, Serialize, Clone)]
pub struct YearOutcome {
    pub year: i64,
    pub status: Status,
    pub source_url: String,
    pub sha256: Option<String>,
    pub bytes: Option<u64>,
    pub finished_at_unix: u64,
    pub error: Option<String>,
    pub report: Option<FlattenReport>,
}

pub fn source_url(base_url: &str, year: i64) -> String {
    format!("{}?name={year}.jsonl.gz", base_url.trim_end_matches('/'))
}

fn now_unix() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0)
}

fn has_previous(out: &Path, year: i64) -> bool {
    out.join("process")
        .join(format!("year={year}"))
        .join("data.parquet")
        .exists()
}

/// Flattens a gzip JSON-lines file into Parquet tables under `out`.
pub fn flatten_gz(path: &Path, out: &Path, year: i64) -> Result<FlattenReport> {
    let file = File::open(path).with_context(|| format!("cannot open {}", path.display()))?;
    let reader = BufReader::with_capacity(1 << 20, MultiGzDecoder::new(BufReader::new(file)));
    flatten(reader, out, year)
}

/// Moves the freshly written tables of `year` from `staging` into `out`, replacing old ones.
fn promote(staging: &Path, out: &Path, year: i64) -> Result<()> {
    for table in TABLES {
        let part = format!("year={year}");
        let from = staging.join(table).join(&part);
        let to = out.join(table).join(&part);
        if to.exists() {
            std::fs::remove_dir_all(&to)?;
        }
        std::fs::create_dir_all(to.parent().unwrap_or(out))?;
        std::fs::rename(&from, &to).with_context(|| format!("cannot move {} to {}", from.display(), to.display()))?;
    }
    Ok(())
}

enum Ingested {
    Fresh(FlattenReport, String, u64),
    Unchanged(String, u64),
}

/// SHA-256 of the file behind the last fresh load of `year`, if any.
fn previous_sha(out: &Path, year: i64) -> Option<String> {
    let text = std::fs::read_to_string(out.join("_manifest").join(format!("year={year}.json"))).ok()?;
    let value: serde_json::Value = serde_json::from_str(&text).ok()?;
    value.get("sha256")?.as_str().map(str::to_string)
}

fn ingest_year(cfg: &Config, year: i64, url: &str) -> Result<Ingested> {
    let raw = cfg.raw_dir.join(format!("{year}.jsonl.gz"));
    let (input, sha, bytes) = if cfg.offline {
        let bytes = std::fs::metadata(&raw)
            .with_context(|| format!("offline mode: missing {}", raw.display()))?
            .len();
        (raw.clone(), sha256_file(&raw)?, bytes)
    } else {
        let part = cfg.raw_dir.join(format!("{year}.jsonl.gz.part"));
        let d = download(url, &part, &cfg.retry)?;
        (part, d.sha256, d.bytes)
    };
    if has_previous(&cfg.out_dir, year) && previous_sha(&cfg.out_dir, year).as_deref() == Some(sha.as_str()) {
        if input != raw {
            std::fs::rename(&input, &raw)?;
        }
        return Ok(Ingested::Unchanged(sha, bytes));
    }
    let staging = cfg.out_dir.join(".staging").join(year.to_string());
    if staging.exists() {
        std::fs::remove_dir_all(&staging)?;
    }
    let report = match flatten_gz(&input, &staging, year) {
        Ok(r) => r,
        Err(e) => {
            let _ = std::fs::remove_dir_all(&staging);
            return Err(e.context("the file could not be decompressed or read completely"));
        }
    };
    anyhow::ensure!(report.parsed > 0, "the file has no valid releases");
    promote(&staging, &cfg.out_dir, year)?;
    let _ = std::fs::remove_dir_all(&staging);
    if input != raw {
        std::fs::rename(&input, &raw)?;
    }
    Ok(Ingested::Fresh(report, sha, bytes))
}

/// Ingests one year and never leaves the output without data it already had.
pub fn run_year(cfg: &Config, year: i64) -> YearOutcome {
    let url = source_url(&cfg.base_url, year);
    match ingest_year(cfg, year, &url) {
        Ok(Ingested::Fresh(report, sha, bytes)) => YearOutcome {
            year,
            status: Status::Fresh,
            source_url: url,
            sha256: Some(sha),
            bytes: Some(bytes),
            finished_at_unix: now_unix(),
            error: None,
            report: Some(report),
        },
        Ok(Ingested::Unchanged(sha, bytes)) => YearOutcome {
            year,
            status: Status::Unchanged,
            source_url: url,
            sha256: Some(sha),
            bytes: Some(bytes),
            finished_at_unix: now_unix(),
            error: None,
            report: None,
        },
        Err(e) => YearOutcome {
            year,
            status: if has_previous(&cfg.out_dir, year) {
                Status::Stale
            } else {
                Status::Failed
            },
            source_url: url,
            sha256: None,
            bytes: None,
            finished_at_unix: now_unix(),
            error: Some(format!("{e:#}")),
            report: None,
        },
    }
}

/// Runs every year and writes `_manifest/run.json`. Returns the outcomes.
pub fn run(cfg: &Config, years: &[i64]) -> Result<Vec<YearOutcome>> {
    std::fs::create_dir_all(&cfg.out_dir)?;
    std::fs::create_dir_all(&cfg.raw_dir)?;
    let outcomes: Vec<YearOutcome> = years.iter().map(|y| run_year(cfg, *y)).collect();
    let manifest_dir = cfg.out_dir.join("_manifest");
    std::fs::create_dir_all(&manifest_dir)?;
    for o in &outcomes {
        if o.status == Status::Fresh {
            std::fs::write(
                manifest_dir.join(format!("year={}.json", o.year)),
                serde_json::to_vec_pretty(o)?,
            )?;
        }
    }
    std::fs::write(manifest_dir.join("run.json"), serde_json::to_vec_pretty(&outcomes)?)?;
    Ok(outcomes)
}

/// Parses `2015..2026`, `2015..=2026`, `2025` or `2023,2025`.
pub fn parse_years(spec: &str) -> Result<Vec<i64>> {
    let spec = spec.trim();
    if let Some((a, b)) = spec.split_once("..") {
        let b = b.trim_start_matches('=');
        let (a, b): (i64, i64) = (a.trim().parse()?, b.trim().parse()?);
        anyhow::ensure!(a <= b, "invalid range {spec}");
        return Ok((a..=b).collect());
    }
    spec.split(',')
        .map(|s| s.trim().parse::<i64>().map_err(Into::into))
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_year_specs() {
        assert_eq!(parse_years("2024..2026").unwrap(), vec![2024, 2025, 2026]);
        assert_eq!(parse_years("2024..=2025").unwrap(), vec![2024, 2025]);
        assert_eq!(parse_years("2023, 2025").unwrap(), vec![2023, 2025]);
        assert!(parse_years("2026..2024").is_err());
        assert!(parse_years("abc").is_err());
    }

    #[test]
    fn builds_source_url() {
        assert_eq!(
            source_url("https://data.open-contracting.org/en/publication/110/download/", 2025),
            "https://data.open-contracting.org/en/publication/110/download?name=2025.jsonl.gz"
        );
    }
}
