# HAP Launch Audit — PHA Sign-Up Readiness

Status legend: ✅ built · 🟡 partial · ⚠️ missing · N/A not in scope

## Core HAP lifecycle
| Capability | Status | Notes |
|---|---|---|
| HAP contract create / amend / terminate | ✅ | `agency_hap_contracts` + addendum table |
| Rent calc (TTP / utility) | ✅ | `AgencyRentCalculator` |
| HAP batching draft → reviewed → approved → disbursed | ✅ | Memory: HAP Management & Batching |
| NACHA ACH file generation | ✅ | `agency_nacha_settings` + `agency_nacha_files` |
| Checkbook.io disbursement | ✅ | Edge function fulfilment |
| Special claims HUD-52671 | ✅ | `agency_special_claims` |
| Repayment agreements | ✅ | Auto-decrementing balance trigger |
| **Legacy HAP history import** | ✅ | NEW: `agency_hap_payments_legacy` + import wizard |

## Reporting (HUD)
| Report | Status | Notes |
|---|---|---|
| HUD-50058 (170-char fixed-width) | ✅ | HUD Reporting Suite |
| 1099-MISC year-end (landlords) | ✅ | LandlordPayments tab |
| Annual / monthly statements | ✅ | LandlordPayments tab |
| **VMS (Voucher Management System)** | ⚠️ | Need monthly leasing/HAP totals export |
| **SEMAP indicators (full 14)** | 🟡 | `agency_semap_scores` exists; needs final 14-indicator export |
| **IMS-PIC submission file** | 🟡 | `agency_pic_submissions` scaffolded; transmit step manual |
| 50059 (Multifamily) | N/A | Section 8 HCV scope only |
| EIV discrepancies | ✅ | `agency_eiv_discrepancies` |

## Compliance & docs
| Capability | Status |
|---|---|
| RFTA workflow | ✅ |
| HQS / NSPIRE inspections | ✅ |
| Recertifications + supervisor approval | ✅ |
| Grievance / informal hearings | ✅ |
| FSS escrow ledger | ✅ |
| Reasonable accommodations (504/FHA) | ✅ |
| Consents (HUD-9886, EIV, Privacy Act) | ✅ |
| VAWA self-cert | ✅ |
| Retention policies (24 CFR 908) | ✅ |
| Legal holds + DSAR | ✅ |
| PII vault (pgsodium AEAD) | ✅ |

## Onboarding & data migration
| Capability | Status |
|---|---|
| Bulk CSV import (tenants, vouchers, waitlist, landlords, placements) | ✅ |
| **Bulk PDF dropzone (W-9 / lease / verifications)** | ✅ NEW |
| Idempotent re-import (`source_external_id`) | ✅ NEW |
| Launch readiness checklist | ✅ NEW |
| OnboardingWizard 9-step | ✅ |
| Multi-agency QA harness | ✅ NEW |

## State / regional add-ons (to be opened per-PHA)
- State-specific lease addenda — **add to document templates per agency at sign-up**.
- Local preference points (HUD allows up to 4) — configurable in `agency_operational_settings`. ✅
- State VAWA forms — fall back to federal HUD-5380/5382. ✅

## Open items before commercial sign-up
1. ⚠️ VMS monthly export script — write generator that aggregates HAP/leasing totals into VMS submission format.
2. 🟡 SEMAP 14-indicator export polish — wire remaining 4 indicators into `agency_semap_scores` calculation.
3. 🟡 IMS-PIC transmit automation — currently produces file, transmission is manual.
4. Per-PHA addenda library — onboard at signing.

Everything else is shippable today.
