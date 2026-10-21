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
      <aside
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`absolute inset-y-0 left-0 h-full z-30 bg-[var(--bg-surface)] border-r border-[var(--border)] flex flex-col transition-all duration-300 ease-in-out shadow-lg overflow-hidden ${
          isHovered ? "w-64" : "w-16"
        }`}
      >
        <nav aria-label="Main navigation" className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 space-y-1">
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
                className={`w-full flex items-center ${isHovered ? "justify-between px-3" : "justify-center px-0"} py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-navy-800 text-gold-400 shadow-sm border border-navy-600 font-semibold"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)]"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative flex-shrink-0">
                    <Icon className={`w-5 h-5 ${isActive ? "text-gold-400" : "text-[var(--text-muted)]"}`} />
                    {!isHovered && item.badge !== undefined && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-500 border border-[var(--bg-surface)]" />
                    )}
                  </div>
                <span className={`whitespace-nowrap transition-all duration-200 ${isHovered ? "opacity-100 max-w-xs" : "opacity-0 max-w-0 overflow-hidden"}`}>
                    {labelFor(item.key, item.label)}
                  </span>
                </div>
                {isHovered && item.badge !== undefined && (
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border transition-opacity duration-200 ${item.badgeColor || "bg-navy-100 text-navy-700"}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom User Account / Login Controls */}
        <div className="mt-auto p-3 border-t border-[var(--border)] bg-[var(--bg-muted)]/50">
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

    {/* Concept 1: Floating Glass Island Capsule Dock (Mobile View) */}
    <nav
      aria-label="Mobile navigation"
      className="fixed bottom-3 inset-x-3 z-40 md:hidden bg-slate-900/90 dark:bg-slate-950/95 text-white backdrop-blur-xl border border-white/10 shadow-[0_12px_36px_rgba(0,0,0,0.4)] rounded-full px-3 py-2 flex items-center justify-around"
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
                ? "bg-blue-600 text-white font-bold scale-105 shadow-md px-3.5 py-2 rounded-full gap-1.5"
                : "p-2.5 text-slate-400 hover:text-white rounded-full"
            }`}
          >
            <Icon className="h-5 w-5 shrink-0" />
            {selected && (
              <span className="text-xs font-bold whitespace-nowrap animate-in fade-in zoom-in duration-150">
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
            ? "bg-white/15 text-gold-400 font-bold scale-105"
            : "text-slate-400 hover:text-white"
        }`}
        title="More Enterprise Modules"
      >
        <LayoutGrid className="h-5 w-5 shrink-0" />
        {hasNonDockBadge && (
          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-slate-900" />
        )}
      </button>
    </nav>

    {/* Quick Module Bottom Sheet Drawer */}
    {mobileDrawerOpen && (
      <div
        className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm md:hidden animate-in fade-in duration-150 flex flex-col justify-end"
        onClick={() => setMobileDrawerOpen(false)}
      >
        <div
          className="bg-[var(--bg-surface)] border-t border-[var(--border)] rounded-t-3xl p-5 shadow-2xl max-h-[85vh] overflow-y-auto space-y-4 animate-in slide-in-from-bottom duration-200"
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
                  className={`flex flex-col items-start gap-2 p-3 rounded-2xl border text-left transition-all ${
                    selected
                      ? "border-blue-600 bg-blue-500/10 text-blue-600 dark:text-gold-400 font-bold shadow-sm"
                      : "border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-primary)] hover:bg-[var(--bg-muted)]"
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
        </div>
      </div>
    )}
    </>
  );
};
