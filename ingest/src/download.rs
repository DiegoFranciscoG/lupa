//! HTTP download with retries, exponential backoff and integrity data.

use std::fs::File;
use std::io::{BufWriter, Read, Write};
use std::path::Path;
use std::time::Duration;

use anyhow::{Context, Result, bail};
use sha2::{Digest, Sha256};

#[derive(Debug, Clone)]
pub struct RetryPolicy {
    pub attempts: u32,
    pub base_delay: Duration,
    pub timeout: Duration,
}

impl Default for RetryPolicy {
    fn default() -> Self {
        Self {
            attempts: 4,
            base_delay: Duration::from_secs(5),
            timeout: Duration::from_secs(1800),
        }
    }
}

#[derive(Debug, Clone, PartialEq)]
pub struct Downloaded {
    pub bytes: u64,
    pub sha256: String,
}

/// Delay before attempt `n` (0-based): base, 2×base, 4×base… capped at 5 minutes.
pub fn backoff(policy: &RetryPolicy, attempt: u32) -> Duration {
    let factor = 2u32.saturating_pow(attempt);
    policy.base_delay.saturating_mul(factor).min(Duration::from_secs(300))
}

fn try_once(agent: &ureq::Agent, url: &str, dest: &Path) -> Result<Downloaded> {
    let response = agent.get(url).header("User-Agent", "lupa-ingest/0.1").call()?;
    let expected: Option<u64> = response
        .headers()
        .get("content-length")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.parse().ok());
    let mut reader = response.into_body().into_reader();
    let mut out = BufWriter::new(File::create(dest).with_context(|| format!("cannot create {}", dest.display()))?);
    let mut hasher = Sha256::new();
    let mut buf = vec![0u8; 1 << 20];
    let mut total = 0u64;
    loop {
        let n = reader.read(&mut buf)?;
        if n == 0 {
            break;
        }
        hasher.update(&buf[..n]);
        out.write_all(&buf[..n])?;
        total += n as u64;
    }
    out.flush()?;
    if let Some(len) = expected {
        if len != total {
            bail!("incomplete download: expected {len} bytes, got {total}");
        }
    }
    if total == 0 {
        bail!("empty response body");
    }
    Ok(Downloaded {
        bytes: total,
        sha256: hex::encode(hasher.finalize()),
    })
}

/// Downloads `url` into `dest`, retrying with exponential backoff.
pub fn download(url: &str, dest: &Path, policy: &RetryPolicy) -> Result<Downloaded> {
    if let Some(parent) = dest.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let config = ureq::Agent::config_builder()
        .timeout_global(Some(policy.timeout))
        .build();
    let agent: ureq::Agent = config.into();
    let mut last_error = None;
    for attempt in 0..policy.attempts.max(1) {
        if attempt > 0 {
            std::thread::sleep(backoff(policy, attempt - 1));
        }
        match try_once(&agent, url, dest) {
            Ok(d) => return Ok(d),
            Err(e) => {
                eprintln!("download attempt {} failed for {url}: {e:#}", attempt + 1);
                let _ = std::fs::remove_file(dest);
                last_error = Some(e);
            }
        }
    }
    Err(last_error.unwrap_or_else(|| anyhow::anyhow!("no attempts made")))
}

/// SHA-256 of a local file, used when the file was not downloaded in this run.
pub fn sha256_file(path: &Path) -> Result<String> {
    let mut f = File::open(path)?;
    let mut hasher = Sha256::new();
    let mut buf = vec![0u8; 1 << 20];
    loop {
        let n = f.read(&mut buf)?;
        if n == 0 {
            break;
        }
        hasher.update(&buf[..n]);
    }
    Ok(hex::encode(hasher.finalize()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn backoff_doubles_and_is_capped() {
        let p = RetryPolicy {
            attempts: 3,
            base_delay: Duration::from_secs(5),
            timeout: Duration::from_secs(1),
        };
        assert_eq!(backoff(&p, 0), Duration::from_secs(5));
        assert_eq!(backoff(&p, 1), Duration::from_secs(10));
        assert_eq!(backoff(&p, 2), Duration::from_secs(20));
        assert_eq!(backoff(&p, 20), Duration::from_secs(300));
    }

    #[test]
    fn unreachable_host_fails_after_retries() {
        let dir = tempfile::tempdir().unwrap();
        let p = RetryPolicy {
            attempts: 2,
            base_delay: Duration::from_millis(1),
            timeout: Duration::from_secs(2),
        };
        let dest = dir.path().join("x.gz");
        assert!(download("http://127.0.0.1:9/nothing", &dest, &p).is_err());
        assert!(!dest.exists());
    }

    #[test]
    fn hashes_local_file() {
        let dir = tempfile::tempdir().unwrap();
        let f = dir.path().join("a.txt");
        std::fs::write(&f, b"abc").unwrap();
        assert_eq!(
            sha256_file(&f).unwrap(),
            "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
        );
    }
}
