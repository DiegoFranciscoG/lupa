//! Extraction of the Ecuadorian RUC from OCDS organization identifiers.
//!
//! SERCOP identifiers look like `EC-RUC-<13 digits>-<internal id>`. Only the
//! digits are kept; classification (natural person, public entity, company)
//! happens in SQL so the rule lives next to the data it protects.

/// Returns the RUC digits when the identifier follows the `EC-RUC-<digits>` pattern.
pub fn extract_ruc(identifier: &str) -> Option<String> {
    let rest = identifier.strip_prefix("EC-RUC-").unwrap_or(identifier);
    let digits: String = rest.chars().take_while(char::is_ascii_digit).collect();
    if (10..=14).contains(&digits.len()) {
        Some(digits)
    } else {
        None
    }
}

#[cfg(test)]
mod tests {
    use super::extract_ruc;

    #[test]
    fn extracts_digits_from_sercop_identifier() {
        assert_eq!(
            extract_ruc("EC-RUC-0960000000001-57617").as_deref(),
            Some("0960000000001")
        );
    }

    #[test]
    fn accepts_plain_ruc() {
        assert_eq!(extract_ruc("1790000000001").as_deref(), Some("1790000000001"));
    }

    #[test]
    fn rejects_identifiers_without_ruc() {
        assert_eq!(extract_ruc("EC-RUC--123"), None);
        assert_eq!(extract_ruc("abc"), None);
        assert_eq!(extract_ruc("EC-RUC-12345-1"), None);
    }
}
