# GSAP Motion Engine & Fluid UI Animation System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Install GSAP and `@gsap/react`, build a high-performance fluid animation utility system (`src/lib/motion.ts`), and apply Awwwards-level GSAP motion transitions, modal pop-ins, mobile drawer slide-ins, tab switch reveals, and tactile hover physics across the entire BCAM application.

**Architecture:** GSAP core + `@gsap/react` `useGSAP` hook for declarative Next.js React motion management, backed by a unified motion utility library (`src/lib/motion.ts`) that standardizes spring easings (`back.out(1.7)`, `power3.out`, `expo.out`), stagger delays, and GPU-accelerated transforms without layout thrashing.

**Tech Stack:** Next.js 14, React 18, GSAP (`gsap`, `@gsap/react`), Tailwind CSS, TypeScript 5, Vitest.

**Spec/Design Guidance:** Enforcing `@gpt-taste` design principles: tactile hover physics, liquid modal scale-fades, smooth stagger tab entrances, and mobile drawer slide-ins.

---

## Global Constraints

- **Dependency Addition:** Install `gsap` and `@gsap/react`.
- **Framework Floor:** Next.js 14 App Router, React 18 Client Components (`"use client"`).
- **Reduced Motion Safety:** All GSAP animation sequences check `window.matchMedia('(prefers-reduced-motion: reduce)')` to respect accessibility preferences.
- **Performance:** Hardware-accelerated CSS properties only (`transform: translate3d/scale`, `opacity`, `filter`). No animated `width`/`height`/`top`/`left` causing layout reflows.

---

## Review Focus

1. **Memory Leaks & Stale GSAP Contexts:** Ensure all `useGSAP` or `gsap.context()` calls clean up automatically on component unmounts to prevent orphan listeners and memory growth.
2. **Next.js SSR Hydration Safety:** GSAP DOM queries must execute strictly inside `useGSAP()` or `useEffect()` hooks on client-rendered components to prevent SSR window/document undefined errors.
3. **Modal Overlay Interactivity Blocking:** Modal exit animations must remove fixed backdrop overlays from the DOM immediately upon completion so background buttons remain clickable.
4. **Mobile Drawer Smooth Touch Physics:** Mobile module drawer slide-ins (`yPercent: 100` -> `yPercent: 0`) must complete within 250ms with `power3.out` easing to avoid perceived sluggishness.
5. **Reduced Motion Respect:** Users with system reduced motion enabled must receive immediate opacity toggles instead of spring transforms.

---

## Task 1: GSAP Dependency Setup & Core Motion Utility Library

**Files:**
- Modify: `package.json`
- Create: `src/lib/motion.ts`
- Create: `tests/motionUtils.test.ts`

**Interfaces:**
- Consumes: `gsap`, `@gsap/react`
- Produces:
  - `animatePageEntrance(containerRef: React.RefObject<HTMLElement>)`
  - `animateModalPopIn(modalRef: React.RefObject<HTMLElement>, backdropRef?: React.RefObject<HTMLElement>)`
  - `animateModalPopOut(modalRef: React.RefObject<HTMLElement>, backdropRef: React.RefObject<HTMLElement>, onComplete: () => void)`
  - `animateDrawerSlideIn(drawerRef: React.RefObject<HTMLElement>)`
  - `animateStaggerCards(selector: string, parentRef?: React.RefObject<HTMLElement>)`
  - `animateHoverScale(element: HTMLElement)`

- [ ] **Step 1: Install `gsap` and `@gsap/react`**

Run: `npm install gsap @gsap/react`

- [ ] **Step 2: Create unit test for motion configuration helper in `tests/motionUtils.test.ts`**

Write test verifying helper functions generate expected GSAP configurations, respect reduced motion flags, and parse elements safely.

- [ ] **Step 3: Implement `src/lib/motion.ts`**

Write unified GSAP animation helper library:
```typescript
import gsap from "gsap";

export function isReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export const EASINGS = {
  SPRING_OUT: "back.out(1.5)",
  SMOOTH_OUT: "power3.out",
  EXPO_OUT: "expo.out",
};

export function animatePageEntrance(target: HTMLElement | string) {
  if (isReducedMotion()) return;
  gsap.fromTo(
    target,
    { opacity: 0, y: 16 },
    { opacity: 1, y: 0, duration: 0.35, ease: EASINGS.SMOOTH_OUT, clearProps: "transform" }
  );
}

export function animateModalPopIn(modalEl: HTMLElement, backdropEl?: HTMLElement) {
  if (isReducedMotion()) {
    gsap.set([modalEl, backdropEl].filter(Boolean), { opacity: 1 });
    return;
  }
  if (backdropEl) {
    gsap.fromTo(backdropEl, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: "power2.out" });
  }
  gsap.fromTo(
    modalEl,
    { opacity: 0, scale: 0.94, y: 12 },
    { opacity: 1, scale: 1, y: 0, duration: 0.3, ease: EASINGS.SPRING_OUT }
  );
}

export function animateModalPopOut(modalEl: HTMLElement, backdropEl: HTMLElement, onComplete: () => void) {
  if (isReducedMotion()) {
    onComplete();
    return;
  }
  const tl = gsap.timeline({ onComplete });
  if (backdropEl) tl.to(backdropEl, { opacity: 0, duration: 0.15, ease: "power2.in" }, 0);
  tl.to(modalEl, { opacity: 0, scale: 0.95, y: 8, duration: 0.15, ease: "power2.in" }, 0);
}

export function animateDrawerSlideIn(drawerEl: HTMLElement) {
  if (isReducedMotion()) return;
  gsap.fromTo(
    drawerEl,
    { yPercent: 100, opacity: 0.8 },
    { yPercent: 0, opacity: 1, duration: 0.28, ease: EASINGS.SMOOTH_OUT }
  );
}

export function animateStaggerCards(targets: HTMLElement[] | NodeListOf<HTMLElement> | string) {
  if (isReducedMotion()) return;
  gsap.fromTo(
    targets,
    { opacity: 0, y: 14, scale: 0.98 },
    { opacity: 1, y: 0, scale: 1, duration: 0.3, stagger: 0.04, ease: EASINGS.SMOOTH_OUT, clearProps: "transform" }
  );
}
```

