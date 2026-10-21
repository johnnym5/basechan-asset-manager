"use client";

import React, { useState, useMemo } from "react";
import { AccessGrant, FacilityItem } from "@/types/assets";
import { useAuth } from "@/context/AuthContext";
import { exportToExcel } from "@/lib/excelParser";
import {
  Building2,
  Search,
  Download,
  MapPin,
  Tag,
  Wrench,
  CheckCircle2,
  LayoutGrid,
  List,
  ArrowRight,
} from "lucide-react";
import { BulkActionBar, CardRecordControls, RowActions, SelectionCheckbox } from "./RecordActions";
import { canPerform, excludeArchived } from "@/lib/accessControl";
import { RecordEditorModal } from "../modals/RecordEditorModal";
import { FacilityDetailModal } from "../modals/FacilityDetailModal";

interface FacilitiesTabProps {
  facilities: FacilityItem[];
  grant?: AccessGrant; showArchived?: boolean; onToggleArchived?: () => void; onCreate?: () => void; onEdit?: (record: FacilityItem) => void;
  onSaveRecord?: (record: Record<string, any>) => Promise<void>;
  onArchiveRecord?: (id: string) => Promise<void>; onRestoreRecord?: (id: string) => Promise<void>; onBulkEdit?: (ids: string[]) => void; onBulkArchive?: (ids: string[]) => Promise<void>; onBulkRestore?: (ids: string[]) => Promise<void>;
}

