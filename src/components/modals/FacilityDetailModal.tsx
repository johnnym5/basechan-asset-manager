"use client";

import React, { useEffect, useState } from "react";
import { ResponsiveModal } from "@/components/ui/ResponsiveModal";
import { FacilityItem } from "@/types/assets";
import {
  Building2,
  User,
  MapPin,
  Tag,
  ChevronLeft,
  ChevronRight,
  Wrench,
  Layers,
} from "lucide-react";

interface FacilityDetailModalProps {
  facility: FacilityItem;
  isOpen: boolean;
  onClose: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
}

export const FacilityDetailModal: React.FC<FacilityDetailModalProps> = ({
  facility,
  isOpen,
  onClose,
  onPrevious,
  onNext,
  hasPrevious = false,
  hasNext = false,
}) => {
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

  if (!isOpen || !mounted) return null;

  const footer = (
    <div className="flex items-center justify-between w-full">
      {(onPrevious || onNext) ? (
        <div className="flex items-center bg-slate-900 p-0.5 rounded-xl border border-slate-800 shadow-sm">
          <button
            type="button"
            onClick={onPrevious}
            disabled={!hasPrevious}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 disabled:opacity-30 transition-all cursor-pointer"
            title="Previous Item (Left Arrow)"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="w-[1px] h-4 bg-slate-800 my-auto" />
          <button
            type="button"
            onClick={onNext}
            disabled={!hasNext}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 disabled:opacity-30 transition-all cursor-pointer"
            title="Next Item (Right Arrow)"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      ) : <div />}

      <button
        type="button"
        onClick={onClose}
        className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
      >
        Close
      </button>
    </div>
  );

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      title={facility.itemDescription}
      subtitle={`Category: ${facility.category}`}
      maxWidth="2xl"
      footer={footer}
    >
      <div className="space-y-4">
        {/* Allocation Highlight */}
        <div className="p-4 rounded-xl bg-slate-950 text-amber-400 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block">
              Assigned / Allocation
            </span>
            <div className="text-lg font-extrabold mt-0.5">
              {facility.assignedOrShared && facility.assignedOrShared.toLowerCase() !== "unassigned"
                ? facility.assignedOrShared
                : "Shared Office Space"}
            </div>
            <div className="text-xs text-slate-300 mt-0.5 font-medium">
              {facility.branch || "Abuja Branch"}
            </div>
          </div>
          <User className="w-8 h-8 text-amber-400/80 flex-shrink-0" />
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-slate-400 font-medium block flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" /> Room / Zone
            </span>
            <p className="font-bold text-slate-100 mt-1">{facility.roomZone || "General Area"}</p>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-slate-400 font-medium block flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-purple-400" /> Quantity
            </span>
            <p className="font-bold text-slate-100 mt-1">{facility.quantity} Unit(s)</p>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-slate-400 font-medium block">Condition</span>
            <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
              {facility.condition}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-slate-400 font-medium block flex items-center gap-1">
              <Tag className="w-3.5 h-3.5 text-blue-400" /> Category
            </span>
            <p className="font-bold text-slate-100 mt-1">{facility.category}</p>
          </div>
        </div>

        {facility.maintenanceNotes && (
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs space-y-1">
            <span className="text-slate-400 font-medium flex items-center gap-1">
              <Wrench className="w-3.5 h-3.5 text-amber-400" /> Maintenance Notes
            </span>
            <p className="text-slate-200 leading-relaxed mt-1">
              {facility.maintenanceNotes}
            </p>
          </div>
        )}
      </div>
    </ResponsiveModal>
  );
};
