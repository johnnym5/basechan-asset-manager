# Animated Custom Select, Custom Confirm Modal & System-Wide Modal Exit Transitions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a custom animated dropdown component (`<AnimatedSelect />`) to replace raw browser `<select>` inputs, replace browser `window.confirm()` and `window.alert()` popups with a tactile `<ConfirmModal />` component, and ensure every modal dialog across BCAM has smooth Framer Motion spring enter and exit animations wrapped in `<AnimatePresence>`.

**Architecture:** Custom React components using `framer-motion` (`AnimatePresence`, `<motion.div>`, `SPRING_TRANSITION`), replacing native OS/browser form widgets (`<select>`, `window.confirm`) with accessible, animated glassmorphism components.

**Tech Stack:** Next.js 14, React 18, `framer-motion`, Tailwind CSS, Lucide React icons, Vitest.

---

## Global Constraints

- **No Raw Browser Alerts/Confirms:** Replace `window.confirm()` and `window.alert()` with custom `<ConfirmModal />`.
- **No Native Raw Browser Select Menus:** Replace `<select>` tags in filter bars and modals with `<AnimatedSelect />`.
- **AnimatePresence Keying:** Every modal in `src/components/modals/` and dashboard tabs must be wrapped in `<AnimatePresence>` at call-site to guarantee smooth opening AND closing exit animations.

---

## Review Focus

1. **Outside-Click Dismissal for Dropdowns:** `<AnimatedSelect />` dropdown menu must close automatically when clicking anywhere outside or pressing `Escape`.
2. **Modal Unmount Exit Animation:** Modals must not unmount immediately when closed; `<AnimatePresence>` must run the scale-down/opacity exit animation first.
3. **Form Integration Compatibility:** `<AnimatedSelect />` must accept `value`, `onChange(value)`, `options`, `placeholder`, and `className` props to drop seamlessly into existing forms.
4. **Keyboard Accessibility:** Dropdowns and confirm modals must support keyboard navigation (`Escape`, `Enter`, `Tab`).

---

## Task 1: Custom Animated Select Component (`<AnimatedSelect />`)

**Files:**
- Create: `src/components/ui/AnimatedSelect.tsx`
- Create: `tests/animatedSelect.test.ts`
- Modify: `src/components/dashboard/HardwareTab.tsx`
- Modify: `src/components/dashboard/reporting/AdminReportingMatrix.tsx`
- Modify: `src/components/dashboard/reporting/MonthlyComparisonView.tsx`

**Interfaces:**
- Consumes: `framer-motion`
- Produces: `<AnimatedSelect options={Array<{ value: string; label: string; icon?: React.ReactNode }>} value={string} onChange={(val) => void} placeholder={string} />`

- [ ] **Step 1: Create unit test for `<AnimatedSelect />` prop contracts in `tests/animatedSelect.test.ts`**

Write test checking option selection and value change handling.

- [ ] **Step 2: Build `<AnimatedSelect />` component in `src/components/ui/AnimatedSelect.tsx`**

Implement custom select component with:
- Trigger button showing current label, chevron rotation (`rotate-180` on open), glassmorphism container (`bg-[var(--bg-surface)] border-[var(--border)]`).
- `<AnimatePresence>` dropdown menu with scale-y spring pop-in (`scaleY: 0, opacity: 0` -> `scaleY: 1, opacity: 1`).
- Checkmark on selected option.
- Outside-click listener to auto-close.

- [ ] **Step 3: Replace native `<select>` tags in `HardwareTab.tsx`, `AdminReportingMatrix.tsx`, and `MonthlyComparisonView.tsx`**

Swap native `<select>` dropdowns for `<AnimatedSelect />`.

- [ ] **Step 4: Run tests & verify typecheck**

