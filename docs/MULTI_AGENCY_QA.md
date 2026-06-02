# Multi-Agency QA Walkthrough

Use the harness at `/admin/qa/multi-agency` (admin only).

## 1. Seed
Click **Seed 3 Demo PHAs**. Creates `QA-Demo PHA Alpha/Beta/Gamma`, each with:
- 1 shared landlord (`shared+multi@openkey.dev`) — used for porting
- 1 unique local landlord
- 3 active HAP contracts

## 2. RLS Cross-Tenant Checks
Click **Run RLS Checks**. All three rows must say `PASS`.
- HAP contracts isolation → no foreign rows in tenant scope
- Landlord isolation → same
- Shared landlord → registered to ≥2 agencies (proves multi-PHA registration works)

## 3. Performance
Click **Time parallel HAP fetches**. Expect <500ms total across 3 PHAs.

## 4. Porting walkthrough (manual)
1. Admin Agency Management → impersonate Alpha.
2. Tenants → pick a tenant → Port Out → target Beta.
3. Generate HUD-52665 packet, send.
4. Switch to Beta → Porting tab → packet appears.
5. Choose Absorb (or Bill-back).
6. Verify `agency_port_packets` SLA timer started.

## 5. Teardown
Click **Remove all QA-Demo agencies**. Cleans up everything tagged `is_demo: true` with slug `qa-*`.
