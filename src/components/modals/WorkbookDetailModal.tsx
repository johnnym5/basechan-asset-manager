"use client";

import React, { useEffect, useState } from "react";
import { ResponsiveModal } from "@/components/ui/ResponsiveModal";
import { WorkbookDocument } from "@/types/assets";
import {
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
            title="Previous Workbook (Left Arrow)"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="w-[1px] h-4 bg-slate-800 my-auto" />
          <button
            type="button"
            onClick={onNext}
            disabled={!hasNext}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 disabled:opacity-30 transition-all cursor-pointer"
            title="Next Workbook (Right Arrow)"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      ) : <div />}

      {workbook.cloudStorageUrl ? (
        <a
          href={workbook.cloudStorageUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
        >
          <span>Open Cloud Document</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      ) : (
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold"
        >
          Close
        </button>
      )}
    </div>
  );

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      title={workbook.title}
      subtitle={workbook.businessFunction || "Operational Workbook"}
      maxWidth="2xl"
      footer={footer}
    >
      <div className="space-y-4">
        {/* Primary Owner Card */}
        <div className="p-4 rounded-xl bg-slate-950 text-amber-400 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block">
              Primary File Owner
            </span>
            <div className="text-lg font-extrabold mt-0.5">
              {workbook.primaryOwner || "Basechan International"}
            </div>
            <div className="text-xs text-slate-300 mt-0.5 font-medium">
              {workbook.department || "General Operations"}
            </div>
          </div>
          <User className="w-8 h-8 text-amber-400/80 flex-shrink-0" />
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-slate-400 font-medium block flex items-center gap-1">
              <Briefcase className="w-3.5 h-3.5 text-blue-400" /> Business Function
            </span>
            <p className="font-bold text-slate-100 mt-1">{workbook.businessFunction || "Operations"}</p>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-slate-400 font-medium block flex items-center gap-1">
              <Building className="w-3.5 h-3.5 text-purple-400" /> Department
            </span>
            <p className="font-bold text-slate-100 mt-1">{workbook.department || "General"}</p>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-slate-400 font-medium block flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-sky-400" /> Last Audit Date
            </span>
            <p className="font-mono font-bold text-slate-100 mt-1">{workbook.lastAuditDate || "September 2026"}</p>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-slate-400 font-medium block">Access Permissions</span>
            <span className="inline-flex items-center gap-1 mt-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
              {workbook.accessPermissions?.toUpperCase() === "ALL" ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
              {workbook.accessPermissions || "RESTRICTED"}
            </span>
          </div>
        </div>
      </div>
    </ResponsiveModal>
  );
};
