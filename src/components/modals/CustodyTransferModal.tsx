import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { PhysicalAsset, StaffMember } from "@/types/assets";
import { X, ArrowRightLeft, AlertCircle } from "lucide-react";

interface CustodyTransferModalProps {
  asset: PhysicalAsset;
  staffList: StaffMember[];
  isOpen: boolean;
  onClose: () => void;
  onTransfer: (assetId: string, newStaff: StaffMember, reason: string) => Promise<void>;
}

export const CustodyTransferModal: React.FC<CustodyTransferModalProps> = ({
  asset,
  staffList,
  isOpen,
  onClose,
  onTransfer,
}) => {
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [reason, setReason] = useState("");
  const [transferring, setTransferring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffId) {
      setError("Please select a target staff member.");
      return;
    }

    const targetStaff = staffList.find((s) => s.id === selectedStaffId);
    if (!targetStaff) {
      setError("Selected staff member was not found.");
      return;
    }

    setTransferring(true);
    setError(null);
    try {
      await onTransfer(asset.id, targetStaff, reason);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to transfer asset custody.");
    } finally {
      setTransferring(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="relative my-auto w-full max-w-sm md:max-w-md max-h-[85vh] flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150">
        <div className="flex shrink-0 justify-between items-center px-4 py-3 border-b border-slate-100 bg-slate-50/50 sm:px-6 sm:py-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
              <ArrowRightLeft className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Transfer Hardware Custody</h3>
              <p className="text-xs text-slate-500 font-mono mt-0.5">{asset.tag} • {asset.makeModel}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 space-y-4 sm:p-6">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1">
            <div className="text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Current Custodian</div>
            <div className="font-bold text-slate-800 text-sm">{asset.assignedStaff || "Unassigned"}</div>
            <div className="text-slate-500">{asset.department} • {asset.branch}</div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">New Custodian Staff Member</label>
            <select
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              required
            >
              <option value="">-- Choose Staff Member --</option>
              {staffList.map((staff) => (
                <option key={staff.id} value={staff.id}>
                  {staff.name} ({staff.branch} - {staff.department})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Transfer Reason / Audit Note</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Staff redeployment, promotion, replacement device"
              rows={3}
              className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="sticky bottom-0 -mx-4 -mb-4 flex justify-end gap-2 border-t border-slate-100 bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:-mb-6 sm:px-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={transferring}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium shadow-sm transition-all"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              {transferring ? "Transferring..." : "Confirm Transfer"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
