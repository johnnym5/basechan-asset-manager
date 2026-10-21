"use client";

import React, { useEffect, useState } from "react";
import { ResponsiveModal } from "@/components/ui/ResponsiveModal";
import { StaffMember } from "@/types/assets";
import {
  User,
  Phone,
  MapPin,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Laptop,
  Building,
  Archive,
  Pencil,
  UserRoundCog,
} from "lucide-react";

interface StaffDetailModalProps {
  person: StaffMember;
  assetCount?: number;
  isOpen: boolean;
  onClose: () => void;
  onViewAssets?: (staffName: string) => void;
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
  isAdmin?: boolean;
  canEdit?: boolean;
  canArchive?: boolean;
  onEdit?: () => void;
  onArchive?: () => void;
  onManageAccess?: () => void;
}

export const StaffDetailModal: React.FC<StaffDetailModalProps> = ({
  person,
  assetCount = 0,
  isOpen,
  onClose,
  onViewAssets,
  onPrevious,
  onNext,
  hasPrevious = false,
  hasNext = false,
  isAdmin = false,
  canEdit = false,
  canArchive = false,
  onEdit,
  onArchive,
  onManageAccess,
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
            title="Previous Personnel (Left Arrow)"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="w-[1px] h-4 bg-slate-800 my-auto" />
          <button
            type="button"
            onClick={onNext}
            disabled={!hasNext}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 disabled:opacity-30 transition-all cursor-pointer"
            title="Next Personnel (Right Arrow)"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      ) : <div />}

      <div className="flex items-center gap-2">
        {isAdmin && (
          <button
            type="button"
            onClick={onManageAccess}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-blue-400 hover:bg-slate-700"
          >
            <UserRoundCog className="h-3.5 w-3.5" />
            Manage access
          </button>
        )}
        {canEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>
        )}
        {canArchive && (
          <button
            type="button"
            onClick={onArchive}
            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-400 hover:bg-rose-500/20"
          >
            <Archive className="h-3.5 w-3.5" />
            Archive
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
        >
          Close
        </button>
      </div>
    </div>
  );

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      title={person.name}
      subtitle={person.position || "Corporate Staff"}
      maxWidth="2xl"
      footer={footer}
    >
      <div className="space-y-4">
        {/* Staff Highlight Card */}
        <div className="p-4 rounded-xl bg-slate-950 text-amber-400 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block">
              Staff Personnel Profile
            </span>
            <div className="text-lg font-extrabold mt-0.5">{person.name}</div>
            <div className="text-xs text-slate-300 mt-0.5 font-mono">
              {person.email || "No email address registered"}
            </div>
          </div>
          <User className="w-8 h-8 text-amber-400/80 flex-shrink-0" />
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-slate-400 font-medium block flex items-center gap-1">
              <Building className="w-3.5 h-3.5 text-blue-400" /> Department
            </span>
            <p className="font-bold text-slate-100 mt-1">{person.department || "Operations"}</p>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-slate-400 font-medium block flex items-center gap-1">
              <Briefcase className="w-3.5 h-3.5 text-purple-400" /> Position / Role
            </span>
            <p className="font-bold text-slate-100 mt-1">{person.position || "Staff"}</p>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-slate-400 font-medium block flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" /> Branch Location
            </span>
            <p className="font-bold text-slate-100 mt-1">{person.branch || "Abuja Branch"}</p>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-slate-400 font-medium block flex items-center gap-1">
              <Phone className="w-3.5 h-3.5 text-amber-400" /> Phone Number
            </span>
            <p className="font-mono font-bold text-slate-100 mt-1">{person.phone || "N/A"}</p>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 col-span-2 flex items-center justify-between">
            <div>
              <span className="text-slate-400 font-medium block flex items-center gap-1">
                <Laptop className="w-3.5 h-3.5 text-blue-400" /> Assigned Physical Gear
              </span>
              <p className="font-bold text-slate-100 mt-0.5">
                {assetCount} {assetCount === 1 ? "Assigned Asset" : "Assigned Assets"}
              </p>
            </div>

            {assetCount > 0 && onViewAssets && (
              <button
                type="button"
                onClick={() => { onClose(); onViewAssets(person.name); }}
                className="px-3 py-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg text-xs font-semibold hover:bg-blue-500/20 transition-all cursor-pointer"
              >
                View Gear
              </button>
            )}
          </div>
        </div>
      </div>
    </ResponsiveModal>
  );
};