- [ ] **Step 4: Run tests & verify compilation**

Run: `npx vitest run tests/motionUtils.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/lib/motion.ts tests/motionUtils.test.ts
git commit -m "feat(motion): add GSAP core dependencies and unified motion utility library"
```

---

## Task 2: Fluid Page & Tab Entrance Animations (`src/app/page.tsx`, `ScrollMotion.tsx`)

**Files:**
- Modify: `src/components/ui/ScrollMotion.tsx`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `animatePageEntrance`, `animateStaggerCards` from `src/lib/motion.ts`
- Produces: Enhanced `<ScrollMotion />` wrapper with automatic GSAP tab transition reveals

- [ ] **Step 1: Enhance `ScrollMotion.tsx` with GSAP tab transition animations**

Update `src/components/ui/ScrollMotion.tsx` using `@gsap/react` `useGSAP` to apply GSAP staggered entrances on all dashboard page switches (`data-scroll-motion-root`).

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS with 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/ScrollMotion.tsx src/app/page.tsx
git commit -m "feat(motion): add GSAP staggered tab entrance reveals and fluid page transition animations"
```

---

## Task 3: Liquid GSAP Animations for Modals & Dialogs

**Files:**
- Modify: `src/components/modals/AssetDetailModal.tsx`
- Modify: `src/components/modals/AssetEditModal.tsx`
- Modify: `src/components/modals/AssignTaskModal.tsx`
- Modify: `src/components/modals/StaffDetailModal.tsx`
- Modify: `src/components/dashboard/reporting/TemplateCustomizerModal.tsx`

**Interfaces:**
- Consumes: `animateModalPopIn`, `animateModalPopOut` from `src/lib/motion.ts`
- Produces: GSAP spring pop-ins on modal open, liquid backdrop blur fades, and clean exit transitions

- [ ] **Step 1: Apply GSAP spring pop-ins to modals**

Add `useGSAP` hooks and modal container refs in modal components to trigger `animateModalPopIn` on open and `animateModalPopOut` before dismiss.

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS with 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/modals/AssetDetailModal.tsx src/components/modals/AssetEditModal.tsx src/components/modals/AssignTaskModal.tsx src/components/modals/StaffDetailModal.tsx src/components/dashboard/reporting/TemplateCustomizerModal.tsx
git commit -m "feat(motion): apply liquid GSAP spring pop-in animations and backdrop fades across modals"
```

---

## Task 4: Tactile GSAP Mobile Dock & Quick-Module Drawer Physics (`Sidebar.tsx`)

**Files:**
- Modify: `src/components/layout/Sidebar.tsx`

**Interfaces:**
- Consumes: `animateDrawerSlideIn` from `src/lib/motion.ts`
- Produces: Smooth GSAP `power3.out` mobile drawer slide-ins and capsule dock button spring physics

- [ ] **Step 1: Apply GSAP drawer slide-in animation in `Sidebar.tsx`**

Attach GSAP `useGSAP` animation to the mobile bottom sheet drawer in `Sidebar.tsx` so opening the drawer triggers `animateDrawerSlideIn`.

- [ ] **Step 2: Verify typecheck & tests**

Run: `npm run typecheck`
Expected: PASS with 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/Sidebar.tsx
git commit -m "feat(motion): add GSAP spring physics to mobile glass dock and smooth drawer slide-ins"
```

---

## Task 5: Staggered GSAP Motion in Dashboard Overview & Reporting Subsystem

**Files:**
- Modify: `src/components/dashboard/OverviewTab.tsx`
- Modify: `src/components/dashboard/ReportingTab.tsx`
- Modify: `src/components/dashboard/reporting/ReportEditor.tsx`

**Interfaces:**
- Consumes: `animateStaggerCards` from `src/lib/motion.ts`
- Produces: GSAP staggered card reveals on Overview, Personal Home, and Report Editor cards

- [ ] **Step 1: Apply GSAP stagger reveals on Overview & Reporting cards**

Attach GSAP `useGSAP` hooks targeting metric cards, sub-navigation pills, and report section grids for staggered entry reveals.

- [ ] **Step 2: Run all tests & typecheck**

Run: `npx vitest run tests/reportingUtils.test.ts tests/reportingIntegration.test.ts tests/motionUtils.test.ts`
Run: `npm run typecheck`
Expected: ALL PASS with 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/OverviewTab.tsx src/components/dashboard/ReportingTab.tsx src/components/dashboard/reporting/ReportEditor.tsx
git commit -m "feat(motion): add GSAP staggered card reveals across overview and reporting views"
```
