# Staff Weekly & Monthly Reporting System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Staff Weekly & Monthly Reporting System in BCAM allowing staff to manage weekly reports with dynamic multi-column templates, snapshot template headers on submit, compare up to 4 weeks side-by-side with variance deltas (+/- %), aggregate monthly packages, and allow Admins to manage staff submissions and unlocks.

**Architecture:** Firestore collections (`reportTemplates`, `weeklyReports`, `monthlyPackages`, `lateUnlockRequests`), pure TypeScript reporting utilities for ISO week calculations, template merging, numeric total/average calculations, percentage delta math, and monthly aggregations, along with a modular React dashboard tab (`ReportingTab`) housing specialized sub-views (`ReportEditor`, `WeeklyComparisonView`, `MonthlyComparisonView`, `AdminReportingMatrix`).

**Tech Stack:** Next.js 14, React 18, TypeScript 5, Firebase Firestore, Tailwind CSS, Lucide React icons, Vitest, Playwright.

**Spec:** [docs/superpowers/specs/2025-03-05-staff-reporting-system-design.md](file:///C:/Users/HP/Documents/CODING/BCAM/docs/superpowers/specs/2025-03-05-staff-reporting-system-design.md)

---

## Global Constraints

- **Language & Framework:** TypeScript 5, Next.js 14 App Router, React 18.
- **Styling:** Tailwind CSS with dark mode variables (`bg-[var(--bg-surface)]`, `text-[var(--text-primary)]`, `border-[var(--border)]`).
- **Icons:** `lucide-react` icons (`FileText`, `Plus`, `Trash2`, `Lock`, `Unlock`, `Calendar`, `TrendingUp`, `TrendingDown`, `Columns`).
- **State & Data:** Firebase Firestore for database state, `AuthContext` for user identity and role verification.
- **Weekly Deadline:** Monday 23:59 submission window.

---

## Review Focus

1. **Division-by-Zero in Delta Percentage Math:** Previous value = 0 when computing `((Current - Previous) / Previous) * 100` must safely return `100%` if Current > 0 or `0%` if Current = 0 without producing `Infinity%` or `NaN%`.
2. **Missing or Mismatched Snapshot Templates:** Legacy or unsubmitted reports with missing snapshot templates must fall back seamlessly to current merged templates without throwing runtime exceptions.
3. **Empty Numeric Table Cells:** Blank text in numeric table columns (`""` or `undefined`) must parse safely as `0` without corrupting column total sums or averages.
4. **Admin Cross-User Scope Isolation:** Admins viewing or comparing reports must retain per-user template alignment so staff member A's custom headers do not bleed into staff member B's comparison matrix.
5. **Month Transition Boundaries:** ISO weeks spanning two months (e.g. week starting March 30th and ending April 5th) must map accurately to the primary month index determined by the week's Monday.

---

## Task 1: Core Reporting Types & Pure Logic Utility Functions

**Files:**
- Create: `src/types/reporting.ts`
- Create: `src/lib/reportingUtils.ts`
- Create: `tests/reportingUtils.test.ts`

**Interfaces:**
- Consumes: None
- Produces:
  - `ReportColumnDef`, `ReportSectionDef`, `ReportTemplate`, `WeeklyReport`, `MonthlyPackage`, `LateUnlockRequest`, `ReportComparisonResult` in `src/types/reporting.ts`
  - `getISOWeekDetails(date: Date)`
  - `mergeTemplates(globalAdmin: ReportSectionDef[], userCustom: ReportSectionDef[])`
  - `calculateSectionTotals(rows: Array<Record<string, any>>, columns: ReportColumnDef[])`
  - `calculatePercentageDelta(current: number, previous: number)`
  - `compareWeeklyReports(reports: WeeklyReport[])`
  - `compileMonthlyPackage(userId: string, userName: string, year: number, month: number, weeklyReports: WeeklyReport[])`

- [ ] **Step 1: Write the failing tests for reporting utilities**

Create `tests/reportingUtils.test.ts` testing:
- `getISOWeekDetails`: Calculates correct year, month, week number, Monday start date, and Sunday end date.
- `mergeTemplates`: Merges global mandatory sections with user custom sections while preserving order and column definitions.
- `calculateSectionTotals`: Parses string/numeric values, safely ignoring empty strings, and computes correct column sums.
- `calculatePercentageDelta`: Handles normal changes (`100` -> `150` = `+50%`), decrease (`100` -> `50` = `-50%`), zero baseline (`0` -> `50` = `+100%`), and zero current (`0` -> `0` = `0%`).
- `compareWeeklyReports`: Merges snapshot templates across up to 4 reports and calculates column averages and percentage deltas.
- `compileMonthlyPackage`: Groups weekly report rows, calculates total sums across weeks, and derives weekly averages per column.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/reportingUtils.test.ts`
Expected: FAIL with "Cannot find module '../src/types/reporting' or '../src/lib/reportingUtils'"

- [ ] **Step 3: Define TypeScript interfaces in `src/types/reporting.ts`**

Define exported interfaces:
```typescript
export type ColumnType = "text" | "number" | "currency" | "date";

export interface ReportColumnDef {
  key: string;
  label: string;
  type: ColumnType;
  isCalculatedTotal?: boolean;
}

export interface ReportSectionDef {
  id: string;
  title: string;
  isRequired?: boolean;
  columns: ReportColumnDef[];
}

export interface ReportTemplate {
  userId: string | null;
  sections: ReportSectionDef[];
  updatedAt?: any;
  updatedBy?: string;
}

export interface WeeklyReport {
  id: string;
  userId: string;
  userName: string;
  year: number;
  month: number;
  weekNumber: number;
  weekStartDate: string;
  weekEndDate: string;
  status: "DRAFT" | "SUBMITTED" | "OVERDUE" | "LATE_UNLOCKED";
  submittedAt?: any;
  snapshotTemplate: ReportSectionDef[];
  data: Record<string, Array<Record<string, any>>>;
  totals?: Record<string, Record<string, number>>;
}

export interface MonthlyPackage {
  id: string;
  userId: string;
  userName: string;
  year: number;
  month: number;
  compiledAt: any;
  includedWeeklyReportIds: string[];
  sectionSummaries: Record<string, {
    columnTotals: Record<string, number>;
    columnAverages: Record<string, number>;
    rowCount: number;
  }>;
}

export interface LateUnlockRequest {
  id: string;
  userId: string;
  weekIdentifier: string;
  grantedBy: string;
  grantedAt: any;
  expiresAt: any;
  status: "ACTIVE" | "USED" | "EXPIRED";
}

export interface ReportComparisonResult {
  alignedSections: Array<{
    sectionId: string;
    sectionTitle: string;
    columns: ReportColumnDef[];
    reportsData: Array<{
      reportId: string;
      weekLabel: string;
      rows: Array<Record<string, any>>;
      totals: Record<string, number>;
    }>;
    columnAverages: Record<string, number>;
    columnDeltas: Record<string, number>; // percentage changes from oldest to newest
  }>;
}
```

- [ ] **Step 4: Implement utility functions in `src/lib/reportingUtils.ts`**

Implement `getISOWeekDetails`, `mergeTemplates`, `calculateSectionTotals`, `calculatePercentageDelta`, `compareWeeklyReports`, and `compileMonthlyPackage`.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/reportingUtils.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/types/reporting.ts src/lib/reportingUtils.ts tests/reportingUtils.test.ts
git commit -m "feat(reporting): add core types and reporting utility logic"
```

---

## Task 2: Access Control & Sidebar Navigation Integration

**Files:**
- Modify: `src/types/assets.ts`
- Modify: `src/lib/accessControl.ts`
- Modify: `src/components/layout/Sidebar.tsx`

**Interfaces:**
- Consumes: `PageAccess` in `src/lib/accessControl.ts`
- Produces: Updated `TabKey` and `PageAccess` types supporting `"reporting"`

- [ ] **Step 1: Update `ResourceKey` and `TabKey` types**

In `src/types/assets.ts`:
Add `"reporting"` to `ResourceKey` if applicable.

In `src/lib/accessControl.ts`:
- Update `PageAccess` type to include `reporting: boolean`.
- Update `accessiblePages()` to set `reporting: true` for all authenticated users (`SUPER_ADMIN` and `STAFF`).

In `src/components/layout/Sidebar.tsx`:
- Add `"reporting"` to `TabKey` type definition.
- Add `{ key: "reporting" as TabKey, label: "Staff Reports", icon: FileText }` to `navigationItems`.

- [ ] **Step 2: Verify TypeScript compilation**

Run: `npm run typecheck`
Expected: PASS with 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/types/assets.ts src/lib/accessControl.ts src/components/layout/Sidebar.tsx
git commit -m "feat(reporting): register reporting tab in sidebar and page access controls"
```

---

## Task 3: Template Management & Customizer Modal

**Files:**
- Create: `src/components/dashboard/reporting/TemplateCustomizerModal.tsx`
- Create: `src/lib/reportingService.ts`

**Interfaces:**
- Consumes: `ReportTemplate`, `ReportSectionDef`, `ReportColumnDef` from `src/types/reporting.ts`
- Produces:
  - `fetchUserTemplate(userId: string)`
  - `saveUserTemplate(userId: string, template: ReportSectionDef[], updatedBy: string)`
  - `fetchGlobalAdminTemplate()`
  - `saveGlobalAdminTemplate(template: ReportSectionDef[], updatedBy: string)`
  - `<TemplateCustomizerModal />` component

- [ ] **Step 1: Create Firestore service methods in `src/lib/reportingService.ts`**

Implement Firestore operations for reading and writing `reportTemplates/global_admin` and `reportTemplates/{userId}` using `db` from `@/lib/firebase`.

- [ ] **Step 2: Create `<TemplateCustomizerModal />` UI component**

Implement the template editor modal where staff/admins can:
- View mandatory admin sections (disabled delete/move).
- Add new custom sections with custom titles.
- Add/remove columns with specified types (`text`, `number`, `currency`, `date`).
- Save changes, updating `reportTemplates/{userId}` in Firestore.

- [ ] **Step 3: Commit**

```bash
git add src/lib/reportingService.ts src/components/dashboard/reporting/TemplateCustomizerModal.tsx
git commit -m "feat(reporting): add template customizer modal and Firestore template service"
```

---

## Task 4: Interactive Weekly Report Editor & Submission Workflow

**Files:**
- Create: `src/components/dashboard/reporting/ReportEditor.tsx`
- Modify: `src/lib/reportingService.ts`

**Interfaces:**
- Consumes: `WeeklyReport`, `ReportSectionDef` from `src/types/reporting.ts`, service functions from `src/lib/reportingService.ts`
- Produces:
  - `fetchWeeklyReport(userId: string, year: number, weekNumber: number)`
  - `saveWeeklyReportDraft(report: Partial<WeeklyReport>)`
  - `submitWeeklyReport(reportId: string, mergedTemplate: ReportSectionDef[], data: Record<string, any[]>)`
  - `<ReportEditor />` component

- [ ] **Step 1: Add report draft & submit functions in `src/lib/reportingService.ts`**

Implement `fetchWeeklyReport`, `saveWeeklyReportDraft`, and `submitWeeklyReport` with automatic snapshot template freezing.

- [ ] **Step 2: Build `<ReportEditor />` UI component**

Implement:
- Header displaying current week range (e.g. "Week 10: Mar 3, 2025 – Mar 9, 2025") and submission status badge (`Draft`, `Submitted`, `Overdue`).
- Render table grid per section.
- Support adding/deleting rows per table section.
- Auto-calculate live section column totals at the bottom of numeric columns.
- Auto-save draft debounced or on change.
- "Submit Report" button that confirms submission and freezes the report structure.

- [ ] **Step 3: Commit**

```bash
git add src/lib/reportingService.ts src/components/dashboard/reporting/ReportEditor.tsx
git commit -m "feat(reporting): implement interactive weekly report editor with live section totals and submission freeze"
```

---

## Task 5: Up-to-4-Week Side-by-Side Comparison Matrix Component

**Files:**
- Create: `src/components/dashboard/reporting/WeeklyComparisonView.tsx`

**Interfaces:**
- Consumes: `compareWeeklyReports` from `src/lib/reportingUtils.ts`, `WeeklyReport` from `src/types/reporting.ts`
- Produces: `<WeeklyComparisonView />` component

- [ ] **Step 1: Create `<WeeklyComparisonView />` component**

Implement:
- Multi-week selector (checkboxes or dropdown) allowing users to pick up to 4 past or current submitted weekly reports.
- Aligned grid display showing up to 4 weeks side-by-side per section.
- Summary cards at the top showing overall section totals, 4-week averages, and percentage delta badges (`+12.5%` green, `-5%` red).
- Highlight changed cell values across consecutive weeks.

- [ ] **Step 2: Commit**

```bash
git add src/components/dashboard/reporting/WeeklyComparisonView.tsx
git commit -m "feat(reporting): add up-to-4-week side-by-side comparison matrix component"
```

---

## Task 6: Monthly Compilation & Cross-Month Comparison Engine

**Files:**
- Create: `src/components/dashboard/reporting/MonthlyComparisonView.tsx`
- Modify: `src/lib/reportingService.ts`

**Interfaces:**
- Consumes: `compileMonthlyPackage` from `src/lib/reportingUtils.ts`, `MonthlyPackage` from `src/types/reporting.ts`
- Produces:
  - `fetchMonthlyPackage(userId: string, year: number, month: number)`
  - `generateMonthlyPackage(userId: string, userName: string, year: number, month: number)`
  - `<MonthlyComparisonView />` component

- [ ] **Step 1: Add monthly package service functions in `src/lib/reportingService.ts`**

Implement `fetchMonthlyPackage` and `generateMonthlyPackage`.

- [ ] **Step 2: Build `<MonthlyComparisonView />` component**

Implement:
- Month selector to view compiled monthly packages.
- Cross-month comparison drawer to compare two or more months (e.g., August vs October).
- Summary grid showing weekly averages, total accumulated output, and net variance between selected months.

- [ ] **Step 3: Commit**

```bash
git add src/lib/reportingService.ts src/components/dashboard/reporting/MonthlyComparisonView.tsx
git commit -m "feat(reporting): implement monthly compilation service and cross-month comparison view"
```

---

## Task 7: Admin Supervision Dashboard & Late Submission Unlock System

**Files:**
- Create: `src/components/dashboard/reporting/AdminReportingMatrix.tsx`
- Modify: `src/lib/reportingService.ts`

**Interfaces:**
- Consumes: `LateUnlockRequest` from `src/types/reporting.ts`, `UserProfile` from `src/types/assets.ts`
- Produces:
  - `grantLateUnlock(userId: string, weekIdentifier: string, adminUid: string)`
  - `fetchAllStaffReportingStatus(year: number, weekNumber: number)`
  - `<AdminReportingMatrix />` component

- [ ] **Step 1: Add late unlock service methods in `src/lib/reportingService.ts`**

Implement `grantLateUnlock` and `fetchAllStaffReportingStatus`.

- [ ] **Step 2: Build `<AdminReportingMatrix />` component**

Implement:
- Staff submission matrix table showing all staff members, their department, branch, and status for the chosen week (`Submitted`, `Draft`, `Overdue`).
- "Grant Late Unlock" action button next to overdue staff members allowing 24-hour unlock window.
- Staff report inspector allowing Admins to view and compare reports for any selected staff member.

- [ ] **Step 3: Commit**

```bash
git add src/lib/reportingService.ts src/components/dashboard/reporting/AdminReportingMatrix.tsx
git commit -m "feat(reporting): add admin supervision matrix and late submission unlock system"
```

---

## Task 8: Main Reporting Tab Integration & Comprehensive Verification

**Files:**
- Create: `src/components/dashboard/ReportingTab.tsx`
- Modify: `src/app/page.tsx`
- Create: `tests/reportingIntegration.test.ts`

**Interfaces:**
- Consumes: `<ReportEditor />`, `<WeeklyComparisonView />`, `<MonthlyComparisonView />`, `<AdminReportingMatrix />`
- Produces: Main `<ReportingTab />` container rendered in `src/app/page.tsx` when `activeTab === "reporting"`

- [ ] **Step 1: Create `<ReportingTab />` sub-tab container**

Implement sub-navigation:
1. **My Weekly Report** (`<ReportEditor />`)
2. **Weekly Comparison** (`<WeeklyComparisonView />`)
3. **Monthly Analytics** (`<MonthlyComparisonView />`)
4. **Admin Supervision** (`<AdminReportingMatrix />` - visible if `userProfile.role === "SUPER_ADMIN"`)

- [ ] **Step 2: Wire `ReportingTab` into `src/app/page.tsx`**

Import `ReportingTab` and render it when `activeTab === "reporting"`.

- [ ] **Step 3: Write full integration test in `tests/reportingIntegration.test.ts`**

Write vitest test verifying:
- Complete workflow from template merging -> report entry -> submission -> snapshot freeze -> 4-week comparison -> monthly compilation -> admin late unlock.

- [ ] **Step 4: Run all tests to verify green status**

Run: `npm run test` or `npx vitest run`
Expected: ALL TESTS PASS

- [ ] **Step 5: Run typecheck**

Run: `npm run typecheck`
Expected: PASS with 0 errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/dashboard/ReportingTab.tsx src/app/page.tsx tests/reportingIntegration.test.ts
git commit -m "feat(reporting): integrate reporting tab into main dashboard and verify end-to-end workflow"
```
