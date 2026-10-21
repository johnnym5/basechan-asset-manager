# System-Wide Optimization & Adaptive UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Execute system-wide optimizations for BCAM to deliver sub-second startup speed, IndexedDB Firestore offline caching, dynamic tab code splitting, hardware-accelerated transitions, container-query adaptive grids, and touch-friendly mobile bottom sheets.

**Architecture:** Configure Firestore's `persistentLocalCache` for multi-tab IndexedDB storage. Split monolithic tab and modal imports in `src/app/page.tsx` using `next/dynamic` with `DashboardSkeleton` fallbacks. Unify modal components with a new responsive drawer engine (`ResponsiveModal.tsx`) and apply Tailwind container queries (`@container`) with CSS `content-visibility` virtualization to dense data grids.

**Tech Stack:** Next.js 14 (App Router), React 18, Tailwind CSS v3, Framer Motion v14, Lucide React, Firebase Firestore.

**Spec:** [2026-03-31-system-wide-optimization-design.md](file:///C:/Users/HP/Documents/CODING/BCAM/docs/superpowers/specs/2026-03-31-system-wide-optimization-design.md)

## Global Constraints

- Must maintain 100% backward compatibility with Firebase Firestore security rules and authentication context.
- Must pass `npm run typecheck` cleanly with zero TypeScript errors.
- Must pass `npm run build` static export build without errors.
- Mobile viewport (<640px) modals must convert into touch bottom sheets; desktop viewports (≥640px) must retain centered dialogs.

## Review Focus

- **Offline Firestore Persistence**: Multiple tabs opening simultaneously must not throw `already initialized` or tab synchronization locks.
- **Dynamic Import Skeleton Hydration**: Rapid tab switching between dynamically imported tabs must render `DashboardSkeleton` without React key warnings or layout shift.
- **Mobile Drawer Dismissal**: Tapping backdrop or closing drawer must reset body overflow and Framer Motion state cleanly.
- **Table Virtualization**: Scrolling long tables with CSS `content-visibility: auto` must not lose search filtering state or jump scroll position.
- **SheetJS (`xlsx`) Bundle Splitting**: Initial page bundle must not include `xlsx` code until spreadsheet ingestion or export is initiated.

---

### Task 1: Enable Firestore IndexedDB Persistent Local Cache

**Files:**
- Modify: `src/lib/firebase.ts:1-40`

**Interfaces:**
- Consumes: `@firebase/firestore` (`initializeFirestore`, `persistentLocalCache`, `persistentMultipleTabManager`)
- Produces: `db` initialized with multi-tab persistent IndexedDB local cache.

- [ ] **Step 1: Check existing `firebase.ts` export**

Ensure `db` is initialized using `initializeFirestore` with `persistentLocalCache`.

- [ ] **Step 2: Modify `src/lib/firebase.ts` to configure IndexedDB multi-tab cache**

Update `src/lib/firebase.ts`:
```typescript
import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});
```

- [ ] **Step 3: Run TypeScript typecheck to verify**

Run: `npm run typecheck`  
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/lib/firebase.ts
git commit -m "perf: enable Firestore IndexedDB persistent local cache with multi-tab manager"
```

---

### Task 2: Build Reusable Responsive Modal / Drawer Engine (`ResponsiveModal.tsx`)

**Files:**
- Create: `src/components/ui/ResponsiveModal.tsx`

**Interfaces:**
- Consumes: Framer Motion `motion`, `AnimatePresence`, Lucide `X`
- Produces: `ResponsiveModal` component accepting `isOpen`, `onClose`, `title`, `subtitle`, `children`, `footer`, `maxWidth`.

- [ ] **Step 1: Create `src/components/ui/ResponsiveModal.tsx`**

Implement `ResponsiveModal` with bottom drawer for mobile (`<640px`) and centered dialog for desktop (`≥640px`).

```tsx
"use client";

import React, { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

export interface ResponsiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl";
}

export function ResponsiveModal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidth = "lg",
}: ResponsiveModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const getMaxWidthClass = () => {
    switch (maxWidth) {
      case "sm": return "sm:max-w-sm";
      case "md": return "sm:max-w-md";
      case "lg": return "sm:max-w-lg";
      case "xl": return "sm:max-w-xl";
      case "2xl": return "sm:max-w-2xl";
      case "3xl": return "sm:max-w-3xl";
      case "4xl": return "sm:max-w-4xl";
      default: return "sm:max-w-lg";
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm"
          />

          <motion.div
            initial={{ y: "100%", opacity: 0.5 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 320 }}
            className={`relative z-10 w-full max-h-[90vh] sm:max-h-[85vh] flex flex-col bg-slate-900 border border-slate-800 text-slate-100 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden ${getMaxWidthClass()}`}
          >
            {/* Mobile Handle Bar */}
            <div className="sm:hidden flex justify-center pt-2.5 pb-1">
              <div className="w-12 h-1.5 rounded-full bg-slate-700/80" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800/80 bg-slate-900/90">
              <div>
                <h3 className="text-lg font-bold text-slate-100">{title}</h3>
                {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5">{children}</div>

            {/* Footer */}
            {footer && (
              <div className="px-5 py-3.5 bg-slate-950/70 border-t border-slate-800/80 flex items-center justify-end gap-3">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`  
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/ResponsiveModal.tsx
git commit -m "feat: add ResponsiveModal component for touch mobile drawers and desktop dialogs"
```

---

### Task 3: Refactor Core Modal Dialogs to Use `ResponsiveModal`

**Files:**
- Modify: `src/components/modals/AssetDetailModal.tsx`
- Modify: `src/components/modals/AssetEditModal.tsx`
- Modify: `src/components/modals/StaffDetailModal.tsx`
- Modify: `src/components/modals/FacilityDetailModal.tsx`
- Modify: `src/components/modals/WorkbookDetailModal.tsx`
- Modify: `src/components/modals/ConfirmModal.tsx`

**Interfaces:**
- Consumes: `ResponsiveModal` from `@/components/ui/ResponsiveModal`
- Produces: Modal components wrapped in `ResponsiveModal`.

- [ ] **Step 1: Refactor `AssetDetailModal.tsx`**

Replace outer fixed backdrop and card wrapper with `<ResponsiveModal isOpen={isOpen} onClose={onClose} title={asset.modelName} subtitle={asset.assetTag}>`.

- [ ] **Step 2: Refactor `AssetEditModal.tsx`**

Replace custom backdrop wrapper with `<ResponsiveModal isOpen={isOpen} onClose={onClose} title={isEdit ? "Edit Asset" : "New Physical Asset"}>`.

- [ ] **Step 3: Refactor `StaffDetailModal.tsx`, `FacilityDetailModal.tsx`, `WorkbookDetailModal.tsx`, and `ConfirmModal.tsx`**

Replace custom backdrop wrappers across these modals with `<ResponsiveModal>`.

- [ ] **Step 4: Run typecheck to verify interface signatures**

Run: `npm run typecheck`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/modals/
git commit -m "refactor: integrate ResponsiveModal across core asset, staff, facility, and workbook modals"
```

---

### Task 4: Implement Dynamic Code Splitting for Dashboard Tabs & Modals

**Files:**
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `next/dynamic`, `DashboardSkeleton` from `@/components/ui/LoadingStates`
- Produces: Dynamically imported tab and heavy modal components in `page.tsx`.

- [ ] **Step 1: Update tab imports in `src/app/page.tsx`**

Replace synchronous imports for dashboard tabs (`HardwareTab`, `MissingDetailsTab`, `CredentialsTab`, `WorkbooksTab`, `FacilitiesTab`, `StaffDirectoryTab`, `IngestionTab`, `StocktakeTab`, `TaskInboxTab`, `WorkspaceTab`, `ReportingTab`, `PersonalHomeTab`) with `dynamic()`:

```typescript
import dynamic from "next/dynamic";
import { DashboardSkeleton } from "@/components/ui/LoadingStates";

const HardwareTab = dynamic(() => import("@/components/dashboard/HardwareTab").then((m) => m.HardwareTab), {
  loading: () => <DashboardSkeleton />,
  ssr: false,
});

const MissingDetailsTab = dynamic(() => import("@/components/dashboard/MissingDetailsTab").then((m) => m.MissingDetailsTab), {
  loading: () => <DashboardSkeleton />,
  ssr: false,
});

const CredentialsTab = dynamic(() => import("@/components/dashboard/CredentialsTab").then((m) => m.CredentialsTab), {
  loading: () => <DashboardSkeleton />,
  ssr: false,
});

const WorkbooksTab = dynamic(() => import("@/components/dashboard/WorkbooksTab").then((m) => m.WorkbooksTab), {
  loading: () => <DashboardSkeleton />,
  ssr: false,
});

const FacilitiesTab = dynamic(() => import("@/components/dashboard/FacilitiesTab").then((m) => m.FacilitiesTab), {
  loading: () => <DashboardSkeleton />,
  ssr: false,
});

const StaffDirectoryTab = dynamic(() => import("@/components/dashboard/StaffDirectoryTab").then((m) => m.StaffDirectoryTab), {
  loading: () => <DashboardSkeleton />,
  ssr: false,
});

const IngestionTab = dynamic(() => import("@/components/dashboard/IngestionTab").then((m) => m.IngestionTab), {
  loading: () => <DashboardSkeleton />,
  ssr: false,
});

const StocktakeTab = dynamic(() => import("@/components/dashboard/StocktakeTab").then((m) => m.StocktakeTab), {
  loading: () => <DashboardSkeleton />,
  ssr: false,
});

const TaskInboxTab = dynamic(() => import("@/components/dashboard/TaskInboxTab").then((m) => m.TaskInboxTab), {
  loading: () => <DashboardSkeleton />,
  ssr: false,
});

const WorkspaceTab = dynamic(() => import("@/components/dashboard/WorkspaceTab").then((m) => m.WorkspaceTab), {
  loading: () => <DashboardSkeleton />,
  ssr: false,
});

const ReportingTab = dynamic(() => import("@/components/dashboard/ReportingTab").then((m) => m.ReportingTab), {
  loading: () => <DashboardSkeleton />,
  ssr: false,
});

const PersonalHomeTab = dynamic(() => import("@/components/dashboard/PersonalHomeTab").then((m) => m.PersonalHomeTab), {
  loading: () => <DashboardSkeleton />,
  ssr: false,
});
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`  
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "perf: dynamically import dashboard tabs with skeleton loading fallbacks"
```

---

### Task 5: Motion Hardware Acceleration & SheetJS Isolation

**Files:**
- Modify: `src/app/page.tsx:30-80`
- Modify: `src/lib/excelParser.ts:1-20`

**Interfaces:**
- Consumes: Framer Motion `TAB_PAGE_VARIANTS`
- Produces: Optimized motion variants without CSS blur filters and lazy SheetJS loader.

- [ ] **Step 1: Replace `TAB_PAGE_VARIANTS` blur filter in `src/app/page.tsx`**

Update `TAB_PAGE_VARIANTS`:
```typescript
const TAB_PAGE_VARIANTS: Variants = {
  initial: (custom: { direction: number; isMobile: boolean }) => ({
    opacity: 0,
    x: custom.isMobile ? custom.direction * 35 : 0,
    y: custom.isMobile ? 0 : custom.direction * 25,
    scale: 0.99,
  }),
  animate: {
    opacity: 1,
    x: 0,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.25,
      ease: [0.16, 1, 0.3, 1] as const,
    },
  },
  exit: (custom: { direction: number; isMobile: boolean }) => ({
    opacity: 0,
    x: custom.isMobile ? -custom.direction * 35 : 0,
    y: custom.isMobile ? 0 : -custom.direction * 25,
    scale: 0.99,
    transition: {
      duration: 0.18,
      ease: [0.7, 0, 0.84, 0] as const,
    },
  }),
};
```

- [ ] **Step 2: Isolate `xlsx` import in `src/lib/excelParser.ts`**

Change top-level `import * as XLSX from "xlsx"` to dynamic import function `const getXLSX = async () => import("xlsx")` inside parsing functions (`parseAssetWorkbook`, `exportToExcel`).

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`  
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx src/lib/excelParser.ts
git commit -m "perf: hardware accelerate page transitions and isolate SheetJS xlsx import"
```

---

### Task 6: Apply Container Queries (`@container`), Table Virtualization & Debounced Search

**Files:**
- Modify: `src/components/dashboard/HardwareTab.tsx`
- Modify: `src/components/dashboard/StaffDirectoryTab.tsx`
- Modify: `src/components/dashboard/FacilitiesTab.tsx`

**Interfaces:**
- Consumes: CSS `@container`, `content-visibility: auto`
- Produces: Responsive adaptive grid views and DOM virtualized table lists.

- [ ] **Step 1: Update `HardwareTab.tsx` grid wrapper with `@container`**

Add `@container` class to parent container div and use `@sm:grid-cols-2 @lg:grid-cols-3 @2xl:grid-cols-4` for card grid layout. Add `style={{ contentVisibility: "auto", containIntrinsicSize: "0 120px" }}` to table rows map.

- [ ] **Step 2: Update `StaffDirectoryTab.tsx` and `FacilitiesTab.tsx` with container queries and table row content visibility**

Add container query utility classes and `contentVisibility: auto` inline styles to row item maps.

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`  
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/HardwareTab.tsx src/components/dashboard/StaffDirectoryTab.tsx src/components/dashboard/FacilitiesTab.tsx
git commit -m "style(perf): apply container queries and CSS row virtualization across dashboard tabs"
```

---

### Task 7: Full System Build & Typecheck Verification

**Files:**
- None (Build & Validation Task)

- [ ] **Step 1: Run TypeScript typecheck**

Run: `npm run typecheck`  
Expected: PASS

- [ ] **Step 2: Run Next.js static build**

Run: `npm run build`  
Expected: Clean build output with dynamic JS chunks for dashboard tabs.

- [ ] **Step 3: Final Commit**

```bash
git commit --allow-empty -m "chore(release): complete system-wide optimization and adaptive UI enhancements"
```
