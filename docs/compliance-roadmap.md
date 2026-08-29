# OSIRIS Compliance Roadmap

**Version:** 1.0  
**Last Updated:** 2026-08-26  
**Owner:** OSIRIS Development / Compliance Team  
**Status:** Active  

---

## 1. PURPOSE

This document maps OSIRIS to applicable regulatory regimes, deadlines, and action items. It is the single source of truth for compliance work.

**Scope:** Security hardening, legal/compliance, observability, infrastructure — no new user-facing features, current pricing preserved, referrals deferred.

---

## 2. REGULATORY LANDSCAPE OVERVIEW

| Regime | Jurisdiction | Applicability to OSIRIS | Deadline | Status |
|--------|-------------|------------------------|----------|--------|
| **MiCA** | EU | Likely if EU users; copy-trading + subscription may trigger CASP | July 1, 2026 (grace period end) | Assessment pending |
| **GDPR** | EU/UK | Applies if serving EU/UK users regardless of entity location | Ongoing | Review pending |
| **DORA** | EU | Applies if MiCA-authorized CASP; ICT risk management | Ongoing | Documentation pending |
| **CARF** | OECD | First reports due 2027; "control or sufficient influence" test | Reporting 2027 | Assessment pending |
| **SEC No-Action** | US | Non-custodial crypto interface conditions (April 2026 staff statement) | Ongoing | Checklist pending |
| **UK FCA** | UK | Authorization gateway Sep 30, 2026; full regime Oct 25, 2027 | Gateway: Sep 30, 2026 | Assessment pending |
| **UAE VARA** | UAE | VASP licensing in Dubai; non-custodial may fall outside scope | Ongoing | Assessment pending |
| **AML/BSA** | US/Global | 5-year retention minimum for transaction records | Ongoing | Matrix pending |

---

## 3. MiCA (EU MARKETS IN CRYPTO-ASSETS REGULATION)

### 3.1 Overview
MiCA establishes a comprehensive framework for crypto-asset service providers (CASPs). The transitional period ends July 1, 2026. Non-compliance requires cessation of EU operations. Penalties: up to 5% annual worldwide turnover.

### 3.2 Applicability Assessment
**Question:** Does OSIRIS fall under MiCA CASP definition?

**Factors:**
- OSIRIS is non-custodial: users retain control of private keys
- OSIRIS proposes transactions; users sign locally
- OSIRIS does not hold user funds
- OSIRIS charges subscription fees (Monthly/Lifetime)

**Preliminary Assessment:** Non-custodial software-only providers may fall outside CASP scope, BUT:
- Copy-trading service layer could be interpreted as "execution of orders"
- Automated trading on behalf of users may trigger CASP classification
- Professional judgment required

### 3.3 Action Items
| ID | Item | Severity | Deadline | Owner |
|----|------|----------|----------|-------|
| M1 | Legal opinion on MiCA CASP applicability | Must | Aug 31, 2026 | Legal/Compliance |
| M2 | If applicable: MiCA authorization roadmap | Must | Sep 15, 2026 | Compliance |
| M3 | If not applicable: Document non-applicability rationale | Must | Aug 31, 2026 | Legal/Compliance |
| M4 | AML/KYC policy documentation (required for partnerships/licensing) | Should | Sep 30, 2026 | Compliance |
| M5 | Market communication review (financial promotions) | Must | Jun 10, 2026 | Marketing/Compliance |

### 3.4 Capital Requirements (if CASP)
- Initial capital: €50,000 for operational risk
- Additional capital based on activity volume
- Alternative: Professional indemnity insurance (E&O) may satisfy

### 3.5 Governance Requirements (if CASP)
- Fit and proper management
- Segregation of duties
- Risk management framework
- Internal audit function
- Compliance officer appointment

---

## 4. GDPR (GENERAL DATA PROTECTION REGULATION)

### 4.1 Overview
GDPR applies to any entity processing personal data of EU residents, regardless of where the entity is established.

