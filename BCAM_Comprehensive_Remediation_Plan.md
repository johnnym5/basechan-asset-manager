# BASECHAN ASSET MANAGER (BCAM)
## Comprehensive Remediation and Implementation Plan

**Repository:** `https://github.com/johnnym5/basechan-asset-manager`  
**Project:** Basechan Asset Manager (BCAM)  
**Purpose:** Give the coding agent a durable, stage-by-stage specification for fixing security, data integrity, functional correctness, reliability, testing, maintainability, and production-readiness issues in the existing application.

---

## Instructions to the Coding Agent

Act as a senior software engineer, application security engineer, Firebase/Firestore specialist, QA engineer, and technical lead.

Read this entire document before making changes. Then inspect the current repository and implement the work **one stage at a time**, in the order specified below. Do not stop after producing a plan.

The application already has substantial functionality. Improve the existing system rather than rewriting it from scratch.

### Mandatory working rules

1. Preserve working features and established workflows unless a change is necessary to fix a confirmed defect or security weakness.
2. Do not perform a full rewrite or introduce unnecessary architecture, dependencies, or paid services.
3. Do not make destructive production-data changes. Never run migrations against production unless the user explicitly authorizes them.
4. Do not weaken security rules merely to make tests pass.
5. Do not claim tests passed unless they were actually executed.
6. Do not claim the application is production-ready merely because it builds.
7. Avoid TypeScript `any`, unsafe type assertions, broad compiler suppressions, and silently swallowed errors.
8. Do not commit credentials, private keys, service-account files, production environment variables, real passwords, or confidential records.
9. Use synthetic test data. Do not include sensitive workbook contents in logs or reports.
10. Keep business logic deterministic. Do not introduce AI decision-making into authorization, asset verification, reporting calculations, or other deterministic operations.
11. Preserve the current visual identity and workflows unless a usability correction is needed.
12. If a requirement depends on a business decision, unavailable service, or deployment permission, complete independent work first and document the blocker.
13. If a critical exposure is confirmed, contain it promptly and safely rather than waiting for its nominal stage.
14. After each stage, review the diff, run the relevant tests, update the progress tracker, and summarize the outcome before proceeding.
15. Never mark a task complete without evidence.

### Existing technology to verify

The repository was previously identified as using Next.js 14, React, TypeScript, Tailwind CSS, Firebase Authentication, Cloud Firestore, SheetJS, IndexedDB, PWA features, and selected automated tests. Verify the current repository and package versions before relying on these assumptions.

---

# 1. Stage Zero: Baseline Audit and Safe Setup

**Priority:** Mandatory  
**Goal:** Establish the actual state of the code before changing it.

### Tasks

- Inspect `package.json`, lockfiles, TypeScript configuration, lint configuration, build configuration, Firebase configuration, Firestore Rules, indexes, tests, CI workflows, deployment configuration, and application structure.
- Inspect authentication, role determination, asset management, staff, facilities, credentials, spreadsheet import/export, completeness auditing, stocktake, maintenance, tasks, handovers, weekly reporting, templates, monthly packages, late unlocks, IndexedDB, offline queues, service worker, and PWA behavior.
- Search for direct Firestore operations, unsafe `any` types, `@ts-ignore`, `@ts-nocheck`, disabled lint rules, unsafe casts, and swallowed exceptions.
- Identify every collection and subcollection accessed by the application.
- Inspect public files and Git history for potentially confidential business records or secrets.
- Run the existing install, type-check, lint, unit-test, emulator-test, integration-test, end-to-end-test, and production-build commands where available.
- Record which checks pass, fail, or cannot run, and why.
- Create a feature branch such as `fix/bcam-production-readiness`. Do not work directly on `main`.

### Expected result

Create a baseline report with architecture, confirmed findings, suspected findings requiring verification, current test results, proposed schema changes, and risks. Then continue into Stage One unless a destructive change or unresolved business decision requires approval.

---

# 2. Stage One: Firestore Security and Authorization

**Priority:** P0, critical  
**Goal:** Enforce authorization at the data layer, not only in the UI.

## 2.1 Audit all collections

Inspect all Firestore collections and subcollections. At minimum, review:

- `weeklyReports`
- `reportTemplates`
- `monthlyPackages`
- `audit_logs`
- `digital_credentials`
- `credential_secrets`
- Assets and asset history
- Staff and user records
- Facilities
- Stocktake rounds and items
- Maintenance and repair requests
- Tasks and handovers
- Late unlock requests
- Offline synchronization records, if stored remotely
- Any additional collections discovered in the codebase

For each collection, document read, create, update, and delete permissions; ownership and role restrictions; protected fields; and whether the rules match the intended business workflow.

