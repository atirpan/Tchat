//! Local capability gating; this crate neither encrypts nor transports messages.
//! Capability values must come from trusted local adapters, never remote claims.

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Mode {
    Private,
    Anonymous,
    Ghost,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Transport {
    Direct,
    Tor,
    I2p,
}

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub struct Capabilities {
    pub reviewed_e2ee: bool,
    pub encrypted_local_storage: bool,
    pub direct: bool,
    pub tor: bool,
    pub i2p: bool,
    pub circuit_isolation: bool,
    pub dns_leak_protection: bool,
    pub mix: bool,
    pub cover_traffic: bool,
    pub padding: bool,
    pub route_rotation: bool,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum BlockReason {
    MissingReviewedEncryption,
    MissingEncryptedStorage,
    TransportUnavailable,
    DirectForbidden,
    MissingNetworkIsolation,
    MissingGhostProtection,
}

/// Check exactly the requested mode and transport. Never chooses a fallback.
pub fn authorize(mode: Mode, transport: Transport, caps: &Capabilities) -> Result<(), BlockReason> {
    if !caps.reviewed_e2ee {
        return Err(BlockReason::MissingReviewedEncryption);
    }
    if !caps.encrypted_local_storage {
        return Err(BlockReason::MissingEncryptedStorage);
    }
    let available = match transport {
        Transport::Direct => caps.direct,
        Transport::Tor => caps.tor,
        Transport::I2p => caps.i2p,
    };
    if !available {
        return Err(BlockReason::TransportUnavailable);
    }
    if mode != Mode::Private {
        if transport == Transport::Direct {
            return Err(BlockReason::DirectForbidden);
        }
        if !caps.circuit_isolation || !caps.dns_leak_protection {
            return Err(BlockReason::MissingNetworkIsolation);
        }
    }
    if mode == Mode::Ghost
        && !(caps.mix && caps.cover_traffic && caps.padding && caps.route_rotation)
    {
        return Err(BlockReason::MissingGhostProtection);
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn synthetic_all() -> Capabilities {
        Capabilities {
            reviewed_e2ee: true,
            encrypted_local_storage: true,
            direct: true,
            tor: true,
            i2p: true,
            circuit_isolation: true,
            dns_leak_protection: true,
            mix: true,
            cover_traffic: true,
            padding: true,
            route_rotation: true,
        }
    }

    #[test]
    fn no_provider_means_no_messaging() {
        for mode in [Mode::Private, Mode::Anonymous, Mode::Ghost] {
            assert_eq!(
                authorize(mode, Transport::Tor, &Capabilities::default()),
                Err(BlockReason::MissingReviewedEncryption)
            );
        }
    }

    #[test]
    fn anonymous_modes_never_authorize_direct_transport() {
        for mode in [Mode::Anonymous, Mode::Ghost] {
            assert_eq!(
                authorize(mode, Transport::Direct, &synthetic_all()),
                Err(BlockReason::DirectForbidden)
            );
        }
    }

    #[test]
    fn tor_outage_does_not_select_direct_or_i2p() {
        let mut caps = synthetic_all();
        caps.tor = false;
        assert_eq!(
            authorize(Mode::Ghost, Transport::Tor, &caps),
            Err(BlockReason::TransportUnavailable)
        );
        assert_eq!(authorize(Mode::Ghost, Transport::I2p, &caps), Ok(()));
    }

    #[test]
    fn missing_each_ghost_capability_blocks_ghost() {
        for missing in 0..4 {
            let mut caps = synthetic_all();
            match missing {
                0 => caps.mix = false,
                1 => caps.cover_traffic = false,
                2 => caps.padding = false,
                _ => caps.route_rotation = false,
            }
            assert_eq!(
                authorize(Mode::Ghost, Transport::Tor, &caps),
                Err(BlockReason::MissingGhostProtection)
            );
        }
    }

    #[test]
    fn every_capability_combination_respects_anonymous_invariants() {
        for bits in 0_u16..2048 {
            let caps = Capabilities {
                reviewed_e2ee: bits & 1 != 0,
                encrypted_local_storage: bits & 2 != 0,
                direct: bits & 4 != 0,
                tor: bits & 8 != 0,
                i2p: bits & 16 != 0,
                circuit_isolation: bits & 32 != 0,
                dns_leak_protection: bits & 64 != 0,
                mix: bits & 128 != 0,
                cover_traffic: bits & 256 != 0,
                padding: bits & 512 != 0,
                route_rotation: bits & 1024 != 0,
            };
            for mode in [Mode::Anonymous, Mode::Ghost] {
                for transport in [Transport::Direct, Transport::Tor, Transport::I2p] {
                    if authorize(mode, transport, &caps).is_ok() {
                        assert!(caps.reviewed_e2ee && caps.encrypted_local_storage);
                        assert_ne!(transport, Transport::Direct);
                        assert!(caps.circuit_isolation && caps.dns_leak_protection);
                        if mode == Mode::Ghost {
                            assert!(
                                caps.mix
                                    && caps.cover_traffic
                                    && caps.padding
                                    && caps.route_rotation
                            );
                        }
                    }
                }
            }
        }
    }
}