### 4.2 Applicability to OSIRIS
OSIRIS processes:
- Telegram user IDs, names, usernames
- Session tokens
- IP addresses (via request logs)
- Trading preferences/configurations

**Assessment:** OSIRIS likely processes personal data of EU residents via Telegram Mini App and dashboard. GDPR applies.

### 4.3 Action Items
| ID | Item | Severity | Deadline | Owner |
|----|------|----------|----------|-------|
| G1 | Data mapping: inventory all personal data processed | Must | Aug 31, 2026 | Dev/Compliance |
| G2 | Lawful basis analysis for each data category | Must | Aug 31, 2026 | Legal/Compliance |
| G3 | Privacy Policy published with GDPR-compliant disclosures | Must | Sep 15, 2026 | Legal/Dev |
| G4 | Data minimization review | Must | Sep 15, 2026 | Dev |
| G5 | User rights implementation: access, rectification, erasure, portability | Must | Sep 30, 2026 | Dev |
| G6 | Data breach notification procedure (72h) | Must | Sep 15, 2026 | Dev/Ops |
| G7 | DPO contact designation (if required) | Should | Sep 30, 2026 | Compliance |
| G8 | GDPR reconciliation with AML retention obligations | Must | Sep 30, 2026 | Legal/Compliance |
| G9 | Third-party processor agreements (Helius, Telegram, RPC providers) | Must | Sep 15, 2026 | Legal |
| G10 | Cookie consent mechanism (if applicable) | Should | Sep 30, 2026 | Dev |

### 4.4 Key Tension: GDPR Erasure vs AML Retention
GDPR grants right to erasure; AML laws require 5-year retention of transaction records.

**Resolution:** Segregate personal data from transaction records. Delete personal data upon request; retain anonymized transaction records for AML compliance.

---

## 5. DORA (DIGITAL OPERATIONAL RESILIENCE ACT)

### 5.1 Overview
DORA applies to EU financial entities and their ICT third-party providers. If OSIRIS is not a MiCA-authorized CASP, DORA may not directly apply, but documenting ICT risk management demonstrates maturity.

### 5.2 Action Items
| ID | Item | Severity | Deadline | Owner |
|----|------|----------|----------|-------|
| D1 | ICT risk management framework documentation | Nice | Oct 31, 2026 | Dev/Ops |
| D2 | Third-party oversight: RPC provider risk assessment | Nice | Oct 31, 2026 | Dev/Ops |
| D3 | Incident response plan aligned with DORA | Nice | Oct 31, 2026 | Dev/Ops |
| D4 | Business continuity planning | Nice | Oct 31, 2026 | Dev/Ops |

---

## 6. CARF (OECD CRYPTO-ASSET REPORTING FRAMEWORK)

### 6.1 Overview
CARF went live January 1, 2026. First reports due 2027. Applies to "Reporting Crypto-Asset Service Providers" (RCASPs).

### 6.2 Applicability Test: "Control or Sufficient Influence"
CARF applies if the service provider:
- Controls private keys on behalf of users, OR
- Has sufficient influence over user transactions

**OSIRIS Assessment:**
- OSIRIS does NOT control user private keys (non-custodial)
- OSIRIS proposes transactions; users sign locally
- OSIRIS likely does NOT have "sufficient influence" under CARF definition

**Preliminary Conclusion:** OSIRIS likely falls outside CARF scope, but must be documented and monitored.

### 6.3 Action Items
| ID | Item | Severity | Deadline | Owner |
|----|------|----------|----------|-------|
| C1 | Document CARF applicability analysis | Nice | Sep 30, 2026 | Legal/Compliance |
| C2 | Monitor regulatory guidance on "sufficient influence" test | Nice | Ongoing | Compliance |
| C3 | If applicable: Implement reporting infrastructure | Nice | Dec 31, 2026 | Dev |

---

## 7. SEC NO-ACTION LETTER (APRIL 2026)

