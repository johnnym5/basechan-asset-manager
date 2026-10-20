"use client";

import React, { useState, useMemo } from "react";
import { AccessGrant, StaffMember, PhysicalAsset } from "@/types/assets";
import { useAuth } from "@/context/AuthContext";
import { exportToExcel } from "@/lib/excelParser";
import {
  Users,
  Search,
  Download,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Laptop,
  LayoutGrid,
  List,
  ArrowRight,
} from "lucide-react";
import { BulkActionBar, CardRecordControls, RowActions, SelectionCheckbox } from "./RecordActions";
import { canPerform, excludeArchived, staffHasAsset } from "@/lib/accessControl";
import { RecordEditorModal } from "../modals/RecordEditorModal";
import { StaffDetailModal } from "../modals/StaffDetailModal";

interface StaffDirectoryTabProps {
  staff: StaffMember[];
  assets: PhysicalAsset[];
  onSelectStaffAssets: (staffName: string) => void;
  grant?: AccessGrant; isAdmin?: boolean; onManageAccess?: (staff: StaffMember) => void; showArchived?: boolean; onToggleArchived?: () => void; onCreate?: () => void; onEdit?: (record: StaffMember) => void;
  onSaveRecord?: (record: Record<string, any>) => Promise<void>;
  onArchiveRecord?: (id: string) => Promise<void>; onRestoreRecord?: (id: string) => Promise<void>; onBulkEdit?: (ids: string[]) => void; onBulkArchive?: (ids: string[]) => Promise<void>; onBulkRestore?: (ids: string[]) => Promise<void>;
}