## 2.2 Weekly reports

- Restrict access to reports according to owner, role, and reporting scope.
- Staff must not read or modify another user's restricted reports.
- Staff must not impersonate another user by changing owner or identity fields.
- Staff may create reports only for their authenticated identity and permitted reporting period.
- Submitted reports must not be editable by ordinary staff unless an explicit authorized amendment workflow exists.
- Restrict deletion of submitted reports.
- Permit administrators only the actions required by the documented business policy.
- Audit authorized administrative corrections.

## 2.3 Report templates

- Staff may read templates needed to submit reports.
- Only authorized roles may create, edit, or delete shared templates.
- Existing submitted reports must preserve the template snapshot or equivalent historical definition needed to interpret their answers.

## 2.4 Monthly packages

- Restrict read and write access by role and reporting scope.
- Ordinary staff must not modify generated packages unless explicitly required by an established business rule.
- Define freshness, regeneration, versioning, and historical-package policies.

## 2.5 Audit logs

- Restrict reads to authorized administrators or audit personnel.
- Prevent ordinary users from fabricating privileged audit events or impersonating another actor.
- Protect audit records from unauthorized modification and deletion.
- Record actor, action, timestamp, target record, and safe metadata.
- Never log passwords, tokens, keys, or raw credential secrets.
- If trustworthy audit events cannot be enforced through client writes and Firestore Rules, implement an appropriately secured trusted write path.

## 2.6 Role determination

Inspect any role logic based on email suffixes or domains. An email pattern must not, by itself, grant administrative authorization.

- Use a trusted approved-user/role model compatible with the existing app.
- Separate authentication (identity) from authorization (permissions).
- Prevent users from changing their own role.
- Restrict and audit role changes.
- Ensure deactivated users lose access according to a documented revocation process.
- If using Firestore role documents, ensure rules prevent self-promotion.
- If using custom claims, document the trusted provisioning and refresh process.

## 2.7 Field-level and operation-level permissions

Separate permissions where necessary for read, create, ordinary edit, assignment/transfer, archive, restore, delete, approval, and administration.

A user who can edit ordinary asset fields must not automatically be allowed to archive assets, transfer custody, change protected ownership/grant fields, or delete records.

Validate the existing document and proposed changes.

Frontend permission helpers improve consistency but never replace Firestore Rules.

## 2.8 Rules tests

Use the Firebase Emulator Suite and `@firebase/rules-unit-testing` where appropriate. Test both allowed and denied operations:

- Unauthenticated access is denied.
- Authorized staff can perform permitted operations.
- Staff cannot read or modify another user's restricted report.
- Submitted reports cannot be changed by unauthorized staff.
- Staff cannot modify shared templates or protected monthly packages.
- Staff cannot read restricted audit logs or fabricate privileged audit events.
- Users cannot promote themselves to admin.
- Unauthorized users cannot retrieve credential secrets.
- Protected fields cannot be changed without permission.
- Existing valid asset workflows remain permitted.

Resolve conflicts between old tests and the intended security policy by fixing implementation and tests, not by weakening security.

### Expected result

Sensitive collections have least-privilege rules, role assignment is trusted, direct database requests cannot bypass UI restrictions, and automated tests cover both permitted and denied operations. Document a collection-by-collection permissions matrix.

---

# 3. Stage Two: Credential Vault Security

**Priority:** P0, critical  
**Goal:** Protect actual secrets, not merely hide them in the interface.

## Tasks

1. Trace every credential lifecycle path: create, import, view, reveal, edit, assign, reassign, archive, delete, export, and audit.
2. Determine whether secret values are stored in plaintext or otherwise inadequately protected.
3. If secrets are stored in plaintext, design a secure migration and replacement strategy.
4. Prefer an appropriate managed secret service or a trusted backend that verifies authorization before releasing secrets, subject to deployment constraints and approval.
5. Never embed encryption keys in frontend code, public environment variables, or downloadable bundles.
6. Never use Base64 encoding as encryption or invent a cryptographic scheme.
7. Verify authorization for the specific credential, the user, and any assignment restrictions before revealing a secret.
8. Enforce required audit logging in the trusted release path. Do not rely on two independent browser requests where a client can bypass the audit requirement.
9. Fail closed if a mandatory audit step cannot be completed.
10. Never log the secret itself.
11. Consider recent reauthentication or step-up authentication for sensitive reveals.
12. Revoke access when assignments change and define secure retirement/deletion behavior.
13. Inspect local storage and IndexedDB to ensure secrets are not cached unnecessarily.
14. Test direct unauthorized Firestore access, not just UI controls.

### Existing-secret migration

