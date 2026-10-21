"use client";

import React, { useState } from "react";
import {
  Calendar,
  Columns,
  FileText,
  Package,
  Shield,
} from "lucide-react";
import { StaffMember, UserProfile } from "@/types/assets";
import { ReportEditor } from "./reporting/ReportEditor";
import { WeeklyComparisonView } from "./reporting/WeeklyComparisonView";
import { MonthlyComparisonView } from "./reporting/MonthlyComparisonView";
import { AdminReportingMatrix } from "./reporting/AdminReportingMatrix";

interface Props {
  userProfile: UserProfile;
  staffList: StaffMember[];
}

type SubTab = "editor" | "weekly_comparison" | "monthly_comparison" | "admin_matrix";

export function ReportingTab({ userProfile, staffList }: Props) {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>("editor");
  const isAdmin = userProfile.role === "SUPER_ADMIN";

  const userId = userProfile.uid;
  const userName = userProfile.displayName || userProfile.email || "Staff Member";
  const userEmail = userProfile.email;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-blue-500" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              Staff Reporting System
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
            Weekly performance reports, dynamic templates, side-by-side 4-week comparisons, and monthly summary packages.
          </p>
        </div>

        {/* Sub-Navigation Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[var(--bg-muted)]/70 border border-[var(--border)] flex-wrap">
          <button
            type="button"
            onClick={() => setActiveSubTab("editor")}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeSubTab === "editor"
                ? "bg-[var(--bg-surface)] text-blue-600 dark:text-gold-400 shadow-sm border border-[var(--border)] font-bold"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            <Calendar className="h-3.5 w-3.5" />
            Active Weekly Report
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("weekly_comparison")}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeSubTab === "weekly_comparison"
                ? "bg-[var(--bg-surface)] text-blue-600 dark:text-gold-400 shadow-sm border border-[var(--border)] font-bold"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            <Columns className="h-3.5 w-3.5" />
            Weekly Comparison
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("monthly_comparison")}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeSubTab === "monthly_comparison"
                ? "bg-[var(--bg-surface)] text-blue-600 dark:text-gold-400 shadow-sm border border-[var(--border)] font-bold"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            <Package className="h-3.5 w-3.5" />
            Monthly Analytics
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={() => setActiveSubTab("admin_matrix")}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeSubTab === "admin_matrix"
                  ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 shadow-sm border border-amber-500/30 font-bold"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              <Shield className="h-3.5 w-3.5 text-amber-500" />
              Admin Supervision
            </button>
          )}
        </div>
      </div>

      {/* Sub-Tab View Rendering */}
      <div>
        {activeSubTab === "editor" && (
          <ReportEditor
            userId={userId}
            userName={userName}
            userEmail={userEmail}
            isAdmin={isAdmin}
          />
        )}

        {activeSubTab === "weekly_comparison" && (
          <WeeklyComparisonView userId={userId} />
        )}

        {activeSubTab === "monthly_comparison" && (
          <MonthlyComparisonView userId={userId} userName={userName} />
        )}

        {activeSubTab === "admin_matrix" && isAdmin && (
          <AdminReportingMatrix adminUid={userId} staffList={staffList} />
        )}
      </div>
    </div>
  );
}