### 7.1 Overview
SEC staff statement (April 2026) identifies 12 conditions for non-custodial crypto interfaces to avoid broker-dealer registration.

### 7.2 The 12 Conditions
1. Users maintain control of private keys
2. Platform does not hold user funds
3. Platform does not have custody of private keys
4. Users initiate all transactions
5. Platform does not have authority to move user funds
6. Platform does not provide margin/credit
7. Platform does not aggregate orders for execution
8. Platform does not provide investment advice
9. Platform does not recommend specific securities
10. Platform does not have discretion over user accounts
11. Platform does not guarantee performance
12. Platform does not engage in market-making

### 7.3 OSIRIS Assessment
| Condition | OSIRIS Status | Notes |
|-----------|---------------|-------|
| 1. User key control | ✅ Compliant | Users sign locally |
| 2. No user funds holding | ✅ Compliant | Non-custodial |
| 3. No key custody | ✅ Compliant | OSIRIS never handles user keys |
| 4. User-initiated transactions | ✅ Compliant | User authorizes copy trades |
| 5. No authority to move funds | ✅ Compliant | User wallets sign |
| 6. No margin/credit | ✅ Compliant | No lending |
| 7. No order aggregation | ✅ Compliant | Individual copy trades |
| 8. No investment advice | ⚠️ Review needed | Copy trading could be construed as advice |
| 9. No security recommendations | ⚠️ Review needed | Wallet selection may be construed as recommendation |
| 10. No account discretion | ✅ Compliant | Users control settings |
| 11. No performance guarantee | ✅ Compliant | Risk disclosures in place |
| 12. No market-making | ✅ Compliant | No liquidity provision |

### 7.4 Action Items
| ID | Item | Severity | Deadline | Owner |
|----|------|----------|----------|-------|
| S1 | Document compliance with all 12 conditions | Should | Sep 15, 2026 | Legal/Compliance |
| S2 | Review copy-trading messaging for investment advice implications | Should | Sep 15, 2026 | Legal/Marketing |
| S3 | Review wallet selection for recommendation implications | Should | Sep 15, 2026 | Legal/Compliance |

---

## 8. UK FCA CRYPTO REGIME

### 8.1 Overview
FCA authorization gateway opens Sep 30, 2026; full regime Oct 25, 2027. Applies to crypto-asset firms operating in the UK.

### 8.2 Applicability Assessment
**Question:** Does OSIRIS fall inside the FCA perimeter?

**Factors:**
- OSIRIS is non-custodial
- OSIRIS provides copy-trading signals/execution proposals
- OSIRIS does not hold client funds

**Preliminary Assessment:** Non-custodial software providers may fall outside perimeter, but copy-trading execution service could be construed as regulated activity.

### 8.3 Action Items
| ID | Item | Severity | Deadline | Owner |
|----|------|----------|----------|-------|
| F1 | Legal opinion on FCA perimeter applicability | Nice | Oct 31, 2026 | Legal/Compliance |
| F2 | If applicable: FCA authorization roadmap | Nice | Dec 31, 2026 | Compliance |
| F3 | If not applicable: Document non-applicability rationale | Nice | Oct 31, 2026 | Legal/Compliance |
| F4 | Financial promotions compliance review | Nice | Sep 30, 2026 | Marketing/Compliance |

---

## 9. UAE VARA (VIRTUAL ASSETS REGULATORY AUTHORITY)

### 9.1 Overview
VARA requires licensing for VASPs operating in Dubai. Non-custodial software may fall outside scope.

### 9.2 Action Items
| ID | Item | Severity | Deadline | Owner |
|----|------|----------|----------|-------|
| V1 | VARA scope assessment | Nice | Oct 31, 2026 | Legal/Compliance |
| V2 | If applicable: VARA licensing roadmap | Nice | Dec 31, 2026 | Compliance |

---

## 10. AML/KYC POLICY

### 10.1 Overview
Even for non-custodial bots, a risk-based AML/KYC policy is required for:
- Payment processor partnerships
- Future licensing
- Due diligence by users/investors

