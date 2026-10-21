"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  MODAL_BACKDROP_VARIANTS,
  MODAL_CONTENT_VARIANTS,
  SPRING_TRANSITION,
} from "@/lib/motion";
import { AlertTriangle, Info, ShieldAlert, X } from "lucide-react";

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
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onCancel]);

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

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const confirmBtnBg =
    variant === "danger"
      ? "bg-rose-600 hover:bg-rose-700 text-white"
      : variant === "info"
      ? "bg-blue-600 hover:bg-blue-700 text-white"
      : "bg-amber-600 hover:bg-amber-700 text-white";

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="confirm-backdrop"
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={MODAL_BACKDROP_VARIANTS}
          className="fixed inset-0 z-[99999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
          onClick={onCancel}
        >
          <motion.div
            key="confirm-content"
            ref={containerRef}
            variants={MODAL_CONTENT_VARIANTS}
            transition={SPRING_TRANSITION}
            className="w-full max-w-md flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-2xl overflow-hidden p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start gap-3">
              <div className={`p-2.5 rounded-xl border ${iconBg} shrink-0`}>
                <IconComponent className="h-5 w-5" />
              </div>
              <div className="space-y-1 flex-1">
                <h3 className="font-bold text-base text-[var(--text-primary)]">{title}</h3>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">{message}</p>
              </div>
              <button
                type="button"
                onClick={onCancel}
                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-all"
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
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};
