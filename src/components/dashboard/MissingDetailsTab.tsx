"use client";

import React, { useState, useMemo } from "react";
import { MissingDetailAlert } from "@/types/completeness";
import { PhysicalAsset } from "@/types/assets";
import { AssetEditModal } from "../modals/AssetEditModal";
import { AssetDetailModal } from "../modals/AssetDetailModal";
import { exportToExcel } from "@/lib/excelParser";
import {
  AlertTriangle,
  Search,
  Filter,
  Download,
  CheckCircle2,
  UserCheck,
  Building,
  Shield,
  ArrowRight,
  Sparkles,
} from "lucide-react";

interface MissingDetailsTabProps {
  alerts: MissingDetailAlert[];
  assets: PhysicalAsset[];
  onUpdateAsset: (asset: PhysicalAsset) => Promise<void>;
}

export const MissingDetailsTab: React.FC<MissingDetailsTabProps> = ({
  alerts,
  assets,
  onUpdateAsset,
}) => {
  const [search, setSearch] = useState("");
  const [filterPriority, setFilterPriority] = useState("ALL");
  const [filterActionBy, setFilterActionBy] = useState("ALL");
  const [selectedAsset, setSelectedAsset] = useState<PhysicalAsset | null>(null);

  const filteredAlerts = useMemo(() => {
    return alerts.filter((a) => {
      const matchesSearch =
        a.assetTag.toLowerCase().includes(search.toLowerCase()) ||
        a.makeModel.toLowerCase().includes(search.toLowerCase()) ||
        a.assignedStaff.toLowerCase().includes(search.toLowerCase()) ||
        a.branch.toLowerCase().includes(search.toLowerCase());

      const matchesPriority = filterPriority === "ALL" || a.priority === filterPriority;
      const matchesAction = filterActionBy === "ALL" || a.actionRequiredBy === filterActionBy;

      return matchesSearch && matchesPriority && matchesAction;
    });
  }, [alerts, search, filterPriority, filterActionBy]);

  const handleResolveClick = (alert: MissingDetailAlert) => {
    const target = assets.find((a) => a.id === alert.assetId || a.tag === alert.assetTag);
    if (target) {
      setSelectedAsset(target);
    }
  };

  const handleExport = () => {
    const data = filteredAlerts.map((a) => ({
      "Asset Tag": a.assetTag,
      "Device Make & Model": a.makeModel,
      "Assigned Staff": a.assignedStaff,
      "Physical Location": a.branch,
      "Missing Attributes": a.missingFields.join("; "),
      "Action Required By": a.actionRequiredBy,
      "Priority Urgency": a.priority,
      "Action / Resolution Guide": a.resolutionGuide,
    }));
    exportToExcel(data, `Basechan_Missing_Details_Audit_${new Date().toISOString().slice(0, 10)}`);
  };

  const criticalCount = alerts.filter((a) => a.priority === "CRITICAL").length;
  const adminActionCount = alerts.filter((a) => a.actionRequiredBy === "ADMIN").length;
  const staffActionCount = alerts.filter((a) => a.actionRequiredBy === "STAFF").length;

  return (
    <div data-scroll-motion-root className="space-y-5 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <span>Data Completeness & Missing Details Auditor</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Automated compliance engine detecting missing serials, unassigned tags, or unverified hardware.
          </p>
        </div>

        <button
          onClick={handleExport}
          className="flex items-center justify-center gap-1.5 px-3 py-2 bg-[var(--bg-surface)] border border-[var(--border)] hover:bg-[var(--bg-muted)] text-[var(--text-primary)] text-xs font-semibold rounded-lg shadow-sm transition-all"
        >
          <Download className="w-3.5 h-3.5 text-slate-500" />
          <span>Export Audit Log</span>
        </button>
      </div>

      {/* Action Breakdown Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-rose-600" /> Critical Serials Missing
            </span>
            <span className="text-lg font-black text-rose-700">{criticalCount}</span>
          </div>
          <p className="text-[11px] text-rose-700 leading-relaxed">
            Hardware items lacking verifiable serial numbers. Assigned to IT Administrator for physical verification.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-purple-50 border border-purple-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-purple-800 uppercase tracking-wider flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-purple-600" /> Admin Review
            </span>
            <span className="text-lg font-black text-purple-700">{adminActionCount}</span>
          </div>
          <p className="text-[11px] text-purple-700 leading-relaxed">
            Hardware records with missing information requiring administrator verification.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-blue-800 uppercase tracking-wider flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-blue-600" /> Staff Condition Updates
            </span>
            <span className="text-lg font-black text-blue-700">{staffActionCount}</span>
          </div>
          <p className="text-[11px] text-blue-700 leading-relaxed">
            Laptops or gear pending physical health verification in staff self-service portal.
          </p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-[var(--bg-surface)] p-3.5 rounded-xl border border-[var(--border)] shadow-sm flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search alerts by tag, make/model, staff, or branch..."
            className="w-full min-w-0 bg-[var(--bg-primary)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] text-xs pl-9 pr-4 py-2 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-col sm:flex-row items-stretch gap-2 w-full md:w-auto">
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="min-w-0 flex-1 text-xs px-2.5 py-2 border border-[var(--border)] rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Priorities</option>
            <option value="CRITICAL">Critical Only</option>
            <option value="HIGH">High Priority</option>
            <option value="MEDIUM">Medium</option>
          </select>

          <select
            value={filterActionBy}
            onChange={(e) => setFilterActionBy(e.target.value)}
            className="min-w-0 flex-1 text-xs px-2.5 py-2 border border-[var(--border)] rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Responsible Parties</option>
            <option value="ADMIN">IT Administrator</option>
            <option value="STAFF">Assigned Staff</option>
          </select>
        </div>
      </div>

      {/* Alerts Grid / Table */}
      <div className="space-y-3">
        {filteredAlerts.length === 0 ? (
          <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-12 text-center shadow-sm">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <h3 className="font-bold text-[var(--text-primary)] text-base">No Data Completeness Gaps Found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Every asset in your inventory contains a valid Serial Number, Asset Tag ID, and verified condition.
            </p>
          </div>
        ) : (
          filteredAlerts.map((alert, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-xl border bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm transition-all hover:shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                alert.priority === "CRITICAL"
                  ? "border-l-4 border-l-rose-500 border-slate-200"
                  : alert.priority === "HIGH"
                  ? "border-l-4 border-l-amber-500 border-slate-200"
                  : "border-l-4 border-l-blue-400 border-slate-200"
              }`}
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-bold text-slate-900 text-sm">{alert.assetTag}</span>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="font-semibold text-slate-800 text-xs">{alert.makeModel}</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      alert.priority === "CRITICAL"
                        ? "bg-rose-100 text-rose-800 border border-rose-200"
                        : alert.priority === "HIGH"
                        ? "bg-amber-100 text-amber-800 border border-amber-200"
                        : "bg-blue-100 text-blue-800 border border-blue-200"
                    }`}
                  >
                    {alert.priority} PRIORITY
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    Action: {alert.actionRequiredBy}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                  <span>Custody: <strong className="text-slate-700">{alert.assignedStaff}</strong></span>
                  <span>Branch: <strong className="text-slate-700">{alert.branch}</strong></span>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-rose-700 pt-1">
                  <span className="font-medium text-slate-500">Missing Fields:</span>
                  {alert.missingFields.map((field) => (
                    <span
                      key={field}
                      className="px-2 py-0.5 rounded bg-rose-50 border border-rose-200 text-rose-800 font-semibold text-[11px]"
                    >
                      {field}
                    </span>
                  ))}
                </div>

                <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-200/60 mt-2">
                  <span className="font-semibold text-slate-700">Directive:</span> {alert.resolutionGuide}
                </p>
              </div>

              <div className="flex items-center gap-2 self-end md:self-center">
                <button
                  onClick={() => handleResolveClick(alert)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-all"
                >
                  <span>Resolve Gap</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {selectedAsset && (() => {
        const matchingAlerts = filteredAlerts;
        const currentAlertIndex = matchingAlerts.findIndex((a) => a.assetId === selectedAsset.id || a.assetTag === selectedAsset.tag);
        const hasPrevious = currentAlertIndex > 0;
        const hasNext = currentAlertIndex >= 0 && currentAlertIndex < matchingAlerts.length - 1;
        const handlePrevious = () => {
          if (hasPrevious) {
            const prevAlert = matchingAlerts[currentAlertIndex - 1];
            const target = assets.find((a) => a.id === prevAlert.assetId || a.tag === prevAlert.assetTag);
            if (target) setSelectedAsset(target);
          }
        };
        const handleNext = () => {
          if (hasNext) {
            const nextAlert = matchingAlerts[currentAlertIndex + 1];
            const target = assets.find((a) => a.id === nextAlert.assetId || a.tag === nextAlert.assetTag);
            if (target) setSelectedAsset(target);
          }
        };

        return (
          <AssetDetailModal
            asset={selectedAsset}
            isOpen={!!selectedAsset}
            onClose={() => setSelectedAsset(null)}
            hasPrevious={hasPrevious}
            hasNext={hasNext}
            onPrevious={handlePrevious}
            onNext={handleNext}
          />
        );
      })()}
    </div>
  );
};