export const StaffDirectoryTab: React.FC<StaffDirectoryTabProps> = ({
  staff,
  assets,
  onSelectStaffAssets,
  grant, isAdmin = false, onManageAccess, showArchived = false, onToggleArchived = () => {}, onCreate, onEdit, onSaveRecord, onArchiveRecord, onRestoreRecord, onBulkEdit, onBulkArchive, onBulkRestore,
}) => {
  const { userProfile } = useAuth();
  const [search, setSearch] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("ALL");
  const [selectedDept, setSelectedDept] = useState("ALL");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [selectedDetailStaff, setSelectedDetailStaff] = useState<StaffMember | null>(null);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]); const [actionError, setActionError] = useState("");
  const canCreate = canPerform(userProfile, grant, "staff_inventory", "create"); const canEdit = canPerform(userProfile, grant, "staff_inventory", "edit"); const canArchive = canPerform(userProfile, grant, "staff_inventory", "archive"); const canRestore = canPerform(userProfile, grant, "staff_inventory", "restore");

  const departments = useMemo(() => {
    return Array.from(new Set(staff.map((s) => s.department).filter(Boolean)));
  }, [staff]);

  const filteredStaff = useMemo(() => {
    return excludeArchived(staff, showArchived).filter((s) => {
      const matchesSearch =
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.email.toLowerCase().includes(search.toLowerCase()) ||
        s.position.toLowerCase().includes(search.toLowerCase()) ||
        (s.phone && s.phone.includes(search));

      const matchesBranch = selectedBranch === "ALL" || s.branch.toLowerCase().includes(selectedBranch.toLowerCase());
      const matchesDept = selectedDept === "ALL" || s.department.toLowerCase() === selectedDept.toLowerCase();

      return matchesSearch && matchesBranch && matchesDept;
    });
  }, [staff, search, selectedBranch, selectedDept, showArchived]);

  const getStaffAssetCount = (person: StaffMember | string) => {
    if (typeof person === "string") {
      const normalized = person.trim().toLowerCase();
      return assets.filter((asset) => asset.assignedStaff.trim().toLowerCase() === normalized).length;
    }
    return assets.filter((asset) => !asset.archived && staffHasAsset(asset, person)).length;
  };

  const handleExport = () => {
    const data = filteredStaff.map((s) => ({
      "S/N": s.sn || "",
      "Staff Name": s.name,
      "Email Address": s.email,
      "Department": s.department,
      "Position": s.position,
      "Branch Location": s.branch,
      "Phone Number": s.phone || "",
      "Employment Date": s.employmentDate || "",
      "Assigned Hardware Count": getStaffAssetCount(s),
    }));
    exportToExcel(data, `Basechan_Staff_Directory_${new Date().toISOString().slice(0, 10)}`);
  };

  return (
    <div data-scroll-motion-root className="space-y-5 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-600" />
            <span>Staff Inventory & Personnel Directory</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Directory of corporate personnel across Abuja HQ and Benin Branch with asset custody bindings.
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
      <BulkActionBar count={selectedIds.length} onSelectAll={() => setSelectedIds(filteredStaff.map((row) => row.id))} onClear={() => setSelectedIds([])} onCreate={onCreate} onEdit={() => onBulkEdit?.(selectedIds)} onArchive={() => onBulkArchive?.(selectedIds).then(() => setSelectedIds([])).catch((error) => setActionError(error.message))} onRestore={() => onBulkRestore?.(selectedIds).then(() => setSelectedIds([])).catch((error) => setActionError(error.message))} showArchived={showArchived} onToggleArchived={onToggleArchived} canCreate={canCreate} canEdit={canEdit} canArchive={canArchive} canRestore={canRestore} />
      {actionError && <p role="alert" className="rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-700">{actionError}</p>}
      <div className="bg-[var(--bg-surface)] p-3.5 rounded-xl border border-[var(--border)] shadow-sm flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search staff by name, email, position, or phone..."
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
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="min-w-0 flex-1 text-xs px-2.5 py-2 border border-[var(--border)] rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Staff Display: Cards Grid or Table */}
      {viewMode === "grid" ? (
        filteredStaff.length === 0 ? (
        <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)] p-6 text-center shadow-sm text-[var(--text-muted)] sm:p-12">
            <Users className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <h3 className="font-bold text-[var(--text-primary)] text-base">No Staff Members Found</h3>
            <p className="text-xs text-[var(--text-muted)] mt-1">Try adjusting your search criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {filteredStaff.map((person) => {
              const assetCount = getStaffAssetCount(person);
              return (
                <div
                  key={person.id}
                  onClick={() => setSelectedDetailStaff(person)}
                  className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-purple-500/50 transition-all cursor-pointer group flex flex-col justify-between space-y-4"
                >
                  <CardRecordControls checked={selectedIds.includes(person.id)} onSelect={() => setSelectedIds((ids) => ids.includes(person.id) ? ids.filter((id) => id !== person.id) : [...ids, person.id])} label={`Select ${person.name}`} canEdit={canEdit} onEdit={() => onEdit ? onEdit(person) : setEditingStaff(person)} onArchive={canArchive && !showArchived ? () => onArchiveRecord?.(person.id).catch((error) => setActionError(error.message)) : undefined} onRestore={canRestore && showArchived ? () => onRestoreRecord?.(person.id).catch((error) => setActionError(error.message)) : undefined} archived={showArchived} onManageAccess={isAdmin ? () => onManageAccess?.(person) : undefined} />
                  {/* Top Section: Prominent Staff Name (Big) */}
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                        Personnel Name
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                        {assetCount} {assetCount === 1 ? "Gear" : "Gears"}
                      </span>
                    </div>

                    <h3 className="text-base font-extrabold tracking-tight text-[var(--text-primary)] group-hover:text-purple-600 dark:group-hover:text-purple-400 truncate">
                      {person.name}
                    </h3>
                  </div>

                  {/* Middle Section: Only 2 Key Pieces of Information */}
                  <div className="space-y-2.5 pt-3 border-t border-[var(--border)] text-xs">
                    {/* Info 1: Position & Department */}
                    <div>
                      <span className="text-[10px] text-[var(--text-muted)] font-medium block">Position & Department</span>
                      <p className="font-bold text-[var(--text-primary)] truncate mt-0.5">
                        {person.position} <span className="font-sans font-normal text-[var(--text-muted)]">• {person.department}</span>
                      </p>
                    </div>

                    {/* Info 2: Email & Branch */}
                    <div>
                      <span className="text-[10px] text-[var(--text-muted)] font-medium block">Email & Location</span>
                      <p className="font-mono text-blue-600 dark:text-blue-400 truncate mt-0.5 flex items-center gap-1.5">
                        <span className="truncate">{person.email || "No email"}</span>
                        <span>•</span>
                        <span className="font-sans text-[var(--text-muted)] font-normal truncate">{person.branch}</span>
                      </p>
                    </div>
                  </div>

                  {/* Footer Action Indicator */}
                  <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between text-xs text-purple-600 dark:text-purple-400 font-semibold group-hover:underline">
                    <span>Click for profile</span>
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
                  <th className="py-3 px-2"><SelectionCheckbox checked={filteredStaff.length > 0 && selectedIds.length === filteredStaff.length} onChange={() => setSelectedIds(selectedIds.length === filteredStaff.length ? [] : filteredStaff.map((row) => row.id))} label="Select filtered staff" /></th>
                  <th className="py-3 px-4">Staff Name</th>
                  <th className="py-3 px-4">Corporate Email</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Position</th>
                  <th className="py-3 px-4">Branch Location</th>
                  <th className="py-3 px-4">Phone Number</th>
                  <th className="py-3 px-4 text-center">Assigned Gear</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] text-[var(--text-primary)]">
                {filteredStaff.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      No staff members match your search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredStaff.map((person) => {
                    const assetCount = getStaffAssetCount(person);
                    return (
                      <tr key={person.id} className="cursor-pointer transition-colors hover:bg-[var(--bg-muted)]" onClick={() => setSelectedDetailStaff(person)}>
                        <td className="py-3 px-2" onClick={(e) => e.stopPropagation()}><SelectionCheckbox checked={selectedIds.includes(person.id)} onChange={() => setSelectedIds((ids) => ids.includes(person.id) ? ids.filter((id) => id !== person.id) : [...ids, person.id])} label={`Select ${person.name}`} /></td>
                        <td className="py-3 px-4 font-bold text-[var(--text-primary)]">
                          {person.name}
                        </td>
                        <td className="py-3 px-4 font-mono text-blue-600 dark:text-blue-400">
                          {person.email ? (
                            <a href={`mailto:${person.email}`} className="hover:underline flex items-center gap-1">
                              <Mail className="w-3 h-3 text-slate-400" />
                              <span>{person.email}</span>
                            </a>
                          ) : (
                            <span className="text-slate-300">No email on record</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 font-medium">
                            {person.department}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium text-[var(--text-primary)]">
                          {person.position}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 text-slate-600">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            {person.branch}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-mono">
                          {person.phone ? (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-400" />
                              {person.phone}
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => onSelectStaffAssets(person.name)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-all ${
                              assetCount > 0
                                ? "bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
                                : "bg-slate-100 text-slate-400"
                            }`}
                          >
                            <Laptop className="w-3 h-3" />
                            <span>{assetCount} {assetCount === 1 ? "Item" : "Items"}</span>
                          </button>
                        </td>
                        <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}><div className="flex items-center justify-end gap-1"><RowActions canEdit={canEdit} onEdit={() => onEdit ? onEdit(person) : setEditingStaff(person)} onArchive={canArchive ? () => onArchiveRecord?.(person.id).catch((error) => setActionError(error.message)) : undefined} onRestore={canRestore ? () => onRestoreRecord?.(person.id).catch((error) => setActionError(error.message)) : undefined} archived={showArchived} />{isAdmin && <button type="button" onClick={() => onManageAccess?.(person)} className="rounded-md border border-[var(--border)] px-2 py-1 text-[10px] font-semibold text-blue-600 hover:bg-blue-500/10">Manage access</button>}</div></td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="p-3 bg-[var(--bg-muted)] border-t border-[var(--border)] text-xs text-[var(--text-muted)] flex justify-between items-center">
            <span>Showing {filteredStaff.length} of {staff.length} staff personnel</span>
          </div>
        </div>
      )}

      {selectedDetailStaff && (() => {
        const currentIndex = filteredStaff.findIndex((s) => s.id === selectedDetailStaff.id);
        const hasPrevious = currentIndex > 0;
        const hasNext = currentIndex >= 0 && currentIndex < filteredStaff.length - 1;
        return (
          <StaffDetailModal
            person={selectedDetailStaff}
            assetCount={getStaffAssetCount(selectedDetailStaff)}
            isOpen={!!selectedDetailStaff}
            onClose={() => setSelectedDetailStaff(null)}
            onViewAssets={onSelectStaffAssets}
            hasPrevious={hasPrevious}
            hasNext={hasNext}
            onPrevious={() => hasPrevious && setSelectedDetailStaff(filteredStaff[currentIndex - 1])}
            onNext={() => hasNext && setSelectedDetailStaff(filteredStaff[currentIndex + 1])}
            isAdmin={isAdmin}
            canEdit={canEdit}
            canArchive={canArchive && !showArchived}
            onEdit={() => { setSelectedDetailStaff(null); onEdit ? onEdit(selectedDetailStaff) : setEditingStaff(selectedDetailStaff); }}
            onArchive={() => { void onArchiveRecord?.(selectedDetailStaff.id).then(() => setSelectedDetailStaff(null)).catch((error) => setActionError(error.message)); }}
            onManageAccess={() => { const person = selectedDetailStaff; setSelectedDetailStaff(null); onManageAccess?.(person); }}
          />
        );
      })()}
      {editingStaff && <RecordEditorModal title="Edit staff record" initial={editingStaff} fields={[{ key: "name", label: "Name", required: true }, { key: "email", label: "Email", type: "email", required: true }, { key: "department", label: "Department", required: true }, { key: "position", label: "Position", required: true }, { key: "branch", label: "Branch", required: true }, { key: "phone", label: "Phone" }, { key: "employmentDate", label: "Employment date", type: "date" }]} onClose={() => setEditingStaff(null)} onSave={async (values) => { await onSaveRecord?.({ ...values, id: editingStaff.id }); setEditingStaff(null); }} />}
    </div>
  );
};
