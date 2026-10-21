"use client";

import React, { useEffect, useState } from "react";
import {
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  Filter,
  Lock,
  RotateCcw,
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
import { AnimatedSelect } from "@/components/ui/AnimatedSelect";
import { ConfirmModal } from "@/components/modals/ConfirmModal";
import { WeeklyComparisonView } from "./WeeklyComparisonView";

interface Props {
  adminUid: string;
  staffList: StaffMember[];
}

export function AdminReportingMatrix({ adminUid, staffList }: Props) {
  // Interactive Target Week Date Navigation
  const [referenceDate, setReferenceDate] = useState<Date>(new Date());
  const weekDetails = getISOWeekDetails(referenceDate);

  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [grantingUid, setGrantingUid] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Filters State
  const [selectedDepartment, setSelectedDepartment] = useState<string>("ALL");
  const [selectedBranch, setSelectedBranch] = useState<string>("ALL");

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
  }, [weekDetails.year, weekDetails.weekNumber]);

  // Date / Week / Month Navigation Handlers
  const handlePrevWeek = () => {
    setReferenceDate((prev) => {
      const updated = new Date(prev);
      updated.setDate(updated.getDate() - 7);
      return updated;
    });
  };

  const handleNextWeek = () => {
    setReferenceDate((prev) => {
      const updated = new Date(prev);
      updated.setDate(updated.getDate() + 7);
      const today = new Date();
      return updated > today ? today : updated;
    });
  };

  const handlePrevMonth = () => {
    setReferenceDate((prev) => {
      const updated = new Date(prev);
      updated.setDate(updated.getDate() - 28);
      return updated;
    });
  };

  const handleNextMonth = () => {
    setReferenceDate((prev) => {
      const updated = new Date(prev);
      updated.setDate(updated.getDate() + 28);
      const today = new Date();
      return updated > today ? today : updated;
    });
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      const [yearStr, monthStr, dayStr] = e.target.value.split("-");
      const selected = new Date(Number(yearStr), Number(monthStr) - 1, Number(dayStr));
      const today = new Date();
      setReferenceDate(selected > today ? today : selected);
    }
  };

  const handleResetToCurrentWeek = () => {
    setReferenceDate(new Date());
  };

  // Confirm Unlock State
  const [confirmUnlockStaff, setConfirmUnlockStaff] = useState<StaffMember | null>(null);

  const handleGrantUnlockConfirmed = async (staff: StaffMember) => {
    const targetUid = staff.uid || staff.id;
    if (!targetUid) return;

    setConfirmUnlockStaff(null);
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

  // Derive Filtered Options
  const departments = Array.from(
    new Set(staffList.map((s) => s.department || "Operations").filter(Boolean))
  );
  const branches = Array.from(
    new Set(staffList.map((s) => s.branch || "Abuja Branch").filter(Boolean))
  );

  const filteredStaff = staffList.filter((s) => {
    const matchesDept = selectedDepartment === "ALL" || (s.department || "Operations") === selectedDepartment;
    const matchesBranch = selectedBranch === "ALL" || (s.branch || "Abuja Branch") === selectedBranch;
    return matchesDept && matchesBranch;
  });

  const isCurrentWeek =
    weekDetails.year === getISOWeekDetails().year &&
    weekDetails.weekNumber === getISOWeekDetails().weekNumber;

  return (
    <div className="space-y-6">
      {/* Header & Interactive Week Navigator Controls */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
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

          {/* Interactive Target Week & Month Controller */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-[var(--text-muted)]">Target Week:</span>

            <div className="inline-flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--bg-muted)]/50 p-1">
              {/* Previous Month */}
              <button
                type="button"
                onClick={handlePrevMonth}
                className="px-2 py-1 rounded-lg text-[11px] font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors cursor-pointer"
                title="Previous Month (-4 Weeks)"
              >
                « Month
              </button>

              {/* Previous Week */}
              <button
                type="button"
                onClick={handlePrevWeek}
                className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors cursor-pointer"
                title="Previous Week (-1 Week)"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              {/* Week Display & Direct Calendar Picker Trigger */}
              <label className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-extrabold text-[var(--text-primary)] cursor-pointer hover:bg-[var(--bg-surface)] rounded-lg transition-colors">
                <Calendar className="h-3.5 w-3.5 text-blue-500" />
                <span>Week {weekDetails.weekNumber}</span>
                <span className="text-[11px] text-[var(--text-muted)] font-medium">({weekDetails.weekStartDate})</span>
                <input
                  type="date"
                  value={weekDetails.weekStartDate}
                  onChange={handleDateChange}
                  max={new Date().toISOString().split("T")[0]}
                  aria-label="Target week start date"
                  className="w-5 h-5 opacity-70 cursor-pointer focus:outline-none"
                  title="Click to select any week from calendar"
                />
              </label>

              {/* Next Week */}
              <button
                type="button"
                onClick={handleNextWeek}
                disabled={isCurrentWeek}
                className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] disabled:opacity-30 transition-colors cursor-pointer"
                title="Next Week (+1 Week)"
              >
                <ChevronRight className="h-4 w-4" />
              </button>

              {/* Next Month */}
              <button
                type="button"
                onClick={handleNextMonth}
                disabled={isCurrentWeek}
                className="px-2 py-1 rounded-lg text-[11px] font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] disabled:opacity-30 transition-colors cursor-pointer"
                title="Next Month (+4 Weeks)"
              >
                Month »
              </button>
            </div>

            {!isCurrentWeek && (
              <button
                type="button"
                onClick={handleResetToCurrentWeek}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-[var(--bg-muted)] transition-colors cursor-pointer"
                title="Jump to Present Day / Current Week"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Current Week
              </button>
            )}
          </div>
        </div>

        {/* Department & Branch Filters Bar */}
        <div className="flex items-center justify-between border-t border-[var(--border)] pt-3 gap-3 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-muted)]">
              <Filter className="h-3.5 w-3.5 text-blue-500" />
              <span>Filters:</span>
            </div>

            {/* Department Filter */}
            <AnimatedSelect
              value={selectedDepartment}
              onChange={setSelectedDepartment}
              options={[
                { value: "ALL", label: `All Departments (${departments.length})` },
                ...departments.map((dept) => ({ value: dept, label: dept })),
              ]}
              ariaLabel="Department filter"
            />

            {/* Branch Filter */}
            <AnimatedSelect
              value={selectedBranch}
              onChange={setSelectedBranch}
              options={[
                { value: "ALL", label: `All Branches (${branches.length})` },
                ...branches.map((br) => ({ value: br, label: br })),
              ]}
              ariaLabel="Branch filter"
            />
          </div>

          <span className="text-xs text-[var(--text-muted)] font-medium">
            Showing {filteredStaff.length} of {staffList.length} Staff
          </span>
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
              Staff Submissions ({filteredStaff.length} Staff Members)
            </h3>
          </div>
        </div>

        {loading ? (
          <p className="p-8 text-center text-xs text-[var(--text-muted)]">Loading staff matrix data...</p>
        ) : filteredStaff.length === 0 ? (
          <p className="p-8 text-center text-xs text-[var(--text-muted)]">No staff members match the selected filters.</p>
        ) : (
          <>
            {/* Mobile Cards View */}
            <div className="block md:hidden divide-y divide-[var(--border)]">
              {filteredStaff.map((staff) => {
                const targetUid = staff.uid || staff.id;
                const matchingReport = reports.find(
                  (r) => r.userId === targetUid || r.userId === staff.email
                );
                const status = matchingReport?.status || "OVERDUE";
                const userInitial = (staff.name[0] || "S").toUpperCase();

                return (
                  <div key={staff.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                          {userInitial}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-xs sm:text-sm text-[var(--text-primary)] truncate">
                            {staff.name}
                          </h4>
                          <p className="text-[10px] text-[var(--text-muted)] truncate">
                            {staff.email}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
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
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-lg bg-[var(--bg-muted)]/50 p-2">
                        <span className="text-[9px] uppercase font-bold text-[var(--text-muted)] block">
                          Department
                        </span>
                        <span className="font-semibold text-[11px] text-[var(--text-primary)] truncate block">
                          {staff.department || "General"}
                        </span>
                      </div>
                      <div className="rounded-lg bg-[var(--bg-muted)]/50 p-2">
                        <span className="text-[9px] uppercase font-bold text-[var(--text-muted)] block">
                          Branch
                        </span>
                        <span className="font-semibold text-[11px] text-[var(--text-primary)] truncate block">
                          {staff.branch || "Headquarters"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setInspectStaff(staff)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] py-2 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-muted)]"
                      >
                        <Eye className="h-3.5 w-3.5 text-blue-500" />
                        Inspect Reports
                      </button>

                      {status !== "SUBMITTED" && (
                        <button
                          type="button"
                          onClick={() => setConfirmUnlockStaff(staff)}
                          disabled={grantingUid === targetUid}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-600 py-2 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
                        >
                          <Unlock className="h-3.5 w-3.5" />
                          {grantingUid === targetUid ? "Unlocking..." : "Grant Unlock"}
                        </button>
                      )}
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
                  <th className="px-4 py-3">Staff Name</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Branch</th>
                  <th className="px-4 py-3 text-center">Week Status</th>
                  <th className="px-4 py-3 text-right">Admin Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filteredStaff.map((staff) => {
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
                              onClick={() => setConfirmUnlockStaff(staff)}
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
          </>
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
                    Viewing and comparing weekly reports for {inspectStaff.email} ({inspectStaff.department || "Operations"})
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

      {/* Confirm Late Unlock Modal */}
      <ConfirmModal
        isOpen={!!confirmUnlockStaff}
        title="Grant Late Submission Unlock"
        message={confirmUnlockStaff ? `Grant a 24-hour late submission unlock for ${confirmUnlockStaff.name} for Week ${weekDetails.weekNumber}?` : ""}
        confirmLabel="Grant Unlock"
        cancelLabel="Cancel"
        variant="warning"
        onConfirm={() => {
          if (confirmUnlockStaff) handleGrantUnlockConfirmed(confirmUnlockStaff);
        }}
        onCancel={() => setConfirmUnlockStaff(null)}
      />
    </div>
  );
}
