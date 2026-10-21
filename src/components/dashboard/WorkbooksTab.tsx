"use client";

import React, { useState, useMemo } from "react";
import { AccessGrant, WorkbookDocument } from "@/types/assets";
import { useAuth } from "@/context/AuthContext";
import { exportToExcel } from "@/lib/excelParser";
import {
  FileSpreadsheet,
  Search,
  Download,
  ExternalLink,
  Shield,
  Lock,
  Globe,
  Calendar,
  LayoutGrid,
  List,
  ArrowRight,
} from "lucide-react";
import { BulkActionBar, CardRecordControls, RowActions, SelectionCheckbox } from "./RecordActions";
import { canPerform, excludeArchived } from "@/lib/accessControl";
import { RecordEditorModal } from "../modals/RecordEditorModal";
import { WorkbookDetailModal } from "../modals/WorkbookDetailModal";

interface WorkbooksTabProps {
  workbooks: WorkbookDocument[];
  grant?: AccessGrant; showArchived?: boolean; onToggleArchived?: () => void; onCreate?: () => void; onEdit?: (record: WorkbookDocument) => void;
  onSaveRecord?: (record: Record<string, any>) => Promise<void>;
  onArchiveRecord?: (id: string) => Promise<void>; onRestoreRecord?: (id: string) => Promise<void>; onBulkEdit?: (ids: string[]) => void; onBulkArchive?: (ids: string[]) => Promise<void>; onBulkRestore?: (ids: string[]) => Promise<void>;
}

