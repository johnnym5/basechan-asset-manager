"use client";

import React from "react";
import { PhysicalAsset, StaffMember, DigitalCredential, WorkbookDocument, FacilityItem, WorkspaceLink } from "@/types/assets";
import { MissingDetailAlert } from "@/types/completeness";
import { TabKey } from "../layout/Sidebar";
import {
  Laptop,
  Users,
  KeyRound,
  AlertTriangle,
  Building2,
  FileSpreadsheet,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { WorkspaceCards } from "@/components/dashboard/WorkspaceTab";

interface OverviewTabProps {
  displayName: string;
  assets: PhysicalAsset[];
  staff: StaffMember[];
  credentials: DigitalCredential[];
  workbooks: WorkbookDocument[];
  facilities: FacilityItem[];
  missingAlerts: MissingDetailAlert[];
  onNavigateTab: (tab: TabKey) => void;
  workspaceLinks: WorkspaceLink[];
  workspaceFavorites: string[];
  onToggleWorkspaceFavorite: (id: string) => Promise<void>;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  displayName,
  assets,
  staff,
  credentials,
  workbooks,
  facilities,
  missingAlerts,
  onNavigateTab,
  workspaceLinks,
  workspaceFavorites,
  onToggleWorkspaceFavorite,
}) => {
  const abujaAssets = assets.filter((a) => a.branch.toLowerCase().includes("abuja"));
  const beninAssets = assets.filter((a) => a.branch.toLowerCase().includes("benin"));
  const operationalCount = assets.filter((asset) => asset.status.toLowerCase() !== "retired" && !asset.condition.toLowerCase().includes("damaged") && !asset.condition.toLowerCase().includes("faulty") && !asset.condition.toLowerCase().includes("repair")).length;
  const operationalPercent = assets.length ? Math.round((operationalCount / assets.length) * 100) : 0;

  const criticalAlerts = missingAlerts.filter((m) => m.priority === "CRITICAL");
  const highAlerts = missingAlerts.filter((m) => m.priority === "HIGH");

  const categories = assets.reduce((acc, a) => {
    const cat = a.category || "Other";
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div data-scroll-motion-root className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-navy-900 via-navy-800 to-navy-700 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-gold-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-200 text-xs font-semibold border border-blue-400/20">
                Consolidated Operational Inventory
              </span>
              <span className="text-xs text-slate-300">Live Firestore snapshot</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Welcome back, {displayName.trim().split(/\s+/)[0] || "Administrator"}</h2>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Your organization-wide command center for hardware, staff, credentials, workbooks, and facilities.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigateTab("auditor")}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-md transition-all"
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Review {missingAlerts.length} Alerts</span>
            </button>
            <button
              onClick={() => onNavigateTab("hardware")}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/20 flex items-center gap-1.5 transition-all"
            >
              <span>View Hardware</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {workspaceLinks.filter((link) => workspaceFavorites.includes(link.id)).length > 0 && <section className="space-y-3"><div className="flex items-center justify-between"><div><h3 className="text-lg font-bold text-[var(--text-primary)]">Your Workspace</h3><p className="text-xs text-[var(--text-muted)]">Favourite software and tools, ready to open.</p></div><button onClick={() => onNavigateTab("workspace")} className="text-xs font-semibold text-blue-600">All workspace links <ArrowUpRight className="inline h-3 w-3" /></button></div><WorkspaceCards links={workspaceLinks.filter((link) => workspaceFavorites.includes(link.id))} favorites={workspaceFavorites} onToggleFavorite={onToggleWorkspaceFavorite} /></section>}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div
          onClick={() => onNavigateTab("hardware")}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-blue-400 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Laptop className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Hardware</span>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{assets.length}</div>
          <div className="text-xs text-slate-500 mt-1">Physical Assets</div>
        </div>

        <div
          onClick={() => onNavigateTab("staff")}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-blue-400 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
              <Users className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Personnel</span>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{staff.length}</div>
          <div className="text-xs text-slate-500 mt-1">Active Staff Members</div>
        </div>

        <div
          onClick={() => onNavigateTab("credentials")}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-blue-400 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <KeyRound className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Vault</span>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{credentials.length}</div>
          <div className="text-xs text-slate-500 mt-1">Secured Accounts</div>
        </div>

        <div
          onClick={() => onNavigateTab("auditor")}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-amber-400 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Audit</span>
          </div>
          <div className="text-2xl font-extrabold text-amber-600">{missingAlerts.length}</div>
          <div className="text-xs text-slate-500 mt-1">Operational Alerts</div>
        </div>

        <div
          onClick={() => onNavigateTab("workbooks")}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-blue-400 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-sky-50 text-sky-600 group-hover:bg-sky-600 group-hover:text-white transition-colors">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Data</span>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{workbooks.length}</div>
          <div className="text-xs text-slate-500 mt-1">Managed Workbooks</div>
        </div>

        <div
          onClick={() => onNavigateTab("facilities")}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-blue-400 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <Building2 className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Facilities</span>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{facilities.length}</div>
          <div className="text-xs text-slate-500 mt-1">Infrastructure Records</div>
        </div>
      </div>

      {/* Two Column Middle Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Branch Operations Distribution */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-900 text-sm mb-4 flex items-center justify-between">
            <span>Branch Asset Allocation</span>
            <span className="text-xs font-normal text-slate-400">Total: {assets.length} Devices</span>
          </h3>

          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-slate-800 text-sm">Abuja Branch (HQ)</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                  {abujaAssets.length} Assets
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${(abujaAssets.length / (assets.length || 1)) * 100}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                Operations, Applications, Marketing & Executive management hub.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-slate-800 text-sm">Benin Branch</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                  {beninAssets.length} Assets
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-purple-600 h-2 rounded-full"
                  style={{ width: `${(beninAssets.length / (assets.length || 1)) * 100}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                Regional operations and customer service.
              </p>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Overall Inventory Health</span>
            <span className="font-semibold text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> {operationalPercent}% Operational
            </span>
          </div>
        </div>

        {/* Device Categories */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-900 text-sm mb-4">Hardware Inventory by Category</h3>
          <div className="space-y-2.5">
            {Object.entries(categories).map(([cat, count]) => (
              <div key={cat} className="flex items-center justify-between text-xs py-1.5 px-2 rounded-lg hover:bg-slate-50">
                <span className="font-medium text-slate-700">{cat}</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-slate-700 h-1.5 rounded-full"
                      style={{ width: `${(count / (assets.length || 1)) * 100}%` }}
                    />
                  </div>
                  <span className="font-bold text-slate-900 w-6 text-right">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Required: Top Completeness Alerts */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>Urgent Audit Gaps</span>
            </h3>
            <button
              onClick={() => onNavigateTab("auditor")}
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
            >
              View All ({missingAlerts.length})
            </button>
          </div>

          {missingAlerts.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <ShieldCheck className="w-10 h-10 text-emerald-500 mb-2" />
              <p className="text-xs font-semibold text-slate-700">All Asset Records Complete</p>
              <p className="text-[11px] text-slate-400">No missing serials, tags, or unverified conditions.</p>
            </div>
          ) : (
            <div className="space-y-3 flex-1 overflow-y-auto max-h-72 pr-1">
              {missingAlerts.slice(0, 4).map((alert, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg border text-xs ${
                    alert.priority === "CRITICAL"
                      ? "bg-rose-50/70 border-rose-200"
                      : alert.priority === "HIGH"
                      ? "bg-amber-50/70 border-amber-200"
                      : "bg-slate-50 border-slate-200"
                  }`}
                >
                  <div className="flex items-center justify-between font-semibold">
                    <span className="text-slate-900 font-mono">{alert.assetTag}</span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        alert.priority === "CRITICAL"
                          ? "bg-rose-200 text-rose-800"
                          : alert.priority === "HIGH"
                          ? "bg-amber-200 text-amber-800"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {alert.priority}
                    </span>
                  </div>
                  <div className="text-slate-600 mt-1 font-medium">{alert.makeModel}</div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Missing: <span className="font-semibold text-slate-700">{alert.missingFields.join(", ")}</span>
                  </div>
                  <div className="text-[10px] text-blue-700 font-medium mt-1">
                    Assigned: {alert.actionRequiredBy}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
