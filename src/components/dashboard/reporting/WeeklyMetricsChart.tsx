"use client";

import React from "react";
import { alignWeeklyReportMetrics } from "@/lib/reportingUtils";
import { WeeklyReport } from "@/types/reporting";

const SERIES_COLORS = ["#2563eb", "#059669", "#d97706", "#9333ea", "#e11d48", "#0891b2"];

export function WeeklyMetricsChart({ reports }: { reports: WeeklyReport[] }) {
  const aligned = alignWeeklyReportMetrics(reports);
  const maxValue = Math.max(1, ...aligned.reports.flatMap((report) => Object.values(report.values).filter((value): value is number => value !== null)));

  if (aligned.metrics.length === 0 || aligned.reports.length === 0) return <div className="rounded-xl border border-[var(--border)] p-5 text-center text-xs text-[var(--text-muted)]">Select reports with numeric template metrics to display a graph.</div>;

  return <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-6">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div><h3 className="font-bold text-sm text-[var(--text-primary)]">Weekly report comparison</h3><p className="mt-1 text-xs text-[var(--text-muted)]">Metrics on the X-axis · counts on the Y-axis</p></div>
      <div className="flex flex-wrap gap-3">{aligned.reports.map((report, index) => <span key={report.reportId} className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-[var(--text-muted)]"><i className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: SERIES_COLORS[index % SERIES_COLORS.length] }} />{report.weekLabel}</span>)}</div>
    </div>
    <div className="relative overflow-x-auto pb-1">
      <div className="flex min-w-max items-end gap-2 border-b border-l border-[var(--border)] pl-2 pr-2 pt-2" style={{ height: 250 }}>
        {aligned.metrics.map((metric) => <div key={metric.id} className="flex h-full w-28 shrink-0 flex-col justify-end">
          <div className="flex h-full items-end justify-center gap-1 border-b border-dashed border-[var(--border)] px-1">
            {aligned.reports.map((report, index) => {
              const value = report.values[metric.id];
              return <div key={report.reportId} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end" title={`${report.weekLabel} · ${metric.label}: ${value === null ? "No value" : value}`}>
                {value !== null && <span className="mb-1 text-[9px] font-bold text-[var(--text-muted)]">{value.toLocaleString()}</span>}
                <div className="w-full max-w-7 rounded-t-sm" style={{ height: value === null ? 0 : `${Math.max(value === 0 ? 1 : 3, (value / maxValue) * 75)}%`, backgroundColor: SERIES_COLORS[index % SERIES_COLORS.length] }} />
              </div>;
            })}
          </div>
          <span className="mt-2 block h-8 overflow-hidden text-ellipsis text-center text-[10px] font-semibold leading-4 text-[var(--text-primary)]" title={metric.label}>{metric.label}</span>
        </div>)}
      </div>
      <div className="absolute left-0 top-2 flex h-[220px] flex-col justify-between text-[9px] text-[var(--text-muted)]" aria-hidden="true"><span>{maxValue.toLocaleString()}</span><span>{Math.round(maxValue / 2).toLocaleString()}</span><span>0</span></div>
    </div>
  </section>;
}
