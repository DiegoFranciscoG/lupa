//! Subset of an OCDS 1.1 compiled release used by LUPA.
//!
//! Every field is optional: the source has gaps and the ingest must never
//! invent a value. Identifiers are accepted as JSON strings or numbers.

use serde::{Deserialize, Deserializer};

fn opt_string<'de, D>(deserializer: D) -> Result<Option<String>, D::Error>
where
    D: Deserializer<'de>,
{
    let value = Option::<serde_json::Value>::deserialize(deserializer)?;
    Ok(match value {
        Some(serde_json::Value::String(s)) => Some(s),
        Some(serde_json::Value::Number(n)) => Some(n.to_string()),
        _ => None,
    })
}

fn opt_number<'de, D>(deserializer: D) -> Result<Option<f64>, D::Error>
where
    D: Deserializer<'de>,
{
    let value = Option::<serde_json::Value>::deserialize(deserializer)?;
    Ok(match value {
        Some(serde_json::Value::Number(n)) => n.as_f64(),
        Some(serde_json::Value::String(s)) => s.trim().parse::<f64>().ok(),
        _ => None,
    })
}

fn null_as_empty<'de, D, T>(deserializer: D) -> Result<Vec<T>, D::Error>
where
    D: Deserializer<'de>,
    T: Deserialize<'de>,
{
    Ok(Option::<Vec<T>>::deserialize(deserializer)?.unwrap_or_default())
}

#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Release {
    #[serde(default, deserialize_with = "opt_string")]
    pub ocid: Option<String>,
    #[serde(default, deserialize_with = "opt_string")]
    pub id: Option<String>,
    #[serde(default, deserialize_with = "opt_string")]
    pub date: Option<String>,
    #[serde(default)]
    pub buyer: Option<OrganizationRef>,
    #[serde(default)]
    pub tender: Option<Tender>,
    #[serde(default, deserialize_with = "null_as_empty")]
    pub awards: Vec<Award>,
    #[serde(default, deserialize_with = "null_as_empty")]
    pub parties: Vec<Party>,
}

#[derive(Debug, Default, Deserialize)]
pub struct OrganizationRef {
    #[serde(default, deserialize_with = "opt_string")]
    pub id: Option<String>,
    #[serde(default, deserialize_with = "opt_string")]
    pub name: Option<String>,
}

#[derive(Debug, Default, Deserialize)]
pub struct Value {
    #[serde(default, deserialize_with = "opt_number")]
    pub amount: Option<f64>,
    #[serde(default, deserialize_with = "opt_string")]
    pub currency: Option<String>,
}

#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Period {
    #[serde(default, deserialize_with = "opt_string")]
    pub start_date: Option<String>,
    #[serde(default, deserialize_with = "opt_string")]
    pub end_date: Option<String>,
}

#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Tender {
    #[serde(default, deserialize_with = "opt_string")]
    pub id: Option<String>,
    #[serde(default, deserialize_with = "opt_string")]
    pub title: Option<String>,
    #[serde(default, deserialize_with = "opt_string")]
    pub status: Option<String>,
    #[serde(default, deserialize_with = "opt_string")]
    pub procurement_method: Option<String>,
    #[serde(default, deserialize_with = "opt_string")]
    pub procurement_method_details: Option<String>,
    #[serde(default, deserialize_with = "opt_string")]
    pub main_procurement_category: Option<String>,
    #[serde(default)]
    pub value: Option<Value>,
    #[serde(default)]
    pub tender_period: Option<Period>,
    #[serde(default, deserialize_with = "opt_number")]
    pub number_of_tenderers: Option<f64>,
    #[serde(default, deserialize_with = "null_as_empty")]
    pub tenderers: Vec<OrganizationRef>,
}

#[derive(Debug, Default, Deserialize)]
pub struct Award {
    #[serde(default, deserialize_with = "opt_string")]
    pub id: Option<String>,
    #[serde(default, deserialize_with = "opt_string")]
    pub date: Option<String>,
    #[serde(default, deserialize_with = "opt_string")]
    pub status: Option<String>,
    #[serde(default)]
    pub value: Option<Value>,
    #[serde(default, deserialize_with = "null_as_empty")]
    pub suppliers: Vec<OrganizationRef>,
    #[serde(default, deserialize_with = "null_as_empty")]
    pub items: Vec<Item>,
}

#[derive(Debug, Default, Deserialize)]
pub struct Classification {
    #[serde(default, deserialize_with = "opt_string")]
    pub id: Option<String>,
    #[serde(default, deserialize_with = "opt_string")]
    pub scheme: Option<String>,
    #[serde(default, deserialize_with = "opt_string")]
    pub description: Option<String>,
}

#[derive(Debug, Default, Deserialize)]
pub struct Unit {
    #[serde(default, deserialize_with = "opt_string")]
    pub name: Option<String>,
    #[serde(default)]
    pub value: Option<Value>,
}

#[derive(Debug, Default, Deserialize)]
pub struct Item {
    #[serde(default, deserialize_with = "opt_string")]
    pub id: Option<String>,
    #[serde(default, deserialize_with = "opt_string")]
    pub description: Option<String>,
    #[serde(default, deserialize_with = "opt_number")]
    pub quantity: Option<f64>,
    #[serde(default)]
    pub classification: Option<Classification>,
    #[serde(default)]
    pub unit: Option<Unit>,
}

#[derive(Debug, Default, Deserialize)]
pub struct Address {
    #[serde(default, deserialize_with = "opt_string")]
    pub region: Option<String>,
}

#[derive(Debug, Default, Deserialize)]
pub struct Identifier {
    #[serde(default, deserialize_with = "opt_string")]
    pub id: Option<String>,
    #[serde(default, deserialize_with = "opt_string")]
    pub scheme: Option<String>,
}

#[derive(Debug, Default, Deserialize)]
pub struct Party {
    #[serde(default, deserialize_with = "opt_string")]
    pub id: Option<String>,
    #[serde(default, deserialize_with = "opt_string")]
    pub name: Option<String>,
    #[serde(default, deserialize_with = "null_as_empty")]
    pub roles: Vec<String>,
    #[serde(default)]
    pub address: Option<Address>,
    #[serde(default)]
    pub identifier: Option<Identifier>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_numeric_ids_and_string_amounts() {
        let r: Release = serde_json::from_str(
            r#"{"ocid":"ocds-x-1","awards":[{"id":7,"value":{"amount":"12.5","currency":"USD"}}]}"#,
        )
        .unwrap();
        assert_eq!(r.awards[0].id.as_deref(), Some("7"));
        assert_eq!(r.awards[0].value.as_ref().unwrap().amount, Some(12.5));
    }

    #[test]
    fn null_arrays_become_empty() {
        let r: Release = serde_json::from_str(r#"{"ocid":"a","awards":null,"parties":null}"#).unwrap();
        assert!(r.awards.is_empty());
        assert!(r.parties.is_empty());
    }

    #[test]
    fn non_numeric_amount_is_none_not_zero() {
        let v: Value = serde_json::from_str(r#"{"amount":"n/a"}"#).unwrap();
        assert_eq!(v.amount, None);
    }
}
