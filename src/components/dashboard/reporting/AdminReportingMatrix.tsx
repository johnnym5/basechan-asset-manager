"use client";

import React, { useEffect, useState } from "react";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Eye,
  Lock,
  Shield,
  Unlock,
  Users,
  X,
} from "lucide-react";
import { StaffMember } from "@/types/assets";
import { WeeklyReport } from "@/types/reporting";
import { getISOWeekDetails } from "@/lib/reportingUtils";
import {
  fetchAllWeeklyReportsForWeek,
  grantLateUnlock,
} from "@/lib/reportingService";
import { WeeklyComparisonView } from "./WeeklyComparisonView";

interface Props {
  adminUid: string;
  staffList: StaffMember[];
}

export function AdminReportingMatrix({ adminUid, staffList }: Props) {
  const [weekDetails, setWeekDetails] = useState(getISOWeekDetails());
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [grantingUid, setGrantingUid] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Inspector Modal State
  const [inspectStaff, setInspectStaff] = useState<StaffMember | null>(null);

  useEffect(() => {
    async function loadWeekMatrix() {
      setLoading(true);
      setMessage(null);
      try {
        const weekReports = await fetchAllWeeklyReportsForWeek(weekDetails.year, weekDetails.weekNumber);
        setReports(weekReports);
      } catch (err) {
        console.warn("Could not load week matrix:", err);
      } finally {
        setLoading(false);
      }
    }
    loadWeekMatrix();
  }, [weekDetails]);

  const handleGrantUnlock = async (staff: StaffMember) => {
    const targetUid = staff.uid || staff.id;
    if (!targetUid) {
      alert("Selected staff member does not have a registered system UID.");
      return;
    }
    if (!window.confirm(`Grant 24-hour late submission unlock for ${staff.name}?`)) {
      return;
    }

    setGrantingUid(targetUid);
    setMessage(null);
    try {
      await grantLateUnlock(targetUid, weekDetails.year, weekDetails.weekNumber, adminUid);
      setMessage({
        type: "success",
        text: `Granted late submission unlock for ${staff.name} (Week ${weekDetails.weekNumber}).`,
      });

      // Reload matrix
      const updatedReports = await fetchAllWeeklyReportsForWeek(weekDetails.year, weekDetails.weekNumber);
      setReports(updatedReports);
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to grant unlock.",
      });
    } finally {
      setGrantingUid(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-amber-500" />
              <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
                Admin Supervision & Submission Matrix
              </h2>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Monitor weekly report submissions across all staff members, inspect individual reports, and grant late submission unlocks.
            </p>
          </div>

          {/* Week Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[var(--text-muted)]">Target Week:</span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-muted)]/50 text-xs font-bold text-[var(--text-primary)]">
              <Calendar className="h-3.5 w-3.5 text-blue-500" />
              Week {weekDetails.weekNumber} ({weekDetails.weekStartDate})
            </span>
          </div>
        </div>

        {message && (
          <div
            className={`flex items-center gap-2 rounded-xl p-3 text-xs font-semibold border ${
              message.type === "success"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400"
            }`}
          >
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{message.text}</span>
          </div>
        )}
      </div>

      {/* Staff Submission Matrix Table */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] overflow-hidden shadow-sm">
        <div className="border-b border-[var(--border)] bg-[var(--bg-muted)]/40 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-500" />
            <h3 className="font-bold text-sm text-[var(--text-primary)]">
              Staff Submissions ({staffList.length} Staff Members)
            </h3>
          </div>
        </div>

        {loading ? (
          <p className="p-8 text-center text-xs text-[var(--text-muted)]">Loading staff matrix data...</p>
        ) : staffList.length === 0 ? (
          <p className="p-8 text-center text-xs text-[var(--text-muted)]">No staff members registered in directory.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--bg-muted)]/20 text-[var(--text-muted)] uppercase tracking-wider text-[11px] font-bold">
                  <th className="px-4 py-3">Staff Name</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Branch</th>
                  <th className="px-4 py-3 text-center">Week Status</th>
                  <th className="px-4 py-3 text-right">Admin Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {staffList.map((staff) => {
                  const targetUid = staff.uid || staff.id;
                  const matchingReport = reports.find(
                    (r) => r.userId === targetUid || r.userId === staff.email
                  );

                  const status = matchingReport?.status || "OVERDUE";

                  return (
                    <tr key={staff.id} className="hover:bg-[var(--bg-muted)]/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-bold text-[var(--text-primary)]">{staff.name}</div>
                        <div className="text-[11px] text-[var(--text-muted)]">{staff.email}</div>
                      </td>
                      <td className="px-4 py-3 text-[var(--text-primary)] font-medium">
                        {staff.department || "General"}
                      </td>
                      <td className="px-4 py-3 text-[var(--text-primary)] font-medium">
                        {staff.branch || "Headquarters"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            status === "SUBMITTED"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              : status === "LATE_UNLOCKED"
                              ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                              : status === "DRAFT"
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                              : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                          }`}
                        >
                          {status === "SUBMITTED" ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : status === "LATE_UNLOCKED" ? (
                            <Unlock className="h-3 w-3" />
                          ) : status === "DRAFT" ? (
                            <Clock className="h-3 w-3" />
                          ) : (
                            <Lock className="h-3 w-3" />
                          )}
                          {status}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setInspectStaff(staff)}
                            className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-muted)]"
                            title="Inspect Staff Reports"
                          >
                            <Eye className="h-3.5 w-3.5 text-blue-500" />
                            Inspect Reports
                          </button>

                          {status !== "SUBMITTED" && (
                            <button
                              type="button"
                              onClick={() => handleGrantUnlock(staff)}
                              disabled={grantingUid === targetUid}
                              className="inline-flex items-center gap-1 rounded-lg bg-amber-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
                              title="Grant Late Submission Unlock"
                            >
                              <Unlock className="h-3.5 w-3.5" />
                              {grantingUid === targetUid ? "Unlocking..." : "Grant Unlock"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Staff Report Inspector Modal */}
      {inspectStaff && (
        <div
          className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/75 p-2 backdrop-blur-sm sm:p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="flex max-h-[calc(100dvh-2rem)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-2xl">
            <header className="flex shrink-0 items-center justify-between border-b border-[var(--border)] bg-[var(--bg-muted)]/60 px-4 py-3 sm:px-6">
              <div className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-blue-500" />
                <div>
                  <h3 className="font-bold text-sm sm:text-base">
                    Report History Inspector: {inspectStaff.name}
                  </h3>
                  <p className="text-xs text-[var(--text-muted)]">
                    Viewing and comparing weekly reports for {inspectStaff.email}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setInspectStaff(null)}
                className="rounded-lg p-2 text-[var(--text-muted)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
              <WeeklyComparisonView userId={inspectStaff.uid || inspectStaff.id} />
            </div>

            <footer className="border-t border-[var(--border)] bg-[var(--bg-muted)]/40 px-4 py-3 flex justify-end">
              <button
                onClick={() => setInspectStaff(null)}
                className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white"
              >
                Close Inspector
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
