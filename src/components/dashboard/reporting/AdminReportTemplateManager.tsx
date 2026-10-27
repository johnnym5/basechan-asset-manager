"use client";

import React, { useEffect, useState } from "react";
import { Plus, Save, Shield, Users } from "lucide-react";
import { StaffMember } from "@/types/assets";
import { ReportMetricDef, SharedReportTemplate } from "@/types/reporting";
import { buildDefaultApplicationTemplate, buildDefaultLeadTemplate, fetchSharedReportTemplates, saveSharedReportTemplate } from "@/lib/reportingService";

interface Props { adminUid: string; staffList: StaffMember[]; onManageAccess?: (staff: StaffMember) => void | Promise<void>; }

export function AdminReportTemplateManager({ adminUid, staffList, onManageAccess }: Props) {
  const [templates, setTemplates] = useState<SharedReportTemplate[]>([]);
  const [activeTemplateId, setActiveTemplateId] = useState("");
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState("");
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateKind, setNewTemplateKind] = useState<SharedReportTemplate["kind"]>("LEAD");
  const [newMetric, setNewMetric] = useState("");

  const load = async () => {
    setBusy(true);
    try {
      let rows = await fetchSharedReportTemplates();
      const kinds = new Set(rows.map((template) => template.kind));
      if (!kinds.has("APPLICATION")) await saveSharedReportTemplate(buildDefaultApplicationTemplate(adminUid), adminUid);
      if (!kinds.has("LEAD")) await saveSharedReportTemplate(buildDefaultLeadTemplate(adminUid), adminUid);
      rows = await fetchSharedReportTemplates();
      setTemplates(rows);
      setActiveTemplateId((current) => rows.some((template) => template.id === current) ? current : rows[0]?.id || "");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not load report templates."); }
    finally { setBusy(false); }
  };

  useEffect(() => { void load(); }, [adminUid, staffList]);
  const activeTemplate = templates.find((template) => template.id === activeTemplateId);

  const saveTemplate = async (updated: SharedReportTemplate) => {
    setMessage("");
    try {
      await saveSharedReportTemplate(updated, adminUid);
      setTemplates((previous) => previous.map((template) => template.id === updated.id ? updated : template));
      setMessage(`${updated.name} template saved.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save template."); }
  };

  const createTemplate = async () => {
    const name = newTemplateName.trim();
    if (!name) return;
    const id = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "_")}_${Date.now()}`;
    const template: SharedReportTemplate = newTemplateKind === "APPLICATION"
      ? { ...buildDefaultApplicationTemplate(adminUid), id, name }
      : { id, name, kind: "LEAD", metrics: [], createdBy: adminUid, updatedBy: adminUid };
    await saveTemplate(template); setActiveTemplateId(id); setNewTemplateName("");
    setTemplates((previous) => [...previous, template]);
  };

  const updateMetric = (metricId: string, update: Partial<ReportMetricDef>) => {
    if (!activeTemplate) return;
    setTemplates((previous) => previous.map((template) => template.id !== activeTemplate.id ? template : { ...template, metrics: template.metrics.map((metric) => metric.id === metricId ? { ...metric, ...update } : metric) }));
  };

  const addMetric = () => {
    if (!activeTemplate || !newMetric.trim()) return;
    const id = `${activeTemplate.id}_${Date.now()}`;
    setTemplates((previous) => previous.map((template) => template.id !== activeTemplate.id ? template : { ...template, metrics: [...template.metrics, { id, label: newMetric.trim(), type: "number" }] }));
    setNewMetric("");
  };

  const removeMetric = (metricId: string) => activeTemplate && setTemplates((previous) => previous.map((template) => template.id !== activeTemplate.id ? template : { ...template, metrics: template.metrics.filter((metric) => metric.id !== metricId) }));

  return <div className="space-y-5">
    <header className="rounded-2xl border border-amber-500/20 bg-[var(--bg-surface)] p-5"><div className="flex items-center gap-2"><Shield className="h-5 w-5 text-amber-500" /><h2 className="text-lg font-bold">Shared report templates</h2></div><p className="mt-1 text-xs text-[var(--text-muted)]">The Weekly Report Starter is available to every staff member who has report generation access. Staff copy it or another shared template into their private library, then customize and name their own version. Grant access through Manage Access.</p></header>
    {busy ? <div className="rounded-xl border border-[var(--border)] p-6 text-sm text-[var(--text-muted)]">Loading shared templates…</div> : <div className="grid gap-5 lg:grid-cols-2">
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4"><div className="mb-4 flex items-center justify-between gap-2"><h3 className="font-bold">Shared templates</h3><button onClick={() => void saveTemplate(activeTemplate!)} disabled={!activeTemplate} className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"><Save className="h-3.5 w-3.5" />Save</button></div>
        <div className="mb-4 flex flex-wrap gap-2">{templates.map((template) => <button key={template.id} type="button" onClick={() => setActiveTemplateId(template.id)} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${activeTemplateId === template.id ? "border-blue-500 bg-blue-500/10 text-blue-700" : "border-[var(--border)]"}`}>{template.name} <span className="opacity-60">({template.kind})</span></button>)}</div>
        <div className="mb-3 flex flex-col gap-2 sm:flex-row"><input value={newTemplateName} onChange={(event) => setNewTemplateName(event.target.value)} placeholder="New template name" className="min-h-11 min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-xs" /><div className="flex gap-2"><select value={newTemplateKind} onChange={(event) => setNewTemplateKind(event.target.value as SharedReportTemplate["kind"])} className="min-h-11 min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-2 text-xs"><option value="APPLICATION">Application</option><option value="LEAD">Lead</option></select><button type="button" onClick={() => void createTemplate()} className="inline-flex min-h-11 items-center justify-center gap-1 rounded-lg bg-[var(--bg-muted)] px-3 py-2 text-xs font-semibold"><Plus className="h-3.5 w-3.5" />Create</button></div></div>
        {activeTemplate && <><h4 className="mb-2 text-sm font-bold">{activeTemplate.name} metrics</h4><div className="max-h-[420px] space-y-2 overflow-auto">{activeTemplate.metrics.map((metric) => <div key={metric.id} className="flex gap-2"><input value={metric.label} onChange={(event) => updateMetric(metric.id, { label: event.target.value })} className="min-h-11 min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-xs" /><button type="button" disabled={activeTemplate.kind === "APPLICATION" && metric.group !== "PIPELINE"} onClick={() => removeMetric(metric.id)} className="min-h-11 rounded-lg px-3 text-xs text-rose-600 disabled:opacity-30" aria-label={`Remove ${metric.label}`}>Remove</button></div>)}</div><div className="mt-3 flex flex-col gap-2 sm:flex-row"><input value={newMetric} onChange={(event) => setNewMetric(event.target.value)} placeholder="Add metric" className="min-h-11 min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-xs" /><button type="button" onClick={addMetric} className="inline-flex min-h-11 items-center justify-center gap-1 rounded-lg bg-[var(--bg-muted)] px-3 py-2 text-xs font-semibold"><Plus className="h-3.5 w-3.5" />Add</button></div></>}
      </section>
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4"><div className="mb-4 flex items-center gap-2"><Users className="h-4 w-4 text-blue-500" /><h3 className="font-bold">Staff report access</h3></div><p className="mb-3 text-xs leading-5 text-[var(--text-muted)]">Template availability follows reporting permissions. Each staff member’s personal template library is private to them and does not need individual template assignment.</p><div className="max-h-[650px] divide-y divide-[var(--border)] overflow-auto">{staffList.map((staff) => <div key={staff.id} className="flex flex-wrap items-center justify-between gap-2 py-3"><div><p className="text-sm font-semibold">{staff.name}</p><p className="text-[10px] text-[var(--text-muted)]">{staff.email}</p></div><button onClick={() => void onManageAccess?.(staff)} className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-bold">Manage access</button></div>)}</div></section>
    </div>}
    {message && <p role="status" className="rounded-lg bg-blue-500/10 p-3 text-xs font-semibold text-blue-700">{message}</p>}
  </div>;
}
