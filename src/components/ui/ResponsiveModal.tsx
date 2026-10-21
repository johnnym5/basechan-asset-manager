"use client";

import React, { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

export interface ResponsiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl";
}

export function ResponsiveModal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidth = "lg",
}: ResponsiveModalProps) {
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

  const getMaxWidthClass = () => {
    switch (maxWidth) {
      case "sm": return "sm:max-w-sm";
      case "md": return "sm:max-w-md";
      case "lg": return "sm:max-w-lg";
      case "xl": return "sm:max-w-xl";
      case "2xl": return "sm:max-w-2xl";
      case "3xl": return "sm:max-w-3xl";
      case "4xl": return "sm:max-w-4xl";
      default: return "sm:max-w-lg";
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm"
          />

          <motion.div
            initial={{ y: "100%", opacity: 0.5 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 320 }}
            className={`relative z-10 w-full max-h-[90vh] sm:max-h-[85vh] flex flex-col bg-slate-900 border border-slate-800 text-slate-100 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden ${getMaxWidthClass()}`}
          >
            {/* Mobile Touch Drag Indicator Handle */}
            <div className="sm:hidden flex justify-center pt-2.5 pb-1">
              <div className="w-12 h-1.5 rounded-full bg-slate-700/80" />
            </div>

            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800/80 bg-slate-900/90">
              <div>
                <h3 className="text-lg font-bold text-slate-100">{title}</h3>
                {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-5">{children}</div>

            {/* Footer Actions */}
            {footer && (
              <div className="px-5 py-3.5 bg-slate-950/70 border-t border-slate-800/80 flex items-center justify-end gap-3">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
