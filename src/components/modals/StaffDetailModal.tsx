import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { StaffMember } from "@/types/assets";
import {
  X,
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Calendar,
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

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="relative my-auto w-full max-w-sm md:max-w-3xl lg:max-w-4xl max-h-[85vh] flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150">

        {/* Modal Header */}
        <div className="flex shrink-0 justify-between items-center px-6 py-4 border-b border-[var(--border)] bg-[var(--bg-muted)]/50">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex-shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-[var(--text-primary)] truncate">
                {person.name}
              </h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate">
                {person.position || "Corporate Staff"}
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
                  className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer"
                  title="Previous Personnel (Left Arrow)"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="w-[1px] h-4 bg-[var(--border)] my-auto" />
                <button
                  type="button"
                  onClick={onNext}
                  disabled={!hasNext}
                  className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer"
                  title="Next Personnel (Right Arrow)"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4">

          {/* Staff Highlight Card */}
          <div className="p-4 rounded-xl bg-navy-800 text-gold-400 border border-navy-600 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-slate-300 font-semibold block">
                Staff Personnel Profile
              </span>
              <div className="text-lg font-extrabold mt-0.5">
                {person.name}
              </div>
              <div className="text-xs text-slate-300 mt-0.5">
                {person.email || "No email address registered"}
              </div>
            </div>
            <User className="w-8 h-8 text-gold-400/80 flex-shrink-0" />
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-[var(--bg-muted)] border border-[var(--border)]">
              <span className="text-[var(--text-muted)] font-medium block flex items-center gap-1">
                <Building className="w-3.5 h-3.5" /> Department
              </span>
              <p className="font-bold text-[var(--text-primary)] mt-1">{person.department || "Operations"}</p>
            </div>

            <div className="p-3 rounded-xl bg-[var(--bg-muted)] border border-[var(--border)]">
              <span className="text-[var(--text-muted)] font-medium block flex items-center gap-1">
                <Briefcase className="w-3.5 h-3.5" /> Position / Role
              </span>
              <p className="font-bold text-[var(--text-primary)] mt-1">{person.position || "Staff"}</p>
            </div>

            <div className="p-3 rounded-xl bg-[var(--bg-muted)] border border-[var(--border)]">
              <span className="text-[var(--text-muted)] font-medium block flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" /> Branch Location
              </span>
              <p className="font-bold text-[var(--text-primary)] mt-1">{person.branch || "Abuja Branch"}</p>
            </div>

            <div className="p-3 rounded-xl bg-[var(--bg-muted)] border border-[var(--border)]">
              <span className="text-[var(--text-muted)] font-medium block flex items-center gap-1">
                <Phone className="w-3.5 h-3.5" /> Phone Number
              </span>
              <p className="font-mono font-bold text-[var(--text-primary)] mt-1">{person.phone || "N/A"}</p>
            </div>

            <div className="p-3 rounded-xl bg-[var(--bg-muted)] border border-[var(--border)] col-span-2 flex items-center justify-between">
              <div>
                <span className="text-[var(--text-muted)] font-medium block flex items-center gap-1">
                  <Laptop className="w-3.5 h-3.5 text-blue-500" /> Assigned Physical Gear
                </span>
                <p className="font-bold text-[var(--text-primary)] mt-0.5">
                  {assetCount} {assetCount === 1 ? "Assigned Asset" : "Assigned Assets"}
                </p>
              </div>

              {assetCount > 0 && onViewAssets && (
                <button
                  type="button"
                  onClick={() => { onClose(); onViewAssets(person.name); }}
                  className="px-3 py-1.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 rounded-lg text-xs font-semibold hover:bg-blue-500/20 transition-all cursor-pointer"
                >
                  View Gear
                </button>
              )}
            </div>
          </div>

        </div>

        {/* Modal Actions Footer */}
        <div className="flex shrink-0 items-center justify-end gap-2 p-3 sm:p-4 border-t border-[var(--border)] bg-[var(--bg-muted)]/50">
          {isAdmin && <button type="button" onClick={onManageAccess} className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-500/10"><UserRoundCog className="h-3.5 w-3.5" />Manage access</button>}
          {canEdit && <button type="button" onClick={onEdit} className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-muted)]"><Pencil className="h-3.5 w-3.5" />Edit</button>}
          {canArchive && <button type="button" onClick={onArchive} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-500/10"><Archive className="h-3.5 w-3.5" />Archive</button>}
          <button
            onClick={onClose}
            className="px-4 py-2 bg-navy-800 hover:bg-navy-700 text-gold-400 rounded-xl text-xs font-semibold shadow-sm transition-all"
          >
            Close
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
};