### 10.2 Action Items
| ID | Item | Severity | Deadline | Owner |
|----|------|----------|----------|-------|
| A1 | Document risk-based AML/KYC policy | Should | Sep 30, 2026 | Compliance |
| A2 | Travel Rule obligations assessment | Should | Sep 30, 2026 | Compliance |
| A3 | Sanctions screening integration (if handling deposits) | Should | Sep 30, 2026 | Dev |
| A4 | Suspicious activity reporting procedure | Should | Sep 30, 2026 | Dev/Ops |

---

## 11. DATA RETENTION MATRIX

### 11.1 Overview
See `docs/data-retention-matrix.md` for detailed retention schedule.

### 11.2 Key Principles
- Personal data: retain only as long as necessary; support erasure
- Transaction records: retain 5 years minimum (AML/BSA requirement)
- Logs: retain per operational/security needs; reconcile with GDPR
- Backups: encrypted; retention aligned with data classification

---

## 12. INSURANCE & LIABILITY

### 12.1 Overview
Traditional E&O policies increasingly exclude AI-generated outputs (Verisk ISO endorsements CG 40 47, CG 40 48, CG 35 08 effective Jan 1, 2026).

### 12.2 Action Items
| ID | Item | Severity | Deadline | Owner |
|----|------|----------|----------|-------|
| I1 | Insurance coverage gap assessment | Should | Sep 30, 2026 | Legal/Finance |
| I2 | Document what's covered and gaps | Should | Sep 30, 2026 | Legal/Finance |
| I3 | Evaluate purpose-built AI liability coverage | Should | Sep 30, 2026 | Legal/Finance |
| I4 | Terms of Service limitation of liability review | Must | Sep 15, 2026 | Legal |

---

## 13. COMPLIANCE ROADMAP GANTT

| Month | Focus |
|-------|-------|
| Aug 2026 | MiCA applicability, GDPR data mapping, SEC no-action checklist |
| Sep 2026 | ToS/Privacy Policy, AML/KYC policy, data retention matrix, IR plan |
| Oct 2026 | UK FCA assessment, UAE VARA assessment, DORA documentation |
| Nov 2026 | CARF analysis, SOC 2 roadmap, insurance review |
| Dec 2026 | Compliance documentation finalization, audit readiness |
| Q1 2027 | CARF first reporting preparation (if applicable) |
| Q2 2027 | SOC 2 Type I readiness assessment |
| Q3 2027 | UK FCA full regime compliance (if applicable) |

---

## 14. FREE RESOURCES FOR COMPLIANCE

| Resource | Type | Use Case |
|----------|------|----------|
| **PolicifyAI** | Legal doc generator | MiCA/GDPR/AML-aware ToS, privacy policy, risk disclosures |
| **SimpleAudit** | SOC 2 toolkit | Policy templates, readiness checklist, evidence guide |
| **capetron/incident-response-plan-template** | IR plan | NIST SP 800-61-based IR plan |
| **NorthPoint MiCA marketing self-audit skill** | Compliance skill | 40 rules for EU crypto marketing compliance |
| **brandonhimpfen/awesome-crypto-compliance** | Compliance resources | Curated crypto compliance tools and frameworks |
| **vyayasan/kyc-analyst** | KYC/AML automation | Open-source KYC/AML compliance automation |
| **Buzzi.ai AI insurance gap assessment** | Insurance tool | Free AI coverage gap heatmap; flags Verisk CG 40 47/48 |
| **termly.io / termsfeed / freeprivacypolicy.com** | Legal doc generators | Free privacy policy and terms templates |

---

## 15. CHANGE LOG

| Date | Version | Change |
|------|---------|--------|
| 2026-08-26 | 1.0 | Initial creation; covers MiCA, GDPR, DORA, CARF, SEC, UK FCA, UAE VARA, AML, insurance |

---

*This document is maintained by the OSIRIS compliance team. All regulatory work must be traceable to this roadmap.*