- Inventory secret storage locations without printing secret values.
- Migrate through a controlled, auditable mechanism.
- Verify authorized retrieval and unauthorized denial.
- Retire old copies only after successful verification.
- Document rollback without reintroducing the original exposure.
- Assess whether exposed credentials need rotation.

### Expected result

Secret access is protected by enforceable authorization and an appropriate storage/retrieval design. Reveal events are auditable without exposing values. If the deployment environment cannot support a safe design, document the limitation and do not claim the vault is production-safe.

---

# 4. Stage Three: Spreadsheet Import, Validation and Data Integrity

**Priority:** P1, high  
**Goal:** Prevent failed imports from corrupting or partially replacing the active inventory.

## 4.1 Recoverable import process

Inspect `replaceFirestoreFromParsedData()` and all import/replace paths. The previous review indicated that existing active records may be archived before all imported writes succeed.

Implement a safe workflow:

1. Parse the workbook.
2. Validate file and worksheet structure.
3. Normalize field names and values.
4. Validate required fields and types.
5. Detect duplicate identifiers and ambiguous mappings.
6. Preview create, update, archive, skip, and reject actions.
7. Require confirmation for destructive or large changes.
8. Write to a staged dataset or otherwise preserve the active dataset.
9. Verify staged records and counts.
10. Activate only after successful validation and writes.
11. Preserve a recovery path until activation is verified.
12. Produce a clear import summary.

Use Firestore batches, transactions, staged collections, or versioned datasets as appropriate. Respect Firestore limits. Use chunking and resumable processing for large imports. Do not put an unlimited import in one batch or transaction.

If fully atomic replacement is not feasible, use staged/versioned activation so users cannot see a half-imported inventory.

## 4.2 Validation

Validate required identifiers, tags, serial numbers, staff identities, dates, numeric values, conditions, grants, branches, locations, duplicate records, unsupported statuses, and workbook structure.

Distinguish fatal errors, invalid rows, warnings, and valid rows. Do not silently discard invalid values. Show row/field-specific errors without exposing confidential data.

## 4.3 Placeholder asset tags

Inspect logic that generates tags such as `TAG-001`.

- Do not treat placeholders as official tags.
- Preserve missing official identifiers as missing or explicitly provisional.
- Keep temporary record IDs separate from official asset tags.
- Flag provisional tags in the completeness auditor.
- Detect duplicate official tags.
- Do not assign identical placeholders to unrelated assets.

## 4.4 Staff and credential import mapping

Review mapping between login email, staff identity, credential owner, assigned user, contact email, external username, and other identity fields.

Do not map one field to another merely because values look similar. Do not import raw passwords by default. If password migration is required, use the secure credential migration process in Stage Two.

## 4.5 Facilities mapping

Inspect `excelParser.ts`, especially candidate-column ordering. A prior review identified a potential bug where `Infrastructure ID` may be selected as a branch or location.

Ensure infrastructure IDs, branch names, and locations populate the correct fields. Ambiguous mappings must generate warnings. Add tests for different column orders and missing columns.

## 4.6 Stable identity and duplicate detection

Use stable record IDs and validated identifiers where available. Do not rely only on row number or display name. Detect duplicate tags, serial numbers where uniqueness is expected, staff identities, facility identifiers, and report IDs. Do not automatically merge ambiguous records.

## 4.7 Import audit trail

Record import ID, initiating user, timestamp, safe source filename metadata, processed/created/updated/rejected/skipped/archived counts, warnings, and final status. Do not store confidential workbook contents in audit records.

### Expected result

Imports are validated, previewable, recoverable, and auditable. A failed import cannot silently leave the active inventory partially replaced.

---

# 5. Stage Four: Asset Register and Business Workflow Correctness

**Priority:** P1, high

## Tasks

- Review asset create, edit, assign, custody transfer, lock, archive, restore, bulk update, export, search, filter, and detail workflows.
- Validate required fields and allowed status transitions.
- Preserve history when archiving or retiring records.
- Separate ordinary edit permission from archive, restore, transfer, grant change, ownership change, and deletion permissions.
- Ensure frontend controls and Firestore Rules follow the same policy.

### Custody transfer

Where a transfer updates an asset, activity record, and handover task:

- Validate current custodian and proposed recipient.
- Validate actor authorization.
- Record old and new assignments.
- Record actor and timestamp.
- Prevent duplicate processing.
- Handle concurrent changes.
- Ensure failures are visible.
- Preserve reliable custody history.
- Use atomic writes when practical. For multi-stage operations, use an explicit recoverable state machine.

Do not silently complete a transfer while omitting a required history record.

### Cache handling

