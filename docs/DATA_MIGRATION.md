# BCAM Data Migration & Schema Guide

## 1. Credential Secrets Migration
- **Target Collection:** `credential_secrets/{credentialId}`
- **Source Field:** Legacy `digital_credentials.{id}.rawPass`
- **Migration Handler:** `migrateCredentialSecrets()` in `src/app/page.tsx` (Invoked by Admin via Ingestion Tab).
- **Behavior:**
  1. Reads `digital_credentials` documents.
  2. For documents containing legacy `rawPass`, writes `{ secret, updatedAt: serverTimestamp() }` to `credential_secrets/{id}`.
  3. Deletes `rawPass` field from `digital_credentials/{id}` using `deleteField()`.
  4. Records structured audit log entry in `audit_logs` without logging secret values.
- **Rollback:** If migration is interrupted, `digital_credentials` documents retain their metadata. Re-running `migrateCredentialSecrets()` is idempotent.

## 2. Recoverable Import Workflow
- **Handler:** `replaceFirestoreFromParsedData()` in `src/lib/seedDatabase.ts`.
- **Behavior:**
  1. Parses and validates input workbook (`parseBasechanWorkbook()`).
  2. Writes new imported records in chunked batches (200 records per batch).
  3. ONLY after all imported records are successfully written, queries prior active records not in the new dataset and marks them `archived: true`.
  4. If import fails at any step, the operation aborts without archiving or corrupting active inventory.

## 3. Schema Reference

### `physical_assets/{id}`
- `tag`: string (Official tag or `PROVISIONAL-xxx`)
- `makeModel`: string
- `category`: string
- `serialNumber`: string
- `assignedStaff`: string
- `assignedStaffEmail`: string
- `assignedStaffUid`: string
- `department`: string
- `branch`: string
- `condition`: string
- `status`: string ("Active" | "Repair" | "Retired")
- `isLocked`: boolean
- `archived`: boolean

### `credential_secrets/{credentialId}`
- `secret`: string
- `updatedAt`: timestamp