Run: `npx vitest run tests/animatedSelect.test.ts`
Run: `npm run typecheck`
Expected: ALL PASS with 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/AnimatedSelect.tsx tests/animatedSelect.test.ts src/components/dashboard/HardwareTab.tsx src/components/dashboard/reporting/AdminReportingMatrix.tsx src/components/dashboard/reporting/MonthlyComparisonView.tsx
git commit -m "feat(ui): add custom AnimatedSelect component and replace native browser select dropdowns"
```

---

## Task 2: Custom Confirmation & Notification Modal (`<ConfirmModal />`)

**Files:**
- Create: `src/components/modals/ConfirmModal.tsx`
- Modify: `src/lib/confirmService.ts` or `src/context/ConfirmContext.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/components/dashboard/reporting/AdminReportingMatrix.tsx`
- Modify: `src/components/dashboard/reporting/ReportEditor.tsx`

**Interfaces:**
- Consumes: `<AnimatePresence>`, `<motion.div>`, `framer-motion`
- Produces: `<ConfirmModal isOpen={boolean} title={string} message={string} confirmLabel={string} cancelLabel={string} variant={"danger" | "warning" | "info"} onConfirm={() => void} onCancel={() => void} />`

- [ ] **Step 1: Create `<ConfirmModal />` component**

Implement custom confirmation modal with:
- Warning / Shield icon.
- Title and message.
- Framer Motion spring pop-in & exit animation (`<AnimatePresence>`).
- Primary "Confirm" button (`bg-amber-600` or `bg-blue-600`) and "Cancel" button.

- [ ] **Step 2: Replace `window.confirm()` and `window.alert()` calls in `AdminReportingMatrix.tsx`, `ReportEditor.tsx`, and `page.tsx`**

Replace native browser alert/confirm popups with `<ConfirmModal />`.

- [ ] **Step 3: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS with 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/modals/ConfirmModal.tsx src/components/dashboard/reporting/AdminReportingMatrix.tsx src/components/dashboard/reporting/ReportEditor.tsx src/app/page.tsx
git commit -m "feat(ui): add custom ConfirmModal component and eliminate raw browser window.confirm alerts"
```

---

## Task 3: Wrap ALL System Modals in `<AnimatePresence>` at Call-Sites

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/components/dashboard/reporting/AdminReportingMatrix.tsx`
- Modify: `src/components/dashboard/reporting/ReportEditor.tsx`
- Modify: `src/components/dashboard/HardwareTab.tsx`
- Modify: `src/components/dashboard/CredentialsTab.tsx`
- Modify: `src/components/dashboard/WorkbooksTab.tsx`
- Modify: `src/components/dashboard/FacilitiesTab.tsx`
- Modify: `src/components/dashboard/StaffDirectoryTab.tsx`

**Interfaces:**
- Consumes: `<AnimatePresence>` from `framer-motion`
- Produces: All modal popups across the system wrapped in `<AnimatePresence>` at call-site so enter AND exit closing animations execute smoothly.

- [ ] **Step 1: Wrap all modal renders with `<AnimatePresence>`**

In `page.tsx` and all dashboard tab components, wrap modal mounts with `<AnimatePresence>`:
```tsx
<AnimatePresence>
  {editor && (
    <RecordEditorModal ... />
  )}
</AnimatePresence>
```

- [ ] **Step 2: Run all tests & typecheck**

Run: `npx vitest run tests/animatedSelect.test.ts tests/motionUtils.test.ts tests/reportingUtils.test.ts tests/reportingIntegration.test.ts`
Run: `npm run typecheck`
Expected: ALL PASS with 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx src/components/dashboard/reporting/AdminReportingMatrix.tsx src/components/dashboard/reporting/ReportEditor.tsx src/components/dashboard/HardwareTab.tsx src/components/dashboard/CredentialsTab.tsx src/components/dashboard/WorkbooksTab.tsx src/components/dashboard/FacilitiesTab.tsx src/components/dashboard/StaffDirectoryTab.tsx
git commit -m "feat(motion): wrap all system modals in AnimatePresence at call-sites to enable smooth opening and closing exit animations"
```