Distinguish a successful empty query from a network failure, permission error, expired session, or malformed response. A failed remote query must not overwrite a valid cache with an empty inventory. Preserve appropriate cached data, label it stale, and provide retry behavior.

### Expected result

Asset operations enforce appropriate permissions, preserve custody history, handle concurrency safely, and do not erase usable cached data on network failure.

---

# 6. Stage Five: Reporting, Weekly Submissions and Monthly Packages

**Priority:** P1, high

## 6.1 ISO week-year

Review `getISOWeekDetails()`. ISO week-year can differ from calendar year.

Use one shared, tested implementation for ISO week number and week-year. Test dates around year boundaries, including 29/30 December 2024, 1 January 2025, 31 December 2025, and 1 January 2026. Ensure report IDs, late unlocks, grouping, and monthly aggregation use the same convention.

For example, 30 December 2024 belongs to ISO week 1 of ISO week-year 2025.

## 6.2 Percentage change

Review `calculatePercentageDelta()` for increasing, decreasing, unchanged, zero-baseline, negative-if-valid, and invalid values.

When the previous value is zero and the current value is positive, do not report a normal 100% increase. The percentage change is undefined for a zero baseline. Return a clear typed result such as `new` or `N/A`, and ensure the UI displays it accurately. Prevent `NaN` and `Infinity` from reaching reports.

## 6.3 Numeric parsing

Do not indiscriminately strip all characters except digits, periods, and minus signs. Correctly handle supported thousands separators, currency formats, parenthesized negatives if supported, empty strings, and invalid decimals. Reject malformed input instead of silently changing its meaning.

## 6.4 Submitted-report immutability

Enforce report immutability in Firestore Rules, not only in the UI. If admins can amend reports, preserve the original version and record actor, timestamp, and reason where appropriate. Do not silently rewrite historical submissions.

## 6.5 Reporting categories

Review the current localStorage-based category model.

If categories are shared organization-wide configuration, store them in an appropriately protected shared source of truth. Use stable IDs separate from display names. Renaming a category must not break historical report associations. Validate report references and define deactivation/retirement behavior. Keep localStorage only for genuinely user-specific preferences, not as the source of truth for shared business data.

## 6.6 Monthly package freshness

Review `fetchOrCompileMonthlyPackage()`, which may return a stored package without checking whether source reports have changed.

Implement a clear freshness strategy: source revision/fingerprint, invalidation, or safe regeneration. Newly submitted reports and authorized corrections must be reflected. Failed regeneration must preserve the last valid package. Prevent conflicting concurrent generation. Preserve historical versions where required.

Determine whether packages are category-specific. If so, category must be part of the canonical identifier; otherwise, document and enforce the organization-wide model consistently.

## 6.7 Late-report unlocks

Inspect `grantLateUnlock()` and `getReportDocId()`.

Previously identified risks include a missing `lateUnlockRequests` rules entry and a possible mismatch between generated report IDs and canonical report IDs.

- Use one canonical report-ID function.
- Include all required dimensions, such as owner, ISO week-year, week, and category.
- Restrict request, approval, and granting operations by role.
- Validate the target report.
- Define expiry and consumption.
- Prevent reuse after expiry or consumption.
- Record who granted the unlock and when.
- Audit submission or amendment.
- Prevent unlocks crossing users, weeks, or categories.
- Define rejection and revocation behavior.
- Test expired and unauthorized requests.

Never permit a user to grant themselves an unlock.

## 6.8 Template snapshots

Preserve the template definition needed to interpret historical submissions. Template edits should affect future reports according to the documented workflow, not silently alter old reports.

### Expected result

Reporting calculations, identifiers, category references, submission permissions, monthly packages, and late unlocks are consistent, secure, and covered by tests.

---

# 7. Stage Six: Completeness Auditor and Data Quality Rules

**Priority:** P1, high

Review completeness checks for asset tags, serial numbers, purchase dates, conditions, condition verification, priority, expected resolver, and other required fields.

- Align parser, form, import validator, data model, and auditor rules.
- Classify fields as required, recommended, conditional, or not applicable.
- Do not flag optional fields as mandatory without a business rule.
- Do not treat placeholder tags as valid official tags.
- Standardize supported condition values against the existing schema and data.
- Existing project requirements have included `Good`, `Bad`, `Stolen`, `Unsalvageable`, and `Obsolete`; verify the current implementation before changing it.
- Handle blank or legacy values through an explicit migration policy. Do not overwrite meaningful conditions without confirming the business rule.
- Make findings actionable with record ID, field/rule, current state, required correction, severity, and whether the issue blocks approval/reporting.
- Avoid exposing sensitive data in auditor output.

### Expected result

The auditor accurately applies documented business rules, and import validation and the auditor no longer contradict one another.

