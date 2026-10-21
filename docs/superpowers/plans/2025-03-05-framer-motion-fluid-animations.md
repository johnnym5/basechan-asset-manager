# Framer Motion Fluid Animation Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Framer Motion animation system (`src/lib/motion.ts`), and apply tactile spring pop-in/pop-out exit transitions for modals, smooth bottom drawer slide-ins with `AnimatePresence`, sliding tab indicators with `layoutId`, and staggered card entrance reveals across BCAM.

**Architecture:** Framer Motion (`framer-motion`) with native `<AnimatePresence>` for unmount exit animations, layout spring animations (`layoutId`), and custom Framer Motion variants in `src/lib/motion.ts`.

**Tech Stack:** Next.js 14, React 18, `framer-motion`, Tailwind CSS, TypeScript 5, Vitest.

---

## Global Constraints

- **Dependency Addition:** Install `framer-motion`.
- **Framework Floor:** Next.js 14 App Router, React 18 Client Components (`"use client"`).
- **Reduced Motion:** Respect `useReducedMotion()` from `framer-motion`.
- **Exit Transitions:** Wrap all modals and mobile drawers in `<AnimatePresence>` to guarantee smooth exit animations before unmounting.

---

## Review Focus

1. **AnimatePresence Key Placement:** Ensure `<AnimatePresence>` wraps conditionally rendered components (`{isOpen && <motion.div key="modal">...}`) so exit animations execute before unmounting.
2. **Layout Animation Collisions:** Ensure unique `layoutId` string names across components (e.g. `layoutId="activeSubTabPill"`, `layoutId="mobileActiveDockPill"`) to prevent pill animation cross-talk.
3. **Touch Targets & Drag Handles:** Ensure mobile bottom sheet drawers drag smoothly and don't block background clicks when closed.
4. **Zero Reflows:** Use `opacity`, `transform` (`x`, `y`, `scale`), and `layout` prop for GPU acceleration.

---

## Task 1: Framer Motion Utility Presets & Variants Library

**Files:**
- Create: `src/lib/motion.ts`
- Create: `tests/motionUtils.test.ts`

**Interfaces:**
- Consumes: `framer-motion`
- Produces:
  - `SPRING_TRANSITION`: `{ type: "spring", stiffness: 350, damping: 25 }`
  - `MODAL_VARIANTS`: `{ hidden: { opacity: 0, scale: 0.94, y: 12 }, visible: { opacity: 1, scale: 1, y: 0 }, exit: { opacity: 0, scale: 0.95, y: 8 } }`
  - `DRAWER_VARIANTS`: `{ hidden: { y: "100%", opacity: 0.8 }, visible: { y: 0, opacity: 1 }, exit: { y: "100%", opacity: 0 } }`
  - `STAGGER_CONTAINER_VARIANTS`, `STAGGER_ITEM_VARIANTS`

- [ ] **Step 1: Create `src/lib/motion.ts`**

Write Framer Motion spring presets and animation variants:
```typescript
import { Variants, Transition } from "framer-motion";

export const SPRING_TRANSITION: Transition = {
  type: "spring",
  stiffness: 350,
  damping: 25,
};

export const SMOOTH_TRANSITION: Transition = {
  duration: 0.25,
  ease: [0.25, 0.1, 0.25, 1],
};

export const MODAL_BACKDROP_VARIANTS: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

export const MODAL_CONTENT_VARIANTS: Variants = {
  hidden: { opacity: 0, scale: 0.94, y: 12 },
  visible: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.95, y: 8 },
};

export const DRAWER_VARIANTS: Variants = {
  hidden: { y: "100%", opacity: 0.8 },
  visible: { y: 0, opacity: 1 },
  exit: { y: "100%", opacity: 0 },
};

export const STAGGER_CONTAINER_VARIANTS: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

export const STAGGER_ITEM_VARIANTS: Variants = {
  hidden: { opacity: 0, y: 14, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1 },
};
```

- [ ] **Step 2: Create unit test in `tests/motionUtils.test.ts`**

Write test verifying variants export correct target values.

