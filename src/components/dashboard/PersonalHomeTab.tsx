"use client";

import React from "react";
import { ArrowUpRight, ClipboardList, KeyRound, Laptop, MapPin, Star, Wrench } from "lucide-react";
import { DigitalCredential, InboxTask, PhysicalAsset, WorkspaceLink } from "@/types/assets";
import { WorkspaceCards } from "@/components/dashboard/WorkspaceTab";
import { TabKey } from "@/components/layout/Sidebar";

interface Props {
  displayName: string;
  branch?: string;
  department?: string;
  assets: PhysicalAsset[];
  credentials: DigitalCredential[];
  tasks: InboxTask[];
  workspaceLinks: WorkspaceLink[];
  favorites: string[];
  onNavigate: (tab: TabKey) => void;
  onToggleFavorite: (id: string) => Promise<void>;
  onShowHelp: () => void;
}

export function PersonalHomeTab({ displayName, branch, department, assets, credentials, tasks, workspaceLinks, favorites, onNavigate, onToggleFavorite, onShowHelp }: Props) {
  const firstName = displayName.trim().split(/\s+/)[0] || "there";
  const favoriteLinks = workspaceLinks.filter((link) => favorites.includes(link.id));
  const openTasks = tasks.filter((task) => task.status !== "done");

  return <div className="space-y-6" data-scroll-motion-root>
    <section className="relative overflow-hidden rounded-2xl border border-blue-400/20 bg-gradient-to-br from-navy-900 via-navy-800 to-sky-950 p-5 text-white shadow-lg sm:p-7">
      <div className="pointer-events-none absolute -right-12 -top-20 h-64 w-64 rounded-full bg-sky-400/10 blur-3xl" />
      <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.18em] text-sky-200">Your Basechan workspace</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Welcome back, {firstName}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-200">Your assigned equipment, account access, tasks, and favourite tools are gathered here for you.</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-200">
            {branch && <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/10 px-2.5 py-1"><MapPin className="h-3 w-3" />{branch}</span>}
            {department && <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1">{department}</span>}
          </div>
        </div>
        <button onClick={onShowHelp} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15">
          How this app works <ArrowUpRight className="h-4 w-4" />
        </button>
      </div>
    </section>

    <section className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4" aria-label="Your work at a glance">
      <button onClick={() => onNavigate("hardware")} className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-400">
        <Laptop className="h-5 w-5 text-blue-500" /><strong className="mt-3 block text-2xl text-[var(--text-primary)]">{assets.length}</strong><span className="text-xs text-[var(--text-muted)]">My active assets</span>
      </button>
      <button onClick={() => onNavigate("credentials")} className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-400">
        <KeyRound className="h-5 w-5 text-emerald-500" /><strong className="mt-3 block text-2xl text-[var(--text-primary)]">{credentials.length}</strong><span className="text-xs text-[var(--text-muted)]">My accounts</span>
      </button>
      <button onClick={() => onNavigate("tasks")} className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-amber-400">
        <ClipboardList className="h-5 w-5 text-amber-500" /><strong className="mt-3 block text-2xl text-[var(--text-primary)]">{openTasks.length}</strong><span className="text-xs text-[var(--text-muted)]">Open tasks</span>
      </button>
      <button onClick={() => onNavigate("workspace")} className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-purple-400">
        <Star className="h-5 w-5 text-purple-500" /><strong className="mt-3 block text-2xl text-[var(--text-primary)]">{favoriteLinks.length}</strong><span className="text-xs text-[var(--text-muted)]">Favourite tools</span>
      </button>
    </section>

    <div className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3"><div><h3 className="font-bold text-[var(--text-primary)]">My assets</h3><p className="mt-1 text-xs text-[var(--text-muted)]">Check what is assigned to you or report a change.</p></div><button onClick={() => onNavigate("hardware")} className="shrink-0 text-xs font-semibold text-blue-600">View all</button></div>
        {assets.length === 0 ? <div className="rounded-xl border border-dashed border-[var(--border)] p-6 text-center"><Laptop className="mx-auto h-6 w-6 text-[var(--text-muted)]" /><p className="mt-2 text-sm font-medium text-[var(--text-primary)]">No active assets are assigned to your account.</p><p className="mt-1 text-xs text-[var(--text-muted)]">If you think something is missing, contact your administrator.</p></div> : <div className="space-y-2">{assets.slice(0, 4).map((asset) => <button key={asset.id} onClick={() => onNavigate("hardware")} className="flex w-full items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] p-3 text-left transition hover:border-blue-400"><div className="min-w-0"><strong className="block truncate text-sm text-[var(--text-primary)]">{asset.makeModel}</strong><span className="mt-0.5 block truncate text-xs text-[var(--text-muted)]">{asset.tag} · {asset.category}</span></div><span className="shrink-0 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">{asset.condition || asset.status}</span></button>)}</div>}
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3"><div><h3 className="font-bold text-[var(--text-primary)]">My task inbox</h3><p className="mt-1 text-xs text-[var(--text-muted)]">Repair updates and actions assigned to you.</p></div><button onClick={() => onNavigate("tasks")} className="shrink-0 text-xs font-semibold text-blue-600">Open inbox</button></div>
        {openTasks.length === 0 ? <div className="rounded-xl border border-dashed border-[var(--border)] p-6 text-center"><Wrench className="mx-auto h-6 w-6 text-[var(--text-muted)]" /><p className="mt-2 text-sm font-medium text-[var(--text-primary)]">You are all caught up.</p><p className="mt-1 text-xs text-[var(--text-muted)]">New requests and handovers will appear here.</p></div> : <div className="space-y-2">{openTasks.slice(0, 4).map((task) => <button key={task.id} onClick={() => onNavigate("tasks")} className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] p-3 text-left"><strong className="block text-sm text-[var(--text-primary)]">{task.title}</strong><span className="mt-1 block line-clamp-2 text-xs text-[var(--text-muted)]">{task.description || task.status.replaceAll("_", " ")}</span></button>)}</div>}
      </section>
    </div>

    <section className="space-y-3"><div className="flex items-center justify-between"><div><h3 className="text-lg font-bold text-[var(--text-primary)]">Your favourite workspaces</h3><p className="text-xs text-[var(--text-muted)]">Keep your everyday tools close at hand.</p></div><button onClick={() => onNavigate("workspace")} className="text-xs font-semibold text-blue-600">Manage links</button></div>
      {favoriteLinks.length ? <WorkspaceCards links={favoriteLinks} favorites={favorites} onToggleFavorite={onToggleFavorite} /> : <button onClick={() => onNavigate("workspace")} className="flex w-full items-center justify-between rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg-surface)] p-4 text-left text-sm text-[var(--text-muted)]"><span>Favourite a workspace link to see it here.</span><ArrowUpRight className="h-4 w-4" /></button>}
    </section>
  </div>;
}
