"use client";

import React, { useState } from "react";
import Image from "next/image";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { TabKey } from "@/components/layout/Sidebar";
import { UserRole } from "@/types/assets";

interface PageGuide {
  title: string;
  description: string;
  steps: string[];
}

const pageGuides: Record<TabKey, (isAdmin: boolean) => PageGuide> = {
  overview: (isAdmin) => ({
    title: isAdmin ? "Dashboard and organization overview" : "Your dashboard",
    description: isAdmin
      ? "Use the dashboard as your starting point for organization activity and quick access to records."
      : "Use your dashboard to see work and records connected to your account.",
    steps: isAdmin
      ? ["Review the summary counts and activity at a glance.", "Select a dashboard card or shortcut to open its page.", "Use the navigation menu to move between areas of the workspace."]
      : ["Check your assigned equipment and current work at a glance.", "Use a dashboard shortcut to open the related page.", "Open your task inbox or workspace links for your next action."],
  }),
  hardware: (isAdmin) => ({
    title: isAdmin ? "Hardware inventory" : "Your assigned assets",
    description: isAdmin
      ? "Find and manage the organization’s physical equipment."
      : "View the equipment assigned to you and report issues when something needs attention.",
    steps: isAdmin
      ? ["Search or filter the inventory to find a device.", "Open a record to review its assignment, condition, and details.", "Use the available create, edit, archive, or restore actions to maintain records."]
      : ["Search or browse your assigned equipment.", "Open an asset to check its details and condition.", "Use the issue or repair action to report a problem for follow-up."],
  }),
  auditor: (isAdmin) => ({
    title: "Missing details auditor",
    description: "Use this page to find asset records that need information or verification.",
    steps: ["Review the missing-detail list and its status indicators.", "Open an item to see which details need attention.", isAdmin ? "Update the record or follow up with the assigned staff member." : "Follow up on the records within your assigned scope."],
  }),
  credentials: (isAdmin) => ({
    title: isAdmin ? "Credentials vault" : "Your accounts and credentials",
    description: isAdmin
      ? "Review digital accounts and their assignments. Sensitive password actions are access-controlled and audited."
      : "Find the digital accounts assigned to you. Password access is restricted and recorded.",
    steps: isAdmin
      ? ["Search for an account by name, owner, or service.", "Open a record to review its account and assignment details.", "Only reveal or update credentials when your permissions allow it; password reveals are audited."]
      : ["Search or browse accounts assigned to you.", "Open an account to review its details and available link.", "Use the password reveal or copy action only when you need it; each reveal is recorded."],
  }),
  workbooks: (isAdmin) => ({
    title: "Workbooks and documents",
    description: "Find managed workbooks, reference files, and cloud-storage links.",
    steps: ["Search by title, owner, or business function; use the department filter to narrow the list.", "Select a workbook to review its owner, department, and access details.", isAdmin ? "Use the available record actions to add, edit, archive, or restore workbook entries." : "Open the workbook’s cloud link when you have access. Available record actions depend on the permissions your administrator assigned."],
  }),
  facilities: (isAdmin) => ({
    title: "Office and facilities",
    description: "Review facility and infrastructure records for the locations available to your account.",
    steps: ["Browse or filter the list to find a facility item.", "Open an item to review its location, details, and current status.", isAdmin ? "Use the available actions to keep facility records up to date." : "Contact an administrator if a facility record needs to be changed."],
  }),
  staff: (isAdmin) => ({
    title: isAdmin ? "Staff directory" : "Staff directory",
    description: isAdmin
      ? "Find staff records and review their department, branch, and assigned equipment."
      : "Find colleagues and view the staff details available to your account.",
    steps: ["Search by name, email, department, or branch.", "Open a staff record to see the available profile and assignment details.", isAdmin ? "Use staff actions to update records or manage access when needed." : "Ask an administrator if you need additional directory access."],
  }),
  reporting: (isAdmin) => ({
    title: isAdmin ? "Weekly reporting and supervision" : "Weekly reports",
    description: isAdmin
      ? "Review submissions, manage report templates and staff access, and compare weekly and monthly results."
      : "Create a weekly report from your saved templates and track your results over time.",
    steps: isAdmin
      ? ["Use Admin Supervision to review staff submissions by week.", "Use Templates & Access to manage shared report templates and grant reporting permissions.", "Open Weekly Comparison or Monthly Analytics to review submitted figures and trends."]
      : ["Choose up to five saved templates and enter this week’s metric values.", "Save draft to continue later; submit when the required totals balance. A submitted report is locked.", "Compare submitted weeks or view monthly summaries. A new reporting week starts Tuesday."],
  }),
  ingestion: () => ({
    title: "Excel import",
    description: "Import records from a spreadsheet after reviewing what the app will change.",
    steps: ["Choose the workbook file you want to import.", "Review the preview, including new, changed, duplicate, and incomplete rows.", "Commit the reviewed import only when the preview is correct. Replacement archives existing active records rather than deleting their history."],
  }),
  stocktake: (isAdmin) => ({
    title: "Stocktake",
    description: isAdmin
      ? "Create verification rounds and review the results of physical checks."
      : "Complete the physical asset checks assigned to your stocktake round.",
    steps: isAdmin
      ? ["Create a round and assign the staff members who will verify assets.", "Track progress and review reported differences against the inventory.", "Close the round when checks and follow-ups are complete."]
      : ["Open your assigned round and work through its listed assets.", "Record the observed condition or location for each check.", "Submit the check and flag any mismatch so it can be reviewed."],
  }),
  tasks: (isAdmin) => ({
    title: isAdmin ? "Task inbox and coordination" : "Your task inbox",
    description: isAdmin
      ? "Coordinate follow-ups and monitor actions across the team."
      : "Keep track of work assigned to you, including repairs and verification follow-ups.",
    steps: isAdmin
      ? ["Review open tasks and their owners or due dates.", "Create or assign a task with enough detail for the recipient to act.", "Follow task status through to completion."]
      : ["Review open tasks and their due dates.", "Open a task for its instructions and related record.", "Update its status as you make progress and add a note if more context is needed."],
  }),
  workspace: (isAdmin) => ({
    title: "Workspace links",
    description: "Keep the tools and reference links you use most close at hand.",
    steps: ["Browse or search the available links.", "Open a link to launch its service.", isAdmin ? "Manage shared links and restore archived links from the available actions." : "Favourite frequently used links so they are easier to find next time."],
  }),
};

