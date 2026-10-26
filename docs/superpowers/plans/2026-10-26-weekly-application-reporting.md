# Weekly Application and Lead Reporting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide a universal default reporting template, a staff setup wizard for personal templates, draft/submit weekly reporting, and week-labeled comparison graphs.

**Architecture:** Keep existing `weeklyReports` documents and legacy readers intact. Make one combined universal template available to every staff member with report-generation permission. Store staff-owned customized templates separately from admin-created shared starters, maintain each staff member's own library index, then snapshot selected templates into reports. Enforce count checks by stable metric IDs only when the complete equation remains. Update reporting UI to guide first-time users through template setup before weekly entry.

**Tech Stack:** Next.js 14, React 18, TypeScript, Firebase Firestore, Firestore rules, Vitest (existing suite; no new tests are authorized by the current session instruction).

**Spec:** `docs/superpowers/specs/2026-10-26-weekly-application-reporting-design.md`

## Global Constraints

- Every staff member with report-generation permission receives the universal combined starter without admin assignment.
- Staff can add, remove, or rename metrics, name and save personal templates, and copy admin-created shared templates into their own library.
- A staff member may include at most five distinct templates in one weekly report and at most one Application-kind template.
- `B2B applications + B2C applications + Subagents applications = Total Applications`.
- For each channel, `Conditional Offers + Unconditional Offers + Awaiting Offers = applications in that channel`.
- “Application Submitted” is separate from total applications and offer arithmetic.
- Drafts may be incomplete or inconsistent; submission requires non-negative whole-number values and satisfied Application equations.
- Template edits must not rewrite submitted report snapshots or legacy report data.
- Staff may read and write only their own reporting data and personal templates; admins may manage shared templates and inspect reports.
- Do not add or run tests unless the user asks to test or verify implementation.

## Review Focus

- Incomplete Application draft: saving must preserve entered values, while submission remains blocked until all required count equations hold.
- Zero and missing metrics: explicit zero is plotted as zero; absent values remain missing and are not silently converted into zero.
- Template changed after submission: prior report graph/history continues to use the saved snapshot.
- ISO week year boundary: comparison labels remain unambiguous when the same week number occurs in different years.
- Legacy generic report: remains readable and does not acquire fabricated Application totals or fail merely because the new fields are absent.

---

## File map and implementation decisions

- `src/types/reporting.ts`: define reusable template, assignment, metric, report snapshot, and backward-compatible weekly report types.
- `src/lib/reportingUtils.ts`: pure functions for count validation, metric value normalization, and comparison alignment.
- `src/lib/reportingService.ts`: Firestore reads/writes for shared templates, per-user assignments, report drafts, and submissions.
- `src/components/dashboard/reporting/`: admin template management, staff selection/editor, graph comparison, and inspector integration.
- `src/components/modals/AccessGrantModal.tsx`, `src/lib/accessControl.ts`, `src/app/page.tsx`, and `firestore.rules`: reporting access and navigation/security integration.
- `tests/reportingUtils.test.ts`, `tests/reportingIntegration.test.ts`, and `tests/firestore.rules.test.ts` are the existing relevant test files; this plan does not authorize modifying or running them.

Use `reportTemplates/{templateId}` for shared templates, preserving the existing `global_admin` and `{userId}` documents for legacy compatibility. Store each staff member’s assigned template IDs in `reportTemplateAssignments/{uid}`. Each new weekly report stores `selectedTemplates`, each containing a `templateId`, a frozen `templateSnapshot`, and report-specific metric definitions/values. Keep legacy `snapshotTemplate`, `data`, and `totals` readable during transition; new code must not infer new Application equations from legacy reports.

Approved follow-up: shared templates remain in `reportTemplates`; staff personal templates use top-level `staffReportTemplates/{templateId}` documents with `ownerUid`. `reportTemplateAssignments/{uid}` becomes the staff-owned personal-library index, writable by the matching staff account with reporting create permission. The universal combined starter is built in code and copied to personal storage by the setup wizard. Old per-staff shared-template assignments remain readable for migration but are no longer required for staff access. One Application-kind template remains the maximum per weekly report.

Revision for this approved follow-up: keep shared templates in `reportTemplates`, store staff-created templates in an owner-scoped personal collection, and use `reportTemplateAssignments/{uid}` as the staff-owned personal-library index (not an admin assignment). The universal starter is copied into a staff-owned template when setup is saved. Report reads and writes enforce library membership against this index. Preserve legacy template documents and their rules.

## Task 1: Reporting types and pure count rules