- [ ] **Step 3: Run test**

Run: `npx vitest run tests/motionUtils.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/lib/motion.ts tests/motionUtils.test.ts
git commit -m "feat(motion): add Framer Motion presets, spring transitions, and animation variants"
```

---

## Task 2: Tactile Framer Motion Mobile Glass Dock & Quick Module Drawer (`Sidebar.tsx`)

**Files:**
- Modify: `src/components/layout/Sidebar.tsx`

**Interfaces:**
- Consumes: `<AnimatePresence>`, `<motion.div>`, `DRAWER_VARIANTS`, `SPRING_TRANSITION` from `framer-motion` & `src/lib/motion.ts`
- Produces:
  - Sliding active pill highlight on mobile dock (`layoutId="mobileActiveDockPill"`)
  - Smooth mobile bottom drawer slide-in and slide-out exit animation (`AnimatePresence`)

- [ ] **Step 1: Update `Sidebar.tsx` with Framer Motion**

Wrap `mobileDrawerOpen` in `<AnimatePresence>` and convert mobile nav items to `<motion.button>` with `layoutId="mobileActiveDockPill"`.

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS with 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/Sidebar.tsx
git commit -m "feat(motion): enhance mobile glass dock with Framer Motion layoutId pill and AnimatePresence drawer slide-ins"
```

---

## Task task-3: Liquid Framer Motion Spring Pop-ins for Modals & Dialogs

**Files:**
- Modify: `src/components/dashboard/reporting/TemplateCustomizerModal.tsx`
- Modify: `src/components/modals/AssetDetailModal.tsx`
- Modify: `src/components/modals/AssetEditModal.tsx`
- Modify: `src/components/modals/AssignTaskModal.tsx`
- Modify: `src/components/modals/StaffDetailModal.tsx`

**Interfaces:**
- Consumes: `<AnimatePresence>`, `<motion.div>`, `MODAL_CONTENT_VARIANTS`, `MODAL_BACKDROP_VARIANTS`
- Produces: Spring pop-ins on open, backdrop blur fades, and exit animations

- [ ] **Step 1: Convert modals to Framer Motion `<AnimatePresence>`**

Wrap modal overlays with `<AnimatePresence>` and replace container `div`s with `<motion.div>` using `MODAL_CONTENT_VARIANTS` and `SPRING_TRANSITION`.

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS with 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/reporting/TemplateCustomizerModal.tsx src/components/modals/AssetDetailModal.tsx src/components/modals/AssetEditModal.tsx src/components/modals/AssignTaskModal.tsx src/components/modals/StaffDetailModal.tsx
git commit -m "feat(motion): add Framer Motion spring pop-ins and AnimatePresence exit animations across modals"
```

---

## Task 4: Sliding Tab Indicators & Staggered Card Entrance Reveals (`ReportingTab.tsx`, `OverviewTab.tsx`, `ScrollMotion.tsx`)

**Files:**
- Modify: `src/components/dashboard/ReportingTab.tsx`
- Modify: `src/components/ui/ScrollMotion.tsx`

**Interfaces:**
- Consumes: `layoutId="activeSubTabPill"`, `<motion.div>`, `STAGGER_CONTAINER_VARIANTS`
- Produces:
  - Sliding active pill highlight on sub-nav tabs (`ReportingTab`)
  - Framer Motion staggered entrance container (`ScrollMotion`)

- [ ] **Step 1: Update `ReportingTab.tsx` and `ScrollMotion.tsx`**

Add `layoutId` pill indicator to `ReportingTab` sub-navigation buttons and wrap `ScrollMotion` children with Framer Motion staggered variants.

- [ ] **Step 2: Run all tests & typecheck**

Run: `npx vitest run tests/reportingUtils.test.ts tests/reportingIntegration.test.ts tests/motionUtils.test.ts`
Run: `npm run typecheck`
Expected: ALL PASS with 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/ReportingTab.tsx src/components/ui/ScrollMotion.tsx
git commit -m "feat(motion): add Framer Motion sliding tab indicators and staggered page entrance reveals"
```
