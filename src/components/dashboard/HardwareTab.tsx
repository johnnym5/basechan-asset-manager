"use client";

import React, { useState, useMemo } from "react";
import { AccessGrant, PhysicalAsset, StaffMember } from "@/types/assets";
import { useAuth } from "@/context/AuthContext";
import { exportToExcel } from "@/lib/excelParser";
import { AssetEditModal } from "../modals/AssetEditModal";
import { CustodyTransferModal } from "../modals/CustodyTransferModal";
import { AssetDetailModal } from "../modals/AssetDetailModal";
import { AnimatedSelect } from "@/components/ui/AnimatedSelect";
import {
  Laptop,
  Search,
  Filter,
  Download,
  Lock,
  Unlock,
  Edit2,
  ArrowRightLeft,
  AlertCircle,
  CheckCircle2,
  MapPin,
  Plus,
  Wrench,
  ArrowRight,
  LayoutGrid,
  List,
} from "lucide-react";
import { BulkActionBar, CardRecordControls, RowActions, SelectionCheckbox } from "./RecordActions";
import { canPerform, canReadRecord, excludeArchived, recordWithinScope } from "@/lib/accessControl";

interface HardwareTabProps {
  assets: PhysicalAsset[];
  staff: StaffMember[];
  onUpdateAsset: (asset: PhysicalAsset) => Promise<void>;
  onTransferCustody: (assetId: string, newStaff: StaffMember, reason: string) => Promise<void>;
  grant?: AccessGrant; showArchived?: boolean; onToggleArchived?: () => void; onCreate?: () => void; onSaveRecord?: (record: Record<string, any>) => Promise<void>; onArchiveRecord?: (id: string) => Promise<void>; onRestoreRecord?: (id: string) => Promise<void>; onBulkEdit?: (ids: string[]) => void; onBulkArchive?: (ids: string[]) => Promise<void>; onBulkRestore?: (ids: string[]) => Promise<void>;
  pendingUpdates?: { id: string; state: string; error?: string }[]; isOnline?: boolean; onRetryPendingUpdate?: (id: string) => Promise<void>; onRequestRepair?: (asset: PhysicalAsset, description: string) => Promise<void>;
  staffFilter?: { name: string; email?: string } | null; onClearStaffFilter?: () => void;
}