**Files:**
- Modify: `src/types/reporting.ts`
- Modify: `src/lib/reportingUtils.ts`
- Existing tests (reference only; do not modify/run under current instruction): `tests/reportingUtils.test.ts`

**Interfaces:**
- Produce `ReportMetricDef` with stable `id`, `label`, and numeric type.
- Produce `SharedReportTemplate` with `id`, `name`, `kind: "APPLICATION" | "LEAD"`, metrics, and audit fields.
- Produce `ReportTemplateAssignment` with `uid`, `templateIds`, `applicationTemplateIds`, and audit fields.
- Produce `SelectedReportTemplate` with `templateId`, `templateSnapshot`, `metrics`, and `values: Record<string, number | null>`.
- Extend `WeeklyReport` with optional `selectedTemplates` while keeping legacy fields optional/readable.
- Produce `validateApplicationCounts(values)` returning `{ valid: boolean; errors: string[]; expectedTotal: number; channelTotals: Record<"B2B" | "B2C" | "SUBAGENTS", { applications: number; offers: number }> }`.

- [ ] Add the new types without removing legacy `ReportSectionDef` fields.
- [ ] Implement `validateApplicationCounts` so missing, negative, fractional, or non-finite counts are invalid; verify channel and offer equations and report actionable messages.
- [ ] Implement a stable metric-alignment helper keyed by metric ID that preserves missing values as `null` and does not merge same-label metrics with different IDs.
- [ ] Inspect the diff for legacy compatibility and avoid coercing empty values to zero in the new path.

## Task 2: Shared templates, assignments, and report service

**Files:**
- Modify: `src/lib/reportingService.ts`
- Modify: `src/types/reporting.ts` (interfaces from Task 1)
- Existing tests (reference only): `tests/reportingIntegration.test.ts`

**Interfaces:**
- `fetchSharedReportTemplates(): Promise<SharedReportTemplate[]>`
- `saveSharedReportTemplate(template: Omit<SharedReportTemplate, "createdAt" | "updatedAt">, adminUid: string): Promise<void>`
- `fetchReportTemplateAssignment(uid: string): Promise<ReportTemplateAssignment | null>`
- `saveReportTemplateAssignment(uid: string, templateIds: string[], adminUid: string): Promise<void>`
- `saveWeeklyReportDraft(reportData: Partial<WeeklyReport> & { id: string; userId: string; year: number; weekNumber: number; selectedTemplates: SelectedReportTemplate[] }): Promise<void>`
- `submitWeeklyReport(reportId: string, selectedTemplates: SelectedReportTemplate[]): Promise<void>`

- [ ] Add the shared-template and assignment reads/writes using Firestore `reportTemplates` and `reportTemplateAssignments` documents.
- [ ] Enforce the five-template limit in service inputs and reject unknown/duplicate template IDs before writing a user report.
- [ ] Preserve legacy fetch and submit behavior where existing admin/inspector components still consume `snapshotTemplate`, `data`, and `totals`.
- [ ] Snapshot template definitions at draft creation and retain the snapshot on submit so later shared-template edits do not mutate history.
- [ ] Ensure draft save does not apply submission-only count validation; the editor owns the submission gate and Firestore rules enforce ownership/assignment.

## Task 3: Firestore access and rules

**Files:**
- Modify: `firestore.rules`
- Modify: `src/lib/accessControl.ts`
- Modify: `src/components/modals/AccessGrantModal.tsx`
- Modify: `src/app/page.tsx`
- Existing tests (reference only): `tests/firestore.rules.test.ts`

**Interfaces:**
- Reporting page requires a `read` reporting grant for staff.
- Report creation/submission requires a `create` reporting grant.
- Shared template writes and assignment writes require admin role.
- Staff may read their own assignment, read only assigned shared templates, and read/write only their own weekly reports.

- [ ] Add rule helpers for assignment membership and template assignment lookup; allow admins full shared-template and assignment management.
- [ ] Restrict staff template access to assigned template IDs and own assignment document; deny staff writes to shared templates/assignments.
- [ ] Require reporting read access for staff report history and reporting create access for draft/submit writes; preserve owner identity checks and admin review access.
- [ ] Keep legacy reports readable according to reporting grants without requiring new `selectedTemplates` fields.
- [ ] Prevent staff report ownership fields from changing after creation; validate submitted Application count equations against the selected assigned Application template, and disallow submitted report edits/deletes.
- [ ] Add “Staff reports” to access grants and change staff reporting navigation to require the `read` action; keep admins unrestricted.
- [ ] Review rule behavior for missing grant documents and legacy grant shapes; fail closed for staff with no reporting grant.