export const WorkbooksTab: React.FC<WorkbooksTabProps> = ({ workbooks, grant, showArchived = false, onToggleArchived = () => {}, onCreate, onEdit, onSaveRecord, onArchiveRecord, onRestoreRecord, onBulkEdit, onBulkArchive, onBulkRestore }) => {
  const { userProfile } = useAuth();
  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState("ALL");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [selectedDetailWorkbook, setSelectedDetailWorkbook] = useState<WorkbookDocument | null>(null);
  const [editingWorkbook, setEditingWorkbook] = useState<WorkbookDocument | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]); const [actionError, setActionError] = useState("");
  const canCreate = canPerform(userProfile, grant, "workbooks", "create"); const canEdit = canPerform(userProfile, grant, "workbooks", "edit"); const canArchive = canPerform(userProfile, grant, "workbooks", "archive"); const canRestore = canPerform(userProfile, grant, "workbooks", "restore");

  const departments = useMemo(() => {
    return Array.from(new Set(workbooks.map((w) => w.department).filter(Boolean)));
  }, [workbooks]);

  const filteredWorkbooks = useMemo(() => {
    return excludeArchived(workbooks, showArchived).filter((w) => {
      const matchesSearch =
        w.title.toLowerCase().includes(search.toLowerCase()) ||
        w.primaryOwner.toLowerCase().includes(search.toLowerCase()) ||
        (w.businessFunction && w.businessFunction.toLowerCase().includes(search.toLowerCase()));

      const matchesDept = selectedDept === "ALL" || w.department.toLowerCase() === selectedDept.toLowerCase();

      return matchesSearch && matchesDept;
    });
  }, [workbooks, search, selectedDept, showArchived]);

  const handleExport = () => {
    const data = filteredWorkbooks.map((w) => ({
      "Workbook / Doc Title": w.title,
      "Business Function": w.businessFunction || "N/A",
      "Cloud Storage Link": w.cloudStorageUrl,
      "Primary File Owner": w.primaryOwner,
      "Department": w.department,
      "Access Permissions": w.accessPermissions,
      "Last Audit Date": w.lastAuditDate || "N/A",
    }));
    exportToExcel(data, `Basechan_Workbooks_${new Date().toISOString().slice(0, 10)}`);
  };

  return (
    <div data-scroll-motion-root className="space-y-5 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-sky-600" />
            <span>Data, Workbooks & Cloud Storage Links</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Operational spreadsheets, Google Drive links, and shared company data assets.
          </p>
        </div>

      <div className="flex flex-col items-stretch gap-2.5 sm:flex-row sm:items-center">
          <div className="flex items-center bg-[var(--bg-surface)] p-1 rounded-xl border border-[var(--border)] shadow-sm">
            <button
              onClick={() => setViewMode("grid")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === "grid"
                  ? "bg-navy-800 text-gold-400 shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Cards</span>
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === "table"
                  ? "bg-navy-800 text-gold-400 shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
          </div>

          <button
            onClick={handleExport}
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-[var(--bg-surface)] border border-[var(--border)] hover:bg-[var(--bg-muted)] text-[var(--text-primary)] text-xs font-semibold rounded-lg shadow-sm transition-all"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export Directory</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <BulkActionBar count={selectedIds.length} onSelectAll={() => setSelectedIds(filteredWorkbooks.map((row) => row.id))} onClear={() => setSelectedIds([])} onCreate={onCreate} onEdit={() => onBulkEdit?.(selectedIds)} onArchive={() => onBulkArchive?.(selectedIds).then(() => setSelectedIds([])).catch((error) => setActionError(error.message))} onRestore={() => onBulkRestore?.(selectedIds).then(() => setSelectedIds([])).catch((error) => setActionError(error.message))} showArchived={showArchived} onToggleArchived={onToggleArchived} canCreate={canCreate} canEdit={canEdit} canArchive={canArchive} canRestore={canRestore} />
      {actionError && <p role="alert" className="rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-700">{actionError}</p>}
      <div className="bg-[var(--bg-surface)] p-3.5 rounded-xl border border-[var(--border)] shadow-sm flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search workbooks by title, owner, or function..."
            className="w-full min-w-0 bg-[var(--bg-primary)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] text-xs pl-9 pr-4 py-2 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <select
          value={selectedDept}
          onChange={(e) => setSelectedDept(e.target.value)}
          className="min-w-0 text-xs px-2.5 py-2 border border-[var(--border)] rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-auto"
        >
          <option value="ALL">All Departments</option>
          {departments.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      {/* Workbooks Display: Cards Grid or Table */}
      {viewMode === "grid" ? (
        filteredWorkbooks.length === 0 ? (
          <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)] p-6 text-center shadow-sm text-[var(--text-muted)] sm:p-12">
            <FileSpreadsheet className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <h3 className="font-bold text-[var(--text-primary)] text-base">No Workbooks Found</h3>
            <p className="text-xs text-[var(--text-muted)] mt-1">Try adjusting your search criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
            {filteredWorkbooks.map((wb) => {
              const hasOwner = wb.primaryOwner && wb.primaryOwner.trim().toLowerCase() !== "unassigned";
              return (
                <div
                  key={wb.id}
                  onClick={() => setSelectedDetailWorkbook(wb)}
                  className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-sky-500/50 transition-all cursor-pointer group flex flex-col justify-between space-y-4"
                >
                  <CardRecordControls checked={selectedIds.includes(wb.id)} onSelect={() => setSelectedIds((ids) => ids.includes(wb.id) ? ids.filter((id) => id !== wb.id) : [...ids, wb.id])} label={`Select ${wb.title}`} canEdit={canEdit} onEdit={() => onEdit ? onEdit(wb) : setEditingWorkbook(wb)} onArchive={canArchive && !showArchived ? () => onArchiveRecord?.(wb.id).catch((error) => setActionError(error.message)) : undefined} onRestore={canRestore && showArchived ? () => onRestoreRecord?.(wb.id).catch((error) => setActionError(error.message)) : undefined} archived={showArchived} />
                  {/* Top Section: Prominent File Owner (Big) */}
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                        Primary File Owner
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        wb.accessPermissions?.toUpperCase() === "ALL" || wb.accessPermissions?.toUpperCase() === "PUBLIC"
                          ? "bg-gold-500/10 text-gold-600 dark:text-gold-400 border border-gold-500/30"
                          : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                      }`}>
                        {wb.accessPermissions || "RESTRICTED"}
                      </span>
                    </div>

                    <h3 className={`text-base font-extrabold tracking-tight truncate ${
                      hasOwner ? "text-[var(--text-primary)] group-hover:text-sky-600 dark:group-hover:text-sky-400" : "text-amber-600 dark:text-amber-400 italic"
                    }`}>
                      {hasOwner ? wb.primaryOwner : "Unassigned / No Owner"}
                    </h3>
                  </div>

                  {/* Middle Section: Only 2 Key Pieces of Information */}
                  <div className="space-y-2.5 pt-3 border-t border-[var(--border)] text-xs">
                    {/* Info 1: Document Title */}
                    <div>
                      <span className="text-[10px] text-[var(--text-muted)] font-medium block">Document Title</span>
                      <p className="font-bold text-[var(--text-primary)] truncate mt-0.5">
                        {wb.title}
                      </p>
                    </div>

                    {/* Info 2: Business Function & Department */}
                    <div>
                      <span className="text-[10px] text-[var(--text-muted)] font-medium block">Function & Department</span>
                      <p className="font-semibold text-[var(--text-muted)] truncate flex items-center gap-1.5 mt-0.5">
                        <span className="px-2 py-0.5 rounded bg-[var(--bg-muted)] text-[var(--text-primary)] font-medium text-[11px]">
                          {wb.department || "General"}
                        </span>
                        <span>•</span>
                        <span className="truncate">{wb.businessFunction || "Operations"}</span>
                      </p>
                    </div>
                  </div>

                  {/* Footer Action Indicator */}
                  <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between text-xs text-sky-600 dark:text-sky-400 font-semibold group-hover:underline">
                    <span>Click for details</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--bg-muted)] border-b border-[var(--border)] text-[var(--text-muted)] uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-2"><SelectionCheckbox checked={filteredWorkbooks.length > 0 && selectedIds.length === filteredWorkbooks.length} onChange={() => setSelectedIds(selectedIds.length === filteredWorkbooks.length ? [] : filteredWorkbooks.map((row) => row.id))} label="Select filtered workbooks" /></th>
                  <th className="py-3 px-4">Workbook / Document Title</th>
                  <th className="py-3 px-4">Business Function</th>
                  <th className="py-3 px-4">Primary File Owner</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Access Permissions</th>
                  <th className="py-3 px-4">Last Audit Date</th>
                  <th className="py-3 px-4 text-right">Cloud Link / Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] text-[var(--text-primary)]">
                {filteredWorkbooks.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      No workbooks found.
                    </td>
                  </tr>
                ) : (
                  filteredWorkbooks.map((wb) => (
                    <tr key={wb.id} className="cursor-pointer transition-colors hover:bg-[var(--bg-muted)]" onClick={() => setSelectedDetailWorkbook(wb)}>
                      <td className="py-3 px-2" onClick={(e) => e.stopPropagation()}><SelectionCheckbox checked={selectedIds.includes(wb.id)} onChange={() => setSelectedIds((ids) => ids.includes(wb.id) ? ids.filter((id) => id !== wb.id) : [...ids, wb.id])} label={`Select ${wb.title}`} /></td>
                      <td className="py-3 px-4 font-bold text-[var(--text-primary)]">
                        {wb.title}
                      </td>
                      <td className="py-3 px-4 text-[var(--text-muted)]">
                        {wb.businessFunction || "Operations & Tracking"}
                      </td>
                      <td className="py-3 px-4 font-semibold text-[var(--text-primary)]">
                        {wb.primaryOwner}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-md bg-[var(--bg-muted)] text-[var(--text-primary)] font-medium">
                          {wb.department}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            wb.accessPermissions.toUpperCase() === "ALL" || wb.accessPermissions.toUpperCase() === "PUBLIC"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {wb.accessPermissions.toUpperCase() === "ALL" ? (
                            <Globe className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Lock className="w-3 h-3 text-amber-600" />
                          )}
                          {wb.accessPermissions}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[var(--text-muted)] font-mono text-[11px]">
                        {wb.lastAuditDate || "September 2026"}
                      </td>
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <RowActions canEdit={canEdit} onEdit={() => onEdit ? onEdit(wb) : setEditingWorkbook(wb)} onArchive={canArchive ? () => onArchiveRecord?.(wb.id).catch((error) => setActionError(error.message)) : undefined} onRestore={canRestore ? () => onRestoreRecord?.(wb.id).catch((error) => setActionError(error.message)) : undefined} archived={showArchived} />
                        {wb.cloudStorageUrl ? (
                          <a
                            href={wb.cloudStorageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold transition-colors"
                          >
                            <span>Open Doc</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        ) : (
                          <span className="text-slate-300">No URL</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex justify-between items-center">
            <span>Showing {filteredWorkbooks.length} of {workbooks.length} workbooks</span>
          </div>
        </div>
      )}

      {selectedDetailWorkbook && (() => {
        const currentIndex = filteredWorkbooks.findIndex((w) => w.id === selectedDetailWorkbook.id);
        const hasPrevious = currentIndex > 0;
        const hasNext = currentIndex >= 0 && currentIndex < filteredWorkbooks.length - 1;
        return (
          <WorkbookDetailModal
            workbook={selectedDetailWorkbook}
            isOpen={!!selectedDetailWorkbook}
            onClose={() => setSelectedDetailWorkbook(null)}
            hasPrevious={hasPrevious}
            hasNext={hasNext}
            onPrevious={() => hasPrevious && setSelectedDetailWorkbook(filteredWorkbooks[currentIndex - 1])}
            onNext={() => hasNext && setSelectedDetailWorkbook(filteredWorkbooks[currentIndex + 1])}
          />
        );
      })()}
      {editingWorkbook && <RecordEditorModal title="Edit workbook" initial={editingWorkbook} fields={[{ key: "title", label: "Title", required: true }, { key: "businessFunction", label: "Business function" }, { key: "cloudStorageUrl", label: "Cloud URL", required: true }, { key: "primaryOwner", label: "Primary owner", required: true }, { key: "primaryOwnerEmail", label: "Owner email", type: "email" }, { key: "primaryOwnerBranch", label: "Owner branch" }, { key: "department", label: "Department", required: true }, { key: "accessPermissions", label: "Access", type: "select", options: ["ALL", "RESTRICTED"] }, { key: "lastAuditDate", label: "Last audit date", type: "date" }]} onClose={() => setEditingWorkbook(null)} onSave={async (values) => { await onSaveRecord?.({ ...values, id: editingWorkbook.id }); setEditingWorkbook(null); }} />}
    </div>
  );
};
