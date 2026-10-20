import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { StaffMember, PhysicalAsset } from "@/types/assets";
import { X, Send, AlertCircle, ClipboardList, User, Laptop } from "lucide-react";

interface AssignTaskModalProps {
  staffList: StaffMember[];
  assetList: PhysicalAsset[];
  isOpen: boolean;
  onClose: () => void;
  onAssign: (taskData: {
    title: string;
    description: string;
    type: "repair_request" | "stocktake" | "handover" | "general_task";
    assignedToStaff: StaffMember;
    asset?: PhysicalAsset;
  }) => Promise<void>;
}

export const AssignTaskModal: React.FC<AssignTaskModalProps> = ({
  staffList,
  assetList,
  isOpen,
  onClose,
  onAssign,
}) => {
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [taskType, setTaskType] = useState<"repair_request" | "stocktake" | "handover" | "general_task">("general_task");
  const [loading, setLoading] = useState(false);
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
    if (!title.trim()) {
      setError("Please enter a task title.");
      return;
    }

    const targetStaff = staffList.find((s) => s.id === selectedStaffId);
    if (!targetStaff) {
      setError("Selected staff member was not found.");
      return;
    }

    const targetAsset = assetList.find((a) => a.id === selectedAssetId);

    setLoading(true);
    setError(null);
    try {
      await onAssign({
        title: title.trim(),
        description: description.trim(),
        type: taskType,
        assignedToStaff: targetStaff,
        asset: targetAsset,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to assign task.");
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="relative my-auto w-full max-w-sm md:max-w-md max-h-[85vh] flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150">

        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-[var(--border)] bg-[var(--bg-muted)]/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                Assign Task to User
              </h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Dispatch work directives, inspections, or asset verification.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 space-y-4 sm:p-6">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Target Personnel */}
          <div>
            <label className="block text-xs font-bold text-[var(--text-primary)] mb-1 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-blue-500" /> Assign To Personnel *
            </label>
            <select
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-[var(--border)] rounded-xl bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">-- Choose Target Staff Member --</option>
              {staffList.map((staff) => (
                <option key={staff.id} value={staff.id}>
                  {staff.name} ({staff.department} • {staff.branch})
                </option>
              ))}
            </select>
          </div>

          {/* Task Title */}
          <div>
            <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
              Task Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Verify Laptop Serial & Physical Health"
              className="w-full text-xs px-3 py-2 border border-[var(--border)] rounded-xl bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              required
            />
          </div>

          {/* Task Type */}
          <div>
            <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
              Task Type
            </label>
            <select
              value={taskType}
              onChange={(e) => setTaskType(e.target.value as any)}
              className="w-full text-xs px-3 py-2 border border-[var(--border)] rounded-xl bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="general_task">General Task / Directive</option>
              <option value="stocktake">Stocktake Audit / Inspection</option>
              <option value="handover">Hardware Handover / Custody</option>
              <option value="repair_request">Hardware Repair Inspection</option>
            </select>
          </div>

          {/* Optional Related Asset */}
          <div>
            <label className="block text-xs font-bold text-[var(--text-primary)] mb-1 flex items-center gap-1">
              <Laptop className="w-3.5 h-3.5 text-slate-400" /> Related Hardware Asset (Optional)
            </label>
            <select
              value={selectedAssetId}
              onChange={(e) => setSelectedAssetId(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-[var(--border)] rounded-xl bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- None / General Task --</option>
              {assetList.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.tag} • {asset.makeModel} ({asset.assignedStaff || "Unassigned"})
                </option>
              ))}
            </select>
          </div>

          {/* Task Description / Instructions */}
          <div>
            <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
              Task Description & Directives
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed instructions for the assigned personnel..."
              rows={3}
              className="w-full text-xs px-3 py-2 border border-[var(--border)] rounded-xl bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Actions Footer */}
          <div className="flex justify-end gap-2 pt-4 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-[var(--text-muted)] hover:bg-[var(--bg-muted)] rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2 bg-navy-800 hover:bg-navy-700 disabled:opacity-50 text-gold-400 rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              {loading ? "Dispatching..." : "Assign Task"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
