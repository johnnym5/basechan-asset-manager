"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { MODAL_BACKDROP_VARIANTS, MODAL_CONTENT_VARIANTS, SPRING_TRANSITION } from "@/lib/motion";
import { AccessGrant, GrantAction, GrantScope, ResourceKey, StaffMember } from "@/types/assets";
import { X, Save } from "lucide-react";

const RESOURCES: { key: ResourceKey; label: string; sensitive?: boolean }[] = [
  { key: "staff_inventory", label: "Staff directory" },
  { key: "physical_assets", label: "Physical hardware" },
  { key: "digital_credentials", label: "Credential vault", sensitive: true },
  { key: "workbooks", label: "Workbooks" },
  { key: "facilities", label: "Facilities" },
];
const ACTIONS: { key: GrantAction; label: string }[] = [
  { key: "read", label: "View outside default access" }, { key: "create", label: "Create" },
  { key: "edit", label: "Edit" }, { key: "archive", label: "Archive" },
  { key: "restore", label: "Restore" },
];

interface Props { staff: StaffMember; current?: AccessGrant; onClose: () => void; onSave: (grant: AccessGrant) => Promise<void>; }

export const AccessGrantModal: React.FC<Props> = ({ staff, current, onClose, onSave }) => {
  const [grants, setGrants] = useState<AccessGrant["grants"]>(current?.grants || {});
  const [secretWrite, setSecretWrite] = useState(current?.grants.digital_credentials?.actions.includes("secretWrite") || false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const toggle = (resource: ResourceKey, action: GrantAction) => setGrants((prev) => {
    const existing = prev[resource] || { actions: [], scope: "assigned" as GrantScope };
    const actions = existing.actions.includes(action) ? existing.actions.filter((value) => value !== action) : [...existing.actions, action];
    return { ...prev, [resource]: { ...existing, actions } };
  });

  const setScope = (resource: ResourceKey, scope: GrantScope) => setGrants((prev) => ({ ...prev, [resource]: { actions: prev[resource]?.actions || [], scope } }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const result = { ...grants };
      if (secretWrite) {
        const existing = result.digital_credentials || { actions: [], scope: "assigned" as GrantScope };
        result.digital_credentials = { ...existing, actions: Array.from(new Set([...existing.actions, "secretWrite" as GrantAction])) };
      } else if (result.digital_credentials) {
        result.digital_credentials = { ...result.digital_credentials, actions: result.digital_credentials.actions.filter((action) => action !== "secretWrite") };
      }
      await onSave({ uid: staff.uid!, email: staff.email, branch: staff.branch, department: staff.department, grants: result });
      onClose();
    } catch (err) { setError(err instanceof Error ? err.message : "Could not save access grants."); }
    finally { setBusy(false); }
  };

  if (!staff.uid) return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4"><div className="max-w-md rounded-xl bg-[var(--bg-surface)] p-6 text-[var(--text-primary)]"><h2 className="font-bold">Staff member must sign in first</h2><p className="mt-2 text-sm text-[var(--text-muted)]">This staff member needs to sign in with Google once before an account-specific grant can be assigned.</p><button onClick={onClose} className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white">Close</button></div></div>;

  return (
    <motion.div
      key="access-grant-backdrop"
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={MODAL_BACKDROP_VARIANTS}
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Manage staff access"
      onClick={onClose}
    >
      <motion.form
        key="access-grant-content"
        variants={MODAL_CONTENT_VARIANTS}
        transition={SPRING_TRANSITION}
        onSubmit={submit}
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
      <header className="flex items-center justify-between border-b border-[var(--border)] p-5"><div><h2 className="text-lg font-bold">Manage page access</h2><p className="text-sm text-[var(--text-muted)]">{staff.name} · {staff.email}</p></div><button type="button" onClick={onClose} aria-label="Close"><X className="h-5 w-5" /></button></header>
      <div className="space-y-3 p-5">{RESOURCES.map((resource) => <section key={resource.key} className="rounded-xl border border-[var(--border)] p-4"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><h3 className="font-semibold">{resource.label}</h3><select value={grants[resource.key]?.scope || "assigned"} onChange={(event) => setScope(resource.key, event.target.value as GrantScope)} className="rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-sm"><option value="assigned">Assigned records</option><option value="branch">Branch / department records</option><option value="all">All records</option></select></div><div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">{ACTIONS.map((action) => <label key={action.key} className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={grants[resource.key]?.actions.includes(action.key) || false} onChange={() => toggle(resource.key, action.key)} />{action.label}</label>)}</div>{resource.sensitive && <label className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-amber-700"><input type="checkbox" checked={secretWrite} onChange={(event) => setSecretWrite(event.target.checked)} />Change stored credential secrets</label>}</section>)}</div>
      {error && <p role="alert" className="mx-5 mb-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      <footer className="flex justify-end gap-2 border-t border-[var(--border)] p-5"><button type="button" onClick={onClose} className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm">Cancel</button><button disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"><Save className="h-4 w-4" />{busy ? "Saving…" : "Save access"}</button></footer>
    </motion.form>
  </motion.div>
  );
};