interface Props {
  displayName: string;
  role: UserRole;
  page: TabKey;
  onComplete: () => Promise<void>;
  onDismiss: () => void;
}

export function OnboardingGuide({ displayName, role, page, onComplete, onDismiss }: Props) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const isAdmin = role === "SUPER_ADMIN";
  const firstName = displayName.trim().split(/\s+/)[0] || "there";
  const guide = pageGuides[page](isAdmin);

  const finish = async () => {
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      await onComplete();
      onDismiss();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your guide progress. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/75 p-2 backdrop-blur-sm sm:p-4" role="dialog" aria-modal="true" aria-labelledby="welcome-title">
    <section className="flex max-h-[calc(100dvh-1rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-2xl sm:max-h-[calc(100dvh-2rem)]">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--bg-muted)]/60 px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex min-w-0 items-center gap-3"><Image src="/logo.png" alt="" width={38} height={38} className="shrink-0 rounded-lg" /><div className="min-w-0"><p className="truncate text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">{isAdmin ? "Administrator · First visit" : "Staff · First visit"}</p><h2 id="welcome-title" className="truncate font-bold">{guide.title}</h2></div></div>
        <button type="button" onClick={() => void finish()} disabled={saving} aria-label="Skip the guide and mark it complete" title="Skip guide" className="shrink-0 rounded-lg p-2 text-[var(--text-muted)] hover:bg-[var(--bg-muted)] disabled:opacity-50"><X className="h-4 w-4" /></button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">
        <div className="space-y-5">
          <div><p className="text-sm leading-6 text-[var(--text-muted)]">{guide.description}</p><div className="mt-4 flex items-center gap-3"><span className="h-1.5 flex-1 rounded-full bg-blue-600" style={{ opacity: (step + 1) / guide.steps.length }} /><span className="text-xs font-semibold text-blue-600">{step + 1} of {guide.steps.length}</span></div></div>
          <article className="flex min-h-36 items-start gap-4 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] p-5"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-sm font-bold text-blue-600">{step + 1}</span><p className="pt-1 text-base leading-7">{guide.steps[step]}</p></article>
          <p className="text-xs text-[var(--text-muted)]">This guide appears the first time you open this page. Other pages have their own separate guides.</p>
        </div>
        {error && <p role="alert" className="mt-4 rounded-lg border border-rose-300 bg-rose-500/10 p-3 text-sm text-rose-700 dark:text-rose-300">{error}</p>}
      </div>

      <footer className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] bg-[var(--bg-muted)]/40 p-3 sm:px-6 sm:py-4">
        <span className="text-xs text-[var(--text-muted)]">{firstName} · {guide.title}</span>
        <div className="flex flex-wrap justify-end gap-2">
          {step > 0 && <button type="button" disabled={saving} onClick={() => setStep((current) => Math.max(0, current - 1))} className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-semibold disabled:opacity-50"><ArrowLeft className="h-3.5 w-3.5" />Back</button>}
          {step < guide.steps.length - 1 && <button type="button" disabled={saving} onClick={() => setStep((current) => Math.min(guide.steps.length - 1, current + 1))} className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">Next step<ArrowRight className="h-3.5 w-3.5" /></button>}
          {step === guide.steps.length - 1 && <button type="button" disabled={saving} onClick={() => void finish()} className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">{saving ? "Saving…" : "Finish page guide"}</button>}
        </div>
      </footer>
    </section>
  </div>;
}