## Task 4: Admin shared-template and assignment management

**Files:**
- Create: `src/components/dashboard/reporting/AdminReportTemplateManager.tsx`
- Create: `src/components/dashboard/reporting/ReportTemplateEditor.tsx`
- Modify: `src/components/dashboard/ReportingTab.tsx`
- Modify: `src/components/dashboard/reporting/AdminReportingMatrix.tsx`
- Modify: `src/lib/reportingService.ts` (interfaces from Task 2)

**Interfaces:**
- `AdminReportTemplateManager` receives `adminUid` and `staffList` and owns shared template CRUD plus staff assignment controls.
- `ReportTemplateEditor` receives an optional template and returns a saved `SharedReportTemplate` with metric IDs preserved on edits.

- [ ] Seed the Application template with the eight specified pipeline metrics plus total/channel/offer breakdown metrics; seed a blank Lead template.
- [ ] Allow admins to add, rename, reorder, and remove numeric metric definitions and save shared templates.
- [ ] Allow admins to assign one or more templates per staff member and grant reporting access using existing staff access controls.
- [ ] Prevent deleting a shared template while it remains assigned; require unassignment first so staff can still finish drafts and existing report history remains interpretable.
- [ ] Add an admin-only navigation surface for template management and retain existing submission supervision/late unlock functions.
- [ ] Ensure staff assignment changes do not alter templates already snapshotted in saved reports.

## Task 5: Staff multi-template weekly editor and submission flow

**Files:**
- Modify: `src/components/dashboard/reporting/ReportEditor.tsx`
- Modify: `src/components/dashboard/reporting/TemplateCustomizerModal.tsx` (replace or retire personal global template editing in the new workflow)
- Modify: `src/components/dashboard/ReportingTab.tsx`
- Use: types and service interfaces from Tasks 1–3

**Interfaces:**
- `ReportEditor` receives `userId`, `userName`, `userEmail`, `isAdmin`, assigned templates, and generation permission (or loads assignments through reporting service).
- The report form stores values by template ID and metric ID, independent of display label.

- [ ] Replace single category/template editing with a selector for assigned templates, capped at five per ISO week.
- [ ] Render the frozen template metrics and allow staff to add report-specific metrics without modifying shared definitions.
- [ ] Restore selected templates and values from an existing draft when the week is reopened.
- [ ] Save drafts with incomplete values and visible validation state.
- [ ] Before submission, validate Application metric counts; prevent submit with errors and show the expected versus entered channel/offer totals.
- [ ] On successful submit, store selected template snapshots and submitted timestamp; make submitted values read-only for staff.
- [ ] Preserve the separate `Application Submitted` metric without including it in application total calculations.

## Task 6: Multi-week overlay graph and history selection

**Files:**
- Modify: `src/components/dashboard/reporting/WeeklyComparisonView.tsx`
- Modify: `src/components/dashboard/reporting/ReportEditor.tsx` (current-week graph integration if graph is shown in the editor)
- Create if the graph needs an isolated component: `src/components/dashboard/reporting/WeeklyMetricsChart.tsx`
- Use: stable metric alignment from Task 1

**Interfaces:**
- `WeeklyMetricsChart` receives `{ reports: WeeklyReport[]; currentReportId?: string }` and plots metric ID, label, week/year, and `number | null` values.

- [ ] Allow selection of multiple prior submitted reports for the same staff member and include the current report in the comparison when saved.
- [ ] Overlay each selected week as a labeled series; show ISO week number and year when needed to disambiguate.
- [ ] Plot metrics along X and values along Y; show exact values in labels/tooltips and render explicit zero separately from missing data.
- [ ] Align only by stable metric ID; show non-matching template metrics as unavailable for that series.
- [ ] Retain a readable legacy comparison path for older reports without `selectedTemplates`.

## Task 7: Admin history, monthly compatibility, and final integration

**Files:**
- Modify: `src/components/dashboard/reporting/AdminReportingMatrix.tsx`
- Modify: `src/components/dashboard/reporting/MonthlyComparisonView.tsx`
- Modify: `src/lib/reportingUtils.ts`
- Modify: `src/lib/reportingService.ts`

- [ ] Update admin inspection to load multi-template report history and display the same week-overlay graph while preserving submission state and late-unlock actions.
- [ ] Ensure monthly aggregation keys template metrics by template ID and metric ID; do not combine unrelated metrics that only share labels.
- [ ] Keep existing legacy monthly package reads available; do not fabricate values for the new model.
- [ ] Review all acceptance criteria against the spec, inspect Firestore rule paths and UI permission gates, and run only typechecking unless the user authorizes tests.
- [ ] Summarize any deferred migration or admin correction policy before implementation is considered complete.

