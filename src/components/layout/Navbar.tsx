"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import {
  Bell,
  Sun,
  Moon,
  X,
  Clock3,
  WifiOff,
  RefreshCw,
  CheckCircle2,
  CircleHelp,
  LogOut,
} from "lucide-react";
import { AuditLog } from "@/types/assets";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface NavbarProps {
  dataLoading?: boolean;
  isOnline?: boolean;
  onShowHelp: () => void;
  onSignOut: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ dataLoading = false, isOnline = true, onShowHelp, onSignOut }) => {
  const { theme, toggleTheme } = useTheme();
  const { userProfile } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [mobileProfileMenuOpen, setMobileProfileMenuOpen] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clearedLogs, setClearedLogs] = useState<string[]>([]);
  const [isRead, setIsRead] = useState<boolean>(false);

  const visibleLogs = logs.filter((log) => !clearedLogs.includes(log.id));
  const hasNotifications = visibleLogs.length > 0 && !isRead;

  const handleMarkAllRead = () => setIsRead(true);
  const handleClearAll = () => {
    setClearedLogs(logs.map((log) => log.id));
    setIsRead(true);
  };

  const userInitial = (userProfile?.displayName?.[0] || userProfile?.email?.[0] || "U").toUpperCase();

  useEffect(() => {
    if (!userProfile) { setLogs([]); setError(null); return; }
    setLoading(true);
    setError(null);

    // Admins review the system feed. Staff subscribe only to logs they personally
    // created; filtering a broad feed in the browser can expose other users' activity.
    const activityQuery = userProfile.role === "SUPER_ADMIN"
      ? query(collection(db, "audit_logs"))
      : query(collection(db, "audit_logs"), where("actorUid", "==", userProfile.uid));

    const unsubscribe = onSnapshot(activityQuery, (snapshot) => {
      const filteredLogs = snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() } as AuditLog));

      const toMillis = (value: any) => value?.toMillis?.() ?? (value?.toDate?.() ? value.toDate().getTime() : typeof value === "string" ? Date.parse(value) : 0);
      filteredLogs.sort((a, b) => toMillis(b.timestamp) - toMillis(a.timestamp));

      setLogs(filteredLogs);
      setLoading(false);
      setError(null);
    }, (err) => {
      console.warn("Audit logs subscription notice:", err);
      setLogs([]);
      setLoading(false);
      setError(null);
    });

    return () => unsubscribe();
  }, [userProfile]);

  const formatTime = (value: any) => {
    const date = value?.toDate?.() || (typeof value === "string" ? new Date(value) : null);
    return date && !Number.isNaN(date.getTime()) ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date) : "Just now";
  };

  return (
    <header className="sticky top-0 z-40 bg-white/25 dark:bg-[rgba(12,29,47,0.45)] backdrop-blur-md backdrop-saturate-150 border-b border-white/50 dark:border-white/15 shadow-[0_4px_20px_rgba(0,0,0,0.06),inset_0_1px_1px_rgba(255,255,255,0.6)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.12)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center gap-2">

          {/* Logo & Brand */}
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <Image
              src="/logo.png"
              alt="Basechan Logo"
              width={40}
              height={40}
              className="h-9 w-9 rounded-xl object-contain sm:h-10 sm:w-10"
              priority
            />
            <div>
              <h1 className="max-w-[36vw] truncate font-bold text-[var(--text-primary)] text-xs tracking-tight sm:max-w-none sm:text-lg">
                <span className="sm:hidden">Basechan Assets</span><span className="hidden sm:inline">Basechan Enterprise Asset Manager</span>
              </h1>
            </div>
          </div>

          {/* Desktop Right Action Area */}
          <div className="hidden md:flex items-center gap-2.5">
            {/* Sync / Connectivity Status Indicator */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border backdrop-blur-md shadow-sm transition-all ${
                !isOnline
                  ? "bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400"
                  : dataLoading
                  ? "bg-blue-500/15 border-blue-500/30 text-blue-600 dark:text-blue-400"
                  : "bg-gold-500/15 border-gold-500/30 text-gold-600 dark:text-gold-400"
              }`}
              title={!isOnline ? "Offline Mode" : dataLoading ? "Syncing..." : "Database Synced"}
            >
              {!isOnline ? (
                <WifiOff className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
              ) : dataLoading ? (
                <RefreshCw className="w-3.5 h-3.5 text-blue-500 animate-spin flex-shrink-0" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 text-gold-400 flex-shrink-0" />
              )}
              <span>{!isOnline ? "Offline" : dataLoading ? "Syncing..." : "Synced"}</span>
            </div>

            {/* Notifications Button */}
            {userProfile && (
              <button
                onClick={() => setNotificationsOpen((prev) => !prev)}
                className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] bg-white/30 dark:bg-white/10 hover:bg-white/60 dark:hover:bg-white/20 border border-white/40 dark:border-white/15 backdrop-blur-md shadow-sm transition-all relative cursor-pointer"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                {hasNotifications && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500" />
                )}
              </button>
            )}

            {/* Help Guide */}
            {userProfile && (
              <button
                onClick={onShowHelp}
                className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] bg-white/30 dark:bg-white/10 hover:bg-white/60 dark:hover:bg-white/20 border border-white/40 dark:border-white/15 backdrop-blur-md shadow-sm transition-all cursor-pointer"
                title="Help & Guide"
              >
                <CircleHelp className="w-4 h-4" />
              </button>
            )}

            {/* Sign Out */}
            {userProfile && (
              <button
                onClick={onSignOut}
                className="p-2 rounded-xl text-[var(--text-muted)] hover:text-rose-600 bg-white/30 dark:bg-white/10 hover:bg-rose-500/20 border border-white/40 dark:border-white/15 backdrop-blur-md shadow-sm transition-all cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}

            {/* Dark / Light Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] bg-white/30 dark:bg-white/10 hover:bg-white/60 dark:hover:bg-white/20 border border-white/40 dark:border-white/15 backdrop-blur-md shadow-sm transition-all cursor-pointer"
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? <Sun className="w-4 h-4 text-gold-400" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* User Profile Avatar with Initials */}
            {userProfile && (
              <div
                className={`w-9 h-9 min-w-9 min-h-9 rounded-full bg-blue-600/90 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-md select-none border border-white/40 dark:border-white/20 backdrop-blur-md ${
                  hasNotifications ? "ring-2 ring-gold-400 ring-offset-2 ring-offset-[var(--bg-surface)] animate-pulse" : ""
                }`}
                title={`${userProfile.displayName || userProfile.email}`}
              >
                {userInitial}
              </div>
            )}
          </div>

          {/* Mobile Right Action Area (Profile Button + Mini Vertical Pop-up) */}
          <div className="md:hidden relative flex items-center gap-2">
            {userProfile && (
              <button
                onClick={() => setMobileProfileMenuOpen((prev) => !prev)}
                className={`w-9 h-9 min-w-9 min-h-9 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-md transition-all cursor-pointer relative ${
                  hasNotifications ? "ring-2 ring-gold-400 ring-offset-2 ring-offset-[var(--bg-surface)] animate-pulse" : ""
                }`}
                title={userProfile.displayName || userProfile.email}
              >
                {userInitial}
              </button>
            )}

            {/* Mobile Mini Vertical Scroll Menu (Icons Only) */}
            {mounted && createPortal(
              <AnimatePresence>
                {mobileProfileMenuOpen && (
                  <motion.div
                    key="mobile-profile-menu-backdrop"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    className="fixed inset-0 z-[100] bg-slate-950/35 backdrop-blur-[4px] flex items-start justify-end p-4"
                    onClick={() => setMobileProfileMenuOpen(false)}
                  >
                    <motion.div
                      key="mobile-profile-menu-panel"
                      initial={{ opacity: 0, scale: 0.9, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: -10 }}
                      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                      className="w-14 max-h-56 mt-14 overflow-y-auto no-scrollbar rounded-2xl liquid-glass shadow-2xl p-2 flex flex-col items-center gap-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Sync Icon */}
                      <div
                        className="p-2 rounded-xl bg-white/50 dark:bg-white/10 text-[var(--text-primary)] cursor-pointer"
                        title={!isOnline ? "Offline Mode" : dataLoading ? "Syncing..." : "Database Synced"}
                      >
                        {!isOnline ? (
                          <WifiOff className="w-4 h-4 text-amber-500" />
                        ) : dataLoading ? (
                          <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        )}
                      </div>

                      {/* Bell Icon */}
                      <button
                        onClick={() => {
                          setMobileProfileMenuOpen(false);
                          setNotificationsOpen(true);
                        }}
                        className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/50 dark:hover:bg-white/10 transition-colors relative cursor-pointer"
                        title="Notifications"
                      >
                        <Bell className="w-4 h-4" />
                        {hasNotifications && (
                          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-500" />
                        )}
                      </button>

                      {/* Help Icon */}
                      <button
                        onClick={() => {
                          setMobileProfileMenuOpen(false);
                          onShowHelp();
                        }}
                        className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/50 dark:hover:bg-white/10 transition-colors cursor-pointer"
                        title="Help & Guide"
                      >
                        <CircleHelp className="w-4 h-4" />
                      </button>

                      {/* Theme Toggle Icon */}
                      <button
                        onClick={toggleTheme}
                        className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/50 dark:hover:bg-white/10 transition-colors cursor-pointer"
                        title="Toggle Theme"
                      >
                        {theme === "dark" ? <Sun className="w-4 h-4 text-gold-400" /> : <Moon className="w-4 h-4" />}
                      </button>

                      {/* Sign Out Icon */}
                      <button
                        onClick={() => {
                          setMobileProfileMenuOpen(false);
                          onSignOut();
                        }}
                        className="p-2 rounded-xl text-[var(--text-muted)] hover:text-rose-600 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title="Sign Out"
                      >
                        <LogOut className="w-4 h-4 text-rose-500" />
                      </button>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>,
              document.body
            )}
          </div>

          {/* Activity Notifications Modal Overlay & Liquid Glass Panel */}
          {mounted && createPortal(
            <AnimatePresence>
              {notificationsOpen && (
                <motion.div
                  key="notifications-drawer-backdrop"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  className="fixed inset-0 z-[100] bg-slate-950/35 backdrop-blur-[4px] flex items-start justify-end p-3 sm:p-6"
                  onClick={() => setNotificationsOpen(false)}
                >
                  <motion.div
                    key="notifications-drawer-panel"
                    initial={{ opacity: 0, scale: 0.93, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.93, y: -10 }}
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    className="w-[min(28rem,calc(100vw-1.5rem))] max-h-[80vh] mt-14 overflow-hidden rounded-2xl liquid-glass shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between border-b border-white/50 dark:border-white/10 px-4 py-3 bg-white/30 dark:bg-white/5">
                      <div>
                        <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                          Activity Log
                          {visibleLogs.length > 0 && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                              {visibleLogs.length}
                            </span>
                          )}
                        </h2>
                        <p className="text-[11px] text-[var(--text-muted)]">
                          {userProfile?.role === "SUPER_ADMIN" ? "All system activity" : "Your assigned activity"}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {visibleLogs.length > 0 && (
                          <>
                            <button
                              type="button"
                              onClick={handleMarkAllRead}
                              className="text-[11px] font-semibold text-blue-600 dark:text-gold-400 hover:underline px-2 py-1 rounded-lg hover:bg-white/50 dark:hover:bg-white/10 cursor-pointer"
                              title="Mark all as read"
                            >
                              Mark read
                            </button>
                            <button
                              type="button"
                              onClick={handleClearAll}
                              className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:underline px-2 py-1 rounded-lg hover:bg-rose-500/10 cursor-pointer"
                              title="Clear all notifications"
                            >
                              Clear all
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => setNotificationsOpen(false)}
                          className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-white/50 dark:hover:bg-white/10 cursor-pointer"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="max-h-[calc(80vh-4rem)] overflow-y-auto no-scrollbar p-3 space-y-2">
                      {loading ? (
                        <p className="p-6 text-center text-sm text-[var(--text-muted)]">Loading activity feed…</p>
                      ) : error ? (
                        <p role="alert" className="p-6 text-center text-sm text-rose-600">{error}</p>
                      ) : visibleLogs.length === 0 ? (
                        <p className="p-6 text-center text-sm text-[var(--text-muted)]">No activity logs recorded.</p>
                      ) : (
                        visibleLogs.map((log) => (
                          <article
                            key={log.id}
                            className="p-3 rounded-xl border border-white/50 dark:border-white/15 bg-white/40 dark:bg-white/10 backdrop-blur-md hover:bg-white/60 dark:hover:bg-white/20 transition-all shadow-sm flex flex-col gap-1.5 group"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <p className="text-xs font-semibold leading-relaxed text-[var(--text-primary)] group-hover:text-blue-600 dark:group-hover:text-gold-400 transition-colors">
                                {log.details}
                              </p>
                              <span className="shrink-0 rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400 dark:bg-blue-400/15 px-2 py-0.5 text-[10px] font-bold font-mono border border-blue-500/30">
                                {log.action.replaceAll("_", " ").toLowerCase()}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] font-medium text-[var(--text-muted)]">
                              <Clock3 className="h-3 w-3 text-gold-500 dark:text-gold-400 flex-shrink-0" />
                              <span className="truncate">{log.actorName || log.actorEmail}</span>
                              <span>•</span>
                              <span className="shrink-0">{formatTime(log.timestamp)}</span>
                            </div>
                          </article>
                        ))
                      )}
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>,
            document.body
          )}

        </div>
      </div>
    </header>
  );
};

