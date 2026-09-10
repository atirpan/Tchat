//! Exact-match alias validation for a privacy-preserving resolver.
//!
//! This crate does not store aliases, enumerate users or resolve a root
//! identity. It only validates a local candidate and performs exact matching
//! against an explicitly supplied opaque resolver result.

const MAX_ALIAS_BYTES: usize = 64;
const MIN_ALIAS_BYTES: usize = 3;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum AliasError {
    Empty,
    TooLong,
    UnsupportedCharacter,
    Reserved,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ExactMatch<'a> {
    Match(&'a str),
    NoMatch,
}

const RESERVED: &[&str] = &[
    "admin",
    "administrator",
    "anonim",
    "anonymous",
    "support",
    "system",
];

/// Normalizes only the safe ASCII alias grammar. Unicode is rejected until a
/// reviewed confusable policy is selected; silently folding it would create
/// visually identical aliases with different security meanings.
pub fn normalize(input: &str) -> Result<String, AliasError> {
    let bytes = input.as_bytes();
    if bytes.is_empty() {
        return Err(AliasError::Empty);
    }
    if bytes.len() < MIN_ALIAS_BYTES || bytes.len() > MAX_ALIAS_BYTES {
        return Err(AliasError::TooLong);
    }
    let mut output = String::with_capacity(bytes.len());
    for byte in bytes {
        match *byte {
            b'A'..=b'Z' => output.push((*byte + (b'a' - b'A')) as char),
            b'a'..=b'z' | b'0'..=b'9' | b'_' | b'-' | b'.' => output.push(*byte as char),
            _ => return Err(AliasError::UnsupportedCharacter),
        }
    }
    if RESERVED.contains(&output.as_str()) {
        return Err(AliasError::Reserved);
    }
    Ok(output)
}

/// Compares only the complete normalized alias. No prefix or directory query
/// exists in this API by design.
pub fn exact_match<'a>(candidate: &str, resolved: &'a str) -> Result<ExactMatch<'a>, AliasError> {
    let candidate = normalize(candidate)?;
    if candidate == resolved {
        Ok(ExactMatch::Match(resolved))
    } else {
        Ok(ExactMatch::NoMatch)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalizes_ascii_case_without_unicode_folding() {
        assert_eq!(normalize("Alice_42"), Ok("alice_42".to_owned()));
        assert_eq!(normalize("аlice"), Err(AliasError::UnsupportedCharacter));
    }

    #[test]
    fn exact_match_does_not_accept_prefixes_or_suffixes() {
        assert_eq!(exact_match("alice", "alice.more"), Ok(ExactMatch::NoMatch));
        assert_eq!(
            exact_match("alice", "alice"),
            Ok(ExactMatch::Match("alice"))
        );
    }

    #[test]
    fn reserved_and_invalid_aliases_fail_closed() {
        assert_eq!(normalize("admin"), Err(AliasError::Reserved));
        assert_eq!(normalize("ab"), Err(AliasError::TooLong));
        assert_eq!(normalize("a/b"), Err(AliasError::UnsupportedCharacter));
        assert_eq!(normalize(""), Err(AliasError::Empty));
    }

    #[test]
    fn boundary_length_is_explicit() {
        assert!(normalize(&"a".repeat(MIN_ALIAS_BYTES)).is_ok());
        assert_eq!(
            normalize(&"a".repeat(MAX_ALIAS_BYTES + 1)),
            Err(AliasError::TooLong)
        );
    }
}
