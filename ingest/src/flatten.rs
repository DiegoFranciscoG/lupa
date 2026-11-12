//! Streams compiled releases (one JSON per line) and writes normalized Parquet tables.

use std::collections::BTreeMap;
use std::io::BufRead;
use std::path::{Path, PathBuf};

use anyhow::{Context, Result};
use serde::Serialize;

use crate::model::Release;
use crate::ruc::extract_ruc;
use crate::table::{Kind, TableWriter, Val};

/// Maximum number of parse errors kept in the report (all are counted).
const MAX_ERROR_SAMPLES: usize = 50;

#[derive(Debug, Default, Serialize, Clone, PartialEq)]
pub struct FlattenReport {
    pub source_year: i64,
    pub lines: u64,
    pub parsed: u64,
    pub parse_errors: u64,
    pub error_samples: Vec<String>,
    pub awards: u64,
    pub awards_amount_usd: f64,
    pub rows: BTreeMap<String, u64>,
}

pub const TABLES: [&str; 6] = ["process", "award", "award_supplier", "award_item", "party", "tenderer"];

struct Writers {
    process: TableWriter,
    award: TableWriter,
    award_supplier: TableWriter,
    award_item: TableWriter,
    party: TableWriter,
    tenderer: TableWriter,
}

fn table_path(out: &Path, table: &str, year: i64) -> PathBuf {
    out.join(table).join(format!("year={year}")).join("data.parquet")
}

impl Writers {
    fn create(out: &Path, year: i64) -> Result<Self> {
        use Kind::*;
        Ok(Self {
            process: TableWriter::create(
                "process",
                &table_path(out, "process", year),
                &[
                    ("ocid", Str),
                    ("release_id", Str),
                    ("release_date", Str),
                    ("buyer_id", Str),
                    ("buyer_name", Str),
                    ("tender_id", Str),
                    ("title", Str),
                    ("tender_status", Str),
                    ("procurement_method", Str),
                    ("procurement_method_details", Str),
                    ("main_category", Str),
                    ("tender_amount", F64),
                    ("tender_currency", Str),
                    ("tender_start", Str),
                    ("tender_end", Str),
                    ("number_of_tenderers", I64),
                    ("source_year", I64),
                ],
            )?,
            award: TableWriter::create(
                "award",
                &table_path(out, "award", year),
                &[
                    ("ocid", Str),
                    ("award_id", Str),
                    ("award_date", Str),
                    ("status", Str),
                    ("amount", F64),
                    ("currency", Str),
                    ("source_year", I64),
                ],
            )?,
            award_supplier: TableWriter::create(
                "award_supplier",
                &table_path(out, "award_supplier", year),
                &[
                    ("ocid", Str),
                    ("award_id", Str),
                    ("supplier_id", Str),
                    ("supplier_name", Str),
                    ("source_year", I64),
                ],
            )?,
            award_item: TableWriter::create(
                "award_item",
                &table_path(out, "award_item", year),
                &[
                    ("ocid", Str),
                    ("award_id", Str),
                    ("item_id", Str),
                    ("item_index", I64),
                    ("cpc_code", Str),
                    ("cpc_scheme", Str),
                    ("cpc_description", Str),
                    ("description", Str),
                    ("quantity", F64),
                    ("unit_name", Str),
                    ("unit_price", F64),
                    ("currency", Str),
                    ("source_year", I64),
                ],
            )?,
            party: TableWriter::create(
                "party",
                &table_path(out, "party", year),
                &[
                    ("ocid", Str),
                    ("party_id", Str),
                    ("ruc", Str),
                    ("name", Str),
                    ("roles", Str),
                    ("region", Str),
                    ("source_year", I64),
                ],
            )?,
            tenderer: TableWriter::create(
                "tenderer",
                &table_path(out, "tenderer", year),
                &[
                    ("ocid", Str),
                    ("tenderer_id", Str),
                    ("tenderer_name", Str),
                    ("source_year", I64),
                ],
            )?,
        })
    }

    fn finish(self, report: &mut FlattenReport) -> Result<()> {
        for (name, w) in [
            ("process", self.process),
            ("award", self.award),
            ("award_supplier", self.award_supplier),
            ("award_item", self.award_item),
            ("party", self.party),
            ("tenderer", self.tenderer),
        ] {
            let (_, rows) = w.finish()?;
            report.rows.insert(name.to_string(), rows);
        }
        Ok(())
    }
}

