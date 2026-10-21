# Stage Zero Baseline Audit Report

**Branch:** `fix/bcam-production-readiness`  
**Date:** October 2024  
**Project:** Basechan Asset Manager (BCAM)

---

## 1. Environment & Architecture Overview
- **Framework:** Next.js 14.2.15 (App Router, Static HTML Export config `output: export`)
- **React:** 18.3.1
- **Styling:** Tailwind CSS 3.4.14
- **Database & Auth:** Cloud Firestore, Firebase Authentication (v10.14.1)
- **Spreadsheets:** SheetJS `xlsx` 0.18.5
- **Testing:** Vitest 2.1.9, `@firebase/rules-unit-testing` 3.0.4, Playwright 1.63.0
- **Build Output:** Static site (`out/`)

---

## 2. Collections & Subcollections Access Matrix

| Collection | Operations in Rules | Role/Access Restrictions |
|---|---|---|
| `users` | read, create, update | User can only read/create/update own record. Role updates rejected. |
| `workspace_links` | read, create, update | Admin manage. Staff read non-archived links targeted to all/them. |
| `workspace_favorites` | read, create, update, delete | User read/write own favorites list (<= 100 items). |
| `access_grants` | read, create, update, delete | Admin manage. User can read own grant document. |
| `tasks` | read, create, update | Admin/Staff read assigned/created. Admin or staff repair request creation. |
| `stocktake_rounds` | read, create, update | Admin create/update. Staff assigned to round can read. |
| `stocktake_items` | read, create, update | Admin create. Assigned staff update item status with history entry. |
| `staff_inventory` | read, create, update | Admin or granted staff. Staff limited field edit. |
| `physical_assets` | read, create, update | Admin or granted staff / owner. Staff condition update on unlocked assets. |
| `digital_credentials` | read, create, update | Admin or owner / granted staff. Secret field `rawPass` hidden from non-admin read. |
| `credential_secrets` | get, create, update, delete | Only owner or granted staff with `secretWrite` permission. List prohibited. |
| `workbooks` | read, create, update | Admin or granted staff / owner. Title/cloudStorageUrl updates permitted. |
| `facilities` | read, create, update | Admin or granted staff. Description/condition/maintenanceNotes updates. |
| `vault_access_logs` | read, create | Admin read. Signed-in user create log entry on secret reveal. |
| `audit_logs` | read, create | Currently open read to all signed-in users! (Needs tightening in Stage 1). |
| `reportTemplates` | read, create, update, delete | Currently open read/write to all signed-in users! (Needs tightening in Stage 1). |
| `weeklyReports` | read, create, update, delete | Currently open read/create/update to all signed-in users! (Needs tightening in Stage 1). |
| `monthlyPackages` | read, create, update, delete | Currently open read/create/update to all signed-in users! (Needs tightening in Stage 1). |

---

## 3. Baseline Validation & Test Results

1. **TypeScript Typecheck (`npm run typecheck`):**
   - Result: **PASS** (0 errors).
2. **ESLint (`npm run lint`):**
   - Result: **PASS** (1 warning: `useEffect` missing dependency in `ReportEditor.tsx`).
3. **Unit Tests (`npx vitest run` - non-emulator):**
   - Result: **PASS** (13/13 unit tests passed across `animatedSelect`, `motionUtils`, `reportingIntegration`, `reportingUtils`).
4. **Firestore Rules Tests (`npm run test:rules`):**
   - Result: **7/8 tests PASS, 1 test FAILS**.
   - Failure detail: `audit_logs` allowed staff to read administrative audit logs because `firestore.rules` permitted unrestricted reads for all authenticated users.
5. **Production Build (`npm run build`):**
   - Result: **PASS** (Static page generation succeeded cleanly).

---

## 4. Primary Findings & Vulnerabilities Identified

### Critical Security & Authorization (Stage 1 & 2)
- `weeklyReports`, `reportTemplates`, `monthlyPackages`, and `audit_logs` currently have overly permissive Firestore security rules (`allow read, create, update: if signedIn();`).
- Role determination relies partly on email pattern checks (`.*@basechaninternational.com$`).
- Credential secrets in legacy `digital_credentials.rawPass` need migration into `credential_secrets/{id}` subcollections/documents.

### Data Integrity & Imports (Stage 3 & 4)
- Spreadsheet import (`replaceFirestoreFromParsedData`) archives active records before writing replacement data, leaving potential half-imported states on failure.
- Auto-tag generator can generate placeholder tags like `TAG-001` which may collide or obscure missing tags.

### Reporting & Calculations (Stage 5 & 6)
- Year boundary calculations (ISO week vs calendar year) need unified helpers.
- Baseline zero percentage calculations can produce `Infinity` or `NaN`.
- Monthly package caching lacks explicit freshness validation when reports change.

---

## 5. Next Steps
Proceed directly to **Stage One: Firestore Security and Authorization** to lock down `weeklyReports`, `reportTemplates`, `monthlyPackages`, `audit_logs`, and role-based permissions.
