"use client";

import React, { useState } from "react";
import Image from "next/image";
import { ArrowLeft, ArrowRight, CheckCircle2, CircleHelp, X } from "lucide-react";
import { PageAccess } from "@/lib/accessControl";
import { TabKey } from "@/components/layout/Sidebar";
import { UserRole } from "@/types/assets";

const descriptions: Record<TabKey, { title: string; description: string }> = {
  overview: { title: "Home", description: "A personal summary of your assigned work and frequently used links, or an organization-wide view for administrators." },
  hardware: { title: "My Assets / Hardware", description: "Find equipment, check its condition and report an issue. Staff can work with their assigned assets; authorized admins can manage the inventory." },
  auditor: { title: "Missing Details Auditor", description: "Review incomplete or unverified asset records and follow up on the details that need attention." },
  credentials: { title: "My Accounts / Credentials Vault", description: "See accounts assigned to you. Revealing a password is permission-checked and recorded in the vault audit trail." },
  workbooks: { title: "Workbooks", description: "Find managed files and links. Editing and broader record access depend on your administrator-granted scope." },
  facilities: { title: "Office & Facilities", description: "Review branch facilities and infrastructure that your account is permitted to see." },
  staff: { title: "Staff Directory", description: "Find staff and their assigned equipment when directory access is enabled for your account." },
  ingestion: { title: "Excel Import", description: "Administrators review a spreadsheet preview before importing validated inventory changes." },
  stocktake: { title: "Stocktake", description: "Record physical checks for an assigned verification round. Administrators create rounds and review discrepancies." },
  tasks: { title: "Task Inbox", description: "Track repair requests, handovers, verification work, and other actions assigned to you." },
  workspace: { title: "Workspace Links", description: "Open software links shared with you and favourite the tools you use most." },
};

interface Props {
  displayName: string;
  role: UserRole;
  accessibleTabs: PageAccess;
  onComplete: () => Promise<void>;
  onDismiss: () => void;
}

export function OnboardingGuide({ displayName, role, accessibleTabs, onComplete, onDismiss }: Props) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const isAdmin = role === "SUPER_ADMIN";
  const availablePages = (Object.keys(descriptions) as TabKey[]).filter((tab) => accessibleTabs[tab]);
  const firstName = displayName.trim().split(/\s+/)[0] || "there";

  const finish = async () => {
    setSaving(true);
    setError("");
    try {
      await onComplete();
      onDismiss();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your welcome progress. You can try again.");
    } finally {
      setSaving(false);
    }
  };

  return <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/75 p-2 backdrop-blur-sm sm:p-4" role="dialog" aria-modal="true" aria-labelledby="welcome-title">
    <section className="flex max-h-[calc(100dvh-1rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-2xl sm:max-h-[calc(100dvh-2rem)]">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--bg-muted)]/60 px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex min-w-0 items-center gap-3"><Image src="/logo.png" alt="" width={38} height={38} className="shrink-0 rounded-lg" /><div className="min-w-0"><p className="truncate text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">{isAdmin ? "Administrator welcome" : "Your staff welcome"}</p><h2 id="welcome-title" className="truncate font-bold">{step === 0 ? `Welcome, ${firstName}` : "A quick guide to your workspace"}</h2></div></div>
        <button type="button" onClick={onDismiss} disabled={saving} aria-label="Close welcome guide" className="shrink-0 rounded-lg p-2 text-[var(--text-muted)] hover:bg-[var(--bg-muted)] disabled:opacity-50"><X className="h-4 w-4" /></button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">
        {step === 0 ? <div className="space-y-5">
          <div className="rounded-2xl bg-gradient-to-br from-navy-900 to-blue-950 p-5 text-white sm:p-6"><p className="text-xs font-semibold uppercase tracking-widest text-sky-200">{isAdmin ? "Your organization at a glance" : "Your work, gathered in one place"}</p><h3 className="mt-2 text-xl font-bold sm:text-2xl">{isAdmin ? "Welcome to your operations desk." : "This is your Basechan workspace."}</h3><p className="mt-2 max-w-xl text-sm leading-6 text-slate-200">{isAdmin ? "Manage records, review activity, coordinate stocktakes, and give staff access to the tools they need." : "Start with the equipment assigned to you, follow tasks in your inbox, and open your favourite work tools from your dashboard."}</p></div>
          <div className="grid gap-3 sm:grid-cols-3">{(isAdmin ? ["Manage the organization’s asset records", "Review tasks, changes, and audit activity", "Grant staff scoped access when needed"] : ["Find your assigned equipment", "Report a condition issue or follow a repair", "Use only pages and records you are allowed to access"]).map((item, index) => <div key={item} className="rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] p-4"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-500/10 text-xs font-bold text-blue-600">{index + 1}</span><p className="mt-3 text-sm font-medium leading-5">{item}</p></div>)}</div>
          <div className="rounded-xl border border-[var(--border)] p-4"><div className="flex items-start gap-3"><CircleHelp className="mt-0.5 h-5 w-5 shrink-0 text-blue-500" /><div><h3 className="text-sm font-semibold">How access works</h3><p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">Your sign-in determines your role. Staff only see assigned records and pages enabled for their account. Administrators can grant specific actions and scopes. Password reveals are restricted and audited. Ask an administrator if a page or record you need is missing.</p></div></div></div>
        </div> : <div className="space-y-5">
          <div><p className="text-sm text-[var(--text-muted)]">These are the pages available to your account. Staff pages appear only when the account has access.</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{availablePages.map((tab) => <article key={tab} className="rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] p-3"><h3 className="text-sm font-semibold">{descriptions[tab].title}</h3><p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">{descriptions[tab].description}</p></article>)}</div></div>
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4"><h3 className="text-sm font-semibold">A few good first steps</h3><ul className="mt-2 space-y-2 text-xs text-[var(--text-muted)]"><li className="flex gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />Check the assets and account access assigned to you.</li><li className="flex gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />Open your task inbox and follow any pending actions.</li><li className="flex gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />Favourite your most-used workspace links for quick access.</li></ul></div>
        </div>}
        {error && <p role="alert" className="mt-4 rounded-lg border border-rose-300 bg-rose-500/10 p-3 text-sm text-rose-700 dark:text-rose-300">{error}</p>}
      </div>

      <footer className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] bg-[var(--bg-muted)]/40 p-3 sm:px-6 sm:py-4">
        <span className="text-xs text-[var(--text-muted)]">{step + 1} of 2</span>
        <div className="flex flex-wrap justify-end gap-2">{step === 1 && <button type="button" onClick={() => setStep(0)} className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-semibold"><ArrowLeft className="h-3.5 w-3.5" />Back</button>}{step === 0 ? <><button type="button" disabled={saving} onClick={onDismiss} className="rounded-lg px-3 py-2 text-xs font-semibold text-[var(--text-muted)] disabled:opacity-50">Remind me later</button><button type="button" onClick={() => setStep(1)} className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white">Show me around <ArrowRight className="h-3.5 w-3.5" /></button></> : <button type="button" disabled={saving} onClick={() => void finish()} className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">{saving ? "Saving…" : "Finish guide"}</button>}</div>
      </footer>
    </section>
  </div>;
}
