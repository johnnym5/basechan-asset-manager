"use client";

import React from "react";
import { alignWeeklyReportMetrics } from "@/lib/reportingUtils";
import { ReportMetricDef, WeeklyReport } from "@/types/reporting";

const WEEK_COLORS = ["#2563eb", "#9333ea", "#0891b2", "#d97706", "#e11d48"];
const OFFER_STATUSES = [
  { key: "awaiting", label: "Awaiting Offer (AWO)", color: "#2563eb" },
  { key: "conditional", label: "Conditional Offer (CO)", color: "#d94b4b" },
  { key: "unconditional", label: "Unconditional Offer (UCO)", color: "#84b83f" },
] as const;
const CHANNELS = ["B2B", "B2C", "SUBAGENTS"] as const;

function getOfferStatus(metric: ReportMetricDef) {
  const value = `${metric.id} ${metric.label}`.toLowerCase();
  return OFFER_STATUSES.find((status) => value.includes(status.key));
}

export function WeeklyMetricsChart({ reports }: { reports: WeeklyReport[] }) {
  const allAligned = alignWeeklyReportMetrics(reports);
  const applicationReports = reports.flatMap((report) => {
    const application = (report.selectedTemplates || []).find((item) => item.templateSnapshot.kind === "APPLICATION");
    if (!application || !application.metrics.some((metric) => metric.group === "OFFER_STATUS")) return [];
    const channels = CHANNELS.map((channel) => {
      const statuses = OFFER_STATUSES.map((status) => {
        const metric = application.metrics.find((item) => item.group === "OFFER_STATUS" && item.channel === channel && getOfferStatus(item)?.key === status.key);
        return { ...status, value: metric ? application.values[metric.id] ?? 0 : 0 };
      });
      return { channel, statuses, total: statuses.reduce((sum, status) => sum + status.value, 0) };
    });
    return [{ reportId: report.id, weekLabel: `W${report.weekNumber} · ${report.year}`, channels }];
  });
  const maxValue = Math.max(1, ...applicationReports.flatMap((report) => report.channels.map((channel) => channel.total)));
  const pipelineMetrics = allAligned.metrics.filter((metric) => metric.group === "PIPELINE" || !metric.group);
  const pipelineHasValues = pipelineMetrics.some((metric) => allAligned.reports.some((report) => report.values[metric.id] !== null));
  const pipelineMax = Math.max(1, ...allAligned.reports.flatMap((report) => pipelineMetrics.map((metric) => report.values[metric.id] ?? 0)));

  if (allAligned.metrics.length === 0 || allAligned.reports.length === 0) return <div className="rounded-xl border border-[var(--border)] p-5 text-center text-xs text-[var(--text-muted)]">Select reports with numeric template metrics to display a graph.</div>;

  return <div className="space-y-5">
    {applicationReports.length > 0 && <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div><h3 className="font-bold text-sm text-[var(--text-primary)]">Offer status by application channel</h3><p className="mt-1 text-xs text-[var(--text-muted)]">Each stacked bar adds Awaiting, Conditional, and Unconditional offers to the channel application total.</p></div>
        <div className="flex flex-wrap gap-x-4 gap-y-2">{OFFER_STATUSES.map((status) => <span key={status.key} className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-[var(--text-muted)]"><i className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: status.color }} />{status.label}</span>)}</div>
      </div>
      <div className="relative overflow-x-auto pb-2 pl-9">
        <div className="relative flex min-w-[420px] items-stretch border-b border-l border-[var(--border)] sm:min-w-[540px]" style={{ height: 270, backgroundImage: "repeating-linear-gradient(to bottom, transparent 0, transparent 49px, var(--border) 50px)" }}>
          {[maxValue, Math.round(maxValue / 2), 0].map((tick, index) => <span key={`${tick}-${index}`} className="absolute -left-9 text-[9px] text-[var(--text-muted)]" style={{ top: index === 0 ? 0 : index === 1 ? "48%" : "96%" }}>{tick}</span>)}
          {CHANNELS.map((channel) => <div key={channel} className="flex min-w-0 flex-1 flex-col justify-end border-r border-[var(--border)]/50 px-2">
            <div className="flex h-full items-end justify-center gap-1 sm:gap-2">
              {applicationReports.map((report, reportIndex) => {
                const entry = report.channels.find((item) => item.channel === channel)!;
                const height = (entry.total / maxValue) * 82;
                return <div key={report.reportId} className="flex h-full w-7 flex-col items-center justify-end sm:w-10" title={`${report.weekLabel} · ${channel}: ${entry.total} applications`}>
                  {entry.total > 0 && <span className="mb-1 text-[9px] font-bold text-[var(--text-primary)]">{entry.total}</span>}
                  <div className="flex w-full flex-col-reverse overflow-hidden rounded-t-sm" style={{ height: `${height}%`, minHeight: entry.total > 0 ? 2 : 0, boxShadow: `inset 0 0 0 1px ${WEEK_COLORS[reportIndex % WEEK_COLORS.length]}` }}>
                    {entry.statuses.map((status) => <div key={status.key} title={`${status.label}: ${status.value}`} style={{ height: `${entry.total ? (status.value / entry.total) * 100 : 0}%`, minHeight: status.value > 0 ? 2 : 0, backgroundColor: status.color }} />)}
                  </div>
                  <span className="mt-1 text-[9px] font-semibold text-[var(--text-muted)]">{report.weekLabel.split(" · ")[0]}</span>
                </div>;
              })}
            </div>
            <span className="mt-2 h-5 text-center text-[10px] font-bold text-[var(--text-primary)]">{channel === "SUBAGENTS" ? "Subagents" : channel}</span>
          </div>)}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">{applicationReports.map((report, index) => <span key={report.reportId} className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-[var(--text-muted)]"><i className="h-2.5 w-2.5 rounded-sm border-2" style={{ borderColor: WEEK_COLORS[index % WEEK_COLORS.length] }} />{report.weekLabel}</span>)}</div>
      </div>
    </section>}

    {pipelineHasValues && <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-6">
      <div className="mb-5"><h3 className="font-bold text-sm text-[var(--text-primary)]">Other weekly metrics</h3><p className="mt-1 text-xs text-[var(--text-muted)]">Metrics on the X-axis · counts on the Y-axis</p></div>
      <div className="relative overflow-x-auto pb-1">
        <div className="flex min-w-max items-end gap-2 border-b border-l border-[var(--border)] pl-2 pr-2 pt-2" style={{ height: 250 }}>
          {pipelineMetrics.map((metric) => <div key={metric.id} className="flex h-full w-28 shrink-0 flex-col justify-end">
            <div className="flex h-full items-end justify-center gap-1 border-b border-dashed border-[var(--border)] px-1">
              {allAligned.reports.map((report, index) => {
                const value = report.values[metric.id];
                return <div key={report.reportId} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end" title={`${report.weekLabel} · ${metric.label}: ${value === null ? "No value" : value}`}>
                  {value !== null && <span className="mb-1 text-[9px] font-bold text-[var(--text-muted)]">{value.toLocaleString()}</span>}
                  <div className="w-full max-w-7 rounded-t-sm" style={{ height: value === null ? 0 : `${Math.max(value === 0 ? 1 : 3, (value / pipelineMax) * 75)}%`, backgroundColor: WEEK_COLORS[index % WEEK_COLORS.length] }} />
                </div>;
              })}
            </div>
            <span className="mt-2 block h-8 overflow-hidden text-ellipsis text-center text-[10px] font-semibold leading-4 text-[var(--text-primary)]" title={metric.label}>{metric.label}</span>
          </div>)}
        </div>
        <div className="absolute left-0 top-2 flex h-[220px] flex-col justify-between text-[9px] text-[var(--text-muted)]" aria-hidden="true"><span>{pipelineMax.toLocaleString()}</span><span>{Math.round(pipelineMax / 2).toLocaleString()}</span><span>0</span></div>
      </div>
    </section>}
  </div>;
}
