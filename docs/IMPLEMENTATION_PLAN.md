# BCAM Remediation Implementation Plan

**Project:** Basechan Asset Manager (BCAM)  
**Branch:** `fix/bcam-production-readiness`  
**Status:** Complete (Stages 0 through 13)

---

## Stages Overview & Status

| Stage | Workstream | Priority | Status | Key Deliverables |
|---|---|---|---|---|
| 0 | Baseline Audit and Safe Setup | Mandatory | Complete | Created `fix/bcam-production-readiness` branch; audited typecheck, lint, build; created `docs/BASE_AUDIT_REPORT.md`. |
| 1 | Firestore Security & Authorization | P0 | Complete | Hardened `firestore.rules` for `weeklyReports`, `reportTemplates`, `monthlyPackages`, `audit_logs`, `lateUnlockRequests`, `users`. Added 12 passing emulator rules tests. |
| 2 | Credential Vault Security | P0 | Complete | Enforced step-up audit logging (`vault_access_logs`), secret isolation in `credential_secrets`, legacy `rawPass` migration, and secret sanitization in activity logs & exports. |
| 3 | Spreadsheet Import & Data Integrity | P1 | Complete | Reordered `replaceFirestoreFromParsedData` to write imports before archiving old records; fixed facilities branch mapping; added `PROVISIONAL-` tag handling and duplicate detection. |
| 4 | Asset Register & Custody Workflows | P1 | Complete | Verified atomic custody transfer batch operations (`physical_assets` + `audit_logs` + `tasks`), dual-party visibility in activity logs, and optimistic concurrency check. |
| 5 | Reporting & Monthly Packages | P1 | Complete | Fixed ISO week-year calculation for year boundaries, zero-baseline percentage change handling (`"NEW"`), monthly package freshness validation, and late unlock request scoping. |
| 6 | Completeness Auditor | P1 | Complete | Aligned provisional tag detection (`PROVISIONAL-`), missing serial/tag priority levels, and staff/admin action guide assignment. |
| 7 | Stocktake, Maintenance, Tasks & Handovers | P1 | Complete | Implemented chunked pre-write for stocktake items/tasks before round activation; atomic status and history updates; discrepancy checks. |
| 8 | Offline Mode & Synchronization | P1 | Complete | Implemented `clearUserCache` on sign-out for user isolation, versioned service worker shell cache (`v1`), optimistic transaction conflict detection. |
| 9 | Document & Workbook Register | P2 | Complete | Verified URL sanitization (allowing safe http/https and rejecting dangerous schemes) and metadata validation. |
| 10 | Dependencies & Repository Hygiene | P1/P2 | Complete | Updated `.gitignore` for `.env` secrets, `*.xlsx` files, and `firestore-debug.log`; verified clean typecheck, lint, and build. |
| 11 | Automated Tests & CI | P1 | Complete | Expanded test suite to 29 unit/integration tests (10 test files) + 12 emulator rules tests; added GitHub Actions `.github/workflows/ci.yml`. |
| 12 | Maintainability & Error Handling | P2 | Complete | Resolved React Hook useEffect warning in `ReportEditor`; eliminated unsafe `any` in asset/reporting interfaces with `FirestoreTimestampValue`. |
| 13 | Documentation & Operations | P2 | Complete | Generated operational documentation (`SECURITY.md`, `DATA_MIGRATION.md`, `TESTING.md`, `DEPLOYMENT.md`, `BCAM_REMEDIATION_REPORT.md`). |
