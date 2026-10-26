"use client";

import React, { useEffect, useState } from "react";
import {
  Calendar,
  CheckSquare,
  Columns,
  Download,
  Square,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { MonthlyPackage } from "@/types/reporting";
import { fetchOrCompileMonthlyPackage, fetchUserMonthlyPackagesHistory } from "@/lib/reportingService";
import { exportToExcel } from "@/lib/excelParser";

interface Props {
  userId: string;
  userName: string;
  canGenerate: boolean;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

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

export function MonthlyComparisonView({ userId, userName, canGenerate }: Props) {
  const [history, setHistory] = useState<MonthlyPackage[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [compiling, setCompiling] = useState(false);

  // Month Compile Selector State
  const now = new Date();
  const [compileYear, setCompileYear] = useState<number>(now.getFullYear());
  const [compileMonth, setCompileMonth] = useState<number>(now.getMonth() + 1);

  useEffect(() => {
    async function loadHistory() {
      setLoading(true);
      try {
        const pkgs = await fetchUserMonthlyPackagesHistory(userId);
        setHistory(pkgs);
        if (pkgs.length > 0) {
          setSelectedIds(pkgs.slice(0, 2).map((p) => p.id));
        }
      } catch (err) {
        console.warn("Could not load monthly packages history:", err);
      } finally {
        setLoading(false);
      }
    }
    loadHistory();
  }, [userId]);

  const handleCompileMonth = async () => {
    setCompiling(true);
    try {
      const pkg = await fetchOrCompileMonthlyPackage(userId, userName, compileYear, compileMonth);
      setHistory((prev) => {
        const filtered = prev.filter((p) => p.id !== pkg.id);
        return [pkg, ...filtered];
      });
      if (!selectedIds.includes(pkg.id)) {
        setSelectedIds((prev) => [...prev, pkg.id]);
      }
    } catch (err) {
      alert("Failed to compile monthly package.");
    } finally {
      setCompiling(false);
    }
  };

  const toggleSelect = (pkgId: string) => {
    if (selectedIds.includes(pkgId)) {
      setSelectedIds((prev) => prev.filter((id) => id !== pkgId));
    } else {
      if (selectedIds.length >= 4) {
        alert("You can select up to 4 monthly packages for comparison.");
        return;
      }
      setSelectedIds((prev) => [...prev, pkgId]);
    }
  };

  const selectedPackages = history.filter((p) => selectedIds.includes(p.id));

  // Collect all unique sections across selected packages
  const sectionIdsSet = new Set<string>();
  selectedPackages.forEach((pkg) => {
    Object.keys(pkg.sectionSummaries || {}).forEach((secId) => sectionIdsSet.add(secId));
  });
  const templateIdsSet = new Set<string>();
  selectedPackages.forEach((pkg) => Object.keys(pkg.templateMetricSummaries || {}).forEach((templateId) => templateIdsSet.add(templateId)));

  const handleExportMonthly = () => {
    const dataToExport: any[] = [];
    sectionIdsSet.forEach((secId) => {
      selectedPackages.forEach((pkg) => {
        const secSum = pkg.sectionSummaries?.[secId];
        if (secSum) {
          dataToExport.push({
            "Month / Year": `${MONTH_NAMES[pkg.month - 1]} ${pkg.year}`,
            "Section ID": secId,
            "Total Rows Submitted": secSum.rowCount,
            "Column Totals (JSON)": JSON.stringify(secSum.columnTotals),
            "Column Averages (JSON)": JSON.stringify(secSum.columnAverages),
          });
        }
      });
    selectedPackages.forEach((pkg) => Object.entries(pkg.templateMetricSummaries || {}).forEach(([templateId, template]) => {
      Object.entries(template.metrics).forEach(([metricId, metric]) => dataToExport.push({
        "Month / Year": `${MONTH_NAMES[pkg.month - 1]} ${pkg.year}`,
        "Template": template.templateName,
        "Metric": metric.label,
        "Template ID": templateId,
        "Metric ID": metricId,
        "Total": metric.total,
        "Average per reported week": metric.average,
        "Weeks with value": metric.reportedWeekCount,
      }));
    }));
    });

    exportToExcel(
      dataToExport,
      `Monthly_Package_Comparison_${userId}_${new Date().toISOString().slice(0, 10)}`
    );
  };

  return (
    <div className="space-y-6">
      {/* Header & Compile Action Bar */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
              Monthly Package Aggregation & Multi-Month Comparison
            </h2>
            <p className="text-xs text-[var(--text-muted)]">
              Compile submitted weekly reports into consolidated monthly packages with total sums, averages, and trend deltas.
            </p>
          </div>
          {selectedPackages.length > 0 && (
            <button
              type="button"
              onClick={handleExportMonthly}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--bg-muted)] border border-[var(--border)] hover:bg-[var(--bg-primary)] text-xs font-semibold text-[var(--text-primary)] transition-all shrink-0 cursor-pointer"
            >
              <Download className="h-3.5 w-3.5 text-slate-500" />
              <span>Export Comparison (.xlsx)</span>
            </button>
          )}
        </div>

        {/* Month Compiler Input Bar */}
        {canGenerate && <div className="rounded-xl bg-[var(--bg-muted)]/50 p-3 flex flex-wrap items-center gap-3 border border-[var(--border)]">
          <span className="text-xs font-bold text-[var(--text-primary)]">Compile Month Package:</span>
          <select
            value={compileMonth}
            onChange={(e) => setCompileMonth(Number(e.target.value))}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text-primary)] focus:outline-none"
          >
            {MONTH_NAMES.map((name, idx) => (
              <option key={name} value={idx + 1}>
                {name}
              </option>
            ))}
          </select>
          <select
            value={compileYear}
            onChange={(e) => setCompileYear(Number(e.target.value))}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text-primary)] focus:outline-none"
          >
            {[2024, 2025, 2026].map((yr) => (
              <option key={yr} value={yr}>
                {yr}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleCompileMonth}
            disabled={compiling}
            className="px-3.5 py-1.5 rounded-lg bg-navy-800 hover:bg-navy-700 text-gold-400 font-bold text-xs shadow-sm transition-all disabled:opacity-50 cursor-pointer"
          >
            {compiling ? "Compiling..." : "Compile & Add Package"}
          </button>
        </div>}

        {/* History Checklist Selector */}
        {loading ? (
          <p className="text-xs text-[var(--text-muted)]">Loading monthly packages history...</p>
        ) : history.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)] italic">
            No compiled monthly packages found. Use the bar above to compile your first monthly package.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2 pt-2">
            {history.map((pkg) => {
              const isSelected = selectedIds.includes(pkg.id);
              return (
                <button
                  key={pkg.id}
                  type="button"
                  onClick={() => toggleSelect(pkg.id)}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
                    isSelected
                      ? "border-blue-600 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold shadow-xs"
                      : "border-[var(--border)] bg-[var(--bg-muted)]/40 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {isSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                  <span>
                    {MONTH_NAMES[pkg.month - 1]} {pkg.year}
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    {pkg.includedWeeklyReportIds.length} Reports
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Comparison Grid Results */}
      {selectedPackages.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-8 text-center text-xs text-[var(--text-muted)]">
          Select at least 1 monthly package above to view consolidated summaries.
        </div>
      ) : sectionIdsSet.size === 0 && templateIdsSet.size === 0 ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-8 text-center text-xs text-[var(--text-muted)]">
          No section summary data available across selected monthly packages.
        </div>
      ) : (
        <div className="space-y-6">
          {Array.from(templateIdsSet).map((templateId) => {
            const templateName = selectedPackages.find((pkg) => pkg.templateMetricSummaries?.[templateId])?.templateMetricSummaries?.[templateId]?.templateName || templateId;
            const metricIds = new Set<string>();
            selectedPackages.forEach((pkg) => Object.keys(pkg.templateMetricSummaries?.[templateId]?.metrics || {}).forEach((metricId) => metricIds.add(metricId)));
            return <div key={templateId} className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-sm">
              <div className="border-b border-[var(--border)] bg-[var(--bg-muted)]/40 px-4 py-3"><h3 className="text-sm font-bold">{templateName} · monthly totals</h3><p className="text-[10px] text-[var(--text-muted)]">Metrics are aligned by template and metric ID.</p></div>
              <div className="overflow-x-auto"><table className="w-full border-collapse text-left text-xs"><thead><tr className="border-b border-[var(--border)] text-[var(--text-muted)]"><th className="px-3 py-2">Metric</th>{selectedPackages.map((pkg) => <th key={pkg.id} className="px-3 py-2 text-center">{MONTH_NAMES[pkg.month - 1]} {pkg.year}</th>)}</tr></thead><tbody className="divide-y divide-[var(--border)]">{Array.from(metricIds).map((metricId) => <tr key={metricId}><td className="px-3 py-2 font-semibold">{selectedPackages.find((pkg) => pkg.templateMetricSummaries?.[templateId]?.metrics[metricId])?.templateMetricSummaries?.[templateId]?.metrics[metricId]?.label || metricId}</td>{selectedPackages.map((pkg) => { const metric = pkg.templateMetricSummaries?.[templateId]?.metrics[metricId]; return <td key={pkg.id} className="px-3 py-2 text-center">{metric ? `${metric.total.toLocaleString()} · avg ${metric.average.toLocaleString()}` : "—"}</td>; })}</tr>)}</tbody></table></div>
            </div>;
          })}
          {Array.from(sectionIdsSet).map((secId, secIdx) => (
            <div
              key={secId}
              className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] overflow-hidden shadow-sm"
            >
              {/* Section Header */}
              <div className="border-b border-[var(--border)] bg-[var(--bg-muted)]/40 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/10 text-xs font-bold text-blue-600">
                    {secIdx + 1}
                  </span>
                  <h3 className="font-bold text-sm text-[var(--text-primary)] uppercase tracking-wider font-mono">
                    Section: {secId.replace(/^sec_/, "").replaceAll("_", " ")}
                  </h3>
                </div>
              </div>

              {/* Mobile View */}
              <div className="block md:hidden p-3 space-y-3">
                {(() => {
                  const allColKeys = new Set<string>();
                  selectedPackages.forEach((pkg) => {
                    Object.keys(pkg.sectionSummaries?.[secId]?.columnTotals || {}).forEach((k) => allColKeys.add(k));
                  });

                  return Array.from(allColKeys).map((colKey) => {
                    const oldestTot = selectedPackages[0]?.sectionSummaries?.[secId]?.columnTotals?.[colKey] || 0;
                    const newestTot = selectedPackages[selectedPackages.length - 1]?.sectionSummaries?.[secId]?.columnTotals?.[colKey] || 0;
                    const delta = oldestTot === 0 && newestTot > 0 ? "NEW" : oldestTot === 0 ? 0 : Math.round(((newestTot - oldestTot) / Math.abs(oldestTot)) * 10000) / 100;

                    return (
                      <div key={colKey} className="rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] p-3 space-y-2">
                        <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                          <span className="font-bold text-xs text-[var(--text-primary)]">Column Total: {colKey}</span>
                          {selectedPackages.length > 1 && renderDeltaBadge(delta)}
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                          {selectedPackages.map((pkg) => {
                            const tot = pkg.sectionSummaries?.[secId]?.columnTotals?.[colKey] || 0;
                            return (
                              <div key={pkg.id} className="rounded-lg bg-[var(--bg-surface)] p-2 border border-[var(--border)]">
                                <span className="text-[9px] text-[var(--text-muted)] font-semibold block truncate">
                                  {MONTH_NAMES[pkg.month - 1]} {pkg.year}
                                </span>
                                <span className="text-xs font-bold text-[var(--text-primary)] block">
                                  {tot.toLocaleString()}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-[var(--bg-muted)]/20 text-[var(--text-muted)] uppercase tracking-wider text-[11px] font-bold">
                      <th className="px-3 py-2.5 min-w-[160px]">Metric / Column</th>
                      {selectedPackages.map((pkg) => (
                        <th key={pkg.id} className="px-3 py-2.5 min-w-[150px] text-center border-l border-[var(--border)]">
                          <div className="flex items-center justify-center gap-1">
                            <Calendar className="h-3 w-3 text-blue-500" />
                            <span>
                              {MONTH_NAMES[pkg.month - 1]} {pkg.year}
                            </span>
                          </div>
                        </th>
                      ))}
                      {selectedPackages.length > 1 && (
                        <th className="px-3 py-2.5 min-w-[120px] text-center border-l border-[var(--border)] bg-blue-500/5 text-blue-600 dark:text-blue-400">
                          Period Delta %
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {(() => {
                      const allColKeys = new Set<string>();
                      selectedPackages.forEach((pkg) => {
                        Object.keys(pkg.sectionSummaries?.[secId]?.columnTotals || {}).forEach((k) => allColKeys.add(k));
                      });

                      return Array.from(allColKeys).map((colKey) => {
                        const oldestTot = selectedPackages[0]?.sectionSummaries?.[secId]?.columnTotals?.[colKey] || 0;
                        const newestTot = selectedPackages[selectedPackages.length - 1]?.sectionSummaries?.[secId]?.columnTotals?.[colKey] || 0;
                        const delta = oldestTot === 0 && newestTot > 0 ? "NEW" : oldestTot === 0 ? 0 : Math.round(((newestTot - oldestTot) / Math.abs(oldestTot)) * 10000) / 100;

                        return (
                          <tr key={colKey} className="hover:bg-[var(--bg-muted)]/30 transition-colors">
                            <td className="px-3 py-2.5 font-bold text-[var(--text-primary)] font-mono">{colKey}</td>
                            {selectedPackages.map((pkg) => {
                              const tot = pkg.sectionSummaries?.[secId]?.columnTotals?.[colKey] || 0;
                              return (
                                <td key={pkg.id} className="px-3 py-2.5 text-center font-semibold border-l border-[var(--border)] text-[var(--text-primary)]">
                                  {tot.toLocaleString()}
                                </td>
                              );
                            })}
                            {selectedPackages.length > 1 && (
                              <td className="px-3 py-2.5 text-center font-bold border-l border-[var(--border)] bg-blue-500/5">
                                {renderDeltaBadge(delta)}
                              </td>
                            )}
                          </tr>
                        );
                      });
                    })()}
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