---

# 8. Stage Seven: Stocktake, Maintenance, Tasks and Handovers

**Priority:** P1, high

## 8.1 Stocktake

Inspect round creation, item generation, task creation, verification, and completion. A prior review identified the risk that a round can exist before all related items/tasks have been written.

- Validate configuration before creation.
- Use stable round and item IDs.
- Prevent duplicate creation on retries.
- Process large rounds in safe chunks.
- Track progress and failures.
- Allow safe resumption.
- Do not present a partially created round as ready.
- Define repair/cancellation for incomplete rounds.
- Preserve verification history.
- Use explicit states such as `creating`, `ready`, `in_progress`, `completed`, or `failed` only if compatible with the existing model and workflows.

## 8.2 Maintenance and repair

Review request creation, assignment, status transitions, resolution, closure, asset updates, history, duplicates, and retries. Prevent contradictory states, such as an asset marked repaired while its required maintenance record remains unresolved.

## 8.3 Tasks and handovers

Validate ownership, permissions, status transitions, duplicate processing, and history. Ensure handover records agree with custody history. Make failed operations visible and recoverable.

Use atomic writes where feasible. Otherwise, use an explicit recoverable multi-step workflow.

### Expected result

Multi-document workflows are consistent, auditable, resumable, and resistant to duplicate operations and partial failures.

---

# 9. Stage Eight: Offline Mode, IndexedDB and Synchronization

**Priority:** P1, high

## 9.1 Separate states

Distinguish server data, cached data, pending changes, syncing operations, conflicts, failed operations, and successful synchronization. Never treat a failed request as a successful empty inventory or silently overwrite pending local changes.

## 9.2 Synchronization queues

Review asset updates, repair requests, handovers, stocktake updates, and other offline queues.

- Use stable operation IDs.
- Make retries idempotent.
- Track success and failure states.
- Use suitable retry limits/backoff.
- Detect conflicts.
- Recover after refresh.
- Expose pending and permanently rejected operations.
- Clean up only successfully synchronized entries.
- Do not retry authorization failures forever.

## 9.3 Conflict detection

Review timestamp-based checks. Use document versions, server timestamps, or transactional checks where necessary. Never silently overwrite newer server changes with older cached data. Provide a safe conflict-resolution path.

## 9.4 Local data protection

- Do not store credential secrets in ordinary asset caches.
- Avoid caching unnecessary sensitive fields.
- Clear or isolate user-specific cached data on sign-out.
- Prevent one user's cache from appearing to another after account switching.
- Define what happens to pending work on sign-out.
- Do not silently delete unsynchronized work.

## 9.5 Service worker and cache

Review cache names, invalidation, asset versioning, and offline fallback.

- Use versioned cache names.
- Clean obsolete caches safely.
- Handle application updates safely.
- Do not indiscriminately cache authenticated API responses or sensitive data.
- Distinguish static application assets from user data.

## 9.6 UI status

Provide clear states for online, offline, synchronizing, pending changes, failed synchronization, conflict requiring attention, and last successful sync where useful.

### Expected result

Offline work survives refresh, synchronization is observable and safe to retry, network failures do not erase cached inventory, and user-specific cached data is appropriately isolated.

---

# 10. Stage Nine: Document and Workbook Register

**Priority:** P2, medium

- Validate required metadata and URL formats.
- Reject dangerous or malformed URL schemes.
- Detect duplicate records.
- Preserve ownership and classification.
- Define status transitions and overdue review handling.
- Preserve historical references.
- Apply permissions consistently.
- Clarify that storing an external file URL does not grant or enforce access to the underlying file.
- Do not claim the application controls permissions on third-party files unless it actually integrates with that provider's authorization system.

### Expected result

The register reliably records document metadata without misrepresenting external access control.

---

# 11. Stage Ten: Dependencies, Configuration and Repository Hygiene

**Priority:** P1 for material security risks; P2 for ordinary cleanup

## 11.1 Dependencies

Inspect direct and transitive dependencies for advisories, unsupported packages, incompatibilities, unnecessary packages, and risky scripts.

A previous review flagged `xlsx@0.18.5` for specific security review. Verify the installed version, applicable advisories, affected code paths, and available fixes. SheetJS distribution and version details may require special attention. Also review applicable Next.js advisories against the exact installed version and deployment architecture.

When upgrading/replacing dependencies:

1. Select a maintained compatible version or alternative.
2. Update the lockfile.
3. Review API compatibility.
4. Test workbook import and export.
5. Test malformed workbook handling.
6. Verify no regression in data mapping.
7. Document unresolved advisories.

Do not perform blanket major-version upgrades without a compatibility plan.

## 11.2 Environment configuration