export const FacilitiesTab: React.FC<FacilitiesTabProps> = ({ facilities, grant, showArchived = false, onToggleArchived = () => {}, onCreate, onEdit, onSaveRecord, onArchiveRecord, onRestoreRecord, onBulkEdit, onBulkArchive, onBulkRestore }) => {
  const { userProfile } = useAuth();
  const [search, setSearch] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("ALL");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [selectedDetailFacility, setSelectedDetailFacility] = useState<FacilityItem | null>(null);
  const [editingFacility, setEditingFacility] = useState<FacilityItem | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]); const [actionError, setActionError] = useState("");
  const canCreate = canPerform(userProfile, grant, "facilities", "create"); const canEdit = canPerform(userProfile, grant, "facilities", "edit"); const canArchive = canPerform(userProfile, grant, "facilities", "archive"); const canRestore = canPerform(userProfile, grant, "facilities", "restore");

  const categories = useMemo(() => {
    return Array.from(new Set(facilities.map((f) => f.category).filter(Boolean)));
  }, [facilities]);

  const filteredFacilities = useMemo(() => {
    return excludeArchived(facilities, showArchived).filter((f) => {
      const matchesSearch =
        f.itemDescription.toLowerCase().includes(search.toLowerCase()) ||
        f.branch.toLowerCase().includes(search.toLowerCase()) ||
        (f.roomZone && f.roomZone.toLowerCase().includes(search.toLowerCase())) ||
        (f.maintenanceNotes && f.maintenanceNotes.toLowerCase().includes(search.toLowerCase()));

      const matchesBranch = selectedBranch === "ALL" || f.branch.toLowerCase().includes(selectedBranch.toLowerCase());
      const matchesCategory = selectedCategory === "ALL" || f.category.toLowerCase() === selectedCategory.toLowerCase();

      return matchesSearch && matchesBranch && matchesCategory;
    });
  }, [facilities, search, selectedBranch, selectedCategory, showArchived]);

  const handleExport = () => {
    const data = filteredFacilities.map((f) => ({
      "Infrastructure Branch": f.branch,
      "Item Description": f.itemDescription,
      "Category": f.category,
      "Room / Zone": f.roomZone || "General",
      "Quantity": f.quantity,
      "Condition": f.condition,
      "Assigned / Shared": f.assignedOrShared || "Shared",
      "Maintenance Notes": f.maintenanceNotes || "",
    }));
    exportToExcel(data, `Basechan_Facilities_${new Date().toISOString().slice(0, 10)}`);
  };

  return (
    <div data-scroll-motion-root className="space-y-5 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-600" />
            <span>Office Facilities & Physical Infrastructure</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Furniture, network equipment, power systems, and physical fixtures across corporate locations.
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
            <span>Export Facilities</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <BulkActionBar count={selectedIds.length} onSelectAll={() => setSelectedIds(filteredFacilities.map((row) => row.id))} onClear={() => setSelectedIds([])} onCreate={onCreate} onEdit={() => onBulkEdit?.(selectedIds)} onArchive={() => onBulkArchive?.(selectedIds).then(() => setSelectedIds([])).catch((error) => setActionError(error.message))} onRestore={() => onBulkRestore?.(selectedIds).then(() => setSelectedIds([])).catch((error) => setActionError(error.message))} showArchived={showArchived} onToggleArchived={onToggleArchived} canCreate={canCreate} canEdit={canEdit} canArchive={canArchive} canRestore={canRestore} />
      {actionError && <p role="alert" className="rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-700">{actionError}</p>}
      <div className="bg-[var(--bg-surface)] p-3.5 rounded-xl border border-[var(--border)] shadow-sm flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search facilities by item, room, or notes..."
            className="w-full min-w-0 bg-[var(--bg-primary)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] text-xs pl-9 pr-4 py-2 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-col sm:flex-row items-stretch gap-2 w-full md:w-auto">
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="min-w-0 flex-1 text-xs px-2.5 py-2 border border-[var(--border)] rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Branches</option>
            <option value="Abuja">Abuja Branch</option>
            <option value="Benin">Benin Branch</option>
          </select>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="min-w-0 flex-1 text-xs px-2.5 py-2 border border-[var(--border)] rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Facilities Display: Cards Grid or Table */}
      {viewMode === "grid" ? (
        filteredFacilities.length === 0 ? (
          <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)] p-6 text-center shadow-sm text-[var(--text-muted)] sm:p-12">
            <Building2 className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <h3 className="font-bold text-[var(--text-primary)] text-base">No Facility Items Found</h3>
            <p className="text-xs text-[var(--text-muted)] mt-1">Try adjusting your search filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
            {filteredFacilities.map((fac) => {
              const hasUser = fac.assignedOrShared && fac.assignedOrShared.trim().toLowerCase() !== "unassigned";
              return (
                <div
                  key={fac.id}
                  onClick={() => setSelectedDetailFacility(fac)}
                  className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-indigo-500/50 transition-all cursor-pointer group flex flex-col justify-between space-y-4"
                >
                  <CardRecordControls checked={selectedIds.includes(fac.id)} onSelect={() => setSelectedIds((ids) => ids.includes(fac.id) ? ids.filter((id) => id !== fac.id) : [...ids, fac.id])} label={`Select ${fac.itemDescription}`} canEdit={canEdit} onEdit={() => onEdit ? onEdit(fac) : setEditingFacility(fac)} onArchive={canArchive && !showArchived ? () => onArchiveRecord?.(fac.id).catch((error) => setActionError(error.message)) : undefined} onRestore={canRestore && showArchived ? () => onRestoreRecord?.(fac.id).catch((error) => setActionError(error.message)) : undefined} archived={showArchived} />
                  {/* Top Section: Prominent Allocation User / Space (Big) */}
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                        Allocation / Space
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        fac.condition.toLowerCase().includes("good") || fac.condition.toLowerCase().includes("fair")
                          ? "bg-gold-500/10 text-gold-600 dark:text-gold-400 border border-gold-500/30"
                          : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                      }`}>
                        {fac.condition}
                      </span>
                    </div>

                    <h3 className={`text-base font-extrabold tracking-tight truncate ${
                      hasUser ? "text-[var(--text-primary)] group-hover:text-indigo-600 dark:group-hover:text-indigo-400" : "text-amber-600 dark:text-amber-400 italic"
                    }`}>
                      {hasUser ? fac.assignedOrShared : "Shared Office Space"}
                    </h3>
                  </div>

                  {/* Middle Section: Only 2 Key Information Items */}
                  <div className="space-y-2.5 pt-3 border-t border-[var(--border)] text-xs">
                    {/* Info 1: Item Description & Qty */}
                    <div>
                      <span className="text-[10px] text-[var(--text-muted)] font-medium block">Item Description</span>
                      <p className="font-bold text-[var(--text-primary)] truncate mt-0.5">
                        {fac.itemDescription} <span className="font-sans font-normal text-[var(--text-muted)]">({fac.quantity} Qty)</span>
                      </p>
                    </div>

                    {/* Info 2: Room Zone & Location */}
                    <div>
                      <span className="text-[10px] text-[var(--text-muted)] font-medium block">Room & Location</span>
                      <p className="font-semibold text-[var(--text-muted)] truncate flex items-center gap-1.5 mt-0.5">
                        <span className="px-2 py-0.5 rounded bg-[var(--bg-muted)] text-[var(--text-primary)] font-medium text-[11px]">
                          {fac.roomZone || "General Area"}
                        </span>
                        <span>•</span>
                        <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                        <span className="truncate">{fac.branch || "Abuja Branch"}</span>
                      </p>
                    </div>
                  </div>

                  {/* Footer Action Indicator */}
                  <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between text-xs text-indigo-600 dark:text-indigo-400 font-semibold group-hover:underline">
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
                  <th className="py-3 px-2"><SelectionCheckbox checked={filteredFacilities.length > 0 && selectedIds.length === filteredFacilities.length} onChange={() => setSelectedIds(selectedIds.length === filteredFacilities.length ? [] : filteredFacilities.map((row) => row.id))} label="Select filtered facilities" /></th>
                  <th className="py-3 px-4">Location / Branch</th>
                  <th className="py-3 px-4">Item Description</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Room / Zone</th>
                  <th className="py-3 px-4 text-center">Qty</th>
                  <th className="py-3 px-4">Condition</th>
                  <th className="py-3 px-4">Allocation</th>
                  <th className="py-3 px-4">Maintenance Notes</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] text-[var(--text-primary)]">
                {filteredFacilities.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400">
                      No office facility items match your filters.
                    </td>
                  </tr>
                ) : (
                  filteredFacilities.map((fac) => (
                    <tr key={fac.id} className="cursor-pointer transition-colors hover:bg-[var(--bg-muted)]" onClick={() => setSelectedDetailFacility(fac)}>
                      <td className="py-3 px-2" onClick={(e) => e.stopPropagation()}><SelectionCheckbox checked={selectedIds.includes(fac.id)} onChange={() => setSelectedIds((ids) => ids.includes(fac.id) ? ids.filter((id) => id !== fac.id) : [...ids, fac.id])} label={`Select ${fac.itemDescription}`} /></td>
                      <td className="py-3 px-4 font-semibold text-[var(--text-primary)]">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {fac.branch}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-[var(--text-primary)] max-w-[220px]">
                        {fac.itemDescription}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-md bg-[var(--bg-muted)] text-[var(--text-primary)] font-medium">
                          {fac.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[var(--text-muted)] font-medium">
                        {fac.roomZone || "Common Space"}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-[var(--text-primary)]">
                        {fac.quantity}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            fac.condition.toLowerCase().includes("good") || fac.condition.toLowerCase().includes("fair")
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {fac.condition}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[var(--text-muted)]">
                        {fac.assignedOrShared || "Shared Office"}
                      </td>
                      <td className="py-3 px-4 text-slate-500 max-w-[200px] truncate">
                        {fac.maintenanceNotes || "—"}
                      </td>
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}><RowActions canEdit={canEdit} onEdit={() => onEdit ? onEdit(fac) : setEditingFacility(fac)} onArchive={canArchive ? () => onArchiveRecord?.(fac.id).catch((error) => setActionError(error.message)) : undefined} onRestore={canRestore ? () => onRestoreRecord?.(fac.id).catch((error) => setActionError(error.message)) : undefined} archived={showArchived} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex justify-between items-center">
            <span>Showing {filteredFacilities.length} of {facilities.length} facility items</span>
          </div>
        </div>
      )}

      {selectedDetailFacility && (() => {
        const currentIndex = filteredFacilities.findIndex((f) => f.id === selectedDetailFacility.id);
        const hasPrevious = currentIndex > 0;
        const hasNext = currentIndex >= 0 && currentIndex < filteredFacilities.length - 1;
        return (
          <FacilityDetailModal
            facility={selectedDetailFacility}
            isOpen={!!selectedDetailFacility}
            onClose={() => setSelectedDetailFacility(null)}
            hasPrevious={hasPrevious}
            hasNext={hasNext}
            onPrevious={() => hasPrevious && setSelectedDetailFacility(filteredFacilities[currentIndex - 1])}
            onNext={() => hasNext && setSelectedDetailFacility(filteredFacilities[currentIndex + 1])}
          />
        );
      })()}
      {editingFacility && <RecordEditorModal title="Edit facility" initial={editingFacility} fields={[{ key: "branch", label: "Branch", required: true }, { key: "itemDescription", label: "Item description", required: true }, { key: "category", label: "Category", type: "select", options: ["FURNITURE", "HARDWARE", "NETWORKING"] }, { key: "roomZone", label: "Room / zone" }, { key: "quantity", label: "Quantity", type: "number", required: true }, { key: "condition", label: "Condition", required: true }, { key: "assignedOrShared", label: "Allocation" }, { key: "assignedOrSharedEmail", label: "Assignee email", type: "email" }, { key: "assignedOrSharedBranch", label: "Assignee branch" }, { key: "maintenanceNotes", label: "Maintenance notes", type: "textarea" }]} onClose={() => setEditingFacility(null)} onSave={async (values) => { await onSaveRecord?.({ ...values, id: editingFacility.id }); setEditingFacility(null); }} />}
    </div>
  );
};
