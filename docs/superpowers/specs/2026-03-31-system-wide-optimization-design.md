# BCAM System-Wide Optimization & Adaptive UI Design Specification

**Date**: 2026-03-31  
**Project**: Basechan Enterprise Asset Manager (BCAM)  
**Status**: Approved  

---

## 1. Overview & Objectives

This specification outlines the technical design for a comprehensive system-wide performance, caching, bundle size, and responsive UI optimization for BCAM.

### Key Goals
1. **Sub-second Initial Load Speed**: Eliminate initial startup render delays across all devices.
2. **Offline-First Persistence**: Enable multi-tab IndexedDB Firestore local cache persistence for zero-latency startups and offline functionality.
3. **Adaptive UI Engine**: Provide fluid container-query layout adaptations and a unified responsive drawer/modal component (bottom drawers on mobile `<640px`, centered modals on desktop/tablet `≥640px`).
4. **Bundle & DOM Optimization**: Decouple monolithic imports in `src/app/page.tsx` via `next/dynamic` code splitting, hardware-accelerate page transitions, and virtualize large data tables.

---

## 2. Architecture & Data Layer (Firestore Caching & Data Fetching)

### 2.1 Firestore IndexedDB Persistence
- **File**: `src/lib/firebase.ts`
- **Implementation**:
  - Configure `initializeFirestore` with `persistentLocalCache` and `persistentMultipleTabManager`.
  - Enables browser-level local caching in IndexedDB. Cached query snapshots load instantly from local storage while syncing remote changes in the background.

```typescript
import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from "firebase/firestore";

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});
```

### 2.2 Incremental Active-Tab Data Loader
- **File**: `src/app/page.tsx`
- **Strategy**:
  - **Phase 1 (Critical)**: On mount, load user profile, `access_grants`, and the active tab's primary dataset (`physical_assets` for hardware, etc.).
  - **Phase 2 (Lazy / Idle)**: Load remaining collections (`staff_inventory`, `digital_credentials`, `workbooks`, `facilities`, `tasks`, `stocktake_rounds`, `workspace_links`) in background idle callbacks via `requestIdleCallback` or when hovering over/switching to that tab.

---

## 3. Code Splitting & Bundle Optimization

### 3.1 Dynamic Tab & Modal Imports
- **File**: `src/app/page.tsx` & modal sites
- **Strategy**:
  - Convert heavy dashboard tab components (`HardwareTab`, `MissingDetailsTab`, `CredentialsTab`, `WorkbooksTab`, `FacilitiesTab`, `StaffDirectoryTab`, `IngestionTab`, `StocktakeTab`, `TaskInboxTab`, `WorkspaceTab`, `ReportingTab`, `PersonalHomeTab`) to dynamic imports using `next/dynamic`.
  - Provide skeleton fallbacks (`DashboardSkeleton`) during chunk loading.
  - Dynamically import heavy modals (`AssetEditModal`, `AssetDetailModal`, `StaffDetailModal`, `FacilityDetailModal`, `WorkbookDetailModal`, `TemplateCustomizerModal`, `ReportEditor`, `AdminReportingMatrix`) on demand.

### 3.2 SheetJS (`xlsx`) Isolation
- **File**: `src/lib/excelParser.ts`
- **Strategy**: Isolate `xlsx` package import inside dynamic `import("xlsx")` calls so it only downloads when spreadsheet parsing/exporting is triggered.

### 3.3 Hardware-Accelerated Motion Transforms
- **File**: `src/app/page.tsx` (`TAB_PAGE_VARIANTS`)
- **Fix**: Remove GPU-heavy SVG/CSS blur filters (`filter: "blur(6px)"`). Replace with compositing-only hardware transforms (`opacity`, `transform: translate3d(x, y, 0)`, `scale`).

---

## 4. Adaptive UI Engine & Virtualization

### 4.1 Responsive Drawer / Modal Engine
- **New Component**: `src/components/ui/ResponsiveModal.tsx`
- **Strategy**:
  - Reusable wrapper component for all modal dialogs.
  - **Mobile (`<640px`)**: Renders slide-up bottom drawer with touch drag indicator, sticky top header, scrollable body (`max-h-[85vh]`), and sticky bottom action buttons.
  - **Desktop / Tablet (`≥640px`)**: Renders centered backdrop modal dialog.
  - Refactor all existing modals (`AssetEditModal`, `AssetDetailModal`, `StaffDetailModal`, `FacilityDetailModal`, `WorkbookDetailModal`, `AssignTaskModal`, `CustodyTransferModal`, `RecordEditorModal`, `RevealPasswordModal`, `ConfirmModal`) to wrap `ResponsiveModal`.

### 4.2 Container Queries (`@container`)
- **Files**: `HardwareTab.tsx`, `FacilitiesTab.tsx`, `StaffDirectoryTab.tsx`, `CredentialsTab.tsx`, `WorkbooksTab.tsx`
- **Strategy**:
  - Add `@container` to grid wrappers.
  - Use `@sm:grid-cols-2`, `@lg:grid-cols-3`, `@2xl:grid-cols-4` container query utility classes so card grids re-flow based on available parent panel width rather than global viewport size.

### 4.3 DOM Virtualization & Debounced Search Inputs
- **Files**: `HardwareTab.tsx`, `StaffDirectoryTab.tsx`, `FacilitiesTab.tsx`
- **Strategy**:
  - Apply CSS `content-visibility: auto` and `contain-intrinsic-size: 100px` to dense list row mappings.
  - Use debounced search filter inputs (`250ms`) across table search bars to eliminate synchronous per-keystroke re-renders.

---

## 5. Verification Plan

### Automated Tests
- `npm run typecheck`: Ensure TypeScript compilation succeeds without errors.
- `npm run lint`: Verify ESLint compliance.
- `npm run build`: Verify production Next.js static build succeeds with clean output chunks.

### Manual Verification
- Test initial page load speed in browser dev tools (Network / Performance tab).
- Test offline mode by toggling browser offline state in DevTools; verify cached records load instantly.
- Test mobile viewports (<640px) to verify bottom drawer behavior for asset modals and touch responsiveness.
- Test desktop viewports to verify centered dialog popups and multi-column container query grid reflow.
