# OpenKey — Manual QA Checklist (21 Modules)

Run through this list before each major release. Each module lists the **primary user path** to verify in a browser. No automated tests — eyes on screen.

> Tip: log in as an agency admin in one tab and a landlord in another to flow data end-to-end.

---

## Agency Portal (16 modules)

### 1. Caseload Management
- [ ] `/agency` → **Caseload** tab loads with filters (status, caseworker, voucher type)
- [ ] Auto-assign button distributes unassigned tenants round-robin
- [ ] Search by tenant name returns results

### 2. Waitlist Management
- [ ] **Caseload → Waitlist** loads applicants
- [ ] Open waitlist accepts new applications; closed waitlist blocks
- [ ] Lottery / preference-points sort works
- [ ] Move applicant to "Issued" creates a voucher row

### 3. RFTA Workflow
- [ ] **Caseload → RFTA** lists pending requests
- [ ] Open an RFTA → tenant + landlord + property fields pre-populated
- [ ] Approve/Deny updates status and notifies both parties

### 4. Recertifications
- [ ] **Caseload → Recerts** shows scheduled recerts with due dates
- [ ] State machine advances: initiated → notice_sent → docs_requested → under_review → completed
- [ ] Supervisor approval gate enforced

### 5. HAP Contracts
- [ ] **Finance → HAP Contracts** lists active contracts
- [ ] Create new contract: tenant, landlord, unit, dates, amounts
- [ ] Effective/expiration dates flow into batching

### 6. HAP Batching + NACHA
- [ ] **Finance → HAP Batching** generates draft batch from active contracts
- [ ] Approve batch → status moves to `approved`
- [ ] **Finance → Payment Rails** generates a NACHA file
- [ ] Downloaded `.ach` file opens in a text editor and contains expected header + entries

### 7. Rent Calculator
- [ ] **Finance → Rent Calc** computes TTP and HAP for a sample household
- [ ] Utility allowance pulled from agency utility schedule
- [ ] Saves snapshot to tenant profile

### 8. Tax Center
- [ ] **Finance → Tax Center** loads 1099 dashboard for current year
- [ ] Generate 1099 PDF for a test landlord; PDF opens cleanly
- [ ] (If IRIS configured) IRS e-file submission returns ack

### 9. EIV Income Discrepancies
- [ ] **Finance → EIV Income** loads import list
- [ ] Upload sample EIV CSV → discrepancies surface with variance %
- [ ] Resolve a discrepancy → status updates to `resolved`

### 10. Inspections + NSPIRE
- [ ] **Compliance → Inspections** schedules a new inspection
- [ ] Add deficiencies with NSPIRE codes; cure deadline auto-calculates
- [ ] Mark cured → deficiency closes

### 11. HUD-50058 Reporting
- [ ] **Admin → Reports** generates HUD-50058 fixed-width `.txt`
- [ ] Each row is exactly 170 characters
- [ ] Required fields populated (HoH SSN, action code, etc.)

### 12. SEMAP / FSS Program
- [ ] **Caseload → FSS** lists participants
- [ ] Enroll new participant: baseline income/rent captured
- [ ] Monthly escrow ledger entries calculate correctly

### 13. Grievances & Hearings
- [ ] **Compliance → Grievances** logs new informal hearing request
- [ ] Schedule, decision, and notice generation flow through
- [ ] Closed cases archived but searchable

### 14. Document Vault
- [ ] **Caseload → tenant detail → Documents** shows shared folder
- [ ] Upload file as caseworker → tenant sees it
- [ ] Upload as tenant → caseworker sees it

### 15. Bulk Notices + Reminders
- [ ] **Communications → Notices** select cohort (e.g. recerts due in 60 days)
- [ ] Mail-merge preview renders with tenant names
- [ ] Send → email_queue receives rows; each tenant gets one email

### 16. Public Waitlist Application
- [ ] Visit `/apply/{agency-slug}` (with `publicWaitlistEnabled` true)
- [ ] Submit a test application
- [ ] Application appears in agency Waitlist tab

---

## Landlord Portal (4 modules)

### 17. Section 8 Enrollment
- [ ] `/landlord` → request enrollment with a PHA
- [ ] Caseworker side: approve request
- [ ] Landlord sees `enrolled` status; per-PHA unit registry populated

### 18. HAP History + Statements
- [ ] **Payments → HAP History** lists disbursements with month/property filters
- [ ] CSV export downloads with headers
- [ ] **Payments → Statements** monthly view loads
- [ ] **Annual Summary** dropdown → year selected → PDF downloads
- [ ] PDF totals match 1099 amount for that year

### 19. Vacancy Posting
- [ ] **Payments → Vacancies** → Post Vacancy wizard runs all 4 steps
- [ ] Property created with `section_8_accepted=true`
- [ ] Unit appears in PHA matchmaker queue

### 20. 1099 / W-9 Self-Service
- [ ] **Payments → W-9** → submit/update tax info
- [ ] **Payments → 1099** → year selector → PDF downloads
- [ ] Status badges accurate (current / expired / missing)

---

## Cross-Cutting (1 module)

### 21. AI OCR Document Extraction
- [ ] (Where surfaced) Upload a sample paystub or lease
- [ ] Extracted fields populate the form
- [ ] User can edit before save (no silent overwrite)

---

## Smoke / Sanity

- [ ] No console errors on first paint of `/`, `/agency`, `/landlord`, `/dashboard`
- [ ] No 4xx/5xx in network panel during the above
- [ ] Help drawer (`?` icon) opens and shows context-aware content per portal
- [ ] Theme tokens consistent — no hardcoded white/black blocks

---

_Last updated: Session 13 — Polish & QA pass._
