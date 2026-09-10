//! Client-only secret ownership and access-time expiry.
//! No persistence, serialization, network access or hardware-key claims.
use std::fmt;
use zeroize::{Zeroize, Zeroizing};

const MAX_SECRET_BYTES: usize = 4096;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum SecretError {
    InvalidLength,
    EntropyUnavailable,
    Destroyed,
    InvalidLifetime,
    Expired,
    ClockRollback,
}

/// Intentionally has no Clone, Serialize or Display implementation.
///
/// ```compile_fail
/// use am_secure_memory::SecretBytes;
/// let secret = SecretBytes::random(32).unwrap();
/// let copy = secret.clone();
/// ```
pub struct SecretBytes {
    bytes: Zeroizing<Vec<u8>>,
    destroyed: bool,
}

impl fmt::Debug for SecretBytes {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str("SecretBytes([REDACTED])")
    }
}

impl SecretBytes {
    pub fn random(length: usize) -> Result<Self, SecretError> {
        if length == 0 || length > MAX_SECRET_BYTES {
            return Err(SecretError::InvalidLength);
        }
        let mut bytes = Zeroizing::new(vec![0; length]);
        getrandom::fill(bytes.as_mut_slice()).map_err(|_| SecretError::EntropyUnavailable)?;
        Ok(Self {
            bytes,
            destroyed: false,
        })
    }

    /// Takes ownership; caller must clear any copies it made before transfer.
    pub fn from_owned(bytes: Vec<u8>) -> Result<Self, SecretError> {
        let bytes = Zeroizing::new(bytes);
        if bytes.is_empty() || bytes.len() > MAX_SECRET_BYTES {
            return Err(SecretError::InvalidLength);
        }
        Ok(Self {
            bytes,
            destroyed: false,
        })
    }

    pub fn with_bytes<R>(&self, action: impl FnOnce(&[u8]) -> R) -> Result<R, SecretError> {
        if self.destroyed {
            return Err(SecretError::Destroyed);
        }
        Ok(action(self.bytes.as_slice()))
    }

    pub fn destroy(&mut self) {
        self.bytes.zeroize();
        self.destroyed = true;
    }
}

/// A monotonic clock adapter. The caller owns the clock; no global wall clock.
pub trait Clock {
    fn now_ms(&self) -> u64;
}

pub struct ExpiringSecret {
    secret: SecretBytes,
    expires_at: u64,
    last_observed: u64,
}

impl ExpiringSecret {
    pub fn new(
        secret: SecretBytes,
        lifetime_ms: u64,
        clock: &impl Clock,
    ) -> Result<Self, SecretError> {
        let now = clock.now_ms();
        let expires_at = now
            .checked_add(lifetime_ms)
            .filter(|_| lifetime_ms > 0)
            .ok_or(SecretError::InvalidLifetime)?;
        Ok(Self {
            secret,
            expires_at,
            last_observed: now,
        })
    }

    /// Enforces expiry at access. Platform lifecycle adapters must additionally
    /// destroy on background/lock; this method is not a timer or OS memory lock.
    pub fn with_bytes<R>(
        &mut self,
        clock: &impl Clock,
        action: impl FnOnce(&[u8]) -> R,
    ) -> Result<R, SecretError> {
        let now = clock.now_ms();
        if now < self.last_observed {
            self.secret.destroy();
            return Err(SecretError::ClockRollback);
        }
        self.last_observed = now;
        if now >= self.expires_at {
            self.secret.destroy();
            return Err(SecretError::Expired);
        }
        self.secret.with_bytes(action)
    }

    pub fn destroy(&mut self) {
        self.secret.destroy();
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashSet;

    struct FrozenClock(u64);
    impl Clock for FrozenClock {
        fn now_ms(&self) -> u64 {
            self.0
        }
    }

    #[test]
    fn explicit_destroy_is_idempotent_and_blocks_access() -> Result<(), SecretError> {
        let mut secret = SecretBytes::from_owned(vec![123; 32])?;
        assert_eq!(format!("{secret:?}"), "SecretBytes([REDACTED])");
        secret.destroy();
        secret.destroy();
        assert!(secret.bytes.is_empty());
        assert_eq!(secret.with_bytes(|_| ()), Err(SecretError::Destroyed));
        Ok(())
    }

    #[test]
    fn expires_exactly_at_deadline() -> Result<(), SecretError> {
        let secret = SecretBytes::from_owned(vec![1; 32])?;
        let mut expiring = ExpiringSecret::new(secret, 100, &FrozenClock(1000))?;
        assert_eq!(
            expiring.with_bytes(&FrozenClock(1099), |bytes| bytes.len()),
            Ok(32)
        );
        assert_eq!(
            expiring.with_bytes(&FrozenClock(1100), |_| ()),
            Err(SecretError::Expired)
        );
        assert!(expiring.secret.bytes.is_empty());
        Ok(())
    }

    #[test]
    fn rollback_erases_instead_of_extending_lifetime() -> Result<(), SecretError> {
        let secret = SecretBytes::from_owned(vec![1; 32])?;
        let mut expiring = ExpiringSecret::new(secret, 100, &FrozenClock(1000))?;
        assert_eq!(
            expiring.with_bytes(&FrozenClock(999), |_| ()),
            Err(SecretError::ClockRollback)
        );
        assert_eq!(
            expiring.with_bytes(&FrozenClock(1001), |_| ()),
            Err(SecretError::Destroyed)
        );
        Ok(())
    }

    #[test]
    fn rejects_empty_oversized_and_overflowing_inputs() -> Result<(), SecretError> {
        assert!(matches!(
            SecretBytes::random(0),
            Err(SecretError::InvalidLength)
        ));
        assert!(matches!(
            SecretBytes::random(MAX_SECRET_BYTES + 1),
            Err(SecretError::InvalidLength)
        ));
        assert!(matches!(
            ExpiringSecret::new(SecretBytes::from_owned(vec![1])?, 1, &FrozenClock(u64::MAX)),
            Err(SecretError::InvalidLifetime)
        ));
        Ok(())
    }

    #[test]
    fn system_randomness_has_no_collisions_in_100k_synthetic_nonces() -> Result<(), SecretError> {
        let mut seen = HashSet::new();
        for _ in 0..100_000 {
            let nonce = SecretBytes::random(24)?;
            let value = nonce.with_bytes(|bytes| {
                let mut value = [0_u8; 24];
                value.copy_from_slice(bytes);
                value
            })?;
            assert!(seen.insert(value));
        }
        Ok(())
    }
}
