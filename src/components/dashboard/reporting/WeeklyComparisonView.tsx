"use client";

import React, { useEffect, useState } from "react";
import {
  Calendar,
  CheckSquare,
  Columns,
  Square,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { WeeklyReport } from "@/types/reporting";
import { compareWeeklyReports } from "@/lib/reportingUtils";
import { fetchUserWeeklyReportsHistory } from "@/lib/reportingService";
import { WeeklyMetricsChart } from "./WeeklyMetricsChart";

interface Props {
  userId: string;
}

function renderDeltaBadge(delta: number | "NEW" | undefined) {
  if (delta === "NEW") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
        NEW
      </span>
    );
  }
  const val = typeof delta === "number" ? delta : 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
        val > 0
          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          : val < 0
          ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
          : "bg-[var(--bg-muted)] text-[var(--text-muted)]"
      }`}
    >
      {val > 0 ? <TrendingUp className="h-3 w-3 shrink-0" /> : val < 0 ? <TrendingDown className="h-3 w-3 shrink-0" /> : null}
      {val > 0 ? `+${val}%` : `${val}%`}
    </span>
  );
}

export function WeeklyComparisonView({ userId }: Props) {
  const [history, setHistory] = useState<WeeklyReport[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHistory() {
      setLoading(true);
      try {
        const rpts = await fetchUserWeeklyReportsHistory(userId);
        setHistory(rpts);
        const submitted = rpts.filter((r) => r.status === "SUBMITTED");
        const defaultSelected = submitted.slice(0, 4).map((r) => r.id);
        setSelectedIds(defaultSelected);
      } catch (err) {
        console.warn("Could not load weekly history:", err);
      } finally {
        setLoading(false);
      }
    }
    loadHistory();
  }, [userId]);

  const toggleSelect = (reportId: string) => {
    if (selectedIds.includes(reportId)) {
      setSelectedIds((prev) => prev.filter((id) => id !== reportId));
    } else {
      if (selectedIds.length >= 4) {
        alert("You can select up to 4 weekly reports for side-by-side comparison.");
        return;
      }
      setSelectedIds((prev) => [...prev, reportId]);
    }
  };

  const selectedReports = history.filter((r) => selectedIds.includes(r.id));
  const comparisonResult = compareWeeklyReports(selectedReports);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
              Multi-Week Side-by-Side Comparison
            </h2>
            <p className="text-xs text-[var(--text-muted)]">
              Select up to 4 weekly reports to compare metrics, column totals, 4-week averages, and percentage deltas (+/- %).
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-xs">
            <Columns className="h-3.5 w-3.5" />
            {selectedIds.length} of 4 Weeks Selected
          </span>
        </div>

        {loading ? (
          <p className="text-xs text-[var(--text-muted)]">Loading report history...</p>
        ) : history.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)] italic">
            No saved weekly reports found in history yet. Submit a weekly report to start comparing.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2 pt-2">
            {history.map((rpt) => {
              const isSelected = selectedIds.includes(rpt.id);
              return (
                <button
                  key={rpt.id}
                  type="button"
                  onClick={() => toggleSelect(rpt.id)}
                  className={`inline-flex min-h-11 items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
                    isSelected
                      ? "border-blue-600 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold shadow-xs"
                      : "border-[var(--border)] bg-[var(--bg-muted)]/40 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {isSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                  <span>
                    Week {rpt.weekNumber} ({rpt.weekStartDate})
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-mono ${
                      rpt.status === "SUBMITTED"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    }`}
                  >
                    {rpt.status}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selectedReports.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-8 text-center text-xs text-[var(--text-muted)]">
          Select at least 1 weekly report above to view side-by-side comparison tables.
        </div>
      ) : comparisonResult.alignedSections.length === 0 ? (
        <div className="space-y-4">
          {selectedReports.some((report) => report.selectedTemplates?.length) && <WeeklyMetricsChart reports={selectedReports} />}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-8 text-center text-xs text-[var(--text-muted)]">No legacy table sections are stored in these reports.</div>
        </div>
      ) : (
        <div className="space-y-6">
          {selectedReports.some((report) => report.selectedTemplates?.length) && <WeeklyMetricsChart reports={selectedReports} />}
          {comparisonResult.alignedSections.map((sec, secIdx) => (
            <div
              key={sec.sectionId}
              className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] overflow-hidden shadow-sm"
            >
              <div className="border-b border-[var(--border)] bg-[var(--bg-muted)]/40 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/10 text-xs font-bold text-blue-600">
                    {secIdx + 1}
                  </span>
                  <h3 className="font-bold text-sm text-[var(--text-primary)]">{sec.sectionTitle}</h3>
                </div>
              </div>

              <div className="border-b border-[var(--border)] p-4">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Weekly totals graph</p>
                <div className="space-y-3">
                  {sec.columns.filter((col) => col.type === "number" || col.type === "currency" || col.isCalculatedTotal).map((col) => {
                    const values = sec.reportsData.map((report) => report.totals[col.key] ?? null);
                    const max = Math.max(...values.filter((value): value is number => value !== null), 1);
                    return <div key={col.key} className="grid grid-cols-[minmax(90px,150px)_1fr] items-center gap-3">
                      <span className="truncate text-xs font-semibold text-[var(--text-primary)]" title={col.label}>{col.label}</span>
                      <div className="flex h-9 items-end gap-2 border-b border-[var(--border)]">
                        {sec.reportsData.map((report, index) => {
                          const value = values[index];
                          return <div key={report.reportId} className="group relative flex h-full min-w-0 flex-1 items-end justify-center" title={`${report.weekLabel}: ${value === null ? "—" : `${col.type === "currency" ? "$" : ""}${value.toLocaleString()}`} `}>
                            {value !== null && <div className="w-full max-w-12 rounded-t bg-blue-500/80 transition-all" style={{ height: `${Math.max(4, (value / max) * 100)}%` }} />}
                            <span className="absolute -bottom-4 truncate text-[9px] text-[var(--text-muted)]">{report.weekLabel}</span>
                          </div>;
                        })}
                      </div>
                    </div>;
                  })}
                </div>
              </div>

              <div className="block md:hidden p-3 space-y-3">
                {sec.columns.map((col) => {
                  const isNumeric = col.type === "number" || col.type === "currency" || col.isCalculatedTotal;
                  const avg = sec.columnAverages[col.key] || 0;
                  const delta = sec.columnDeltas[col.key];

                  return (
                    <div key={col.key} className="rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] p-3 space-y-2">
                      <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                        <span className="font-bold text-xs text-[var(--text-primary)]">{col.label}</span>
                        {isNumeric && sec.reportsData.length > 1 && renderDeltaBadge(delta)}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                        {sec.reportsData.map((rptData) => {
                          const val = rptData.totals[col.key] ?? null;
                          return (
                            <div key={rptData.reportId} className="rounded-lg bg-[var(--bg-surface)] p-2 border border-[var(--border)]">
                              <span className="text-[9px] text-[var(--text-muted)] font-semibold truncate block">
                                {rptData.weekLabel}
                              </span>
                              <span className="text-xs font-bold text-[var(--text-primary)] block">
                                    {isNumeric && val !== null ? (col.type === "currency" ? `$${val.toLocaleString()}` : val.toLocaleString()) : "—"}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {isNumeric && sec.reportsData.length > 1 && (
                        <div className="rounded-lg bg-blue-500/10 p-2 flex items-center justify-between text-xs text-blue-600 dark:text-blue-400 font-bold">
                          <span>Selected Average:</span>
                          <span>{col.type === "currency" ? `$${avg.toLocaleString()}` : avg.toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-[var(--bg-muted)]/20 text-[var(--text-muted)] uppercase tracking-wider text-[11px] font-bold">
                      <th className="px-3 py-2.5 min-w-[160px]">Metric / Column</th>
                      {sec.reportsData.map((rptData) => (
                        <th key={rptData.reportId} className="px-3 py-2.5 min-w-[150px] text-center border-l border-[var(--border)]">
                          <div className="flex items-center justify-center gap-1">
                            <Calendar className="h-3 w-3 text-blue-500" />
                            <span>{rptData.weekLabel}</span>
                          </div>
                        </th>
                      ))}
                      {sec.reportsData.length > 1 && (
                        <>
                          <th className="px-3 py-2.5 min-w-[120px] text-center border-l border-[var(--border)] bg-blue-500/5 text-blue-600 dark:text-blue-400">
                            Selected Avg
                          </th>
                          <th className="px-3 py-2.5 min-w-[120px] text-center border-l border-[var(--border)] bg-blue-500/5 text-blue-600 dark:text-blue-400">
                            Net Delta %
                          </th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {sec.columns.map((col) => {
                      const isNumeric = col.type === "number" || col.type === "currency" || col.isCalculatedTotal;
                      const avg = sec.columnAverages[col.key] || 0;
                      const delta = sec.columnDeltas[col.key];

                      return (
                        <tr key={col.key} className="hover:bg-[var(--bg-muted)]/30 transition-colors">
                          <td className="px-3 py-2.5 font-bold text-[var(--text-primary)]">
                            {col.label}
                            <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase ml-1.5">
                              ({col.type})
                            </span>
                          </td>

                          {sec.reportsData.map((rptData) => {
                            const val = rptData.totals[col.key] ?? null;
                            return (
                              <td
                                key={rptData.reportId}
                                className="px-3 py-2.5 text-center font-semibold border-l border-[var(--border)] text-[var(--text-primary)]"
                              >
                                {isNumeric && val !== null
                                  ? col.type === "currency"
                                    ? `$${val.toLocaleString()}`
                                    : val.toLocaleString()
                                  : "—"}
                              </td>
                            );
                          })}

                          {sec.reportsData.length > 1 && (
                            <>
                              <td className="px-3 py-2.5 text-center font-bold border-l border-[var(--border)] bg-blue-500/5 text-blue-600 dark:text-blue-400">
                                {isNumeric
                                  ? col.type === "currency"
                                    ? `$${avg.toLocaleString()}`
                                    : avg.toLocaleString()
                                  : "—"}
                              </td>
                              <td className="px-3 py-2.5 text-center font-bold border-l border-[var(--border)] bg-blue-500/5">
                                {isNumeric ? renderDeltaBadge(delta) : "—"}
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