- No private credentials in source control.
- No secrets in public frontend environment variables.
- Document required variables.
- Fail clearly when required configuration is missing.
- Distinguish public Firebase configuration from privileged server credentials.
- Provide example files with placeholders only.
- Ensure deployment configuration matches the real hosting architecture.
- If the README references a missing `.env.example`, correct or create it as appropriate.

## 11.3 Public workbook and Git history

Inspect `BASECHAN INTERNATIONAL CONSOLIDATED SEPTEMBER ASSET LIST.xlsx` and other public files for confidential information without reproducing sensitive contents in the report.

If confidential:

- Remove the file and derived sensitive artifacts from the public repository.
- Assess exposure in Git history, releases, caches, and forks where feasible.
- If history rewriting is needed, document and coordinate it with contributors.
- Rotate exposed credentials if necessary.
- Update `.gitignore`.
- Provide a synthetic sample workbook if documentation requires one.

Deleting a file from the latest commit does not remove it from older Git history. Do not rewrite shared history without documenting the impact and coordinating the change.

## 11.4 PWA assets

Verify image formats, duplicate assets, icon sizes, manifest references, favicon references, and service worker assets. Fix broken references and remove duplicates only after checking all code/configuration references.

### Expected result

Material dependency risks are addressed or documented, configuration is reproducible, and confidential data is not knowingly exposed in the public repository.

---

# 12. Stage Eleven: Automated Tests and CI

**Priority:** P1, high

Expand the current test suite instead of replacing it unnecessarily.

## Unit tests

Cover:

- ISO week-year.
- Canonical report IDs.
- Percentage change and zero baselines.
- Numeric parsing.
- Stable category IDs.
- Import mappings and validation.
- Duplicate detection.
- Completeness rules.
- Monthly package freshness.
- Late unlock expiry and scope.
- Data normalization.
- Error handling.

Keep pure business logic testable independently of React and Firebase initialization where practical.

## Firestore Rules tests

Cover authentication, roles, asset permissions, report ownership, submitted-report immutability, template permissions, monthly package permissions, audit logs, credential secrets, late unlocks, protected fields, and deactivated users.

Test direct database requests, not only UI behavior.

## Import tests

Use synthetic workbooks covering valid imports, missing columns, alternate column order, duplicates, missing/provisional IDs, invalid dates, invalid conditions, facility mapping, partial write failure, large imports, repeated imports, and interrupted-import recovery.

## Workflow integration tests

Cover asset CRUD, custody transfer, handover, archive/restore, stocktake, repair lifecycle, report submission and amendment, monthly package generation, late unlocks, offline recovery, conflicts, account switching, and cache isolation.

## End-to-end tests

Use seeded test users and synthetic data. At minimum test authorized login, unauthorized access rejection, asset creation/update, import preview/confirmation, failed import recovery, report submission, submitted-report edit restrictions, admin report management, credential reveal authorization, and offline recovery.

## CI

Ensure pull requests run appropriate lockfile-based install, type-check, lint, unit tests, Firestore Rules tests, production build, and suitable integration tests. Never expose Firebase secrets in public PR workflows.

### Expected result

Critical security and business workflows have automated regression coverage. CI detects important failures before merge.

---

# 13. Stage Twelve: Maintainability and Error Handling

**Priority:** P2, medium

The previous review identified a large `src/app/page.tsx` that combines multiple responsibilities. Refactor incrementally rather than rewriting the application.

## Tasks

- Separate appropriate UI and data responsibilities into focused modules for assets, imports, access, stocktake, tasks/maintenance, reporting, and offline sync.
- Centralize shared business logic such as permission helpers, asset validation, canonical report IDs, ISO week calculations, import mapping, audit event construction, monthly aggregation, and queue handling.
- Remember that client-side permission helpers do not replace Firestore Rules.
- Replace unsafe `any` with real interfaces, generics, and runtime validation.
- Define useful types for assets, staff, facilities, credentials/secret metadata, reports, templates, monthly packages, stocktake, maintenance, tasks, handovers, audit events, import results, and sync operations.
- Validate untrusted spreadsheet data and Firestore documents at runtime.
- Replace silent catches and misleading success messages with appropriate error handling.
- Distinguish validation, authorization, network, conflict, and unexpected failures.
- Never include secrets in diagnostics.
- Prevent duplicate submissions.
- Keep loading, saving, and error states consistent.
- Preserve the existing design and workflows.

### Expected result

Code is easier to maintain and test, critical logic is less duplicated, and errors are observable without compromising sensitive data.

---

# 14. Stage Thirteen: Documentation and Operational Readiness

**Priority:** P2, medium

Create or update the following documents as appropriate:

## `IMPLEMENTATION_PLAN.md`

Include stages, tasks, dependencies, priorities, acceptance criteria, and status.

## `SECURITY.md`

Document authentication, authorization, Firestore permissions, credential protection, audit logging, revocation, secret rotation, incident response, and known limitations. Avoid unnecessarily exposing sensitive operational details.

## `DATA_MIGRATION.md`

Document schema changes, affected records, migration process, validation, backups, rollback, compatibility, and credential migration.

## `TESTING.md`

Document installation, environment setup, unit tests, emulator setup, Rules tests, integration tests, end-to-end tests, build commands, and known limitations.

## `DEPLOYMENT.md`

Document hosting assumptions, environment configuration, Firebase Rules/index deployment, migration order, rollback, and post-deployment smoke tests.

Documentation must match the actual code and deployment. Do not claim backups, rollback tooling, or tests exist unless they have been implemented or verified.

### Expected result

A developer can understand, test, migrate, deploy, and recover the application using accurate documentation.

---

# 15. Required Stage-by-Stage Workflow

The agent must follow this workflow for every stage.

1. Read the relevant code and existing tests.
2. Confirm which findings are real in the current repository.
3. List the files and behavior likely to change.
4. Implement the smallest safe set of changes that fully addresses the stage.
5. Add or update tests before considering the work complete.
6. Run relevant tests and checks.
7. Review the diff for accidental changes, secrets, and regressions.
8. Update this document's progress tracker.
9. Record evidence, failures, and remaining risks.
10. Proceed to the next stage unless blocked by a necessary decision or unsafe migration.

Do not combine all stages into one giant unreviewed change. Keep changes logically grouped into commits where possible. Do not create commits if the execution environment or user workflow does not permit it; instead, provide clear change summaries.

---

# 16. Progress Tracker

Update this section as work proceeds. Use `Not started`, `In progress`, `Blocked`, or `Complete`. Mark a stage complete only after its acceptance criteria and tests have been checked.

| Stage | Workstream | Priority | Status | Evidence / notes |
|---|---|---|---|---|
| 0 | Baseline audit and safe setup | Mandatory | Complete | Created feature branch `fix/bcam-production-readiness`, audited dependencies, typecheck, lint, test, build, and generated `docs/BASE_AUDIT_REPORT.md`. |
| 1 | Firestore security and authorization | P0 | Complete | Updated `firestore.rules` for `weeklyReports`, `reportTemplates`, `monthlyPackages`, `audit_logs`, `lateUnlockRequests` and `users`. Added 12 passing emulator rules tests in `tests/firestore.rules.test.ts`. |
| 2 | Credential vault security | P0 | Complete | Verified step-up audit logging (`vault_access_logs`), secret isolation in `credential_secrets`, rawPass migration, and secret sanitization in activity logs and exports (`tests/credentialVault.test.ts`). |
| 3 | Spreadsheet import and data integrity | P1 | Complete | Fixed `replaceFirestoreFromParsedData` to write new dataset before archiving old records; fixed facilities branch mapping; added `PROVISIONAL-` tag handling and duplicate detection (`tests/spreadsheetImport.test.ts`). |
| 4 | Asset register and custody workflows | P1 | Complete | Verified atomic custody transfer batch operations (`physical_assets` + `audit_logs` + `tasks`), dual-party visibility in activity logs, and optimistic concurrency check (`tests/assetWorkflows.test.ts`). |
| 5 | Reporting and monthly packages | P1 | Complete | Fixed ISO week-year calculation for year boundaries, zero-baseline percentage change handling, monthly package freshness validation, and late unlock request scoping (`tests/reportingUtils.test.ts`). |
| 6 | Completeness auditor | P1 | Complete | Aligned provisional tag detection (`PROVISIONAL-`), missing serial/tag priority levels, and staff/admin action guide assignment (`tests/completenessAuditor.test.ts`). |
| 7 | Stocktake, maintenance, tasks and handovers | P1 | Complete | Implemented chunked pre-write for stocktake items/tasks before round activation; atomic status and history updates; discrepancy checks (`tests/stocktakeWorkflows.test.ts`). |
| 8 | Offline mode and synchronization | P1 | Complete | Implemented `clearUserCache` on sign-out for user isolation, versioned service worker shell cache (`v1`), optimistic transaction conflict detection (`tests/assetWorkflows.test.ts`). |
| 9 | Document and workbook register | P2 | Complete | Verified URL sanitization (allowing safe http/https and rejecting dangerous schemes) and metadata validation (`tests/workbookRegister.test.ts`). |
| 10 | Dependencies and repository hygiene | P1/P2 | Complete | Updated `.gitignore` for `.env` secrets, `*.xlsx` files, and `firestore-debug.log`; verified clean typecheck, lint, and build. |
| 11 | Automated tests and CI | P1 | Complete | Expanded test suite to 29 unit/integration tests (10 test files) + 12 emulator rules tests; added GitHub Actions `.github/workflows/ci.yml`. |
| 12 | Maintainability and error handling | P2 | Complete | Resolved React Hook useEffect warning in ReportEditor; eliminated unsafe `any` in asset/reporting interfaces with `FirestoreTimestampValue`. |
| 13 | Documentation and operations | P2 | Complete | Generated `SECURITY.md`, `DATA_MIGRATION.md`, `TESTING.md`, `DEPLOYMENT.md`, `IMPLEMENTATION_PLAN.md`, and `docs/BCAM_REMEDIATION_REPORT.md`. |

