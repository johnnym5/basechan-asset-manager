"use client";

import React, { useState, useMemo } from "react";
import { DigitalCredential } from "@/types/assets";
import { AccessGrant } from "@/types/assets";
import { useAuth } from "@/context/AuthContext";
import { RevealPasswordModal } from "../modals/RevealPasswordModal";
import { exportToExcel } from "@/lib/excelParser";
import {
  KeyRound,
  Search,
  Download,
  Eye,
  Shield,
  Lock,
  User,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  LayoutGrid,
  List,
  ArrowRight,
} from "lucide-react";
import { BulkActionBar, CardRecordControls, RowActions, SelectionCheckbox } from "./RecordActions";
import { RecordEditorModal, RecordField } from "../modals/RecordEditorModal";
import { canPerform, excludeArchived } from "@/lib/accessControl";

interface CredentialsTabProps {
  credentials: DigitalCredential[];
  grant?: AccessGrant;
  showArchived?: boolean;
  onToggleArchived?: () => void;
  onCreate?: () => void;
  onEdit?: (record: DigitalCredential) => void;
  onSaveRecord?: (record: Record<string, any>) => Promise<void>;
  onArchiveRecord?: (id: string) => Promise<void>;
  onRestoreRecord?: (id: string) => Promise<void>;
  onBulkEdit?: (ids: string[]) => void;
  onBulkArchive?: (ids: string[]) => Promise<void>;
  onBulkRestore?: (ids: string[]) => Promise<void>;
}

