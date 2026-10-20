# Staff Weekly & Monthly Reporting System - Technical Design Specification

## Overview & Objectives

The **Staff Weekly & Monthly Reporting System** provides staff members in BCAM (Basechan Asset Manager) with a flexible, structured reporting workflow. Staff can configure personal multi-column table templates under mandatory global section headers established by Admins. The system manages a weekly report cycle (resets/submits on Mondays), snapshots templates at submission time, enables side-by-side comparison for up to 4 weeks with variance deltas (+/- %), automatically packages and averages monthly data for month-vs-month comparative analytics, and provides Admins with oversight and late submission management.

---

## 1. Data Model & Firestore Architecture

### 1.1 Collections & Document Schema

#### Collection: `reportTemplates`
Holds mandatory global admin templates and customized per-user report structures.

- **Document ID**: `global_admin` OR `{userId}`
- **Fields**:
  - `userId` (`string | null`): `null` for global admin template, or staff UID.
  - `updatedAt` (`Timestamp`): Time template was last modified.
  - `updatedBy` (`string`): UID of user/admin who updated the template.
  - `sections` (`Array<SectionDef>`):
    - `id` (`string`): Unique section identifier.
    - `title` (`string`): Section header name (e.g. "Equipment Maintenance Audits").
    - `isRequired` (`boolean`): `true` if mandatory admin section, `false` for staff custom sections.
    - `columns` (`Array<ColumnDef>`):
      - `key` (`string`): Field key (e.g. `col_cost`).
      - `label` (`string`): Display column title (e.g. "Unit Cost").
      - `type` (`"text" | "number" | "currency" | "date"`): Column data type.
      - `isCalculatedTotal` (`boolean`): Whether numeric totals & averages are computed for this column.

#### Collection: `weeklyReports`
Stores weekly report submissions and draft states.

- **Document ID**: `{userId}_{year}_W{weekNumber}` (e.g., `usr123_2025_W10`)
- **Fields**:
  - `id` (`string`): Document ID.
  - `userId` (`string`): Staff UID.
  - `userName` (`string`): Staff full name.
  - `year` (`number`): Calendar year (e.g. 2025).
  - `month` (`number`): Month index (1–12).
  - `weekNumber` (`number`): ISO week number (1–52).
  - `weekStartDate` (`string`): YYYY-MM-DD.
  - `weekEndDate` (`string`): YYYY-MM-DD.
  - `status` (`"DRAFT" | "SUBMITTED" | "OVERDUE" | "LATE_UNLOCKED"`): State of report.
  - `submittedAt` (`Timestamp | null`): Time of submission.
  - `snapshotTemplate` (`Array<SectionDef>`): Frozen copy of the template headers/columns at the exact time of submission.
  - `data` (`Record<string, Array<Record<string, any>>>`): Keyed by `sectionId`, containing arrays of row objects.
  - `totals` (`Record<string, Record<string, number>>`): Pre-calculated numeric column sums per section for rapid comparison.

#### Collection: `monthlyPackages`
Aggregated monthly reports compiled automatically at the conclusion of each month.

- **Document ID**: `{userId}_{year}_M{month}` (e.g., `usr123_2025_M03`)
- **Fields**:
  - `id` (`string`)
  - `userId` (`string`)
  - `userName` (`string`)
  - `year` (`number`)
  - `month` (`number`)
  - `compiledAt` (`Timestamp`)
  - `includedWeeklyReportIds` (`Array<string>`)
  - `sectionSummaries` (`Record<string, SectionMonthlySummary>`):
    - `columnTotals` (`Record<string, number>`): Total accumulated value across all weeks in the month.
    - `columnAverages` (`Record<string, number>`): Weekly average value for each numeric column.
    - `rowCount` (`number`): Total rows entered across the month.

#### Collection: `lateUnlockRequests`
Tracks admin-granted submission overrides for overdue weekly reports.

- **Document ID**: `{requestId}`
- **Fields**:
  - `userId` (`string`)
  - `weekIdentifier` (`string`): e.g. `2025_W10`
  - `grantedBy` (`string`): Admin UID.
  - `grantedAt` (`Timestamp`)
  - `expiresAt` (`Timestamp`): Window during which staff can edit & submit overdue report.
  - `status` (`"ACTIVE" | "USED" | "EXPIRED"`)

---

