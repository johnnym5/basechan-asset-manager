import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { MODAL_BACKDROP_VARIANTS, MODAL_CONTENT_VARIANTS, SPRING_TRANSITION } from "@/lib/motion";
import { PhysicalAsset } from "@/types/assets";
import { useAuth } from "@/context/AuthContext";
import {
  X,
  Laptop,
  User,
  MapPin,
  Tag,
  Hash,
  Calendar,
  Lock,
  Unlock,
  Edit2,
  ArrowRightLeft,
  Wrench,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface AssetDetailModalProps {
  asset: PhysicalAsset;
  isOpen: boolean;
  onClose: () => void;
  onToggleLock?: (asset: PhysicalAsset) => Promise<void>;
  onEdit?: (asset: PhysicalAsset) => void;
  canEdit?: boolean;
  onTransfer?: (asset: PhysicalAsset) => void;
  onRepair?: (asset: PhysicalAsset) => void;
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
}

export const AssetDetailModal: React.FC<AssetDetailModalProps> = ({
  asset,
  isOpen,
  onClose,
  onToggleLock,
  onEdit,
  canEdit,
  onTransfer,
  onRepair,
  onPrevious,
  onNext,
  hasPrevious = false,
  hasNext = false,
}) => {
  const { userProfile } = useAuth();
  const isAdmin = userProfile?.role === "SUPER_ADMIN";
  const isStaff = userProfile?.role === "STAFF";
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

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && hasPrevious && onPrevious) {
        onPrevious();
      } else if (e.key === "ArrowRight" && hasNext && onNext) {
        onNext();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, hasPrevious, hasNext, onPrevious, onNext]);

  if (!mounted) return null;

  const hasMissingSerial = !asset.serialNumber || asset.serialNumber === "NaN" || asset.serialNumber.trim() === "";

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="asset-detail-backdrop"
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={MODAL_BACKDROP_VARIANTS}
          className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
          onClick={onClose}
        >
          <motion.div
            key="asset-detail-content"
            variants={MODAL_CONTENT_VARIANTS}
            transition={SPRING_TRANSITION}
            className="relative my-auto w-full max-w-sm md:max-w-3xl lg:max-w-4xl max-h-[85vh] flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >

        {/* Modal Header */}
        <div className="flex shrink-0 justify-between items-center px-4 sm:px-6 py-4 border-b border-[var(--border)] bg-[var(--bg-muted)]/60">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex-shrink-0">
              <Laptop className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-extrabold text-[var(--text-primary)] truncate">
                {asset.makeModel}
              </h3>
              <p className="text-xs text-[var(--text-muted)] font-mono mt-0.5 truncate">
                Tag ID: {asset.tag}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Forward / Backward Navigation Buttons */}
            {(onPrevious || onNext) && (
              <div className="flex items-center bg-[var(--bg-surface)] p-0.5 rounded-xl border border-[var(--border)] shadow-sm">
                <button
                  type="button"
                  onClick={onPrevious}
                  disabled={!hasPrevious}
                  className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer"
                  title="Previous Asset (Left Arrow)"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="w-[1px] h-4 bg-[var(--border)] my-auto" />
                <button
                  type="button"
                  onClick={onNext}
                  disabled={!hasNext}
                  className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer"
                  title="Next Asset (Right Arrow)"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">

          {/* Primary Custodian Highlight */}
          <div className="p-4 sm:p-5 rounded-2xl bg-navy-800 text-gold-400 border border-navy-600 flex items-center justify-between">
            <div>
              <span className="text-[10px] sm:text-xs uppercase tracking-wider text-slate-300 font-semibold block">
                Assigned Custodian
              </span>
              <div className="text-lg sm:text-xl font-black mt-0.5">
                {asset.assignedStaff && asset.assignedStaff.toLowerCase() !== "unassigned"
                  ? asset.assignedStaff
                  : "Unassigned / No User"}
              </div>
              <div className="text-xs sm:text-sm text-slate-300 mt-0.5 font-medium">
                {asset.department || "General Operations"} • {asset.branch || "Abuja Branch"}
              </div>
            </div>
            <User className="w-10 h-10 text-gold-400/80 flex-shrink-0" />
          </div>

          {/* Grid of Details (Responsive 2 cols on mobile, 4 cols on PC) */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 text-xs sm:text-sm">
            <div className="p-3.5 rounded-xl bg-[var(--bg-muted)] border border-[var(--border)]">
              <span className="text-[var(--text-muted)] font-medium block flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-blue-500" /> Category
              </span>
              <p className="font-bold text-[var(--text-primary)] mt-1">{asset.category || "Hardware"}</p>
            </div>

            <div className="p-3.5 rounded-xl bg-[var(--bg-muted)] border border-[var(--border)]">
              <span className="text-[var(--text-muted)] font-medium block flex items-center gap-1.5">
                <Hash className="w-4 h-4 text-purple-500" /> Serial Number
              </span>
              <p className="font-mono font-bold text-[var(--text-primary)] mt-1 truncate">
                {hasMissingSerial ? (
                  <span className="text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1">
                    <ShieldAlert className="w-4 h-4" /> Missing
                  </span>
                ) : (
                  asset.serialNumber
                )}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[var(--bg-muted)] border border-[var(--border)]">
              <span className="text-[var(--text-muted)] font-medium block flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-emerald-500" /> Branch Location
              </span>
              <p className="font-bold text-[var(--text-primary)] mt-1">{asset.branch || "Abuja Branch"}</p>
            </div>

            <div className="p-3.5 rounded-xl bg-[var(--bg-muted)] border border-[var(--border)]">
              <span className="text-[var(--text-muted)] font-medium block flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-sky-500" /> Purchase Date
              </span>
              <p className="font-bold text-[var(--text-primary)] mt-1">{asset.purchaseDate || "N/A"}</p>
            </div>

            <div className="p-3.5 rounded-xl bg-[var(--bg-muted)] border border-[var(--border)]">
              <span className="text-[var(--text-muted)] font-medium block">Condition</span>
              <span className={`inline-block mt-1 px-3 py-0.5 rounded-full text-xs font-bold ${
                asset.condition.toLowerCase().includes("good") || asset.condition.toLowerCase().includes("excellent")
                  ? "bg-gold-500/10 text-gold-600 dark:text-gold-400 border border-gold-500/30"
                  : asset.condition.toLowerCase().includes("fair")
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                  : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30"
              }`}>
                {asset.condition}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[var(--bg-muted)] border border-[var(--border)]">
              <span className="text-[var(--text-muted)] font-medium block">Operational Status</span>
              <p className="font-bold text-[var(--text-primary)] mt-1">{asset.status}</p>
            </div>
          </div>

          {/* Custom Attributes & Headers */}
          {asset.customAttributes && Object.keys(asset.customAttributes).length > 0 && (
            <div className="pt-2 border-t border-[var(--border)] space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] block">
                Additional Fields & Custom Headers
              </span>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 text-xs sm:text-sm">
                {Object.entries(asset.customAttributes).map(([key, val]) => (
                  <div key={key} className="p-3.5 rounded-xl bg-[var(--bg-muted)] border border-[var(--border)]">
                    <span className="text-[var(--text-muted)] font-medium block truncate">{key}</span>
                    <p className="font-bold text-[var(--text-primary)] mt-1 truncate">{val || "N/A"}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Lock Status */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--bg-muted)] border border-[var(--border)] text-xs sm:text-sm">
            <span className="text-[var(--text-muted)] font-medium flex items-center gap-2">
              {asset.isLocked ? <Lock className="w-4 h-4 text-amber-500" /> : <Unlock className="w-4 h-4 text-slate-400" />}
              <span>Management Lock Status</span>
            </span>
            <div className="flex items-center gap-3">
              <span className={`font-extrabold ${asset.isLocked ? "text-amber-600 dark:text-amber-400" : "text-[var(--text-muted)]"}`}>
                {asset.isLocked ? "Locked" : "Unlocked"}
              </span>
              {isAdmin && onToggleLock && (
                <button
                  type="button"
                  onClick={() => void onToggleLock(asset)}
                  className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                    asset.isLocked
                      ? "bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                      : "bg-navy-800 hover:bg-navy-700 text-gold-400 shadow-sm"
                  }`}
                >
                  {asset.isLocked ? (
                    <>
                      <Unlock className="w-3.5 h-3.5" />
                      <span>Unlock</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span>Lock Asset</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

        </div>

        {/* Modal Actions Footer */}
        <div className="flex shrink-0 items-center justify-end gap-2 p-3 sm:p-4 border-t border-[var(--border)] bg-[var(--bg-muted)]/50">
          {isStaff && (
            <button
              onClick={() => { onClose(); onRepair?.(asset); }}
              className="px-3 py-2 bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30 rounded-xl text-xs font-semibold hover:bg-amber-500/20 transition-all flex items-center gap-1.5"
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>Report Issue</span>
            </button>
          )}

          {isAdmin && (
            <button
              onClick={() => { onClose(); onTransfer?.(asset); }}
              className="px-3 py-2 bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/30 rounded-xl text-xs font-semibold hover:bg-blue-500/20 transition-all flex items-center gap-1.5"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>Transfer Custody</span>
            </button>
          )}

          {canEdit && <button
            onClick={() => { onClose(); onEdit?.(asset); }}
            className="px-4 py-2 bg-navy-800 hover:bg-navy-700 text-gold-400 rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>{isAdmin ? "Edit Asset" : "Update Condition"}</span>
          </button>}
        </div>

      </motion.div>
    </motion.div>
    )}
    </AnimatePresence>,
    document.body
  );
};
