# BCAM Testing Framework & Instructions

## 1. Test Suite Architecture

- **Unit & Integration Tests:** Vitest 2.1.9 (`npx vitest run`)
- **Firestore Security Rules Tests:** Firebase Emulator Suite + `@firebase/rules-unit-testing` 3.0.4 (`npm run test:rules`)
- **Type Checking:** TypeScript 5.6.3 (`npm run typecheck`)
- **Linting:** ESLint + Next.js Linter (`npm run lint`)
- **E2E Browser Tests:** Playwright 1.63.0 (`npm run test:e2e`)

---

## 2. Test Execution Commands

### TypeScript Type Check
```bash
npm run typecheck
```

### Next.js Linter
```bash
npm run lint
```

### Vitest Unit & Integration Tests
```bash
npx vitest run tests/reportingUtils.test.ts tests/reportingIntegration.test.ts tests/animatedSelect.test.ts tests/motionUtils.test.ts tests/credentialVault.test.ts tests/spreadsheetImport.test.ts tests/assetWorkflows.test.ts tests/completenessAuditor.test.ts tests/stocktakeWorkflows.test.ts tests/workbookRegister.test.ts
```

### Firestore Security Rules Tests (Requires Firebase Emulator)
```bash
npm run test:rules
```

### Production Build Verification
```bash
npm run build
```

---

## 3. Test Coverage Summary

- **29 Unit / Integration Tests (10 Test Files):**
  - `tests/reportingUtils.test.ts`: ISO week-year boundary calculations, zero-baseline percentage change (`NEW`), section totals, report comparison.
  - `tests/reportingIntegration.test.ts`: End-to-end reporting aggregation.
  - `tests/credentialVault.test.ts`: Secret isolation, activity log sanitization, Excel export sanitization.
  - `tests/spreadsheetImport.test.ts`: Facilities branch mapping, `PROVISIONAL-` asset tag handling, duplicate tag/serial detection.
  - `tests/assetWorkflows.test.ts`: Atomic custody transfer (`physical_assets` + `audit_logs` + `tasks`), dual-party visibility in activity logs, optimistic concurrency check.
  - `tests/completenessAuditor.test.ts`: Data quality gaps, provisional tag auditing, action guides for staff vs admin.
  - `tests/stocktakeWorkflows.test.ts`: Chunked pre-write for stocktake items/tasks, atomic verification history tracking, discrepancy validation.
  - `tests/workbookRegister.test.ts`: External URL scheme sanitization (`https://` allowed, `javascript:`/`data:` rejected).
  - `tests/animatedSelect.test.ts`: UI component animation utilities.
  - `tests/motionUtils.test.ts`: Motion animation utilities.

- **12 Firestore Security Rules Tests:**
  - `tests/firestore.rules.test.ts`: Admin access boundaries, staff asset/workbook scoping, onboarding role protection, secret read restriction, activity log visibility, weekly report immutability, report template permissions, monthly package scoping, and late unlock request authorization.
