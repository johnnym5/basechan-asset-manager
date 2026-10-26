"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Copy, Plus, Save, Send, Trash2 } from "lucide-react";
import { getISOWeekDetails, validateApplicationCounts } from "@/lib/reportingUtils";
import { buildUniversalDefaultTemplate, deletePersonalReportTemplate, fetchPersonalReportTemplates, fetchSharedReportTemplates, fetchUserWeeklyReportsHistory, saveAssignedWeeklyReportDraft, savePersonalReportTemplate, submitAssignedWeeklyReport } from "@/lib/reportingService";
import { PersonalReportTemplate, ReportMetricDef, SelectedReportTemplate, SharedReportTemplate, WeeklyReport } from "@/types/reporting";
import { WeeklyMetricsChart } from "./WeeklyMetricsChart";

interface Props { userId: string; userName: string; userEmail: string; isAdmin: boolean; canGenerate: boolean; }
type WizardStep = 1 | 2;

function selectTemplate(template: SharedReportTemplate): SelectedReportTemplate {
  const metrics = template.metrics.map((metric) => ({ ...metric }));
  return { templateId: template.id, templateSnapshot: template, metrics, values: Object.fromEntries(metrics.map((metric) => [metric.id, null])), metricIds: metrics.map((metric) => metric.id) };
}

function cloneForWizard(template: SharedReportTemplate): SelectedReportTemplate {
  const selected = selectTemplate(template);
  return { ...selected, values: {} };
}

