"use client";

import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Columns,
  Lock,
  Plus,
  Save,
  Send,
  Trash2,
} from "lucide-react";
import { ReportSectionDef, WeeklyReport } from "@/types/reporting";
import {
  calculateSectionTotals,
  getISOWeekDetails,
  parseNumericCell,
} from "@/lib/reportingUtils";
import {
  fetchMergedTemplate,
  fetchWeeklyReport,
  getReportDocId,
  saveWeeklyReportDraft,
  submitWeeklyReport,
} from "@/lib/reportingService";
import { TemplateCustomizerModal } from "./TemplateCustomizerModal";

interface Props {
  userId: string;
  userName: string;
  userEmail: string;
  isAdmin: boolean;
}

export function ReportEditor({ userId, userName, userEmail, isAdmin }: Props) {
  const [weekDetails, setWeekDetails] = useState(getISOWeekDetails());
  const [categories, setCategories] = useState<string[]>([
    "B2C Direct",
    "B2B Partnerships",
    "General Operations",
  ]);
  const [activeCategory, setActiveCategory] = useState<string>("B2C Direct");
  const [newCategoryInput, setNewCategoryInput] = useState("");
  const [showAddCategory, setShowAddCategory] = useState(false);

  const [template, setTemplate] = useState<ReportSectionDef[]>([]);
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [reportData, setReportData] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showCustomizer, setShowCustomizer] = useState(false);

  // Load template & weekly report on mount or when week/user/category changes
  useEffect(() => {
    async function loadReportAndTemplate() {
      setLoading(true);
      setMessage(null);
      try {
        const [mergedTemp, existingReport] = await Promise.all([
          fetchMergedTemplate(userId),
          fetchWeeklyReport(userId, weekDetails.year, weekDetails.weekNumber, activeCategory),
        ]);

        setTemplate(existingReport?.snapshotTemplate || mergedTemp);

        if (existingReport) {
          setReport(existingReport);
          setReportData(existingReport.data || {});
        } else {
          // Initialize fresh report draft structure
          const initialData: Record<string, any[]> = {};
          mergedTemp.forEach((sec: ReportSectionDef) => {
            if (sec.defaultRows && sec.defaultRows.length > 0) {
              initialData[sec.id] = sec.defaultRows.map((row) => ({ ...row }));
            } else {
              initialData[sec.id] = [createEmptyRow(sec.columns)];
            }
          });
          setReportData(initialData);
          setReport(null);
        }
      } catch (err) {
        setMessage({
          type: "error",
          text: err instanceof Error ? err.message : "Failed to load report data.",
        });
      } finally {
        setLoading(false);
      }
    }

    loadReportAndTemplate();
  }, [userId, weekDetails, activeCategory]);

  const createEmptyRow = (columns: ReportSectionDef["columns"]) => {
    const row: Record<string, any> = {};
    columns.forEach((c) => {
      row[c.key] = c.type === "number" || c.type === "currency" ? "" : "";
    });
    return row;
  };

  const handleCellChange = (sectionId: string, rowIndex: number, colKey: string, value: any) => {
    if (isReadonly) return;
    setReportData((prev) => {
      const secRows = [...(prev[sectionId] || [])];
      secRows[rowIndex] = { ...secRows[rowIndex], [colKey]: value };
      return { ...prev, [sectionId]: secRows };
    });
  };

  const handleAddRow = (sectionId: string, columns: ReportSectionDef["columns"]) => {
    if (isReadonly) return;
    setReportData((prev) => {
      const secRows = [...(prev[sectionId] || [])];
      secRows.push(createEmptyRow(columns));
      return { ...prev, [sectionId]: secRows };
    });
  };

  const handleDeleteRow = (sectionId: string, rowIndex: number) => {
    if (isReadonly) return;
    setReportData((prev) => {
      const secRows = [...(prev[sectionId] || [])];
      if (secRows.length <= 1) return prev; // Keep at least one row
      secRows.splice(rowIndex, 1);
      return { ...prev, [sectionId]: secRows };
    });
  };

  const isSubmitted = report?.status === "SUBMITTED";
  const isReadonly = isSubmitted;

  const calculateAllTotals = () => {
    const allTotals: Record<string, Record<string, number>> = {};
    template.forEach((sec) => {
      const secRows = reportData[sec.id] || [];
      allTotals[sec.id] = calculateSectionTotals(secRows, sec.columns);
    });
    return allTotals;
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const reportId = getReportDocId(userId, weekDetails.year, weekDetails.weekNumber, activeCategory);
      const totals = calculateAllTotals();

      await saveWeeklyReportDraft({
        id: reportId,
        userId,
        userName,
        reportCategory: activeCategory,
        year: weekDetails.year,
        month: weekDetails.month,
        weekNumber: weekDetails.weekNumber,
        weekStartDate: weekDetails.weekStartDate,
        weekEndDate: weekDetails.weekEndDate,
        status: report?.status || "DRAFT",
        snapshotTemplate: template,
        data: reportData,
        totals,
      });

      setMessage({ type: "success", text: `Draft for ${activeCategory} saved successfully!` });
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to save draft.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!window.confirm(`Submit ${activeCategory} report for Week ${weekDetails.weekNumber}? Once submitted, headers and entries will be frozen for history.`)) {
      return;
    }
    setSubmitting(true);
    setMessage(null);
    try {
      const reportId = getReportDocId(userId, weekDetails.year, weekDetails.weekNumber, activeCategory);
      const totals = calculateAllTotals();

      // First ensure document exists
      await saveWeeklyReportDraft({
        id: reportId,
        userId,
        userName,
        reportCategory: activeCategory,
        year: weekDetails.year,
        month: weekDetails.month,
        weekNumber: weekDetails.weekNumber,
        weekStartDate: weekDetails.weekStartDate,
        weekEndDate: weekDetails.weekEndDate,
        status: "DRAFT",
        snapshotTemplate: template,
        data: reportData,
        totals,
      });

      // Submit and freeze
      await submitWeeklyReport(reportId, template, reportData, totals);

      setReport((prev) => ({
        ...prev!,
        id: reportId,
        reportCategory: activeCategory,
        status: "SUBMITTED",
        submittedAt: new Date(),
        snapshotTemplate: template,
        data: reportData,
        totals,
      }));

      setMessage({
        type: "success",
        text: `${activeCategory} report submitted and frozen successfully!`,
      });
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to submit weekly report.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Status Controls */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-xs">
              <Calendar className="h-3.5 w-3.5" />
              Week {weekDetails.weekNumber} ({weekDetails.weekStartDate} to {weekDetails.weekEndDate})
            </span>

            {isSubmitted ? (
              <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs border border-emerald-500/20">
                <CheckCircle2 className="h-3.5 w-3.5" />
                SUBMITTED & FROZEN
              </span>
            ) : (
              <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-xs border border-amber-500/20">
                <Save className="h-3.5 w-3.5" />
                DRAFT / EDITING
              </span>
            )}
          </div>
          <h2 className="text-lg font-bold text-[var(--text-primary)]">
            Weekly Performance & Activity Report
          </h2>
          <p className="text-xs text-[var(--text-muted)]">
            Staff reports are submitted weekly by Monday. Multi-column tables update live totals automatically.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setShowCustomizer(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--bg-muted)]/60 px-3.5 py-2 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors"
          >
            <Columns className="h-4 w-4 text-blue-500" />
            Customize Headers
          </button>

          {!isReadonly && (
            <>
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={saving || loading}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-2 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-muted)] disabled:opacity-50 transition-colors"
              >
                <Save className="h-4 w-4" />
                {saving ? "Saving..." : "Save Draft"}
              </button>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting || loading}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                <Send className="h-4 w-4" />
                {submitting ? "Submitting..." : "Submit Report"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Category Selection Bar (Multiple Reports per Week) */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-3 shadow-xs flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider px-2">
            Report Category:
          </span>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeCategory === cat
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-[var(--bg-muted)]/60 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              {cat}
            </button>
          ))}

          {!showAddCategory ? (
            <button
              type="button"
              onClick={() => setShowAddCategory(true)}
              className="px-3 py-1.5 rounded-xl border border-dashed border-[var(--border)] text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-500/5 transition-colors"
            >
              + Add Category
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                placeholder="Category Name (e.g. Visas)"
                value={newCategoryInput}
                onChange={(e) => setNewCategoryInput(e.target.value)}
                className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-2.5 py-1 text-xs font-medium focus:outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  if (newCategoryInput.trim()) {
                    const newCat = newCategoryInput.trim();
                    if (!categories.includes(newCat)) {
                      setCategories((prev) => [...prev, newCat]);
                    }
                    setActiveCategory(newCat);
                    setNewCategoryInput("");
                    setShowAddCategory(false);
                  }
                }}
                disabled={!newCategoryInput.trim()}
                className="px-2.5 py-1 rounded bg-blue-600 text-white text-xs font-semibold disabled:opacity-50"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => setShowAddCategory(false)}
                className="px-2 py-1 text-xs text-[var(--text-muted)]"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Feedback Banner */}
      {message && (
        <div
          className={`flex items-center gap-2 rounded-xl p-4 text-xs font-semibold border ${
            message.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Main Report Table Grid Editor / First-Time Onboarding Guide */}
      {loading ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-8 text-center text-sm text-[var(--text-muted)]">
          Loading report template and saved values...
        </div>
      ) : template.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-6 sm:p-8 space-y-6 shadow-sm">
          {/* Welcome Header */}
          <div className="rounded-2xl bg-gradient-to-br from-navy-900 to-blue-950 p-6 text-white space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-sky-300 font-bold text-xs uppercase tracking-wider">
              <Columns className="h-3.5 w-3.5" />
              First-Time Setup Required
            </span>
            <h3 className="text-xl font-bold sm:text-2xl">
              Welcome to Your Staff Reporting System
            </h3>
            <p className="text-xs sm:text-sm leading-6 text-slate-200 max-w-2xl">
              No report sections have been configured for your account yet. You can build custom reporting templates tailored to your department and role, submit multiple category reports, and run week-over-week performance comparisons.
            </p>
          </div>

          {/* Educational Cards Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] p-4 space-y-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-500/10 text-xs font-bold text-blue-600">
                1
              </div>
              <h4 className="text-xs font-bold text-[var(--text-primary)]">Custom Headers & Items</h4>
              <p className="text-[11px] text-[var(--text-muted)] leading-5">
                Define section titles, multi-column headers, and pre-filled row items (e.g. SI-UK, Edvoy, or partners) so your weekly report is pre-loaded for easy entry.
              </p>
            </div>

            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] p-4 space-y-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-500/10 text-xs font-bold text-blue-600">
                2
              </div>
              <h4 className="text-xs font-bold text-[var(--text-primary)]">Multiple Reports per Week</h4>
              <p className="text-[11px] text-[var(--text-muted)] leading-5">
                Create separate report categories (e.g. B2C Direct, B2B Partnerships, Visas) to manage and submit distinct reports simultaneously in the same week.
              </p>
            </div>

            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] p-4 space-y-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-500/10 text-xs font-bold text-blue-600">
                3
              </div>
              <h4 className="text-xs font-bold text-[var(--text-primary)]">Side-by-Side 4-Week Comparison</h4>
              <p className="text-[11px] text-[var(--text-muted)] leading-5">
                Compare up to 4 past weeks side-by-side with automatic live column totals, weekly averages, and percentage deltas (+/- %).
              </p>
            </div>

            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] p-4 space-y-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-500/10 text-xs font-bold text-blue-600">
                4
              </div>
              <h4 className="text-xs font-bold text-[var(--text-primary)]">Monthly Summary Packages</h4>
              <p className="text-[11px] text-[var(--text-muted)] leading-5">
                Weekly reports aggregate automatically into end-of-month summary packages for month-vs-month comparative analysis (e.g. August vs October).
              </p>
            </div>
          </div>

          {/* Action Callout */}
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-[var(--text-primary)]">Ready to design your template?</h4>
              <p className="text-[11px] text-[var(--text-muted)]">
                Click below to add your custom section headers, table columns, and default row items.
              </p>
            </div>
            <button
              onClick={() => setShowCustomizer(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-blue-700 shadow-sm shrink-0"
            >
              <Plus className="h-4 w-4" /> Set Up My Reporting Template
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {template.map((sec, secIdx) => {
            const rows = reportData[sec.id] || [createEmptyRow(sec.columns)];
            const totals = calculateSectionTotals(rows, sec.columns);

            return (
              <div
                key={sec.id}
                className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] overflow-hidden shadow-sm"
              >
                {/* Section Header */}
                <div className="border-b border-[var(--border)] bg-[var(--bg-muted)]/40 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/10 text-xs font-bold text-blue-600">
                      {secIdx + 1}
                    </span>
                    <h3 className="font-bold text-sm text-[var(--text-primary)]">{sec.title}</h3>
                    {sec.isRequired && (
                      <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold">
                        Admin Required
                      </span>
                    )}
                  </div>

                  {!isReadonly && (
                    <button
                      type="button"
                      onClick={() => handleAddRow(sec.id, sec.columns)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Row
                    </button>
                  )}
                </div>

                {/* Multi-column Grid Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[var(--border)] bg-[var(--bg-muted)]/20 text-[var(--text-muted)] uppercase tracking-wider text-[11px] font-bold">
                        <th className="px-3 py-2.5 w-10 text-center">#</th>
                        {sec.columns.map((col) => (
                          <th key={col.key} className="px-3 py-2.5 min-w-[140px]">
                            {col.label}
                          </th>
                        ))}
                        {!isReadonly && <th className="px-3 py-2.5 w-10 text-center">Action</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {rows.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-[var(--bg-muted)]/30 transition-colors">
                          <td className="px-3 py-2 text-center text-[var(--text-muted)] font-mono text-[11px]">
                            {rIdx + 1}
                          </td>

                          {sec.columns.map((col) => {
                            const val = row[col.key] ?? "";
                            return (
                              <td key={col.key} className="px-2 py-1.5">
                                {isReadonly ? (
                                  <div className="px-2 py-1.5 text-xs font-medium text-[var(--text-primary)]">
                                    {col.type === "currency" && val !== "" ? `$${val}` : val}
                                  </div>
                                ) : (
                                  <input
                                    type={col.type === "number" || col.type === "currency" ? "number" : col.type === "date" ? "date" : "text"}
                                    value={val}
                                    onChange={(e) => handleCellChange(sec.id, rIdx, col.key, e.target.value)}
                                    placeholder={col.type === "currency" ? "0.00" : col.label}
                                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                                )}
                              </td>
                            );
                          })}

                          {!isReadonly && (
                            <td className="px-3 py-2 text-center">
                              {rows.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRow(sec.id, rIdx)}
                                  className="p-1 rounded text-rose-500 hover:bg-rose-500/10 transition-colors"
                                  title="Delete Row"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </td>
                          )}
                        </tr>
                      ))}

                      {/* Summary Section Totals Row */}
                      <tr className="border-t-2 border-[var(--border)] bg-[var(--bg-muted)]/50 font-bold text-xs text-[var(--text-primary)]">
                        <td className="px-3 py-2.5 text-center text-[10px] uppercase text-[var(--text-muted)]">
                          Total
                        </td>
                        {sec.columns.map((col) => {
                          const isNumeric = col.type === "number" || col.type === "currency" || col.isCalculatedTotal;
                          const totalVal = totals[col.key] || 0;
                          return (
                            <td key={col.key} className="px-3 py-2.5 font-bold text-blue-600 dark:text-blue-400">
                              {isNumeric ? (col.type === "currency" ? `$${totalVal.toLocaleString()}` : totalVal.toLocaleString()) : "—"}
                            </td>
                          );
                        })}
                        {!isReadonly && <td />}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Template Customizer Modal */}
      {showCustomizer && (
        <TemplateCustomizerModal
          userId={userId}
          userEmail={userEmail}
          isAdmin={isAdmin}
          onClose={() => setShowCustomizer(false)}
          onTemplateSaved={async () => {
            const merged = await fetchMergedTemplate(userId);
            setTemplate(merged);
          }}
        />
      )}
    </div>
  );
}