export const CredentialsTab: React.FC<CredentialsTabProps> = ({ credentials, grant, showArchived = false, onToggleArchived = () => {}, onCreate, onEdit, onSaveRecord, onArchiveRecord, onRestoreRecord, onBulkEdit, onBulkArchive, onBulkRestore }) => {
  const { userProfile } = useAuth();
  const isStaff = userProfile?.role === "STAFF";

  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [selectedCred, setSelectedCred] = useState<DigitalCredential | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [localEditor, setLocalEditor] = useState<DigitalCredential | null>(null);
  const [actionError, setActionError] = useState("");
  const canCreate = canPerform(userProfile, grant, "digital_credentials", "create");
  const canEdit = canPerform(userProfile, grant, "digital_credentials", "edit");
  const canArchive = canPerform(userProfile, grant, "digital_credentials", "archive");
  const canRestore = canPerform(userProfile, grant, "digital_credentials", "restore");

  // Row-level filter: Staff only view their assigned credentials
  const visibleCredentials = useMemo(() => {
    let list = excludeArchived(credentials, showArchived);
    if (isStaff && !canPerform(userProfile, grant, "digital_credentials", "read")) list = list.filter((c) => (c.assignedUserEmail || "").toLowerCase() === userProfile?.email.toLowerCase() || c.assignedUserUid === userProfile?.uid);

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.platform.toLowerCase().includes(q) ||
          c.loginEmail.toLowerCase().includes(q) ||
          c.assignedUser.toLowerCase().includes(q) ||
          (c.subAgentHandleId && c.subAgentHandleId.toLowerCase().includes(q))
      );
    }

    return list;
  }, [credentials, isStaff, userProfile, grant, showArchived, search]);

  const handleExport = () => {
    // Never export raw passwords to unencrypted xlsx
    const data = visibleCredentials.map((c) => ({
      "Platform / Software": c.platform,
      "Account / Login Email": c.loginEmail,
      "Sub-Agent / Handle ID": c.subAgentHandleId || "N/A",
      "Assigned Custodian": c.assignedUser,
      "User Role": c.userRole || "User",
      "Vault Status": c.vaultStatus,
    }));
    exportToExcel(data, `Basechan_Digital_Credentials_${new Date().toISOString().slice(0, 10)}`);
  };

  return (
    <div data-scroll-motion-root className="space-y-5 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-gold-500" />
            <span>Digital Accounts & Credential Vault</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Encrypted repository of corporate logins, CRM handles, and sub-agent accesses with step-up audit logging.
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
            <span>Export Directory (Sanitized)</span>
          </button>
        </div>
      </div>

      {/* Security Banner */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900 to-indigo-950 text-white shadow-sm flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-gold-500/20 text-gold-300 border border-gold-500/30">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-gold-300">Credential Access Controls Active</div>
            <p className="text-xs text-slate-300 mt-0.5">
              Credential reads are restricted by Firestore rules. Revealing a credential requires a successful write to <span className="font-mono text-white">vault_access_logs</span>.
            </p>
          </div>
        </div>
        <div className="hidden sm:block text-right">
          <span className="text-[11px] font-mono bg-white/10 px-2 py-1 rounded text-slate-300 border border-white/10">
            Audited Access
          </span>
        </div>
      </div>

      {/* Search Bar */}
      <BulkActionBar count={selectedIds.length} onSelectAll={() => setSelectedIds(visibleCredentials.map((row) => row.id))} onClear={() => setSelectedIds([])} onCreate={onCreate} onEdit={() => onBulkEdit?.(selectedIds)} onArchive={() => onBulkArchive?.(selectedIds).then(() => setSelectedIds([])).catch((error) => setActionError(error.message))} onRestore={() => onBulkRestore?.(selectedIds).then(() => setSelectedIds([])).catch((error) => setActionError(error.message))} showArchived={showArchived} onToggleArchived={onToggleArchived} canCreate={canCreate} canEdit={canEdit} canArchive={canArchive} canRestore={canRestore} />
      {actionError && <p role="alert" className="rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-700">{actionError}</p>}
      <div className="bg-[var(--bg-surface)] p-3.5 rounded-xl border border-[var(--border)] shadow-sm flex items-center gap-3">
        <div className="relative min-w-0 flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search credentials by platform, login email, or custodian..."
            className="w-full min-w-0 bg-[var(--bg-primary)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] text-xs pl-9 pr-4 py-2 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Credentials Display: Cards Grid or Table */}
      {viewMode === "grid" ? (
        visibleCredentials.length === 0 ? (
          <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)] p-6 text-center shadow-sm text-[var(--text-muted)] sm:p-12">
            <KeyRound className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <h3 className="font-bold text-[var(--text-primary)] text-base">No Credentials Found</h3>
            <p className="text-xs text-[var(--text-muted)] mt-1">Try adjusting your search query.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
            {visibleCredentials.map((cred) => {
              const hasUser = cred.assignedUser && cred.assignedUser.trim().toLowerCase() !== "unassigned";
              return (
                <div
                  key={cred.id}
                  onClick={() => setSelectedCred(cred)}
                  className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-gold-400/80 transition-all cursor-pointer group flex flex-col justify-between space-y-4"
                >
                  <CardRecordControls checked={selectedIds.includes(cred.id)} onSelect={() => setSelectedIds((ids) => ids.includes(cred.id) ? ids.filter((id) => id !== cred.id) : [...ids, cred.id])} label={`Select ${cred.platform}`} canEdit={canEdit} onEdit={onEdit ? () => onEdit(cred) : () => setLocalEditor(cred)} onArchive={canArchive && !showArchived ? () => onArchiveRecord?.(cred.id).catch((error) => setActionError(error.message)) : undefined} onRestore={canRestore && showArchived ? () => onRestoreRecord?.(cred.id).catch((error) => setActionError(error.message)) : undefined} archived={showArchived} />
                  {/* Top Section: Prominent User Name (Big) */}
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                        Assigned User
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gold-500/10 text-gold-600 dark:text-gold-400 border border-gold-500/30">
                        {cred.userRole || "User"}
                      </span>
                    </div>

                    <h3 className={`text-base font-extrabold tracking-tight truncate ${
                      hasUser ? "text-[var(--text-primary)] group-hover:text-gold-500 dark:group-hover:text-gold-400" : "text-amber-600 dark:text-amber-400 italic"
                    }`}>
                      {hasUser ? cred.assignedUser : "Unassigned / No User"}
                    </h3>
                  </div>

                  {/* Middle Section: Only 2 Key Information Items */}
                  <div className="space-y-2.5 pt-3 border-t border-[var(--border)] text-xs">
                    {/* Info 1: Platform & Software */}
                    <div>
                      <span className="text-[10px] text-[var(--text-muted)] font-medium block">Platform / Software</span>
                      <p className="font-bold text-[var(--text-primary)] truncate mt-0.5">
                        {cred.platform}
                      </p>
                    </div>

                    {/* Info 2: Login Email */}
                    <div>
                      <span className="text-[10px] text-[var(--text-muted)] font-medium block">Account Email</span>
                      <p className="font-mono font-semibold text-blue-600 dark:text-blue-400 truncate mt-0.5">
                        {cred.loginEmail}
                      </p>
                    </div>
                  </div>

                  {/* Footer Action Indicator */}
                  <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between text-xs text-gold-500 dark:text-gold-400 font-semibold group-hover:underline">
                    <span className="flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Click to Reveal
                    </span>
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
                  <th className="py-3 px-2"><SelectionCheckbox checked={visibleCredentials.length > 0 && selectedIds.length === visibleCredentials.length} onChange={() => setSelectedIds(selectedIds.length === visibleCredentials.length ? [] : visibleCredentials.map((row) => row.id))} label="Select filtered credentials" /></th>
                  <th className="py-3 px-4">Platform / Software</th>
                  <th className="py-3 px-4">Login / Account Email</th>
                  <th className="py-3 px-4">Sub-Agent / Handle ID</th>
                  <th className="py-3 px-4">Assigned Custodian</th>
                  <th className="py-3 px-4">User Role</th>
                  <th className="py-3 px-4">Password Vault</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] text-[var(--text-primary)]">
                {visibleCredentials.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      No credentials found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  visibleCredentials.map((cred) => (
                    <tr key={cred.id} className="hover:bg-slate-50/70 transition-colors cursor-pointer" onClick={() => setSelectedCred(cred)}>
                      <td className="py-3 px-2" onClick={(e) => e.stopPropagation()}><SelectionCheckbox checked={selectedIds.includes(cred.id)} onChange={() => setSelectedIds((ids) => ids.includes(cred.id) ? ids.filter((id) => id !== cred.id) : [...ids, cred.id])} label={`Select ${cred.platform}`} /></td>
                      <td className="py-3 px-4 font-bold text-[var(--text-primary)]">
                        {cred.platform}
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-blue-600 dark:text-blue-400">
                        {cred.loginEmail}
                      </td>
                      <td className="py-3 px-4 font-mono text-[var(--text-muted)]">
                        {cred.subAgentHandleId || <span className="text-slate-300">—</span>}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-[var(--text-primary)]">{cred.assignedUser || "Unassigned"}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full bg-[var(--bg-muted)] text-[var(--text-primary)] text-[11px] font-medium">
                          {cred.userRole || "User"}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 font-mono text-slate-400 tracking-wider">
                          <Lock className="w-3 h-3 text-slate-400" />
                          <span>••••••••••••</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <RowActions canEdit={canEdit} onEdit={onEdit ? () => onEdit(cred) : canEdit ? () => setLocalEditor(cred) : undefined} onArchive={canArchive ? () => onArchiveRecord?.(cred.id).catch((error) => setActionError(error.message)) : undefined} onRestore={canRestore ? () => onRestoreRecord?.(cred.id).catch((error) => setActionError(error.message)) : undefined} archived={showArchived} />
                        <button
                          onClick={() => setSelectedCred(cred)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-black text-white rounded-lg text-xs font-medium shadow-sm transition-all"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Reveal</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex justify-between items-center">
            <span>Showing {visibleCredentials.length} of {credentials.length} total credentials</span>
            <span>Access attempts are monitored and recorded</span>
          </div>
        </div>
      )}

      {selectedCred && (() => {
        const currentIndex = visibleCredentials.findIndex((c) => c.id === selectedCred.id);
        const hasPrevious = currentIndex > 0;
        const hasNext = currentIndex >= 0 && currentIndex < visibleCredentials.length - 1;
        return (
          <RevealPasswordModal
            credential={selectedCred}
            isOpen={!!selectedCred}
            onClose={() => setSelectedCred(null)}
            hasPrevious={hasPrevious}
            hasNext={hasNext}
            onPrevious={() => hasPrevious && setSelectedCred(visibleCredentials[currentIndex - 1])}
            onNext={() => hasNext && setSelectedCred(visibleCredentials[currentIndex + 1])}
          />
        );
      })()}
      {localEditor && <RecordEditorModal title="Edit credential metadata" initial={localEditor} fields={[{ key: "platform", label: "Platform", required: true }, { key: "loginEmail", label: "Login email", type: "email", required: true }, { key: "subAgentHandleId", label: "Handle ID" }, { key: "assignedUser", label: "Assigned user" }, { key: "assignedUserEmail", label: "Assigned email", type: "email" }, { key: "assignedUserBranch", label: "Assigned branch" }, { key: "userRole", label: "User role" }, { key: "vaultStatus", label: "Vault status", type: "select", options: ["SECURED", "UNRESTRICTED"] }, ...(userProfile?.role === "SUPER_ADMIN" || grant?.grants.digital_credentials?.actions.includes("secretWrite") ? [{ key: "rawPass", label: "Secret", type: "password" as const }] : [])]} onClose={() => setLocalEditor(null)} onSave={async (values) => { await onSaveRecord?.({ ...values, id: localEditor.id }); }} />}
    </div>
  );
};