## Coverage self-review

- Admin shared template create/edit/save and staff assignment: Tasks 2–4.
- Per-staff reporting permissions and Firestore enforcement: Task 3.
- Up to five templates, personal additions, draft restore, submit: Tasks 2 and 5.
- Application/channel/offer equations and separate Application Submitted metric: Tasks 1 and 5.
- Week-labeled multi-report graphs, missing values, metric identity: Tasks 1 and 6.
- Snapshot stability and legacy report compatibility: Tasks 2, 5, 6, and 7.
- Admin matrix, inspector, and monthly compatibility: Task 7.

## Approved follow-up tasks: universal starter and setup wizard

The original implementation covers its initial specification. The following tasks revise the template ownership and first-run flow to match the approved follow-up spec.

### Task 8: Personal template library and permission rules

**Files:**
- Modify: `src/types/reporting.ts`
- Modify: `src/lib/reportingService.ts`
- Modify: `firestore.rules`

**Interfaces:**
- `PersonalReportTemplate extends SharedReportTemplate` with `ownerUid: string` and optional `sourceTemplateId`.
- `fetchPersonalReportTemplates(uid: string): Promise<PersonalReportTemplate[]>`
- `savePersonalReportTemplate(template: PersonalReportTemplate, uid: string): Promise<void>`
- `deletePersonalReportTemplate(templateId: string, uid: string): Promise<void>`
- Staff-owned `reportTemplateAssignments/{uid}` records their personal `templateIds` and `applicationTemplateIds`; shared admin assignment remains backward compatible but is not required for a personal template.

- [x] Add the personal template type and Firestore CRUD methods; update the library index on save and retain IDs after deletion so existing draft snapshots remain submit-eligible.
- [x] Make the universal starter builder return all pipeline and application metrics under a neutral starter name.
- [x] Update report rules so staff can only read/write their own personal template documents and library index, subject to reporting grants.
- [x] Update weekly report membership validation to require selected IDs from the current user's personal library for staff; allow admins to inspect/write only according to existing admin policy.
- [x] Validate application arithmetic by stable metric `id` and `group`/`channel` metadata only when the entire required equation remains in the selected template; a removed metric disables only equations that depend on it.

### Task 9: Staff template setup wizard and weekly use

**Files:**
- Modify: `src/components/dashboard/reporting/AssignedReportEditor.tsx`
- Modify: `src/lib/reportingService.ts`
- Modify: `src/lib/reportingUtils.ts`

**Interfaces:**
- The first-run editor state is `setup` when the staff member has no personal templates and `weekly` otherwise.
- Setup stages: customize the universal starter; name/save a personal template; then continue to weekly reporting.

- [x] Replace assigned-template selection with staff-owned template loading and current user's personal template library.
- [x] Add a first-run wizard with visible numbered stages and default metric list; allow metric label edits that preserve IDs, metric removal, and new metric creation.
- [x] Add rename/edit/delete controls for saved personal templates; confirm deletion before removing a template used in prior reports (prior report snapshots stay intact).
- [x] Keep arithmetic checks tied to metric IDs; UI hides each check once a required metric has been removed and continues validating other complete equations.
- [x] Let staff select up to five personal templates for a week, preserve draft/submit separation, and keep submitted snapshots immutable.
- [x] Allow copying an admin shared starter into the personal library before staff edits it.

### Task 10: Admin shared-starter and access experience

**Files:**
- Modify: `src/components/dashboard/reporting/AdminReportTemplateManager.tsx`
- Modify: `src/components/dashboard/ReportingTab.tsx`
- Modify: `src/components/modals/AccessGrantModal.tsx` (only if labels need adjustment)

**Interfaces:**
- Admin template management creates and edits shared starter templates only; it no longer controls staff-specific template assignment.
- Staff report-generation permissions remain administered through existing access grants.

- [x] Remove per-staff template assignment UI and explain that report access makes the universal starter available.
- [x] Keep admin shared template create/edit/save and make shared templates available in the staff wizard as copyable starters.
- [x] Update reporting page copy from assigned templates to personal templates and setup wizard.
- [x] Retain per-staff read/create access grants and admin history/inspection functions.

Follow-up verification: `npm run typecheck` passes. `git diff --check` passes with only existing Git line-ending normalization warnings. Tests were not added or run under the current session instruction; Firestore rules were not emulator-compiled.

