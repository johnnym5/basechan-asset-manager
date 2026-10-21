"use client";

import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface AnimatedSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  ariaLabel?: string;
}

export const AnimatedSelect: React.FC<AnimatedSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = "Select an option...",
  className = "",
  disabled = false,
  ariaLabel,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Close on click outside or Escape key
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div ref={containerRef} className={`relative inline-block text-left ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={ariaLabel || placeholder}
        aria-expanded={isOpen}
        className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] text-xs font-semibold text-[var(--text-primary)] shadow-xs transition-all hover:bg-[var(--bg-muted)]/60 focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${
          disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
        }`}
      >
        <span className="flex items-center gap-1.5 truncate">
          {selectedOption?.icon}
          <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className="shrink-0 text-[var(--text-muted)]"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </motion.div>
      </button>

      {/* Animated Options Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.ul
            role="listbox"
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 4 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
            className="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-1 shadow-xl backdrop-blur-xl focus:outline-none"
          >
            {options.map((option) => {
              const isSelected = option.value === value;
              return (
                <li
                  key={option.value}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-blue-600 text-white font-bold"
                      : "text-[var(--text-primary)] hover:bg-[var(--bg-muted)]"
                  }`}
                >
                  <span className="flex items-center gap-1.5 truncate">
                    {option.icon}
                    <span className="truncate">{option.label}</span>
                  </span>
                  {isSelected && <Check className="h-3.5 w-3.5 shrink-0" />}
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
};
