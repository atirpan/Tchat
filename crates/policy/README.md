# Local policy foundation

Implements a preliminary fail-closed capability decision for Master modules 5, 6 and 27. It checks the exact requested mode and transport; it never automatically substitutes Direct, Tor or I2P.

This crate has no dependencies, cryptography, network connections or telemetry. Passing synthetic capability flags is not proof that a real provider is implemented or independently reviewed. Actual platform adapters, signed policy distribution, provider attestation and traffic-correlation evidence are still missing. All modes are unavailable with default capabilities.

Current policy also requires encrypted local storage before authorizing messaging, including Private. This is a conservative preflight for the launch-required storage requirement; the documented offline identity creation flow does not use this function. Policy updates must be versioned and reviewed before client integration.