export const HardwareTab: React.FC<HardwareTabProps> = ({
  assets,
  staff,
  onUpdateAsset,
  onTransferCustody,
  grant, showArchived = false, onToggleArchived = () => {}, onCreate, onSaveRecord, onArchiveRecord, onRestoreRecord, onBulkEdit, onBulkArchive, onBulkRestore,
  pendingUpdates = [], isOnline = true, onRetryPendingUpdate, onRequestRepair, staffFilter = null, onClearStaffFilter,
}) => {
  const { userProfile } = useAuth();
  const isAdmin = userProfile?.role === "SUPER_ADMIN";
  const isStaff = userProfile?.role === "STAFF";

  const [search, setSearch] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("ALL");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedCondition, setSelectedCondition] = useState("ALL");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [selectedDetailAsset, setSelectedDetailAsset] = useState<PhysicalAsset | null>(null);
  const [editingAsset, setEditingAsset] = useState<PhysicalAsset | null>(null);
  const [transferringAsset, setTransferringAsset] = useState<PhysicalAsset | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]); const [actionError, setActionError] = useState("");
  const canCreate = canPerform(userProfile, grant, "physical_assets", "create"); const canEdit = canPerform(userProfile, grant, "physical_assets", "edit") || isAdmin; const canArchive = canPerform(userProfile, grant, "physical_assets", "archive"); const canRestore = canPerform(userProfile, grant, "physical_assets", "restore");
  const canEditAsset = (asset: PhysicalAsset) => canEdit || (isStaff && !asset.isLocked);

  // Filter based on Staff row-level isolation
  const visibleAssets = useMemo(() => {
    let list = excludeArchived(assets, showArchived);
    if (isStaff && userProfile) list = list.filter((asset) => canReadRecord(userProfile, grant, "physical_assets", asset));
    if (staffFilter) {
      const targetName = staffFilter.name.trim().toLowerCase();
      const targetEmail = staffFilter.email?.trim().toLowerCase();
      list = list.filter((asset) => {
        const sameEmail = !!targetEmail && asset.assignedStaffEmail?.trim().toLowerCase() === targetEmail;
        const sameName = asset.assignedStaff.trim().toLowerCase() === targetName;
        return sameEmail || sameName;
      });
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (a) =>
          a.tag.toLowerCase().includes(q) ||
          a.makeModel.toLowerCase().includes(q) ||
          a.category.toLowerCase().includes(q) ||
          a.serialNumber.toLowerCase().includes(q) ||
          a.assignedStaff.toLowerCase().includes(q) ||
          a.department.toLowerCase().includes(q)
      );
    }

    if (selectedBranch !== "ALL") {
      list = list.filter((a) => a.branch.toLowerCase().includes(selectedBranch.toLowerCase()));
    }

    if (selectedCategory !== "ALL") {
      list = list.filter((a) => a.category.toLowerCase() === selectedCategory.toLowerCase());
    }

    if (selectedCondition !== "ALL") {
      list = list.filter((a) => a.condition.toLowerCase().includes(selectedCondition.toLowerCase()));
    }

    return list;
  }, [assets, isStaff, userProfile, grant, showArchived, search, selectedBranch, selectedCategory, selectedCondition, staffFilter]);

  const categories = useMemo(() => {
    return Array.from(new Set(assets.map((a) => a.category).filter(Boolean)));
  }, [assets]);

  const handleExport = () => {
    const exportData = visibleAssets.map((a) => ({
      "Asset Tag ID": a.tag,
      "Category": a.category,
      "Make & Model": a.makeModel,
      "Serial Number": a.serialNumber || "N/A",
      "Assigned Staff": a.assignedStaff,
      "Department": a.department,
      "Branch Location": a.branch,
      "Condition": a.condition,
      "Status": a.status,
      "Locked": a.isLocked ? "YES" : "NO",
      "Purchase Date": a.purchaseDate || "",
    }));
    exportToExcel(exportData, `Basechan_Hardware_Assets_${new Date().toISOString().slice(0, 10)}`);
  };

  const handleToggleLock = async (asset: PhysicalAsset) => {
    if (!isAdmin) return;
    const updated = {
      ...asset,
      isLocked: !asset.isLocked,
    };
    await onUpdateAsset(updated);
    if (selectedDetailAsset?.id === asset.id) {
      setSelectedDetailAsset(updated);
    }
  };
  const handleRepairRequest = async (asset: PhysicalAsset) => {
    const description = window.prompt(`Describe the issue with ${asset.tag}:`);
    if (description === null || !description.trim()) return;
    try { await onRequestRepair?.(asset, description.trim()); }
    catch (error) { setActionError(error instanceof Error ? error.message : "Could not submit repair request."); }
  };

  return (
    <div data-scroll-motion-root className="space-y-5 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Laptop className="w-5 h-5 text-blue-600" />
            <span>Physical Hardware Asset Register</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isStaff
              ? "Your assigned IT hardware items, status, and verification."
              : "Enterprise registry of computers, laptops, SIMs, and peripherals."}
          </p>
        </div>

      <div className="flex flex-col items-stretch gap-2.5 sm:flex-row sm:items-center">
          <div className="flex items-center bg-[var(--bg-surface)] p-1 rounded-xl border border-[var(--border)] shadow-sm">
            <button
              onClick={() => setViewMode("grid")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
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
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
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
            <span>Export View</span>
          </button>
        </div>
      </div>


      {isStaff && (
        <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 text-xs text-blue-800 flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <span>
              <strong>Staff Self-Service View:</strong> You are viewing assets assigned to{" "}
              <strong>{userProfile?.displayName}</strong> ({userProfile?.email}).
            </span>
          </div>
          <span className="self-start text-[11px] font-medium text-blue-600 bg-blue-100/60 px-2 py-0.5 rounded sm:self-auto">
            {visibleAssets.length} Assigned Assets
          </span>
        </div>
      )}
      {staffFilter && <div className="flex flex-col gap-2 rounded-xl border border-blue-500/30 bg-blue-500/10 p-3 text-sm text-[var(--text-primary)] sm:flex-row sm:items-center sm:justify-between">
        <span>Showing hardware assigned to <strong>{staffFilter.name}</strong>.</span>
        <button type="button" onClick={onClearStaffFilter} className="self-start rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] sm:self-auto">Clear person filter</button>
      </div>}

      {/* Filter Bar */}
      <BulkActionBar count={selectedIds.length} onSelectAll={() => setSelectedIds(visibleAssets.map((row) => row.id))} onClear={() => setSelectedIds([])} onCreate={onCreate} onEdit={() => onBulkEdit?.(selectedIds.filter((id) => { const asset = visibleAssets.find((row) => row.id === id); return asset && (!isStaff || !asset.isLocked); }))} onArchive={() => onBulkArchive?.(selectedIds).then(() => setSelectedIds([])).catch((error) => setActionError(error.message))} onRestore={() => onBulkRestore?.(selectedIds).then(() => setSelectedIds([])).catch((error) => setActionError(error.message))} showArchived={showArchived} onToggleArchived={onToggleArchived} canCreate={canCreate} canEdit={canEdit && (!isStaff || selectedIds.some((id) => visibleAssets.some((asset) => asset.id === id && !asset.isLocked)))} canArchive={canArchive} canRestore={canRestore} />
      {actionError && <p role="alert" className="rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-700">{actionError}</p>}
      <div className="relative z-20 bg-[var(--bg-surface)] p-3.5 rounded-xl border border-[var(--border)] shadow-sm flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by tag, model, serial, or staff name..."
            className="w-full min-w-0 bg-[var(--bg-primary)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] text-xs pl-9 pr-4 py-2 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-1 gap-2 w-full md:flex md:w-auto flex-wrap">
          <AnimatedSelect
            value={selectedBranch}
            onChange={setSelectedBranch}
            options={[
              { value: "ALL", label: "All Branches" },
              { value: "Abuja", label: "Abuja Branch" },
              { value: "Benin", label: "Benin Branch" },
            ]}
            ariaLabel="Filter by branch"
          />

          <AnimatedSelect
            value={selectedCategory}
            onChange={setSelectedCategory}
            options={[
              { value: "ALL", label: "All Categories" },
              ...categories.map((c) => ({ value: c, label: c })),
            ]}
            ariaLabel="Filter by category"
          />

          <AnimatedSelect
            value={selectedCondition}
            onChange={setSelectedCondition}
            options={[
              { value: "ALL", label: "All Conditions" },
              { value: "Good", label: "Good / Excellent" },
              { value: "Fair", label: "Fair" },
              { value: "Faulty", label: "Faulty / Repair" },
            ]}
            ariaLabel="Filter by condition"
          />
        </div>
      </div>

      {/* Assets Grid / Table Display */}
      {viewMode === "grid" ? (
        visibleAssets.length === 0 ? (
          <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)] p-6 text-center shadow-sm text-[var(--text-muted)] sm:p-12">
            <Laptop className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <h3 className="font-bold text-[var(--text-primary)] text-base">No Hardware Assets Found</h3>
            <p className="text-xs text-[var(--text-muted)] mt-1">Try clearing or adjusting your search filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
            {visibleAssets.map((asset) => {
              const hasUser = asset.assignedStaff && asset.assignedStaff.trim().toLowerCase() !== "unassigned";
              return (
                <div
                  key={asset.id}
                  onClick={() => setSelectedDetailAsset(asset)}
                  className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-blue-500/50 transition-all cursor-pointer group flex flex-col justify-between space-y-4"
                >
                  <CardRecordControls checked={selectedIds.includes(asset.id)} onSelect={() => setSelectedIds((ids) => ids.includes(asset.id) ? ids.filter((id) => id !== asset.id) : [...ids, asset.id])} label={`Select ${asset.tag}`} canEdit={canEditAsset(asset)} onEdit={() => setEditingAsset(asset)} onArchive={canArchive && !showArchived ? () => onArchiveRecord?.(asset.id).catch((error) => setActionError(error.message)) : undefined} onRestore={canRestore && showArchived ? () => onRestoreRecord?.(asset.id).catch((error) => setActionError(error.message)) : undefined} archived={showArchived} />
                  {/* Top Section: Prominent User Name (Big) */}
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                        Assigned Custodian
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        asset.condition.toLowerCase().includes("good") || asset.condition.toLowerCase().includes("excellent")
                          ? "bg-gold-500/10 text-gold-600 dark:text-gold-400 border border-gold-500/30"
                          : asset.condition.toLowerCase().includes("fair")
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                          : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                      }`}>
                        {asset.condition}
                      </span>
                    </div>

                    <h3 className={`text-base font-extrabold tracking-tight truncate ${
                      hasUser ? "text-[var(--text-primary)] group-hover:text-blue-600 dark:group-hover:text-blue-400" : "text-amber-600 dark:text-amber-400 italic"
                    }`}>
                      {hasUser ? asset.assignedStaff : "Unassigned / No User"}
                    </h3>
                  </div>

                  {/* Middle Section: Only 2 Key Pieces of Information */}
                  <div className="space-y-2.5 pt-3 border-t border-[var(--border)] text-xs">
                    {/* Info 1: Tag ID & Make/Model */}
                    <div>
                      <span className="text-[10px] text-[var(--text-muted)] font-medium block">Hardware Item</span>
                      <p className="font-bold text-[var(--text-primary)] font-mono truncate mt-0.5">
                        {asset.tag} <span className="font-sans font-normal text-[var(--text-muted)]">• {asset.makeModel}</span>
                      </p>
                    </div>

                    {/* Info 2: Category & Location */}
                    <div>
                      <span className="text-[10px] text-[var(--text-muted)] font-medium block">Category & Location</span>
                      <p className="font-semibold text-[var(--text-muted)] truncate flex items-center gap-1.5 mt-0.5">
                        <span className="px-2 py-0.5 rounded bg-[var(--bg-muted)] text-[var(--text-primary)] font-medium text-[11px]">
                          {asset.category || "Hardware"}
                        </span>
                        <span>•</span>
                        <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                        <span className="truncate">{asset.branch || "Abuja Branch"}</span>
                      </p>
                    </div>
                  </div>

                  {/* Footer Action Indicator */}
                  <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between text-xs text-blue-600 dark:text-blue-400 font-semibold group-hover:underline">
                    <span>Click for full info</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--bg-muted)] border-b border-[var(--border)] text-[var(--text-muted)] uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-2"><SelectionCheckbox checked={visibleAssets.length > 0 && selectedIds.length === visibleAssets.length} onChange={() => setSelectedIds(selectedIds.length === visibleAssets.length ? [] : visibleAssets.map((row) => row.id))} label="Select filtered hardware" /></th>
                  <th className="py-3 px-4">Tag ID</th>
                  <th className="py-3 px-4">Make & Model</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Serial Number</th>
                  <th className="py-3 px-4">Assigned Custodian</th>
                  <th className="py-3 px-4">Branch</th>
                  <th className="py-3 px-4">Condition</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center">Lock</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] text-[var(--text-primary)]">
                {visibleAssets.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-slate-400">
                      No hardware assets match your filters.
                    </td>
                  </tr>
                ) : (
                  visibleAssets.map((asset) => {
                    const hasMissingSerial = !asset.serialNumber || asset.serialNumber === "NaN" || asset.serialNumber === "";
                    return (
                      <tr key={asset.id} className="cursor-pointer transition-colors hover:bg-[var(--bg-muted)]" onClick={() => setSelectedDetailAsset(asset)}>
                        <td className="py-3 px-2" onClick={(e) => e.stopPropagation()}><SelectionCheckbox checked={selectedIds.includes(asset.id)} onChange={() => setSelectedIds((ids) => ids.includes(asset.id) ? ids.filter((id) => id !== asset.id) : [...ids, asset.id])} label={`Select ${asset.tag}`} /></td>
                        <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                          {asset.tag}
                        </td>
                        <td className="py-3 px-4 font-semibold text-[var(--text-primary)] max-w-[200px] truncate">
                          {asset.makeModel}
                        </td>
                        <td className="py-3 px-4 text-[var(--text-muted)]">
                        <span className="px-2 py-0.5 rounded-md bg-[var(--bg-muted)] text-[var(--text-primary)] font-medium">
                            {asset.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono">
                          {hasMissingSerial ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-700">
                              <AlertCircle className="w-3 h-3" /> MISSING
                            </span>
                          ) : (
                            <span className="text-[var(--text-primary)]">{asset.serialNumber}</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-[var(--text-primary)]">{asset.assignedStaff || "Unassigned"}</div>
                          <div className="text-[10px] text-slate-400">{asset.department}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 text-[var(--text-muted)]">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            {asset.branch}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                              asset.condition.toLowerCase().includes("good") || asset.condition.toLowerCase().includes("excellent")
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : asset.condition.toLowerCase().includes("fair")
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : "bg-rose-50 text-rose-700 border border-rose-200"
                            }`}
                          >
                            {asset.condition}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-medium text-[var(--text-primary)]">{asset.status}</span>
                        </td>
                        <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                          {isAdmin ? (
                            <button
                              onClick={() => handleToggleLock(asset)}
                              className={`p-1.5 rounded-lg transition-colors ${
                                asset.isLocked
                                  ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                                  : "bg-slate-100 text-slate-400 hover:text-slate-700"
                              }`}
                              title={asset.isLocked ? "Asset Locked. Click to Unlock." : "Asset Unlocked. Click to Lock."}
                            >
                              {asset.isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                            </button>
                          ) : asset.isLocked ? (
                            <span className="text-amber-600" title="Locked by Admin">
                              <Lock className="w-3.5 h-3.5 mx-auto" />
                            </span>
                          ) : (
                            <span className="text-slate-300" title="Unlocked">
                              <Unlock className="w-3.5 h-3.5 mx-auto" />
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            {isAdmin && (
                              <button
                                onClick={() => setTransferringAsset(asset)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                title="Transfer Custody"
                              >
                                <ArrowRightLeft className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {isStaff && <button onClick={() => void handleRepairRequest(asset)} className="rounded-lg p-1.5 text-amber-600 hover:bg-amber-50" title="Report issue"><Wrench className="h-3.5 w-3.5"/></button>}
                            {canEditAsset(asset) && <button
                              onClick={() => setEditingAsset(asset)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                              title={isAdmin ? "Edit Asset" : "Update Condition"}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>}
                            <RowActions canEdit={false} onArchive={canArchive ? () => onArchiveRecord?.(asset.id).catch((error) => setActionError(error.message)) : undefined} onRestore={canRestore ? () => onRestoreRecord?.(asset.id).catch((error) => setActionError(error.message)) : undefined} archived={showArchived} />
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex justify-between items-center">
            <span>Showing {visibleAssets.length} of {assets.length} total assets</span>
            {isStaff && <span>Staff mode limits edit access to unlocked item condition/status.</span>}
          </div>
        </div>
      )}

      {/* Modals */}
      {selectedDetailAsset && (() => {
        const currentIndex = visibleAssets.findIndex((a) => a.id === selectedDetailAsset.id);
        const hasPrevious = currentIndex > 0;
        const hasNext = currentIndex >= 0 && currentIndex < visibleAssets.length - 1;
        return (
          <AssetDetailModal
            asset={selectedDetailAsset}
            isOpen={!!selectedDetailAsset}
            onClose={() => setSelectedDetailAsset(null)}
            onToggleLock={handleToggleLock}
            onEdit={(asset) => setEditingAsset(asset)}
            onTransfer={(asset) => setTransferringAsset(asset)}
            onRepair={(asset) => void handleRepairRequest(asset)}
            canEdit={canEditAsset(selectedDetailAsset)}
            hasPrevious={hasPrevious}
            hasNext={hasNext}
            onPrevious={() => hasPrevious && setSelectedDetailAsset(visibleAssets[currentIndex - 1])}
            onNext={() => hasNext && setSelectedDetailAsset(visibleAssets[currentIndex + 1])}
          />
        );
      })()}

      {editingAsset && (
        <AssetEditModal
          asset={editingAsset}
          isOpen={!!editingAsset}
          onClose={() => setEditingAsset(null)}
          onSave={onUpdateAsset}
        />
      )}

      {transferringAsset && (
        <CustodyTransferModal
          asset={transferringAsset}
          staffList={staff}
          isOpen={!!transferringAsset}
          onClose={() => setTransferringAsset(null)}
          onTransfer={onTransferCustody}
        />
      )}
    </div>
  );
};
