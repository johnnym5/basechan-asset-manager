"use client";

import React, { useEffect, useState } from "react";
import { ResponsiveModal } from "@/components/ui/ResponsiveModal";
import { PhysicalAsset } from "@/types/assets";
import { useAuth } from "@/context/AuthContext";
import {
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

  if (!mounted || !isOpen) return null;

  const hasMissingSerial = !asset.serialNumber || asset.serialNumber === "NaN" || asset.serialNumber.trim() === "";

  const footer = (
    <div className="flex items-center justify-between w-full">
      {/* Forward / Backward Navigation Buttons */}
      {(onPrevious || onNext) ? (
        <div className="flex items-center bg-slate-900 p-0.5 rounded-xl border border-slate-800 shadow-sm">
          <button
            type="button"
            onClick={onPrevious}
            disabled={!hasPrevious}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 disabled:opacity-30 transition-all cursor-pointer"
            title="Previous Asset (Left Arrow)"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="w-[1px] h-4 bg-slate-800 my-auto" />
          <button
            type="button"
            onClick={onNext}
            disabled={!hasNext}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 disabled:opacity-30 transition-all cursor-pointer"
            title="Next Asset (Right Arrow)"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      ) : <div />}

      <div className="flex items-center gap-2">
        {isStaff && (
          <button
            type="button"
            onClick={() => { onClose(); onRepair?.(asset); }}
            className="px-3 py-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-semibold hover:bg-amber-500/20 transition-all flex items-center gap-1.5"
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Report Issue</span>
          </button>
        )}

        {isAdmin && (
          <button
            type="button"
            onClick={() => { onClose(); onTransfer?.(asset); }}
            className="px-3 py-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded-xl text-xs font-semibold hover:bg-blue-500/20 transition-all flex items-center gap-1.5"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Transfer Custody</span>
          </button>
        )}

        {canEdit && (
          <button
            type="button"
            onClick={() => { onClose(); onEdit?.(asset); }}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>{isAdmin ? "Edit Asset" : "Update Condition"}</span>
          </button>
        )}
      </div>
    </div>
  );

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      title={asset.makeModel}
      subtitle={`Tag ID: ${asset.tag}`}
      maxWidth="2xl"
      footer={footer}
    >
      <div className="space-y-5">
        {/* Primary Custodian Highlight */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 text-amber-400 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] sm:text-xs uppercase tracking-wider text-slate-400 font-semibold block">
              Assigned Custodian
            </span>
            <div className="text-lg sm:text-xl font-black mt-0.5">
              {asset.assignedStaff && asset.assignedStaff.toLowerCase() !== "unassigned"
                ? asset.assignedStaff
                : "Unassigned / No User"}
            </div>
            <div className="text-xs sm:text-sm text-slate-400 mt-0.5 font-medium">
              {asset.department || "General Operations"} • {asset.branch || "Abuja Branch"}
            </div>
          </div>
          <User className="w-9 h-9 text-amber-400/80 flex-shrink-0" />
        </div>

        {/* Grid of Details */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs sm:text-sm">
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-slate-400 font-medium block flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-blue-400" /> Category
            </span>
            <p className="font-bold text-slate-100 mt-1">{asset.category || "Hardware"}</p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-slate-400 font-medium block flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5 text-purple-400" /> Serial Number
            </span>
            <p className="font-mono font-bold text-slate-100 mt-1 truncate">
              {hasMissingSerial ? (
                <span className="text-rose-400 font-bold flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5" /> Missing
                </span>
              ) : (
                asset.serialNumber
              )}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-slate-400 font-medium block flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" /> Branch Location
            </span>
            <p className="font-bold text-slate-100 mt-1">{asset.branch || "Abuja Branch"}</p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-slate-400 font-medium block flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-sky-400" /> Purchase Date
            </span>
            <p className="font-bold text-slate-100 mt-1">{asset.purchaseDate || "N/A"}</p>
          </div>
        </div>

        {/* Custom Attributes & Headers */}
        {asset.customAttributes && Object.keys(asset.customAttributes).length > 0 && (
          <div className="pt-2 border-t border-slate-800 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
              Additional Fields & Custom Headers
            </span>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs sm:text-sm">
              {Object.entries(asset.customAttributes).map(([key, val]) => (
                <div key={key} className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-slate-400 font-medium block truncate">{key}</span>
                  <p className="font-bold text-slate-100 mt-1 truncate">{val || "N/A"}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Lock Status */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs sm:text-sm">
          <span className="text-slate-400 font-medium flex items-center gap-2">
            {asset.isLocked ? <Lock className="w-4 h-4 text-amber-400" /> : <Unlock className="w-4 h-4 text-slate-400" />}
            <span>Management Lock Status</span>
          </span>
          <div className="flex items-center gap-3">
            <span className={`font-extrabold ${asset.isLocked ? "text-amber-400" : "text-slate-400"}`}>
              {asset.isLocked ? "Locked" : "Unlocked"}
            </span>
            {isAdmin && onToggleLock && (
              <button
                type="button"
                onClick={() => void onToggleLock(asset)}
                className={`px-3 py-1 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                  asset.isLocked
                    ? "bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30"
                    : "bg-slate-800 hover:bg-slate-700 text-amber-400 shadow-sm"
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
    </ResponsiveModal>
  );
};