## 2. Business Logic & Processing Workflow

### 2.1 Template Hierarchy & Merging
- When a staff member opens their report editor, the system merges the `global_admin` template (mandatory sections) with the staff's personal `{userId}` template.
- Mandatory sections cannot be deleted or re-ordered above system defaults by staff, but staff may append custom sections and extra columns.

### 2.2 Submission & Snapshot Freeze
- **Weekly Deadline:** Reports must be submitted by Monday at 23:59.
- **Snapshotting:** Upon clicking "Submit", the system writes a complete copy of the merged template into `weeklyReports.snapshotTemplate`.
- **Template Mutability:** If staff modify their custom headers next week, past submitted reports maintain their original `snapshotTemplate`, guaranteeing historical integrity without data loss or column mismatches.

### 2.3 Up-to-4-Week Comparison Engine
- Users or Admins can select 2, 3, or 4 report IDs for comparison.
- The comparison utility aligns sections and columns based on `snapshotTemplate`.
- **Metrics Calculated**:
  - **Column Totals:** Sum of numeric columns per section for each week.
  - **Difference Margin (Delta %):** Calculated as `((Current - Previous) / Previous) * 100` with visual badges (`+15%` green, `-8%` red, `0%` neutral).
  - **4-Week Average:** Mean value across the selected weeks.

### 2.4 Monthly Packaging & Cross-Month Analytics
- **Monthly Compiler:** A utility compiles all submitted `weeklyReports` for a given month (`month` index 1–12) into a `monthlyPackage` document.
- **Cross-Month Comparison:** Users or Admins can compare any two or more compiled months (e.g. August vs October) side-by-side, comparing monthly totals and weekly averages per section.

### 2.5 Admin Control & Oversight
- Admins have access to a **Staff Reporting Matrix** showing every staff member's submission status for any chosen week.
- Admins can trigger a **Late Unlock** for staff members who missed the Monday deadline.
- Admins can inspect and compare reports for any individual staff member.

---

## 3. UI Component Architecture

1. `src/components/dashboard/ReportingTab.tsx`
   - Main entry tab for the Reporting system in BCAM dashboard.
   - Sub-navigation: **My Active Report**, **History & Comparison**, **Monthly Packages**, **Admin Supervision** (Admins only).

2. `src/components/dashboard/reporting/ReportEditor.tsx`
   - Interactive multi-column table grid for section-by-section row entry.
   - Dynamic row addition/deletion, type validation (numbers, currency, text), and auto-save draft functionality.

3. `src/components/dashboard/reporting/TemplateCustomizerModal.tsx`
   - Modal allowing staff to manage personal sections and add custom columns.

4. `src/components/dashboard/reporting/WeeklyComparisonView.tsx`
   - Side-by-side grid layout for up to 4 weeks.
   - Includes column totals, average summary cards, and delta variance indicators.

5. `src/components/dashboard/reporting/MonthlyComparisonView.tsx`
   - Side-by-side comparison view for compiled monthly packages (e.g., August vs October).

6. `src/components/dashboard/reporting/AdminReportingMatrix.tsx`
   - Matrix view for Admins showing staff list, submission statuses, late unlock trigger, and user report inspector.

---

## 4. Security & Access Control (Firestore Rules)

- **Templates**:
  - `global_admin`: Read by all authenticated users; Write by Admins only.
  - `{userId}`: Read and write by owner (`request.auth.uid == userId`) or Admin.
- **Weekly Reports**:
  - Read: Owner or Admin.
  - Write: Owner (if status is `DRAFT` or `LATE_UNLOCKED` and deadline valid) or Admin.
- **Monthly Packages**:
  - Read: Owner or Admin.
  - Write: System compiler or Admin.
- **Late Unlocks**:
  - Read: Owner or Admin.
  - Write: Admin only.

---

## 5. Verification & Testing Strategy

1. **Unit & Rule Tests (`vitest`)**:
   - Verify Firestore Security Rules for report submissions, template modifications, and admin overrides.
   - Test mathematical functions for column totals, averages, and percentage deltas.
2. **E2E Integration Tests (`playwright`)**:
   - Test staff template customization and weekly report entry.
   - Test submitting a report, snapshot freezing, and 4-week side-by-side comparison.
   - Test monthly compilation and month-vs-month comparison.
   - Test Admin matrix view and late submission unlock flow.