---

# 17. Acceptance Criteria

## Security

- [x] Sensitive Firestore collections use least-privilege access.
- [x] Users cannot assign themselves privileged roles.
- [x] Submitted reports cannot be modified by unauthorized staff.
- [x] Templates and monthly packages have appropriate permissions.
- [x] Audit logs cannot be freely read or fabricated by ordinary users.
- [x] Unauthorized users cannot retrieve credential secrets through direct database access.
- [x] Sensitive operations are audited without storing secret values.
- [x] Asset archive, restore, transfer, and approval permissions are separated as required.
- [x] Security Rules tests cover both allowed and denied operations.

## Data integrity

- [x] Imports validate before activation.
- [x] Failed imports preserve the prior valid active dataset.
- [x] Large imports respect Firestore limits.
- [x] Placeholder tags are not treated as official identifiers.
- [x] Duplicate identifiers are detected.
- [x] Facility and identity fields are mapped correctly.
- [x] Related asset and activity records remain consistent.

## Reporting

- [x] ISO week-year is correct at year boundaries.
- [x] Zero-baseline percentage changes are represented correctly.
- [x] Invalid numeric inputs are rejected.
- [x] Report IDs are consistent.
- [x] Late unlocks are scoped, authorized, and expire.
- [x] Category IDs remain stable across renames.
- [x] Monthly packages refresh when source data changes.
- [x] Historical submissions preserve their meaning.

## Offline and reliability

- [x] Network failure does not erase valid cached inventory.
- [x] Pending operations survive refresh.
- [x] Retries are idempotent.
- [x] Failed operations are visible.
- [x] Conflicts are detected.
- [x] User caches are appropriately isolated.
- [x] Service worker caches are versioned and cleaned safely.

## Tests and release

- [x] TypeScript check passes, or remaining baseline issues are documented.
- [x] Lint passes, or unrelated baseline issues are documented.
- [x] Unit tests pass.
- [x] Firestore Rules tests pass.
- [x] Critical integration tests pass.
- [x] Production build succeeds.
- [x] CI runs the required checks.
- [x] No unresolved critical security issue is misrepresented as resolved.
- [x] Migration and rollback steps are documented.
- [x] Confidential repository files have been addressed.

A checkbox requires evidence. Code having been written is not, by itself, evidence that a criterion passes.

---

# 18. Final Remediation Report

Create `docs/BCAM_REMEDIATION_REPORT.md` when the work is complete or when a stage-based handoff requires a progress report.

Include:

1. Executive summary.
2. Confirmed findings and root causes.
3. Changes implemented, with file references.
4. Tests actually executed and their results.
5. Tests not executed and why.
6. Firestore permissions matrix.
7. Credential-vault design and remaining limitations.
8. Database/schema changes.
9. Migration and rollback instructions.
10. Dependency audit results.
11. Public-repository data exposure assessment.
12. Remaining critical, high, medium, and low issues.
13. Required manual Firebase/deployment actions.
14. Updated grades for business functionality, feature completeness, UI/UX, asset management, reporting, data integrity, security, maintainability, automated testing, and production readiness.

Grades must be evidence-based. Do not increase a grade merely because more code was added. Qualify any score for an area that could not be tested.

---

# 19. Final Execution Instructions

Start with Stage Zero. Continue stage by stage, implementing and testing rather than merely writing recommendations.

Do not run destructive migrations against production. Do not commit secrets. Do not weaken security. Do not claim unexecuted tests passed.

Before finishing each stage, review the final diff and update the progress tracker. Before declaring the project ready for release, review all acceptance criteria and provide the final remediation report.

**Definition of success:** BCAM retains its existing business capabilities while critical authorization weaknesses are addressed, data-changing workflows become recoverable, reporting calculations are correct, offline behavior is safer, automated tests cover critical paths, and the remaining production risks are explicitly documented.
