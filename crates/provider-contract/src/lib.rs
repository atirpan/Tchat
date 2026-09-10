//! Auditable protocol-provider boundaries.
//!
//! This crate deliberately contains no cryptography, networking or secret
//! material. It defines the typed negotiation and capability boundary that
//! native clients use before an independently reviewed provider is loaded.
//! A provider must be selected explicitly; this contract never falls back to
//! a weaker suite.

#[derive(Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct AlgorithmId {
    pub family: AlgorithmFamily,
    pub version: u16,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub enum AlgorithmFamily {
    Pairwise,
    Group,
    File,
    ManualLock,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ProviderError {
    NoCommonAlgorithm,
    DowngradeRejected,
    ProviderUnavailable,
    InvalidRequest,
}

/// An opaque, non-serializable provider session owned by the client core.
/// Implementations must keep actual key state private to the provider.
pub trait OpaqueSession: Send {
    fn algorithm(&self) -> AlgorithmId;
}

/// The provider boundary used by native adapters.
///
/// Concrete providers must be independently reviewed and registered by a
/// release policy before a capability can report reviewed E2EE. The interface
/// does not expose keys or plaintext and has no default implementation.
pub trait CryptoProvider: Send + Sync {
    type Session: OpaqueSession;

    fn id(&self) -> &'static str;
    fn supported(&self) -> &'static [AlgorithmId];
    fn open(&self, requested: AlgorithmId) -> Result<Self::Session, ProviderError>;
}

/// Negotiates one exact algorithm from an explicitly allowed policy.
///
/// The highest common version is not automatically acceptable: the caller's
/// policy supplies the exact allowed ID. This prevents silent downgrade and
/// makes the selected wire algorithm auditable.
pub fn negotiate(
    requested: AlgorithmId,
    offered: &[AlgorithmId],
    allowed: &[AlgorithmId],
) -> Result<AlgorithmId, ProviderError> {
    if !allowed.contains(&requested) {
        return Err(ProviderError::DowngradeRejected);
    }
    if !offered.contains(&requested) {
        return Err(ProviderError::NoCommonAlgorithm);
    }
    Ok(requested)
}

#[cfg(test)]
mod tests {
    use super::*;

    const PAIRWISE_V1: AlgorithmId = AlgorithmId {
        family: AlgorithmFamily::Pairwise,
        version: 1,
    };
    const PAIRWISE_V2: AlgorithmId = AlgorithmId {
        family: AlgorithmFamily::Pairwise,
        version: 2,
    };

    #[test]
    fn exact_requested_algorithm_is_selected() {
        assert_eq!(
            negotiate(PAIRWISE_V2, &[PAIRWISE_V1, PAIRWISE_V2], &[PAIRWISE_V2]),
            Ok(PAIRWISE_V2)
        );
    }

    #[test]
    fn lower_offered_version_cannot_silently_replace_requested_version() {
        assert_eq!(
            negotiate(PAIRWISE_V2, &[PAIRWISE_V1], &[PAIRWISE_V2]),
            Err(ProviderError::NoCommonAlgorithm)
        );
    }

    #[test]
    fn policy_rejects_downgrade_even_when_peer_offers_it() {
        assert_eq!(
            negotiate(PAIRWISE_V1, &[PAIRWISE_V1, PAIRWISE_V2], &[PAIRWISE_V2]),
            Err(ProviderError::DowngradeRejected)
        );
    }

    #[test]
    fn family_is_part_of_algorithm_identity() {
        let group = AlgorithmId {
            family: AlgorithmFamily::Group,
            version: 1,
        };
        assert_eq!(
            negotiate(group, &[PAIRWISE_V1], &[group]),
            Err(ProviderError::NoCommonAlgorithm)
        );
    }
}
