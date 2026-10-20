"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import { ArrowUpRight, BriefcaseBusiness, ExternalLink, Heart, Pencil, Plus, Star, X, RotateCcw } from "lucide-react";
import { StaffMember, WorkspaceLink } from "@/types/assets";

function SiteIcon({ url, title }: { url: string; title: string }) {
  const [failed, setFailed] = useState(false);
  return <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-[var(--bg-muted)]">
    {failed ? <span className="text-lg font-bold text-[var(--text-muted)]">{title.slice(0, 1).toUpperCase()}</span> : <Image src={`https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(url)}&sz=128`} alt="" width={32} height={32} className="h-8 w-8" unoptimized onError={() => setFailed(true)} />}
  </div>;
}

export function WorkspaceCards({ links, favorites, onToggleFavorite, isAdmin = false, onEdit, onArchive, onRestore }: {
  links: WorkspaceLink[];
  favorites: string[];
  onToggleFavorite: (id: string) => Promise<void>;
  isAdmin?: boolean;
  onEdit?: (link: WorkspaceLink) => void;
  onArchive?: (link: WorkspaceLink) => Promise<void>;
  onRestore?: (link: WorkspaceLink) => Promise<void>;
}) {
  return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{links.map((link) => {
    const host = (() => { try { return new URL(link.url).hostname.replace(/^www\./, ""); } catch { return link.url; } })();
    return <article key={link.id} className="group relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-lg">
      <div className="flex items-start gap-3">
        <SiteIcon url={link.url} title={link.title} />
        <div className="min-w-0 flex-1"><h3 className="truncate font-semibold text-[var(--text-primary)]">{link.title}{link.archived && <span className="ml-2 text-[10px] text-amber-600">Archived</span>}</h3><p className="truncate text-xs text-[var(--text-muted)]">{host}</p>{link.description && <p className="mt-2 line-clamp-2 text-sm text-[var(--text-muted)]">{link.description}</p>}</div>
        <button aria-label={favorites.includes(link.id) ? `Remove ${link.title} from favourites` : `Add ${link.title} to favourites`} title={favorites.includes(link.id) ? "Remove favourite" : "Add to favourites"} onClick={() => void onToggleFavorite(link.id)} className="rounded-lg p-2 text-amber-500 transition hover:bg-amber-500/10">{favorites.includes(link.id) ? <Star className="h-4 w-4 fill-current" /> : <Star className="h-4 w-4" />}</button>
      </div>
      <div className="mt-4 flex items-center justify-between gap-2"><span className="text-[11px] text-[var(--text-muted)]">{favorites.includes(link.id) ? "Favourite" : "Workspace site"}</span>{!link.archived && <a href={link.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700">Open site<ExternalLink className="h-3.5 w-3.5" /></a>}</div>
      {isAdmin && <div className="absolute left-3 top-3 flex gap-1 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">{link.archived ? <button onClick={() => void onRestore?.(link)} aria-label={`Restore ${link.title}`} className="rounded-md border border-[var(--border)] bg-[var(--bg-surface)] p-1.5 text-emerald-600"><RotateCcw className="h-3.5 w-3.5" /></button> : <><button onClick={() => onEdit?.(link)} aria-label={`Edit ${link.title}`} className="rounded-md border border-[var(--border)] bg-[var(--bg-surface)] p-1.5 text-[var(--text-muted)]"><Pencil className="h-3.5 w-3.5" /></button><button onClick={() => void onArchive?.(link)} aria-label={`Remove ${link.title}`} className="rounded-md border border-[var(--border)] bg-[var(--bg-surface)] p-1.5 text-rose-600"><X className="h-3.5 w-3.5" /></button></>}</div>}
    </article>;
  })}</div>;
}

export function WorkspaceTab({ links, favorites, staff, isAdmin, onToggleFavorite, onSave, onArchive, onRestore }: {
  links: WorkspaceLink[];
  favorites: string[];
  staff: StaffMember[];
  isAdmin: boolean;
  onToggleFavorite: (id: string) => Promise<void>;
  onSave: (link: Partial<WorkspaceLink> & Pick<WorkspaceLink, "title" | "url" | "audience" | "assignedUids">) => Promise<void>;
  onArchive: (link: WorkspaceLink) => Promise<void>;
  onRestore: (link: WorkspaceLink) => Promise<void>;
}) {
  const [editing, setEditing] = useState<WorkspaceLink | null>(null);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState(""); const [url, setUrl] = useState(""); const [description, setDescription] = useState("");
  const [audience, setAudience] = useState<"all" | "selected">("all"); const [assignedUids, setAssignedUids] = useState<string[]>([]);
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false); const [filter, setFilter] = useState<"all" | "favorites">("all");
  const [showArchived, setShowArchived] = useState(false);
  const visible = useMemo(() => links.filter((link) => (!!link.archived === showArchived) && (filter === "all" || favorites.includes(link.id))), [links, favorites, filter, showArchived]);
  const startCreate = () => { setEditing(null); setCreating(true); setTitle(""); setUrl(""); setDescription(""); setAudience("all"); setAssignedUids([]); setError(""); };
  const startEdit = (link: WorkspaceLink) => { setEditing(link); setCreating(true); setTitle(link.title); setUrl(link.url); setDescription(link.description || ""); setAudience(link.audience); setAssignedUids(link.assignedUids || []); setError(""); };
  const submit = async (event: React.FormEvent) => { event.preventDefault(); setError(""); let normalized: URL; try { normalized = new URL(url.trim()); if (normalized.protocol !== "https:") throw new Error(); } catch { setError("Enter a valid HTTPS site address."); return; }
    setBusy(true); try { const siteTitle = title.trim() || normalized.hostname.replace(/^www\./, ""); await onSave({ ...(editing ? { id: editing.id } : {}), title: siteTitle, url: normalized.toString(), description: description.trim(), audience, assignedUids: audience === "all" ? [] : assignedUids }); setCreating(false); } catch (err) { setError(err instanceof Error ? err.message : "Could not save this link."); } finally { setBusy(false); }
  };
  return <div className="space-y-5" data-scroll-motion-root>
    <header className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="flex items-center gap-2 text-xl font-bold text-[var(--text-primary)]"><BriefcaseBusiness className="h-5 w-5 text-blue-500" />Workspace</h2><p className="mt-1 text-sm text-[var(--text-muted)]">Your approved software and work links in one place. Favourite sites for quick access from the dashboard.</p></div>{isAdmin && <button onClick={startCreate} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white"><Plus className="h-4 w-4" />Add site</button>}</header>
    {isAdmin && links.some((link) => link.archived) && <button onClick={() => setShowArchived((value) => !value)} className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--text-muted)]">{showArchived ? "View active sites" : "View archived sites"}</button>}
    <div className="flex gap-2"><button onClick={() => setFilter("all")} className={`rounded-lg px-3 py-2 text-xs font-semibold ${filter === "all" ? "bg-blue-600 text-white" : "border border-[var(--border)] text-[var(--text-muted)]"}`}>All sites</button><button onClick={() => setFilter("favorites")} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold ${filter === "favorites" ? "bg-blue-600 text-white" : "border border-[var(--border)] text-[var(--text-muted)]"}`}><Heart className="h-3.5 w-3.5" />Favourites</button></div>
    {visible.length ? <WorkspaceCards links={visible} favorites={favorites} onToggleFavorite={onToggleFavorite} isAdmin={isAdmin} onEdit={startEdit} onArchive={onArchive} onRestore={onRestore} /> : <div className="rounded-xl border border-dashed border-[var(--border)] p-8 text-center text-sm text-[var(--text-muted)]">{filter === "favorites" ? "Favourite a site and it will appear here and at the top of your dashboard." : showArchived ? "No archived sites." : "No workspace sites have been added yet."}</div>}
    {creating && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-labelledby="workspace-form-title"><form onSubmit={(event) => void submit(event)} className="max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-5 shadow-2xl"><div className="flex items-center justify-between"><h3 id="workspace-form-title" className="text-lg font-bold text-[var(--text-primary)]">{editing ? "Edit workspace site" : "Add workspace site"}</h3><button type="button" onClick={() => setCreating(false)} aria-label="Close" className="rounded-lg p-2 text-[var(--text-muted)]"><X className="h-4 w-4" /></button></div><label className="block space-y-1 text-sm"><span className="font-medium text-[var(--text-primary)]">Site URL</span><input required type="url" value={url} onChange={(event) => { const next = event.target.value; setUrl(next); if (!title) { try { setTitle(new URL(next).hostname.replace(/^www\./, "")); } catch { /* wait for a complete URL */ } } }} placeholder="https://example.com" className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2" /></label><label className="block space-y-1 text-sm"><span className="font-medium text-[var(--text-primary)]">Display name</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Defaults to the site name" className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2" /></label><label className="block space-y-1 text-sm"><span className="font-medium text-[var(--text-primary)]">Description (optional)</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={2} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2" /></label><label className="block space-y-1 text-sm"><span className="font-medium text-[var(--text-primary)]">Who can see this?</span><select value={audience} onChange={(event) => setAudience(event.target.value as "all" | "selected")} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2"><option value="all">All staff</option><option value="selected">Selected staff</option></select></label>{audience === "selected" && <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-[var(--border)] p-2">{staff.filter((person) => person.uid).map((person) => <label key={person.uid} className="flex items-center gap-2 rounded px-2 py-1.5 text-sm text-[var(--text-primary)]"><input type="checkbox" checked={assignedUids.includes(person.uid!)} onChange={(event) => setAssignedUids((current) => event.target.checked ? [...current, person.uid!] : current.filter((uid) => uid !== person.uid))} />{person.name} <span className="text-xs text-[var(--text-muted)]">{person.email}</span></label>)}{staff.every((person) => !person.uid) && <p className="p-2 text-xs text-[var(--text-muted)]">No staff accounts are linked yet.</p>}</div>}{error && <p role="alert" className="rounded-lg bg-rose-500/10 p-3 text-sm text-rose-600">{error}</p>}<div className="flex justify-end gap-2"><button type="button" onClick={() => setCreating(false)} className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm">Cancel</button><button disabled={busy || (audience === "selected" && assignedUids.length === 0)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Saving…" : editing ? "Save changes" : "Add site"}</button></div></form></div>}
  </div>;
}
