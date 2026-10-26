"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { SPRING_TRANSITION } from "@/lib/motion";
import {
  Calendar,
  Columns,
  FileText,
  Package,
  Shield,
} from "lucide-react";
import { AccessGrant, StaffMember, UserProfile } from "@/types/assets";
import { canPerform } from "@/lib/accessControl";
import { WeeklyComparisonView } from "./reporting/WeeklyComparisonView";
import { MonthlyComparisonView } from "./reporting/MonthlyComparisonView";
import { AdminReportingMatrix } from "./reporting/AdminReportingMatrix";
import { AssignedReportEditor } from "./reporting/AssignedReportEditor";
import { AdminReportTemplateManager } from "./reporting/AdminReportTemplateManager";

interface Props {
  userProfile: UserProfile;
  staffList: StaffMember[];
  grant?: AccessGrant;
  onManageStaffAccess?: (staff: StaffMember) => void | Promise<void>;
}

type SubTab = "editor" | "weekly_comparison" | "monthly_comparison" | "admin_matrix" | "templates";

export function ReportingTab({ userProfile, staffList, grant, onManageStaffAccess }: Props) {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>("editor");
  const isAdmin = userProfile.role === "SUPER_ADMIN";
  const canGenerate = canPerform(userProfile, grant, "reporting", "create");

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
              Weekly Reports
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
              Build weekly reports from your saved templates, then compare submitted weeks on a graph.
          </p>
        </div>

        {/* Sub-Navigation Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[var(--bg-muted)]/70 border border-[var(--border)] flex-wrap">
          <button
            type="button"
            onClick={() => setActiveSubTab("editor")}
            className={`relative inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeSubTab === "editor"
                ? "text-blue-600 dark:text-gold-400 font-bold"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            {activeSubTab === "editor" && (
              <motion.div
                layoutId="activeSubTabPill"
                className="absolute inset-0 bg-[var(--bg-surface)] rounded-xl shadow-xs border border-[var(--border)] -z-10"
                transition={SPRING_TRANSITION}
              />
            )}
            <Calendar className="h-3.5 w-3.5" />
            Active Weekly Report
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("weekly_comparison")}
            className={`relative inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeSubTab === "weekly_comparison"
                ? "text-blue-600 dark:text-gold-400 font-bold"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            {activeSubTab === "weekly_comparison" && (
              <motion.div
                layoutId="activeSubTabPill"
                className="absolute inset-0 bg-[var(--bg-surface)] rounded-xl shadow-xs border border-[var(--border)] -z-10"
                transition={SPRING_TRANSITION}
              />
            )}
            <Columns className="h-3.5 w-3.5" />
            Weekly Comparison
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("monthly_comparison")}
            className={`relative inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeSubTab === "monthly_comparison"
                ? "text-blue-600 dark:text-gold-400 font-bold"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            {activeSubTab === "monthly_comparison" && (
              <motion.div
                layoutId="activeSubTabPill"
                className="absolute inset-0 bg-[var(--bg-surface)] rounded-xl shadow-xs border border-[var(--border)] -z-10"
                transition={SPRING_TRANSITION}
              />
            )}
            <Package className="h-3.5 w-3.5" />
            Monthly Analytics
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={() => setActiveSubTab("admin_matrix")}
              className={`relative inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeSubTab === "admin_matrix"
                  ? "text-amber-700 dark:text-amber-400 font-bold"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              {activeSubTab === "admin_matrix" && (
                <motion.div
                  layoutId="activeSubTabPill"
                  className="absolute inset-0 bg-amber-500/10 rounded-xl shadow-xs border border-amber-500/30 -z-10"
                  transition={SPRING_TRANSITION}
                />
              )}
              <Shield className="h-3.5 w-3.5 text-amber-500" />
              Admin Supervision
            </button>
          )}

          {isAdmin && <button type="button" onClick={() => setActiveSubTab("templates")} className={`rounded-xl px-3.5 py-2 text-xs font-semibold ${activeSubTab === "templates" ? "bg-[var(--bg-surface)] text-amber-700 shadow-xs" : "text-[var(--text-muted)]"}`}>Templates & Access</button>}
        </div>
      </div>

      {/* Sub-Tab View Rendering */}
      <div>
        {activeSubTab === "editor" && (
          <AssignedReportEditor userId={userId} userName={userName} userEmail={userEmail} isAdmin={isAdmin} canGenerate={canGenerate} />
        )}

        {activeSubTab === "weekly_comparison" && (
          <WeeklyComparisonView userId={userId} />
        )}

        {activeSubTab === "monthly_comparison" && (
          <MonthlyComparisonView userId={userId} userName={userName} canGenerate={canGenerate} />
        )}

        {activeSubTab === "admin_matrix" && isAdmin && (
          <AdminReportingMatrix adminUid={userId} staffList={staffList} />
        )}

        {activeSubTab === "templates" && isAdmin && <AdminReportTemplateManager adminUid={userId} staffList={staffList} onManageAccess={onManageStaffAccess} />}
      </div>
    </div>
  );
}
