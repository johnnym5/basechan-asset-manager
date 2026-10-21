"use client";

import React, { useState } from "react";
import {
  LayoutDashboard,
  Laptop,
  AlertTriangle,
  KeyRound,
  FileSpreadsheet,
  Building2,
  Users,
  FileUp,
  Shield,
  User,
  LogOut,
  MapPin,
  LogIn,
  ClipboardCheck,
  Inbox,
  BriefcaseBusiness,
  FileText,
  LayoutGrid,
  X,
  ChevronUp,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { DRAWER_VARIANTS, MODAL_BACKDROP_VARIANTS, SPRING_TRANSITION } from "@/lib/motion";
import { useAuth } from "@/context/AuthContext";
import { PageAccess } from "@/lib/accessControl";

export type TabKey =
  | "overview"
  | "hardware"
  | "auditor"
  | "credentials"
  | "workbooks"
  | "facilities"
  | "staff"
  | "ingestion"
  | "stocktake"
  | "tasks"
  | "workspace"
  | "reporting";

interface SidebarProps {
  activeTab: TabKey;
  onSelectTab: (tab: TabKey) => void;
  missingDetailsCount: number;
  openTaskCount?: number;
  accessibleTabs: PageAccess;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onSelectTab, missingDetailsCount, openTaskCount = 0, accessibleTabs }) => {
  const { userProfile, signOutUser, signInWithGoogle } = useAuth();
  const isAdmin = userProfile?.role === "SUPER_ADMIN";
  const [isHovered, setIsHovered] = useState(false);

  const navigationItems = [
    { key: "overview" as TabKey, label: "Overview & Metrics", icon: LayoutDashboard },
    { key: "hardware" as TabKey, label: "Physical Hardware", icon: Laptop },
    {
      key: "auditor" as TabKey,
      label: "Missing Details Auditor",
      icon: AlertTriangle,
      badge: missingDetailsCount > 0 ? missingDetailsCount : undefined,
      badgeColor: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700",
    },
    { key: "credentials" as TabKey, label: "Digital & Credentials Vault", icon: KeyRound },
    { key: "workbooks" as TabKey, label: "Data & Workbooks", icon: FileSpreadsheet },
    { key: "facilities" as TabKey, label: "Office & Facilities", icon: Building2 },
    { key: "staff" as TabKey, label: "Staff Directory", icon: Users },
    { key: "reporting" as TabKey, label: "Staff Reports", icon: FileText },
    { key: "tasks" as TabKey, label: "Task Inbox", icon: Inbox, badge: openTaskCount || undefined, badgeColor: "bg-blue-100 text-blue-800 border-blue-200" },
    { key: "workspace" as TabKey, label: "Workspace Links", icon: BriefcaseBusiness },
  ];

  if (isAdmin) {
    navigationItems.push({ key: "stocktake" as TabKey, label: "Stocktake", icon: ClipboardCheck });
    navigationItems.push({
      key: "ingestion" as TabKey,
      label: "Excel Ingestion & Sync",
      icon: FileUp,
    });
  }

  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const visibleItems = navigationItems.filter((item) => accessibleTabs[item.key]);
  const labelFor = (key: TabKey, label: string) => key === "hardware" && !isAdmin ? "My Assets" : key === "overview" && !isAdmin ? "My Dashboard" : label;

  // Primary dock shortcuts
  const primaryDockKeys: TabKey[] = ["overview", "hardware", "credentials", "reporting"];
  const primaryDockItems = primaryDockKeys
    .map((k) => visibleItems.find((item) => item.key === k))
    .filter(Boolean) as typeof visibleItems;

  const nonDockItems = visibleItems.filter((item) => !primaryDockKeys.includes(item.key));
  const hasNonDockBadge = nonDockItems.some((item) => item.badge !== undefined && item.badge > 0);

  return (
    <>
    <div className="relative sticky top-16 z-30 hidden h-[calc(100vh-4rem)] w-16 flex-shrink-0 self-start md:block">
      {/* Dark Page Backdrop Overlay when Desktop Sidebar is expanded/hovered */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setIsHovered(false)}
            className="fixed inset-0 top-16 z-20 bg-slate-950/35 dark:bg-black/60 backdrop-blur-[2px] transition-opacity duration-300"
          />
        )}
      </AnimatePresence>

      <aside
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`absolute inset-y-0 left-0 h-full z-30 flex flex-col transition-all duration-300 ease-in-out overflow-hidden ${
          isHovered ? "w-80" : "w-16"
        } bg-white/35 dark:bg-[#0C1D2F]/50 backdrop-blur-2xl backdrop-saturate-180 border-r border-white/50 dark:border-white/15 shadow-[0_8px_32px_rgba(0,0,0,0.08),inset_0_1px_1px_rgba(255,255,255,0.6)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.35),inset_0_1px_1px_rgba(255,255,255,0.12)]`}
      >
        {/* Vertical light refraction highlight on right edge */}
        <div className="pointer-events-none absolute inset-y-0 right-0 w-[1px] bg-gradient-to-b from-white/90 via-white/30 to-transparent dark:from-white/20 dark:via-white/5 dark:to-transparent" />
        {/* Top edge specular glare line */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-white/90 via-white/40 to-transparent dark:from-white/30 dark:via-white/10 dark:to-transparent" />

        <nav aria-label="Main navigation" className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 space-y-1 no-scrollbar">
          <div className={`px-2 py-2 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider whitespace-nowrap transition-opacity duration-200 ${
            isHovered ? "opacity-100" : "opacity-0"
          }`}>
            Enterprise Modules
          </div>
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => onSelectTab(item.key)}
                title={!isHovered ? item.label : undefined}
                className={`relative w-full flex items-center ${isHovered ? "justify-between px-3.5" : "justify-center px-0"} py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "text-gold-400 font-bold z-20 shadow-md"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/50 dark:hover:bg-white/10"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="desktopActiveTabPill"
                    className="absolute inset-0 bg-navy-800 border border-navy-700/80 dark:border-navy-600 rounded-xl -z-10 shadow-sm"
                    transition={{ type: "spring", stiffness: 380, damping: 28 }}
                  />
                )}
                <div className="flex items-center gap-3 min-w-0 z-10 pr-2">
                  <div className="relative flex-shrink-0">
                    <Icon className={`w-5 h-5 ${isActive ? "text-gold-400" : "text-[var(--text-muted)]"}`} />
                    {!isHovered && item.badge !== undefined && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-500 border border-[var(--bg-surface)]" />
                    )}
                  </div>
                  <span className={`whitespace-nowrap transition-all duration-200 ${isHovered ? "opacity-100 max-w-xs truncate" : "opacity-0 max-w-0 overflow-hidden"}`}>
                    {labelFor(item.key, item.label)}
                  </span>
                </div>
                {isHovered && item.badge !== undefined && (
                  <span className={`shrink-0 z-10 text-[11px] font-bold px-2 py-0.5 rounded-full border transition-opacity duration-200 ${item.badgeColor || "bg-navy-100 text-navy-700"}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom User Account / Login Controls */}
        <div className="mt-auto p-3 border-t border-white/50 dark:border-white/10 bg-white/40 dark:bg-black/20">
          {userProfile ? (
            <div className={`flex items-center ${isHovered ? "justify-between" : "justify-center"}`}>
              {/* User Details */}
              {isHovered ? (
                <div className="min-w-0 flex-1 pr-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-bold text-[var(--text-primary)] truncate max-w-[120px]">
                      {userProfile.displayName}
                    </span>
                    {userProfile.role === "SUPER_ADMIN" ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-navy-100 text-navy-800 border border-navy-200 dark:bg-navy-800 dark:text-gold-400 dark:border-navy-600">
                        <Shield className="w-2.5 h-2.5" /> Admin
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[var(--bg-muted)] text-[var(--text-muted)] border border-[var(--border)]">
                        <User className="w-2.5 h-2.5" /> Staff
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-[var(--text-muted)] mt-0.5 truncate">
                    <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
                    <span className="truncate">{userProfile.branch || "Headquarters"}</span>
                    <span>•</span>
                    <span className="truncate">{userProfile.email}</span>
                  </div>
                </div>
              ) : (
                <div
                  className="w-8 h-8 rounded-full bg-navy-800 text-gold-400 border border-navy-600 font-bold text-xs flex items-center justify-center flex-shrink-0 cursor-pointer"
                  title={`${userProfile.displayName} (${userProfile.email})`}
                >
                  {userProfile.displayName ? userProfile.displayName.charAt(0).toUpperCase() : "U"}
                </div>
              )}

              <button
                onClick={signOutUser}
                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors flex-shrink-0"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => void signInWithGoogle().catch(() => undefined)}
              title={!isHovered ? "Sign In with Google" : undefined}
              className={`w-full flex items-center ${isHovered ? "justify-center gap-2 px-3 py-2" : "justify-center p-2"} bg-navy-800 hover:bg-navy-700 text-gold-400 rounded-lg text-xs font-semibold shadow-sm transition-all`}
            >
              <LogIn className="w-4 h-4 flex-shrink-0" />
              {isHovered && <span className="whitespace-nowrap">Sign In with Google</span>}
            </button>
          )}
        </div>
      </aside>
    </div>

    {/* Floating Glass Island Capsule Dock (Mobile View) */}
    <nav
      aria-label="Mobile navigation"
      className="fixed bottom-3 inset-x-3 z-40 md:hidden bg-white/40 dark:bg-[#0C1D2F]/60 text-slate-800 dark:text-slate-100 backdrop-blur-2xl backdrop-saturate-180 border border-white/60 dark:border-white/20 shadow-[0_10px_30px_rgba(0,0,0,0.12),inset_0_1px_1px_rgba(255,255,255,0.6)] dark:shadow-[0_12px_36px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.15)] rounded-full px-3 py-2 flex items-center justify-around"
    >
      {primaryDockItems.map((item) => {
        const Icon = item.icon;
        const selected = activeTab === item.key;
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => {
              onSelectTab(item.key);
              setMobileDrawerOpen(false);
            }}
            aria-current={selected ? "page" : undefined}
            className={`relative flex items-center justify-center transition-all duration-200 ${
              selected
                ? "text-white font-bold scale-[1.15] z-10 shadow-md px-3.5 py-2 rounded-full gap-1.5"
                : "p-2.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-full scale-100"
            }`}
          >
            {selected && (
              <motion.div
                layoutId="mobileActiveDockPill"
                className="absolute inset-0 bg-navy-800 dark:bg-blue-600 rounded-full -z-10 shadow-sm border border-navy-700 dark:border-blue-500"
                transition={SPRING_TRANSITION}
              />
            )}
            <Icon className={`h-5 w-5 shrink-0 ${selected ? "text-gold-400 dark:text-white" : ""}`} />
            {selected && (
              <span className="text-xs font-bold whitespace-nowrap text-gold-400 dark:text-white">
                {item.key === "hardware" ? "Assets" : item.key === "overview" ? "Home" : item.key === "credentials" ? "Vault" : "Reports"}
              </span>
            )}
            {!selected && item.badge !== undefined && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500" />
            )}
          </button>
        );
      })}

      {/* 5th Slot: More Modules Trigger */}
      <button
        type="button"
        onClick={() => setMobileDrawerOpen((prev) => !prev)}
        className={`relative flex items-center justify-center p-2.5 rounded-full transition-all duration-200 ${
          mobileDrawerOpen || nonDockItems.some((item) => activeTab === item.key)
            ? "bg-navy-800/10 dark:bg-white/15 text-navy-800 dark:text-gold-400 font-bold scale-[1.15]"
            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white scale-100"
        }`}
        title="More Enterprise Modules"
      >
        <LayoutGrid className="h-5 w-5 shrink-0" />
        {hasNonDockBadge && (
          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-white dark:ring-slate-900" />
        )}
      </button>
    </nav>

    {/* Quick Module Bottom Sheet Drawer with AnimatePresence Exit Animations */}
    <AnimatePresence>
      {mobileDrawerOpen && (
        <motion.div
          key="mobile-drawer-overlay"
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={MODAL_BACKDROP_VARIANTS}
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm md:hidden flex flex-col justify-end"
          onClick={() => setMobileDrawerOpen(false)}
        >
          <motion.div
            key="mobile-drawer-panel"
            variants={DRAWER_VARIANTS}
            transition={SPRING_TRANSITION}
            className="bg-white/50 dark:bg-[#0C1D2F]/65 backdrop-blur-2xl backdrop-saturate-180 border-t border-white/60 dark:border-white/20 rounded-t-3xl p-5 shadow-[0_-12px_40px_rgba(0,0,0,0.12),inset_0_1px_1px_rgba(255,255,255,0.6)] dark:shadow-[0_-12px_40px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.15)] max-h-[85vh] overflow-y-auto space-y-4 no-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Drag Handle & Header */}
            <div className="space-y-3">
              <div className="w-12 h-1 rounded-full bg-[var(--border)] mx-auto" />
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-[var(--text-primary)]">Enterprise Modules</h2>
                  <p className="text-xs text-[var(--text-muted)]">Select any workspace tool or report view</p>
                </div>
                <button
                  onClick={() => setMobileDrawerOpen(false)}
                  className="p-2 rounded-xl text-[var(--text-muted)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* 2-Column Grid of All Accessible Modules */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              {visibleItems.map((item) => {
                const Icon = item.icon;
                const selected = activeTab === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      onSelectTab(item.key);
                      setMobileDrawerOpen(false);
                    }}
                    className={`flex flex-col items-start gap-2 p-3 rounded-2xl border text-left transition-all duration-200 backdrop-blur-xl ${
                      selected
                        ? "border-blue-500/80 bg-blue-500/25 text-blue-600 dark:text-gold-400 font-bold shadow-md scale-[1.08] z-10 ring-2 ring-blue-500/30"
                        : "border-white/50 dark:border-white/10 bg-white/30 dark:bg-white/10 text-[var(--text-primary)] hover:bg-white/50 dark:hover:bg-white/20 scale-100"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className={`p-2 rounded-xl ${selected ? "bg-blue-600 text-white" : "bg-[var(--bg-muted)] text-[var(--text-muted)]"}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      {item.badge !== undefined && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${item.badgeColor || "bg-amber-100 text-amber-800 border-amber-200"}`}>
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-bold leading-tight">
                      {labelFor(item.key, item.label)}
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
};
