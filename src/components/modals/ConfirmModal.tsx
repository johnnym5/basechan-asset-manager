"use client";

import React, { useEffect, useState } from "react";
import { ResponsiveModal } from "@/components/ui/ResponsiveModal";
import { AlertTriangle, Info, ShieldAlert } from "lucide-react";

export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "warning" | "danger" | "info";
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "warning",
  onConfirm,
  onCancel,
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const IconComponent =
    variant === "danger"
      ? ShieldAlert
      : variant === "info"
      ? Info
      : AlertTriangle;

  const iconBg =
    variant === "danger"
      ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
      : variant === "info"
      ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
      : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";

  const confirmBtnBg =
    variant === "danger"
      ? "bg-rose-600 hover:bg-rose-700 text-white"
      : variant === "info"
      ? "bg-blue-600 hover:bg-blue-700 text-white"
      : "bg-amber-600 hover:bg-amber-700 text-white";

  const footer = (
    <>
      <button
        type="button"
        onClick={onCancel}
        className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 transition-all"
      >
        {cancelLabel}
      </button>
      <button
        type="button"
        onClick={onConfirm}
        className={`px-5 py-2 rounded-xl text-xs font-bold shadow-sm transition-all ${confirmBtnBg}`}
      >
        {confirmLabel}
      </button>
    </>
  );

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
      maxWidth="md"
      footer={footer}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2.5 rounded-xl border ${iconBg} shrink-0`}>
          <IconComponent className="h-5 w-5" />
        </div>
        <p className="text-xs text-slate-300 leading-relaxed my-auto">{message}</p>
      </div>
    </ResponsiveModal>
  );
};
