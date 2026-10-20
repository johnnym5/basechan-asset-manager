import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { WorkbookDocument } from "@/types/assets";
import {
  X,
  FileSpreadsheet,
  User,
  Globe,
  Lock,
  Calendar,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Briefcase,
  Building,
} from "lucide-react";

interface WorkbookDetailModalProps {
  workbook: WorkbookDocument;
  isOpen: boolean;
  onClose: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
}

export const WorkbookDetailModal: React.FC<WorkbookDetailModalProps> = ({
  workbook,
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
            <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 flex-shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-[var(--text-primary)] truncate">
                {workbook.title}
              </h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate">
                {workbook.businessFunction || "Operational Workbook"}
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
                  title="Previous Workbook (Left Arrow)"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="w-[1px] h-4 bg-[var(--border)] my-auto" />
                <button
                  type="button"
                  onClick={onNext}
                  disabled={!hasNext}
                  className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer"
                  title="Next Workbook (Right Arrow)"
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

          {/* Primary Owner Card */}
          <div className="p-4 rounded-xl bg-navy-800 text-gold-400 border border-navy-600 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-slate-300 font-semibold block">
                Primary File Owner
              </span>
              <div className="text-lg font-extrabold mt-0.5">
                {workbook.primaryOwner || "Basechan International"}
              </div>
              <div className="text-xs text-slate-300 mt-0.5">
                {workbook.department || "General Operations"}
              </div>
            </div>
            <User className="w-8 h-8 text-gold-400/80 flex-shrink-0" />
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-[var(--bg-muted)] border border-[var(--border)]">
              <span className="text-[var(--text-muted)] font-medium block flex items-center gap-1">
                <Briefcase className="w-3.5 h-3.5" /> Business Function
              </span>
              <p className="font-bold text-[var(--text-primary)] mt-1">{workbook.businessFunction || "Operations"}</p>
            </div>

            <div className="p-3 rounded-xl bg-[var(--bg-muted)] border border-[var(--border)]">
              <span className="text-[var(--text-muted)] font-medium block flex items-center gap-1">
                <Building className="w-3.5 h-3.5" /> Department
              </span>
              <p className="font-bold text-[var(--text-primary)] mt-1">{workbook.department || "General"}</p>
            </div>

            <div className="p-3 rounded-xl bg-[var(--bg-muted)] border border-[var(--border)]">
              <span className="text-[var(--text-muted)] font-medium block flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Last Audit Date
              </span>
              <p className="font-mono font-bold text-[var(--text-primary)] mt-1">{workbook.lastAuditDate || "September 2026"}</p>
            </div>

            <div className="p-3 rounded-xl bg-[var(--bg-muted)] border border-[var(--border)]">
              <span className="text-[var(--text-muted)] font-medium block">Access Permissions</span>
              <span className={`inline-flex items-center gap-1 mt-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                workbook.accessPermissions?.toUpperCase() === "ALL" || workbook.accessPermissions?.toUpperCase() === "PUBLIC"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30"
              }`}>
                {workbook.accessPermissions?.toUpperCase() === "ALL" ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                {workbook.accessPermissions || "RESTRICTED"}
              </span>
            </div>
          </div>

        </div>

        {/* Modal Actions Footer */}
        <div className="flex shrink-0 items-center justify-end gap-2 p-3 sm:p-4 border-t border-[var(--border)] bg-[var(--bg-muted)]/50">
          {workbook.cloudStorageUrl ? (
            <a
              href={workbook.cloudStorageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-navy-800 hover:bg-navy-700 text-gold-400 rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5"
            >
              <span>Open Cloud Document</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          ) : (
            <span className="text-xs text-[var(--text-muted)] italic">No cloud link available</span>
          )}
        </div>

      </div>
    </div>,
    document.body
  );
};