export function AssignedReportEditor({ userId, userName, userEmail, isAdmin, canGenerate }: Props) {
  const week = useMemo(() => getISOWeekDetails(), []);
  const [templates, setTemplates] = useState<PersonalReportTemplate[]>([]);
  const [sharedTemplates, setSharedTemplates] = useState<SharedReportTemplate[]>([]);
  const [selected, setSelected] = useState<SelectedReportTemplate[]>([]);
  const [history, setHistory] = useState<WeeklyReport[]>([]);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [reportStatus, setReportStatus] = useState<WeeklyReport["status"]>("DRAFT");
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<WizardStep>(1);
  const [wizardTemplate, setWizardTemplate] = useState<SelectedReportTemplate | null>(null);
  const [wizardName, setWizardName] = useState("");
  const [wizardMetricLabel, setWizardMetricLabel] = useState("");
  const [wizardSourceId, setWizardSourceId] = useState<string | null>(null);

  const reportId = `${userId}_${week.year}_W${String(week.weekNumber).padStart(2, "0")}_weekly_applications`;
  const applicationTemplate = selected.find((item) => item.templateSnapshot.kind === "APPLICATION");
  const applicationValues = applicationTemplate?.values || {};
  const validation = applicationTemplate ? validateApplicationCounts(applicationValues, applicationTemplate.metrics) : null;

  const reloadTemplates = async () => {
    const rows = await fetchPersonalReportTemplates(userId);
    setTemplates(rows);
    return rows;
  };

  useEffect(() => {
    let active = true;
    (async () => {
      setBusy(true);
      try {
        const [personal, shared, reports] = await Promise.all([
          fetchPersonalReportTemplates(userId),
          fetchSharedReportTemplates(),
          fetchUserWeeklyReportsHistory(userId),
        ]);
        if (!active) return;
        setTemplates(personal);
        setSharedTemplates(shared);
        const current = reports.find((report) => report.id === reportId);
        setHistory(reports.filter((report) => report.status === "SUBMITTED" && report.id !== reportId));
        if (current?.selectedTemplates?.length) {
          setSelected(current.selectedTemplates);
          setReportStatus(current.status);
        }
        if (canGenerate && personal.length === 0) {
          setWizardTemplate(cloneForWizard(buildUniversalDefaultTemplate(userId)));
          setWizardName(""); setWizardSourceId(null); setWizardStep(1); setWizardOpen(true);
        }
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Could not load your report templates.");
      } finally {
        if (active) setBusy(false);
      }
    })();
    return () => { active = false; };
  }, [userId, canGenerate, reportId]);

  const openWizard = (source: SharedReportTemplate, existingId: string | null) => {
    setWizardTemplate(cloneForWizard(source));
    setWizardName(existingId ? source.name : "");
    setWizardSourceId(existingId ? ((source as PersonalReportTemplate).sourceTemplateId || null) : (source.id === "weekly_report_starter" ? null : source.id));
    setWizardStep(1);
    setWizardOpen(true);
    setMessage("");
  };

  const closeWizard = () => { setWizardOpen(false); setWizardTemplate(null); setWizardMetricLabel(""); };

  const toggleTemplate = (template: PersonalReportTemplate) => {
    if (reportStatus === "SUBMITTED") return;
    setSelected((previous) => {
      const existing = previous.find((item) => item.templateId === template.id);
      if (existing) return previous.filter((item) => item.templateId !== template.id);
      if (template.kind === "APPLICATION" && previous.some((item) => item.templateSnapshot.kind === "APPLICATION")) { setMessage("Use one Application template per week so the application totals stay unambiguous."); return previous; }
      if (previous.length >= 5) { setMessage("A weekly report can use up to five templates."); return previous; }
      return [...previous, selectTemplate(template)];
    });
    setMessage("");
  };

  const updateValue = (templateId: string, metricId: string, value: string) => setSelected((previous) => previous.map((item) => item.templateId !== templateId ? item : { ...item, values: { ...item.values, [metricId]: value === "" ? null : Number(value) } }));

  const updateWizardLabel = (metricId: string, label: string) => setWizardTemplate((current) => !current ? current : ({ ...current, metrics: current.metrics.map((metric) => metric.id === metricId ? { ...metric, label } : metric), metricIds: current.metrics.map((metric) => metric.id) }));

  const removeWizardMetric = (metricId: string) => setWizardTemplate((current) => !current ? current : ({
    ...current,
    metrics: current.metrics.filter((metric) => metric.id !== metricId),
    metricIds: current.metrics.filter((metric) => metric.id !== metricId).map((metric) => metric.id),
    values: Object.fromEntries(Object.entries(current.values).filter(([id]) => id !== metricId)),
  }));

  const addWizardMetric = () => {
    if (!wizardTemplate || !wizardMetricLabel.trim()) return;
    const label = wizardMetricLabel.trim();
    const base = `staff_${label.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`;
    let id = base; let suffix = 2;
    while (wizardTemplate.metrics.some((metric) => metric.id === id)) id = `${base}_${suffix++}`;
    const metric: ReportMetricDef = { id, label, type: "number", group: "PIPELINE" };
    setWizardTemplate((current) => current ? ({ ...current, metrics: [...current.metrics, metric], metricIds: [...current.metrics.map((row) => row.id), id] }) : current);
    setWizardMetricLabel("");
  };

  const saveWizardTemplate = async () => {
    if (!wizardTemplate || !wizardName.trim()) { setMessage("Give your template a name before saving."); return; }
    setSaving(true); setMessage("");
    try {
      const existingId = wizardTemplate.templateId.startsWith(`${userId}_`) ? wizardTemplate.templateId : null;
      const template: PersonalReportTemplate = {
        ...wizardTemplate.templateSnapshot,
        id: existingId || `${userId}_${Date.now()}`,
        name: wizardName.trim(),
        metrics: wizardTemplate.metrics.map((metric) => ({ ...metric })),
        ownerUid: userId,
        sourceTemplateId: wizardSourceId,
        createdBy: userId,
        updatedBy: userId,
      };
      await savePersonalReportTemplate(template, userId);
      const rows = await reloadTemplates();
      setTemplates(rows);
      closeWizard();
      setMessage(`${template.name} is saved. Choose it below to add it to this week's report.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save your personal template."); }
    finally { setSaving(false); }
  };

  const removeTemplate = async (template: PersonalReportTemplate) => {
    if (!window.confirm(`Delete “${template.name}” from your template library? Existing report snapshots will remain.`)) return;
    setSaving(true);
    try {
      await deletePersonalReportTemplate(template.id, userId);
      setTemplates((previous) => previous.filter((item) => item.id !== template.id));
      setSelected((previous) => previous.filter((item) => item.templateId !== template.id));
      setMessage(`${template.name} was removed from your library. Existing reports are unchanged.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not delete this template."); }
    finally { setSaving(false); }
  };

  const makeReport = (): WeeklyReport & { selectedTemplates: SelectedReportTemplate[] } => ({
    id: reportId, userId, userName, ownerEmail: userEmail, year: week.year, month: week.month,
    weekNumber: week.weekNumber, weekStartDate: week.weekStartDate, weekEndDate: week.weekEndDate,
    status: reportStatus === "SUBMITTED" ? "SUBMITTED" : "DRAFT", snapshotTemplate: [], data: {}, totals: {}, selectedTemplates: selected,
    applicationTemplateId: selected.find((item) => item.templateSnapshot.kind === "APPLICATION")?.templateId || null,
  } as WeeklyReport & { selectedTemplates: SelectedReportTemplate[] });

  const saveDraft = async () => {
    setSaving(true); setMessage("");
    try {
      await saveAssignedWeeklyReportDraft({ ...makeReport(), status: "DRAFT" }, isAdmin);
      setReportStatus("DRAFT"); setMessage("Draft saved.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save draft."); }
    finally { setSaving(false); }
  };

  const submit = async () => {
    if (applicationTemplate && validation && !validation.valid) { setMessage("Fix the enabled Application totals before submitting."); return; }
    if (selected.length === 0) { setMessage("Choose at least one template before submitting."); return; }
    setSaving(true); setMessage("");
    try {
      await saveAssignedWeeklyReportDraft({ ...makeReport(), status: "DRAFT" }, isAdmin);
      await submitAssignedWeeklyReport(reportId, selected);
      setReportStatus("SUBMITTED"); setMessage("Weekly report submitted.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not submit report."); }
    finally { setSaving(false); }
  };

  const graphReport: WeeklyReport = { ...makeReport(), status: reportStatus };
  const graphReports = [...history.filter((report) => compareIds.includes(report.id)), ...(selected.length ? [graphReport] : [])];

  if (busy) return <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-8 text-center text-sm text-[var(--text-muted)]">Loading your report setup…</div>;

  if (wizardOpen && wizardTemplate) return <div className="space-y-5">
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-5 sm:p-7">
      <div className="mb-5 flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wider text-blue-600">Report template setup</p><h2 className="mt-1 text-xl font-bold text-[var(--text-primary)]">{wizardStep === 1 ? "Make this template yours" : "Name and save your template"}</h2><p className="mt-1 max-w-2xl text-sm text-[var(--text-muted)]">{wizardStep === 1 ? "Start with the shared weekly default. Rename, remove, or add metrics to fit your weekly workflow." : "Save this version to your personal template library. You can edit it later or make another template."}</p></div><span className="shrink-0 rounded-full bg-blue-500/10 px-3 py-1.5 text-xs font-bold text-blue-700">Stage {wizardStep} of 2</span></div>
      <div className="mb-6 flex items-center gap-2"><span className="h-1.5 flex-1 rounded-full bg-blue-600" /><span className={`h-1.5 flex-1 rounded-full ${wizardStep === 2 ? "bg-blue-600" : "bg-[var(--bg-muted)]"}`} /></div>
      {wizardStep === 1 ? <>
        <div className="mb-4 flex flex-wrap gap-2">{sharedTemplates.map((template) => <button key={template.id} type="button" onClick={() => openWizard(template, null)} className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold ${wizardSourceId === template.id ? "border-blue-500 bg-blue-500/10 text-blue-700" : "border-[var(--border)] text-[var(--text-muted)]"}`}><Copy className="h-3.5 w-3.5" />Copy {template.name}</button>)}</div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{wizardTemplate.metrics.map((metric) => <div key={metric.id} className="flex items-end gap-2"><label className="min-w-0 flex-1 space-y-1 text-xs font-semibold text-[var(--text-primary)]"><span>Metric name</span><input value={metric.label} onChange={(event) => updateWizardLabel(metric.id, event.target.value)} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2" /></label><button type="button" onClick={() => removeWizardMetric(metric.id)} className="mb-0.5 rounded-lg p-2 text-rose-600 hover:bg-rose-500/10" title={`Remove ${metric.label}`} aria-label={`Remove ${metric.label}`}><Trash2 className="h-4 w-4" /></button></div>)}</div>
        <div className="mt-4 flex gap-2"><input value={wizardMetricLabel} onChange={(event) => setWizardMetricLabel(event.target.value)} onKeyDown={(event) => event.key === "Enter" && addWizardMetric()} placeholder="Add a metric" className="min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-sm" /><button type="button" onClick={addWizardMetric} className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--bg-muted)] px-4 py-2 text-xs font-semibold"><Plus className="h-4 w-4" />Add metric</button></div>
        <div className="mt-6 flex flex-wrap justify-between gap-2"><button type="button" onClick={closeWizard} className="rounded-lg border border-[var(--border)] px-4 py-2 text-xs font-semibold">Cancel setup</button><button type="button" onClick={() => setWizardStep(2)} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white">Next: name template <ArrowRight className="h-4 w-4" /></button></div>
      </> : <>
        <label className="block max-w-xl space-y-2 text-sm font-semibold text-[var(--text-primary)]"><span>What should this report template be called?</span><input autoFocus value={wizardName} onChange={(event) => setWizardName(event.target.value)} placeholder="e.g. Weekly Applications" className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-3" /></label>
        <p className="mt-4 rounded-xl bg-[var(--bg-muted)]/60 p-4 text-xs leading-5 text-[var(--text-muted)]">You can reuse this template for future weekly reports. Changing it later will not change reports you have already submitted.</p>
        <div className="mt-6 flex flex-wrap justify-between gap-2"><button type="button" onClick={() => setWizardStep(1)} className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-4 py-2 text-xs font-semibold"><ArrowLeft className="h-4 w-4" />Back to metrics</button><button type="button" disabled={saving || !wizardName.trim()} onClick={() => void saveWizardTemplate()} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"><Save className="h-4 w-4" />{saving ? "Saving…" : "Save my template"}</button></div>
      </>}
      {message && <p role="status" className="mt-4 text-xs font-semibold text-[var(--text-muted)]">{message}</p>}
    </section>
  </div>;

  if (!canGenerate) return <div className="space-y-5"><div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 text-sm text-[var(--text-muted)]">You can view your report history. Ask an administrator to grant report generation access to create or submit reports.</div><section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4"><h3 className="mb-3 text-sm font-bold">Compare submitted weeks</h3><div className="flex flex-wrap gap-2">{history.map((report) => <label key={report.id} className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-xs"><input type="checkbox" checked={compareIds.includes(report.id)} onChange={(event) => setCompareIds((previous) => event.target.checked ? [...previous, report.id] : previous.filter((id) => id !== report.id))} />Week {report.weekNumber} · {report.year}</label>)}</div></section>{compareIds.length > 0 && <WeeklyMetricsChart reports={history.filter((report) => compareIds.includes(report.id))} />}</div>;

  return <div className="space-y-5">
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-base font-bold text-[var(--text-primary)]">Week {week.weekNumber} · {week.year}</h2><p className="text-xs text-[var(--text-muted)]">Choose up to five of your saved templates. Save a draft at any time, or submit once the enabled totals are correct.</p></div><span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-600">{selected.length}/5 templates</span></div>
      <div className="mb-4 flex flex-wrap items-center gap-2"><button type="button" onClick={() => openWizard(buildUniversalDefaultTemplate(userId), null)} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white"><Plus className="h-3.5 w-3.5" />Create personal template</button><span className="text-[10px] text-[var(--text-muted)]">Your templates are private to your account.</span></div>
      {templates.length === 0 ? <p className="rounded-xl bg-amber-500/10 p-4 text-sm text-amber-700">Create and save a template before starting this week’s report.</p> : <div className="flex flex-wrap gap-2">{templates.map((template) => <div key={template.id} className="inline-flex items-stretch overflow-hidden rounded-xl border border-[var(--border)]"><button type="button" onClick={() => toggleTemplate(template)} disabled={reportStatus === "SUBMITTED"} className={`px-3 py-2 text-xs font-semibold ${selected.some((item) => item.templateId === template.id) ? "bg-blue-500/10 text-blue-700" : "text-[var(--text-muted)]"}`}>{selected.some((item) => item.templateId === template.id) ? "✓ " : "＋ "}{template.name}</button><button type="button" onClick={() => openWizard(template, template.id)} disabled={reportStatus === "SUBMITTED"} className="border-l border-[var(--border)] px-2 text-[10px] font-semibold text-[var(--text-muted)]">Edit</button><button type="button" onClick={() => void removeTemplate(template)} disabled={saving || reportStatus === "SUBMITTED"} className="border-l border-[var(--border)] px-2 text-rose-600 disabled:opacity-40" aria-label={`Delete ${template.name}`}><Trash2 className="h-3.5 w-3.5" /></button></div>)}</div>}
      {selected.map((item) => <div key={item.templateId} className="mt-5 rounded-xl border border-[var(--border)] p-4"><h3 className="mb-3 font-bold text-sm text-[var(--text-primary)]">{item.templateSnapshot.name}</h3><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{item.metrics.map((metric) => <label key={metric.id} className="space-y-1 text-xs font-semibold text-[var(--text-primary)]">{metric.label}<input type="number" min="0" step={metric.group === "PIPELINE" ? "any" : "1"} value={item.values[metric.id] ?? ""} disabled={reportStatus === "SUBMITTED"} onChange={(event) => updateValue(item.templateId, metric.id, event.target.value)} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2" /></label>)}</div></div>)}
      {applicationTemplate && validation && <div className={`mt-5 rounded-xl p-3 text-xs ${validation.valid ? "bg-emerald-500/10 text-emerald-700" : "bg-amber-500/10 text-amber-800"}`}><strong>Application checks:</strong> {applicationTemplate.metrics.some((metric) => metric.id === "total_applications" && metric.group !== "PIPELINE") ? `Channels ${validation.expectedTotal} / Total ${applicationValues.total_applications ?? "—"}.` : "Only the checks supported by your template metrics are active."} {validation.errors.slice(0, 8).join(" ")}</div>}
      {reportStatus !== "SUBMITTED" && <div className="mt-5 flex flex-wrap gap-2"><button type="button" disabled={saving} onClick={() => void saveDraft()} className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-bold disabled:opacity-50"><Save className="h-4 w-4" />{saving ? "Saving…" : "Save draft"}</button><button type="button" disabled={saving || selected.length === 0 || (!!validation && !validation.valid)} onClick={() => void submit()} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"><Send className="h-4 w-4" />Submit report</button></div>}
      {message && <p role="status" className="mt-3 text-xs font-semibold text-[var(--text-muted)]">{message}</p>}
    </section>
    {history.length > 0 && <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4"><h3 className="mb-3 text-sm font-bold">Compare with previous submitted weeks</h3><div className="flex flex-wrap gap-2">{history.map((report) => <label key={report.id} className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-xs"><input type="checkbox" checked={compareIds.includes(report.id)} onChange={(event) => setCompareIds((previous) => event.target.checked ? [...previous, report.id] : previous.filter((id) => id !== report.id))} />Week {report.weekNumber} · {report.year}</label>)}</div></section>}
    {graphReports.length > 0 && <WeeklyMetricsChart reports={graphReports} />}
  </div>;
}
