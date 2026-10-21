import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { MODAL_BACKDROP_VARIANTS, MODAL_CONTENT_VARIANTS, SPRING_TRANSITION } from "@/lib/motion";
import { PhysicalAsset } from "@/types/assets";
import { useAuth } from "@/context/AuthContext";
import { X, Lock, Save, AlertCircle, Plus, Trash2 } from "lucide-react";

interface AssetEditModalProps {
  asset: PhysicalAsset;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedAsset: PhysicalAsset) => Promise<void>;
}

export const AssetEditModal: React.FC<AssetEditModalProps> = ({ asset, isOpen, onClose, onSave }) => {
  const { userProfile } = useAuth();
  const isAdmin = userProfile?.role === "SUPER_ADMIN";
  const isLocked = asset.isLocked && !isAdmin;
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

  const [condition, setCondition] = useState(asset.condition || "Good");
  const [status, setStatus] = useState(asset.status || "Active");
  const [serialNumber, setSerialNumber] = useState(asset.serialNumber || "");
  const [tag, setTag] = useState(asset.tag || "");
  const [purchaseDate, setPurchaseDate] = useState(asset.purchaseDate || "");
  const [branch, setBranch] = useState(asset.branch || "Abuja Branch");
  const [lockedState, setLockedState] = useState(asset.isLocked || false);
  const [customFields, setCustomFields] = useState<{ key: string; value: string }[]>(
    asset.customAttributes
      ? Object.entries(asset.customAttributes).map(([key, value]) => ({ key, value }))
      : []
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !mounted) return null;

  const handleAddCustomField = () => {
    setCustomFields((prev) => [...prev, { key: "", value: "" }]);
  };

  const handleCustomFieldChange = (index: number, field: "key" | "value", val: string) => {
    setCustomFields((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: val } : item))
    );
  };

  const handleRemoveCustomField = (index: number) => {
    setCustomFields((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) {
      setError("This asset is locked by management and cannot be modified by staff.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const customAttrsRecord: Record<string, string> = {};
      customFields.forEach((item) => {
        if (item.key.trim()) {
          customAttrsRecord[item.key.trim()] = item.value.trim();
        }
      });

      const updated: PhysicalAsset = {
        ...asset,
        condition,
        status,
        customAttributes: customAttrsRecord,
        ...(isAdmin
          ? {
              serialNumber,
              tag,
              purchaseDate,
              branch,
              isLocked: lockedState,
            }
          : {}),
        updatedAt: new Date().toISOString(),
        lastStaffCheckin: new Date().toISOString()
      };

      await onSave(updated);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to update asset.");
    } finally {
      setSaving(false);
    }
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="asset-edit-backdrop"
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={MODAL_BACKDROP_VARIANTS}
          className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
          onClick={onClose}
        >
          <motion.div
            key="asset-edit-content"
            variants={MODAL_CONTENT_VARIANTS}
            transition={SPRING_TRANSITION}
            className="relative my-auto w-full max-w-sm md:max-w-xl max-h-[85vh] flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
        <div className="flex shrink-0 justify-between items-center px-4 py-3 sm:px-6 sm:py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {isAdmin ? "Manage Hardware Asset" : "Update Asset Condition"}
            </h3>
            <p className="text-xs text-slate-500 font-mono mt-0.5">{asset.tag} • {asset.makeModel}</p>
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

          {asset.isLocked && !isAdmin && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
              <Lock className="w-4 h-4 flex-shrink-0 text-amber-600" />
              <span>Asset is locked by Admin. Edits are restricted.</span>
            </div>
          )}

          {isAdmin && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Asset Tag ID</label>
                  <input
                    type="text"
                    value={tag}
                    onChange={(e) => setTag(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Serial Number</label>
                  <input
                    type="text"
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    placeholder="Enter device serial"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Physical Location</label>
                  <select
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="Abuja Branch">Abuja Branch</option>
                    <option value="Benin Branch">Benin Branch</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Purchase Date</label>
                  <input
                    type="text"
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. 2024-03-15"
                  />
                </div>
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Condition</label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                disabled={isLocked}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-slate-100"
              >
                <option value="Excellent">Excellent</option>
                <option value="Good">Good</option>
                <option value="Fair">Fair</option>
                <option value="Faulty">Faulty</option>
                <option value="Under Repair">Under Repair</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Operational Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                disabled={isLocked}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-slate-100"
              >
                <option value="Active">Active</option>
                <option value="Repair">Repair</option>
                <option value="Retired">Retired</option>
              </select>
            </div>
          </div>

          {isAdmin && (
            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <input
                type="checkbox"
                id="isLockedCheckbox"
                checked={lockedState}
                onChange={(e) => setLockedState(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
              />
              <label htmlFor="isLockedCheckbox" className="text-xs font-medium text-slate-700 cursor-pointer">
                Lock asset (Prevent staff self-service edits)
              </label>
            </div>
          )}

          {/* Custom Fields & Headers Section */}
          {isAdmin && (
            <div className="pt-3 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-xs font-bold text-slate-800">
                    Custom Fields &amp; Additional Headers
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Add custom attributes or headers (e.g. Warranty Date, RAM Specs, MAC Address)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddCustomField}
                  className="px-2.5 py-1 text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg border border-blue-200 transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Header</span>
                </button>
              </div>

              {customFields.length > 0 && (
                <div className="space-y-2">
                  {customFields.map((field, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Header Name (e.g. RAM)"
                        value={field.key}
                        onChange={(e) => handleCustomFieldChange(idx, "key", e.target.value)}
                        className="w-1/2 text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                      />
                      <input
                        type="text"
                        placeholder="Header Value"
                        value={field.value}
                        onChange={(e) => handleCustomFieldChange(idx, "value", e.target.value)}
                        className="w-1/2 text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveCustomField(idx)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                        title="Remove header"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

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
              disabled={saving || isLocked}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium shadow-sm transition-all"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
    )}
    </AnimatePresence>,
    document.body
  );
};
