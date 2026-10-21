"use client";

import React, { useEffect, useState } from "react";
import {
  Calendar,
  CheckSquare,
  Package,
  RefreshCw,
  Square,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { MonthlyPackage } from "@/types/reporting";
import { calculatePercentageDelta } from "@/lib/reportingUtils";
import {
  fetchOrCompileMonthlyPackage,
  fetchUserMonthlyPackagesHistory,
} from "@/lib/reportingService";

interface Props {
  userId: string;
  userName: string;
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

export function MonthlyComparisonView({ userId, userName }: Props) {
  const [packagesHistory, setPackagesHistory] = useState<MonthlyPackage[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [compiling, setCompiling] = useState(false);

  // Month compilation form state
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const [compileYear, setCompileYear] = useState(currentYear);
  const [compileMonth, setCompileMonth] = useState(currentMonth);

  useEffect(() => {
    async function loadMonthlyHistory() {
      setLoading(true);
      try {
        // Compile current month as default if needed
        await fetchOrCompileMonthlyPackage(userId, userName, currentYear, currentMonth);
        const pkgs = await fetchUserMonthlyPackagesHistory(userId);
        setPackagesHistory(pkgs);
        if (pkgs.length > 0) {
          setSelectedIds(pkgs.slice(0, 2).map((p) => p.id));
        }
      } catch (err) {
        console.warn("Could not load monthly packages history:", err);
      } finally {
        setLoading(false);
      }
    }
    loadMonthlyHistory();
  }, [userId, userName, currentYear, currentMonth]);

  const handleManualCompile = async () => {
    setCompiling(true);
    try {
      const pkg = await fetchOrCompileMonthlyPackage(userId, userName, compileYear, compileMonth);
      const pkgs = await fetchUserMonthlyPackagesHistory(userId);
      setPackagesHistory(pkgs);
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
      setSelectedIds((prev) => [...prev, pkgId]);
    }
  };

  const selectedPackages = packagesHistory.filter((p) => selectedIds.includes(p.id));

  // Collect all section keys across selected monthly packages
  const sectionKeys = Array.from(
    new Set(selectedPackages.flatMap((p) => Object.keys(p.sectionSummaries || {})))
  );

  return (
    <div className="space-y-6">
      {/* Header & Month Selector */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
              Month-vs-Month Package Comparison
            </h2>
            <p className="text-xs text-[var(--text-muted)]">
              Compare compiled monthly summaries (e.g. August vs October) showing total accumulated output, weekly averages, and month-over-month net deltas.
            </p>
          </div>

          {/* Manual Month Compile Controller */}
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={compileMonth}
              onChange={(e) => setCompileMonth(Number(e.target.value))}
              className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs font-semibold focus:outline-none"
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
              className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs font-semibold focus:outline-none"
            >
              {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>

            <button
              onClick={handleManualCompile}
              disabled={compiling}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${compiling ? "animate-spin" : ""}`} />
              Compile Month
            </button>
          </div>
        </div>

        {/* Available Monthly Packages List */}
        {loading ? (
          <p className="text-xs text-[var(--text-muted)]">Loading monthly packages history...</p>
        ) : packagesHistory.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)] italic">
            No monthly packages compiled yet. Click &quot;Compile Month&quot; above to compile your first monthly report package.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2 pt-2">
            {packagesHistory.map((pkg) => {
              const isSelected = selectedIds.includes(pkg.id);
              const label = `${MONTH_NAMES[pkg.month - 1]} ${pkg.year}`;
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
                  <Package className="h-3.5 w-3.5 text-blue-500" />
                  <span>{label}</span>
                  <span className="text-[10px] text-[var(--text-muted)] font-mono">
                    ({pkg.includedWeeklyReportIds.length} weeks)
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
          Select at least 1 monthly package above to view analytics.
        </div>
      ) : (
        <div className="space-y-6">
          {sectionKeys.map((secId, secIdx) => (
            <div
              key={secId}
              className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] overflow-hidden shadow-sm"
            >
              <div className="border-b border-[var(--border)] bg-[var(--bg-muted)]/40 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/10 text-xs font-bold text-blue-600">
                    {secIdx + 1}
                  </span>
                  <h3 className="font-bold text-sm text-[var(--text-primary)]">Section Breakdown ({secId})</h3>
                </div>
              </div>

              {/* Mobile Cards View */}
              <div className="block md:hidden p-3 space-y-3">
                {Object.keys(
                  selectedPackages.find((p) => p.sectionSummaries?.[secId])?.sectionSummaries?.[secId]?.columnTotals || {}
                ).map((colKey) => {
                  const oldestPkg = selectedPackages[selectedPackages.length - 1];
                  const newestPkg = selectedPackages[0];

                  const oldestVal = oldestPkg?.sectionSummaries?.[secId]?.columnTotals?.[colKey] || 0;
                  const newestVal = newestPkg?.sectionSummaries?.[secId]?.columnTotals?.[colKey] || 0;
                  const delta = calculatePercentageDelta(newestVal, oldestVal);

                  return (
                    <div key={colKey} className="rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] p-3 space-y-2">
                      <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                        <span className="font-bold text-xs text-[var(--text-primary)]">Column Total: {colKey}</span>
                        {selectedPackages.length > 1 && (
                          <span
                            className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              delta > 0
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : delta < 0
                                ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                                : "bg-[var(--bg-muted)] text-[var(--text-muted)]"
                            }`}
                          >
                            {delta > 0 ? (
                              <TrendingUp className="h-3 w-3 shrink-0" />
                            ) : delta < 0 ? (
                              <TrendingDown className="h-3 w-3 shrink-0" />
                            ) : null}
                            {delta > 0 ? `+${delta}%` : `${delta}%`}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                        {selectedPackages.map((pkg) => {
                          const tot = pkg.sectionSummaries?.[secId]?.columnTotals?.[colKey] || 0;
                          const avg = pkg.sectionSummaries?.[secId]?.columnAverages?.[colKey] || 0;
                          return (
                            <div key={pkg.id} className="rounded-lg bg-[var(--bg-surface)] p-2 border border-[var(--border)]">
                              <span className="text-[9px] text-[var(--text-muted)] font-semibold block truncate">
                                {MONTH_NAMES[pkg.month - 1]} {pkg.year}
                              </span>
                              <span className="text-xs font-bold text-blue-600 dark:text-blue-400 block">
                                {tot.toLocaleString()}
                              </span>
                              <span className="text-[9px] text-[var(--text-muted)] block">
                                Avg: {avg.toLocaleString()}/wk
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-[var(--bg-muted)]/20 text-[var(--text-muted)] uppercase tracking-wider text-[11px] font-bold">
                      <th className="px-3 py-2.5 min-w-[160px]">Metric / Column</th>
                      {selectedPackages.map((pkg) => (
                        <th key={pkg.id} className="px-3 py-2.5 min-w-[160px] text-center border-l border-[var(--border)]">
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
                          Net Delta %
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {/* Render row counts */}
                    <tr className="hover:bg-[var(--bg-muted)]/30 transition-colors">
                      <td className="px-3 py-2.5 font-bold text-[var(--text-primary)]">Total Weekly Entries</td>
                      {selectedPackages.map((pkg) => {
                        const count = pkg.sectionSummaries?.[secId]?.rowCount || 0;
                        return (
                          <td key={pkg.id} className="px-3 py-2.5 text-center font-semibold border-l border-[var(--border)]">
                            {count} entries
                          </td>
                        );
                      })}
                      {selectedPackages.length > 1 && <td className="border-l border-[var(--border)] bg-blue-500/5" />}
                    </tr>

                    {/* Render column totals & weekly averages */}
                    {Object.keys(
                      selectedPackages.find((p) => p.sectionSummaries?.[secId])?.sectionSummaries?.[secId]?.columnTotals || {}
                    ).map((colKey) => {
                      const oldestPkg = selectedPackages[selectedPackages.length - 1];
                      const newestPkg = selectedPackages[0];

                      const oldestVal = oldestPkg?.sectionSummaries?.[secId]?.columnTotals?.[colKey] || 0;
                      const newestVal = newestPkg?.sectionSummaries?.[secId]?.columnTotals?.[colKey] || 0;
                      const delta = calculatePercentageDelta(newestVal, oldestVal);

                      return (
                        <tr key={colKey} className="hover:bg-[var(--bg-muted)]/30 transition-colors">
                          <td className="px-3 py-2.5 font-bold text-[var(--text-primary)]">
                            Column Total: {colKey}
                          </td>

                          {selectedPackages.map((pkg) => {
                            const tot = pkg.sectionSummaries?.[secId]?.columnTotals?.[colKey] || 0;
                            const avg = pkg.sectionSummaries?.[secId]?.columnAverages?.[colKey] || 0;
                            return (
                              <td key={pkg.id} className="px-3 py-2.5 text-center border-l border-[var(--border)]">
                                <div className="font-bold text-blue-600 dark:text-blue-400">{tot.toLocaleString()}</div>
                                <div className="text-[10px] text-[var(--text-muted)]">Avg: {avg.toLocaleString()}/wk</div>
                              </td>
                            );
                          })}

                          {selectedPackages.length > 1 && (
                            <td className="px-3 py-2.5 text-center font-bold border-l border-[var(--border)] bg-blue-500/5">
                              <span
                                className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                  delta > 0
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                    : delta < 0
                                    ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                                    : "bg-[var(--bg-muted)] text-[var(--text-muted)]"
                                }`}
                              >
                                {delta > 0 ? (
                                  <TrendingUp className="h-3 w-3 shrink-0" />
                                ) : delta < 0 ? (
                                  <TrendingDown className="h-3 w-3 shrink-0" />
                                ) : null}
                                {delta > 0 ? `+${delta}%` : `${delta}%`}
                              </span>
                            </td>
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