fn write_release(w: &mut Writers, r: &Release, year: i64, report: &mut FlattenReport) -> Result<()> {
    let ocid = r.ocid.as_deref();
    let y = Val::I(Some(year));
    let t = r.tender.as_ref();
    let buyer = r.buyer.as_ref();
    w.process.push(&[
        Val::S(ocid),
        Val::S(r.id.as_deref()),
        Val::S(r.date.as_deref()),
        Val::S(buyer.and_then(|b| b.id.as_deref())),
        Val::S(buyer.and_then(|b| b.name.as_deref())),
        Val::S(t.and_then(|t| t.id.as_deref())),
        Val::S(t.and_then(|t| t.title.as_deref())),
        Val::S(t.and_then(|t| t.status.as_deref())),
        Val::S(t.and_then(|t| t.procurement_method.as_deref())),
        Val::S(t.and_then(|t| t.procurement_method_details.as_deref())),
        Val::S(t.and_then(|t| t.main_procurement_category.as_deref())),
        Val::F(t.and_then(|t| t.value.as_ref()).and_then(|v| v.amount)),
        Val::S(t.and_then(|t| t.value.as_ref()).and_then(|v| v.currency.as_deref())),
        Val::S(
            t.and_then(|t| t.tender_period.as_ref())
                .and_then(|p| p.start_date.as_deref()),
        ),
        Val::S(
            t.and_then(|t| t.tender_period.as_ref())
                .and_then(|p| p.end_date.as_deref()),
        ),
        Val::I(t.and_then(|t| t.number_of_tenderers).map(|n| n as i64)),
        y.clone(),
    ])?;

    if let Some(t) = t {
        for tt in &t.tenderers {
            w.tenderer.push(&[
                Val::S(ocid),
                Val::S(tt.id.as_deref()),
                Val::S(tt.name.as_deref()),
                y.clone(),
            ])?;
        }
    }

    for a in &r.awards {
        let amount = a.value.as_ref().and_then(|v| v.amount);
        let currency = a.value.as_ref().and_then(|v| v.currency.as_deref());
        report.awards += 1;
        if currency == Some("USD") {
            report.awards_amount_usd += amount.unwrap_or(0.0);
        }
        w.award.push(&[
            Val::S(ocid),
            Val::S(a.id.as_deref()),
            Val::S(a.date.as_deref()),
            Val::S(a.status.as_deref()),
            Val::F(amount),
            Val::S(currency),
            y.clone(),
        ])?;
        for s in &a.suppliers {
            w.award_supplier.push(&[
                Val::S(ocid),
                Val::S(a.id.as_deref()),
                Val::S(s.id.as_deref()),
                Val::S(s.name.as_deref()),
                y.clone(),
            ])?;
        }
        for (idx, it) in a.items.iter().enumerate() {
            let cls = it.classification.as_ref();
            let unit = it.unit.as_ref();
            let price = unit.and_then(|u| u.value.as_ref());
            w.award_item.push(&[
                Val::S(ocid),
                Val::S(a.id.as_deref()),
                Val::S(it.id.as_deref()),
                Val::I(Some(idx as i64)),
                Val::S(cls.and_then(|c| c.id.as_deref())),
                Val::S(cls.and_then(|c| c.scheme.as_deref())),
                Val::S(cls.and_then(|c| c.description.as_deref())),
                Val::S(it.description.as_deref()),
                Val::F(it.quantity),
                Val::S(unit.and_then(|u| u.name.as_deref())),
                Val::F(price.and_then(|p| p.amount)),
                Val::S(price.and_then(|p| p.currency.as_deref())),
                y.clone(),
            ])?;
        }
    }

    for p in &r.parties {
        let ident = p.identifier.as_ref().and_then(|i| i.id.as_deref());
        let ruc = ident.or(p.id.as_deref()).and_then(extract_ruc);
        let roles = p.roles.join("|");
        w.party.push(&[
            Val::S(ocid),
            Val::S(p.id.as_deref()),
            Val::S(ruc.as_deref()),
            Val::S(p.name.as_deref()),
            Val::S(Some(roles.as_str())),
            Val::S(p.address.as_ref().and_then(|a| a.region.as_deref())),
            y.clone(),
        ])?;
    }
    Ok(())
}

/// Reads JSON lines from `input` and writes one Parquet file per table under `out`.
/// Malformed lines are counted and sampled, never silently dropped.
pub fn flatten<R: BufRead>(input: R, out: &Path, year: i64) -> Result<FlattenReport> {
    let mut writers = Writers::create(out, year)?;
    let mut report = FlattenReport {
        source_year: year,
        ..Default::default()
    };
    for (i, line) in input.lines().enumerate() {
        let line = line.with_context(|| format!("read error at line {}", i + 1))?;
        if line.trim().is_empty() {
            continue;
        }
        report.lines += 1;
        match serde_json::from_str::<Release>(&line) {
            Ok(r) => {
                report.parsed += 1;
                write_release(&mut writers, &r, year, &mut report)?;
            }
            Err(e) => {
                report.parse_errors += 1;
                if report.error_samples.len() < MAX_ERROR_SAMPLES {
                    report.error_samples.push(format!("line {}: {e}", i + 1));
                }
            }
        }
    }
    writers.finish(&mut report)?;
    Ok(report)
}
