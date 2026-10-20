"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
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
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [mobileProfileMenuOpen, setMobileProfileMenuOpen] = useState(false);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userInitial = (userProfile?.displayName?.[0] || userProfile?.email?.[0] || "U").toUpperCase();
  const hasNotifications = logs.length > 0;

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
    <header className="sticky top-0 z-40 bg-[var(--bg-surface)] border-b border-[var(--border)] shadow-sm">
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
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                !isOnline
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
                  : dataLoading
                  ? "bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400"
                  : "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
              }`}
              title={!isOnline ? "Offline Mode" : dataLoading ? "Syncing..." : "Database Synced"}
            >
              {!isOnline ? (
                <WifiOff className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
              ) : dataLoading ? (
                <RefreshCw className="w-3.5 h-3.5 text-blue-500 animate-spin flex-shrink-0" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
              )}
              <span>{!isOnline ? "Offline" : dataLoading ? "Syncing..." : "Synced"}</span>
            </div>

            {/* Notifications Button */}
            {userProfile && (
              <button
                onClick={() => setNotificationsOpen((prev) => !prev)}
                className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors relative"
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
                className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors"
                title="Help & Guide"
              >
                <CircleHelp className="w-4 h-4" />
              </button>
            )}

            {/* Sign Out */}
            {userProfile && (
              <button
                onClick={onSignOut}
                className="p-2 rounded-xl text-[var(--text-muted)] hover:text-rose-600 hover:bg-rose-500/10 transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}

            {/* Dark / Light Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors"
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? <Sun className="w-4 h-4 text-gold-400" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* User Profile Avatar with Initials */}
            {userProfile && (
              <div
                className={`w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-sm select-none ${
                  hasNotifications ? "ring-2 ring-emerald-500 ring-offset-2 ring-offset-[var(--bg-surface)] animate-pulse" : ""
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
                className={`w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-md transition-all cursor-pointer relative ${
                  hasNotifications ? "ring-2 ring-emerald-500 ring-offset-2 ring-offset-[var(--bg-surface)] animate-pulse" : ""
                }`}
                title={userProfile.displayName || userProfile.email}
              >
                {userInitial}
              </button>
            )}

            {/* Mobile Mini Vertical Scroll Menu (Icons Only) */}
            {mobileProfileMenuOpen && (
              <div className="absolute right-0 top-11 z-50 w-14 max-h-56 overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-2xl p-2 flex flex-col items-center gap-3 animate-in fade-in zoom-in duration-100">
                {/* Sync Icon */}
                <div
                  className="p-2 rounded-xl bg-[var(--bg-muted)] text-[var(--text-primary)] cursor-pointer"
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
                  className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors relative cursor-pointer"
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
                  className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors cursor-pointer"
                  title="Help & Guide"
                >
                  <CircleHelp className="w-4 h-4" />
                </button>

                {/* Theme Toggle Icon */}
                <button
                  onClick={toggleTheme}
                  className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors cursor-pointer"
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
              </div>
            )}
          </div>

          {/* Activity Notifications Drawer */}
          {notificationsOpen && (
            <div className="fixed sm:absolute right-2 sm:right-6 top-[4.25rem] z-50 w-[min(28rem,calc(100vw-1rem))] max-h-[min(75vh,36rem)] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-2xl animate-in fade-in zoom-in duration-150">
              <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
                <div>
                  <h2 className="text-sm font-bold text-[var(--text-primary)]">Activity Log</h2>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    {userProfile?.role === "SUPER_ADMIN" ? "All system activity" : "Your assigned activity"}
                  </p>
                </div>
                <button
                  onClick={() => setNotificationsOpen(false)}
                  className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg-muted)] cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="max-h-[calc(min(75vh,36rem)-4rem)] overflow-y-auto">
                {loading ? (
                  <p className="p-6 text-center text-sm text-[var(--text-muted)]">Loading activity feed…</p>
                ) : error ? (
                  <p role="alert" className="p-6 text-center text-sm text-rose-600">{error}</p>
                ) : logs.length === 0 ? (
                  <p className="p-6 text-center text-sm text-[var(--text-muted)]">No activity logs recorded.</p>
                ) : (
                  logs.map((log) => (
                    <article key={log.id} className="border-b border-[var(--border)] px-4 py-3 last:border-0">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-xs font-semibold leading-5 text-[var(--text-primary)]">{log.details}</p>
                        <span className="shrink-0 rounded bg-[var(--bg-muted)] px-1.5 py-0.5 text-[10px] text-[var(--text-muted)] font-mono">
                          {log.action.replaceAll("_", " ").toLowerCase()}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
                        <Clock3 className="h-3 w-3" />
                        {log.actorName || log.actorEmail} · {formatTime(log.timestamp)}
                      </div>
                    </article>
                  ))
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </header>
  );
};

