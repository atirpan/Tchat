# ANONYM MESSENGER MASTER SYSTEM

Version: v1.0
Status: ACTIVE
Priority: HIGHEST AUTHORITY

> This is a copy of the governance contract that must be kept in sync with the
> canonical file supplied by the project owner. Any change here requires owner
> approval. All other docs in this folder derive from this one.

---

## 1. PROJECT VISION

Anonymous Messenger is a privacy-first, anonymity-focused communication system.

The system MUST:

- NOT require personal identity
- NOT track users
- NOT store unnecessary data
- NOT expose communication relationships
- PRIORITIZE security over convenience

Core Philosophy:
**Security > Anonymity > Architecture > Sustainability > Performance > UX**

---

## 2. NON-NEGOTIABLE RULES

### 2.1 Identity Rules

- No phone number
- No email
- No name
- No device ID
- No global fixed identity

Identity MUST be:

- system-generated
- minimal
- unlinkable across contexts

### 2.2 Data Rules

- Store minimum data only
- No unnecessary persistence
- Messages MUST be ephemeral by default
- If data is not required -> DO NOT STORE

### 2.3 Logging & Tracking Rules

- No message logging
- No behavior tracking
- No analytics SDK
- No tracking scripts
- No telemetry

### 2.4 Network Rules

- No IP storage
- No connection history logs
- No identifiable network metadata retention

### 2.5 Security Rules

- No insecure shortcuts
- No temporary insecure solutions
- No weakening encryption for performance

### 2.6 Monetization Rules

- Payment MUST NOT link to user identity
- Premium MUST be token-based (not account-based)
- Users MUST NOT be marked as "paid users"

### 2.7 External Dependency Rules

- No third-party tracking tools
- No analytics platforms
- No crash reporters sending user data
- No external services without security validation

### 2.8 Decision Boundaries

The system MUST STOP if a task attempts to:

- Change identity model
- Change encryption model
- Change data retention logic
- Introduce new external services
- Modify monetization logic

---

## 3. ARCHITECTURE CONTRACT

### Core Modules

1. Identity
2. Messaging
3. Network
4. Security
5. Anonymity
6. Monetization
7. Community
8. UI

### Module Isolation Rules

- Identity MUST NOT leak into Messaging
- Messaging MUST NOT control Network
- Monetization MUST NOT access Identity
- UI MUST NOT expose sensitive data
- Security MUST act as a global layer

### Architecture Constraints

- Start as modular monolith
- Avoid premature microservices
- Each module must be isolated
- No cross-module logic leakage

---

## 4. MODULE DEFINITIONS

### Identity Module

Purpose: anonymous account creation, key generation, identity derivation.
Forbidden: personal data collection, global identity exposure.

### Messaging Module

Purpose: secure communication, message lifecycle.
Forbidden: plaintext storage, permanent history.

### Network Module

Purpose: anonymized data transfer, traffic obfuscation.
Forbidden: IP tracking, direct traceable routing.

### Security Module

Purpose: protect device-level exposure, prevent leaks.
Includes: screenshot blocking, memory clearing, fake UI mode.

### Anonymity Module

Purpose: prevent behavioral tracking.
Includes: writing style masking, identity rotation.

### Monetization Module

Purpose: anonymous revenue.
Includes: token-based access, optional contributions.
Forbidden: account-linked payments.

### Community Module

Purpose: spam control, abuse resistance.
Forbidden: persistent reputation tracking.

### UI Module

Purpose: safe user interaction.
Forbidden: revealing hidden data, exposing relationships.

---

## 5. SECURITY PRINCIPLES

- All sensitive data must be short-lived
- RAM must be cleared after use
- No background exposure
- No system-level leakage
- File metadata must be removed before sending

---

## 6. ANONYMITY PRINCIPLES

- Every connection should be unlinkable
- No consistent identifiers across sessions
- Behavior must not be predictable
- Communication patterns must be obscured

---

## 7. MONETIZATION MODEL

### Allowed

- Anonymous donations
- Token-based premium
- Proof-of-work alternative

### Forbidden

- Subscriptions linked to identity
- Payment tracking
- User-payment correlation

---

## 8. AGENT OPERATING MODEL

- Builder Agent (GPT-5.4): system development
- Audit Agent (Claude Opus / Sonnet): rule validation, security audit, architecture compliance
- Quality Agent: testing, validation, failure analysis
- UX Agent: safe interface design

Deployment rule: no deployment without audit approval and rule compliance confirmation.

---

## 9. DEVELOPMENT PHASES

- Phase 0: Foundation
- Phase 1: Identity
- Phase 2: Messaging
- Phase 3: Security
- Phase 4: Network
- Phase 5: Monetization
- Phase 6: Community
- Phase 7: Advanced Anonymity

---

## 10. TASK EXECUTION PROTOCOL

For EVERY task:

1. Explain what will be done
2. Check rule conflicts
3. Identify affected modules
4. List files
5. Produce code
6. Explain security impact
7. Explain anonymity impact
8. Confirm rule compliance

---

## 11. CODE QUALITY STANDARDS

- Modular structure required
- No large monolithic files
- Single responsibility functions
- No plaintext sensitive data
- Tests are mandatory

---

## 12. FORBIDDEN PATTERNS

- Email login
- Phone login
- Global user search
- Contact discovery
- Online status
- Last seen
- Read receipts
- Typing indicators
- Persistent chat history
- Centralized identity mapping

---

## 13. REVIEW & APPROVAL FLOW

1. Builder produces code
2. Audit reviews
3. Issues fixed
4. Quality validation
5. Approval or rejection

---

## FINAL RULE

IF ANY FEATURE:

- increases traceability
- increases stored data
- reduces anonymity

THEN: **DO NOT IMPLEMENT**
