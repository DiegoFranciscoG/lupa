use std::path::PathBuf;
use std::process::ExitCode;
use std::time::Duration;

use clap::{Parser, Subcommand};
use lupa_ingest::download::RetryPolicy;
use lupa_ingest::pipeline::{Config, Status, flatten_gz, parse_years, run};

const DEFAULT_BASE_URL: &str = "https://data.open-contracting.org/en/publication/110/download";

#[derive(Parser)]
#[command(name = "lupa-ingest", version, about = "SERCOP OCDS bulk files to Parquet")]
struct Cli {
    #[command(subcommand)]
    command: Command,
}

#[derive(Subcommand)]
enum Command {
    /// Download and flatten the given years. Failed years keep their previous data.
    Run {
        /// Years: 2025, 2023,2025 or 2015..2026
        #[arg(long, default_value = "2015..2026")]
        years: String,
        #[arg(long, env = "LUPA_SOURCE_URL", default_value = DEFAULT_BASE_URL)]
        base_url: String,
        #[arg(long, default_value = "data/raw")]
        raw_dir: PathBuf,
        #[arg(long, default_value = "data/parquet")]
        out_dir: PathBuf,
        /// Use files already in raw_dir instead of downloading.
        #[arg(long)]
        offline: bool,
        #[arg(long, default_value_t = 4)]
        attempts: u32,
        #[arg(long, default_value_t = 5)]
        retry_delay_secs: u64,
    },
    /// Flatten one local .jsonl.gz file (no download).
    Flatten {
        input: PathBuf,
        #[arg(long)]
        year: i64,
        #[arg(long, default_value = "data/parquet")]
        out_dir: PathBuf,
    },
}

fn main() -> ExitCode {
    match Cli::parse().command {
        Command::Run {
            years,
            base_url,
            raw_dir,
            out_dir,
            offline,
            attempts,
            retry_delay_secs,
        } => {
            let years = match parse_years(&years) {
                Ok(y) => y,
                Err(e) => {
                    eprintln!("invalid --years: {e}");
                    return ExitCode::from(2);
                }
            };
            let cfg = Config {
                base_url,
                raw_dir,
                out_dir,
                offline,
                retry: RetryPolicy {
                    attempts,
                    base_delay: Duration::from_secs(retry_delay_secs),
                    ..RetryPolicy::default()
                },
            };
            match run(&cfg, &years) {
                Ok(outcomes) => {
                    for o in &outcomes {
                        match (&o.status, &o.report) {
                            (Status::Fresh, Some(r)) => println!(
                                "{}: fresh, {} releases, {} parse errors, {} awards",
                                o.year, r.parsed, r.parse_errors, r.awards
                            ),
                            _ => eprintln!("{}: {:?}: {}", o.year, o.status, o.error.as_deref().unwrap_or("")),
                        }
                    }
                    // The run fails only when a year ends with no data at all.
                    if outcomes.iter().any(|o| o.status == Status::Failed) {
                        ExitCode::FAILURE
                    } else {
                        ExitCode::SUCCESS
                    }
                }
                Err(e) => {
                    eprintln!("ingest failed: {e:#}");
                    ExitCode::FAILURE
                }
            }
        }
        Command::Flatten { input, year, out_dir } => match flatten_gz(&input, &out_dir, year) {
            Ok(r) => {
                println!("{}", serde_json::to_string_pretty(&r).unwrap_or_default());
                ExitCode::SUCCESS
            }
            Err(e) => {
                eprintln!("flatten failed: {e:#}");
                ExitCode::FAILURE
            }
        },
    }
}
