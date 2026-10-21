"use client";

import React, { useState, useMemo } from "react";
import { parseBasechanWorkbook, ParsedWorkbookData, exportToExcel } from "@/lib/excelParser";
import { replaceFirestoreFromParsedData, seedFirestoreFromParsedData } from "@/lib/seedDatabase";
import { useAuth } from "@/context/AuthContext";
import { PhysicalAsset, StaffMember, DigitalCredential, WorkbookDocument, FacilityItem } from "@/types/assets";
import {
  FileUp,
  Database,
  CheckCircle2,
  AlertCircle,
  Download,
  UploadCloud,
  FileSpreadsheet,
  RefreshCw,
  Layers,
} from "lucide-react";

interface IngestionTabProps {
  currentStats: {
    staffCount: number;
    physicalCount: number;
    digitalCount: number;
    workbookCount: number;
    facilityCount: number;
  };
  onDataIngested: (data: ParsedWorkbookData, replace?: boolean) => void;
  currentRecords?: ParsedWorkbookData;
  onMigrateSecrets?: () => Promise<number>;
}

function stableRecord(value: Record<string, any>) { return Object.fromEntries(Object.entries(value).filter(([key]) => !["id", "createdAt", "updatedAt", "archivedAt", "archivedBy"].includes(key)).sort(([a], [b]) => a.localeCompare(b))); }

export const IngestionTab: React.FC<IngestionTabProps> = ({ currentStats, currentRecords, onDataIngested, onMigrateSecrets }) => {
  const { userProfile } = useAuth();
  const [parsingFile, setParsingFile] = useState(false);
  const [seedingFirestore, setSeedingFirestore] = useState(false);
  const [migratingSecrets, setMigratingSecrets] = useState(false);
  const [parsedPreview, setParsedPreview] = useState<ParsedWorkbookData | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const importPreview = useMemo(() => {
    if (!parsedPreview) return null;
    const current = currentRecords || { ...parsedPreview, staff: [], physicalAssets: [], digitalCredentials: [], workbooks: [], facilities: [] };
    const definitions = [
      // The workbook S/N-derived record ID is the source identity. Matching on names,
      // titles, or serials can wrongly discard distinct rows that share incomplete data.
      { key: "staff" as const, old: current.staff, valid: (row: any) => !!row.name, identity: (row: any) => row.id },
      { key: "physicalAssets" as const, old: current.physicalAssets, valid: (row: any) => !!(row.makeModel || row.category || row.tag || row.assignedStaff), identity: (row: any) => row.id },
      { key: "digitalCredentials" as const, old: current.digitalCredentials, valid: (row: any) => !!row.platform, identity: (row: any) => row.id },
      { key: "workbooks" as const, old: current.workbooks, valid: (row: any) => !!row.title, identity: (row: any) => row.id },
      { key: "facilities" as const, old: current.facilities, valid: (row: any) => !!row.itemDescription, identity: (row: any) => row.id },
    ];
    let added = 0; let changed = 0; let unchanged = 0; let invalid = (parsedPreview.parseIssues || []).filter((issue) => issue.message.includes("skipped")).length; let duplicates = 0;
    const accepted: any = { ...parsedPreview, staff: [], physicalAssets: [], digitalCredentials: [], workbooks: [], facilities: [] };
    const summaries: { name: string; added: number; changed: number; unchanged: number; invalid: number; duplicates: number }[] = [];
    for (const definition of definitions) {
      let group = { name: definition.key, added: 0, changed: 0, unchanged: 0, invalid: 0, duplicates: 0 };
      const seen = new Set<string>(); const currentById = new Map(definition.old.map((row: any) => [row.id, stableRecord(row as any)]));
      for (const row of parsedPreview[definition.key] as any[]) {
        const identity = String(definition.identity(row) || row.id).trim().toLowerCase();
        if (!definition.valid(row)) { invalid++; group.invalid++; continue; }
        if (identity && seen.has(identity)) { duplicates++; group.duplicates++; continue; }
        if (identity) seen.add(identity);
        const prior = currentById.get(row.id);
        if (!prior) { added++; group.added++; }
        else if (JSON.stringify(prior) !== JSON.stringify(stableRecord(row))) { changed++; group.changed++; }
        else { unchanged++; group.unchanged++; }
        (accepted[definition.key] as any[]).push(row);
      }
      summaries.push(group);
    }
    return { added, changed, unchanged, invalid, duplicates, accepted, summaries };
  }, [parsedPreview, currentRecords]);

  // Drag and drop or manual file selection
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    setParsingFile(true);
    setStatusMessage({ type: "info", text: `Parsing ${file.name}...` });

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const buffer = event.target?.result as ArrayBuffer;
        const parsed = await parseBasechanWorkbook(buffer);
        setParsedPreview(parsed);

        setStatusMessage({ type: "success", text: `Parsed ${file.name}: ${parsed.physicalAssets.length} hardware assets, ${parsed.staff.length} staff, ${parsed.digitalCredentials.length} credentials, ${parsed.workbooks.length} workbooks, and ${parsed.facilities.length} facility items. Rows marked with completeness warnings remain importable.` });
      } catch (err: any) {
        setStatusMessage({ type: "error", text: `Failed to parse workbook: ${err.message}` });
      } finally {
        setParsingFile(false);
      }
    };

    reader.onerror = () => {
      setStatusMessage({ type: "error", text: "Error reading uploaded file." });
      setParsingFile(false);
    };

    reader.readAsArrayBuffer(file);
  };

  const handleCommitPreviewToFirestore = async () => {
    if (!parsedPreview) return;
    if (!importPreview || (!importPreview.accepted.staff.length && !importPreview.accepted.physicalAssets.length && !importPreview.accepted.digitalCredentials.length && !importPreview.accepted.workbooks.length && !importPreview.accepted.facilities.length)) {
      setStatusMessage({ type: "error", text: "There are no valid, non-duplicate rows to import." }); return;
    }
    const summary = `${importPreview.accepted.physicalAssets.length} hardware rows (${importPreview.added} new, ${importPreview.changed} changed, ${importPreview.unchanged} unchanged overall), ${importPreview.duplicates} duplicate(s) skipped, ${importPreview.invalid} invalid row(s) skipped.`;
    if (!window.confirm(`Review import: ${summary}\n\nOnly new, changed, and unchanged valid rows will be written. Archived or absent records will not be deleted.`)) return;
    setSeedingFirestore(true);
    setStatusMessage({ type: "info", text: "Writing parsed records to Cloud Firestore..." });

    try {
      if (!userProfile || !currentRecords) throw new Error("User or current records are unavailable for import auditing.");
      const seedRes = await seedFirestoreFromParsedData(importPreview.accepted, userProfile, currentRecords);
      if (seedRes.success) {
        onDataIngested(importPreview.accepted);
        setStatusMessage({
          type: "success",
          text: `Committed to Firestore! Synced ${seedRes.assetsUploaded} physical assets, ${seedRes.staffUploaded} staff, ${seedRes.credentialsUploaded} credentials, and ${seedRes.workbooksUploaded} workbooks.`
        });
      } else {
        setStatusMessage({
          type: "error",
          text: `Firestore commit warning: ${seedRes.error}`
        });
      }
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Failed to commit to Firestore." });
    } finally {
      setSeedingFirestore(false);
    }
  };

  const handleReplaceActiveData = async () => {
    if (!parsedPreview || !importPreview || userProfile?.role !== "SUPER_ADMIN") return;
    const accepted = importPreview.accepted;
    const total = accepted.staff.length + accepted.physicalAssets.length + accepted.digitalCredentials.length + accepted.workbooks.length + accepted.facilities.length;
    if (!total) { setStatusMessage({ type: "error", text: "There are no valid rows to replace the active data with." }); return; }
    const message = `Replace active data with this workbook?\n\n${total} valid rows will be imported. All currently active staff, hardware, credentials, workbooks, and facilities will be archived first. Audit history is retained and archived records can be restored. This does not hard-delete data.`;
    if (!window.confirm(message)) return;
    setSeedingFirestore(true);
    setStatusMessage({ type: "info", text: "Archiving current records and importing the reviewed workbook..." });
    try {
      if (!currentRecords) throw new Error("Current records are unavailable for import auditing.");
      const result = await replaceFirestoreFromParsedData(accepted, userProfile, currentRecords);
      if (!result.success) throw new Error(result.error || "Replacement did not complete.");
      onDataIngested(accepted, true);
      setStatusMessage({ type: "success", text: `Replacement complete. Archived ${result.archivedCount || 0} active records and imported ${result.staffUploaded} staff, ${result.assetsUploaded} hardware assets, ${result.credentialsUploaded} credentials, ${result.workbooksUploaded} workbooks, and ${result.facilitiesUploaded} facility items.` });
    } catch (error) {
      setStatusMessage({ type: "error", text: error instanceof Error ? error.message : "Replacement failed. Check Firestore access and retry." });
    } finally { setSeedingFirestore(false); }
  };

  const handleMigrateSecrets = async () => {
    if (!onMigrateSecrets || !window.confirm("Move legacy plaintext credential fields into the restricted secret collection? Existing secret text will be removed from normal credential records.")) return;
    setMigratingSecrets(true);
    try {
      const migrated = await onMigrateSecrets();
      setStatusMessage({ type: "success", text: `Migrated ${migrated} credential secret(s) into restricted secret records.` });
    } catch (err) { setStatusMessage({ type: "error", text: err instanceof Error ? err.message : "Credential migration failed." }); }
    finally { setMigratingSecrets(false); }
  };

  return (
    <div data-scroll-motion-root className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileUp className="w-5 h-5 text-blue-600" />
            <span>Excel Ingestion Engine & Database Synchronization</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Automated multi-sheet SheetJS ingestion for Basechan Consolidated September Inventory into Firestore.
          </p>
        </div>
      </div>

      {/* Notification Toast */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center gap-3 animate-in fade-in ${
            statusMessage.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : statusMessage.type === "error"
              ? "bg-rose-50 border-rose-200 text-rose-800"
              : "bg-blue-50 border-blue-200 text-blue-800"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          ) : statusMessage.type === "error" ? (
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          ) : (
            <RefreshCw className="w-5 h-5 text-blue-600 animate-spin flex-shrink-0" />
          )}
          <span className="font-medium leading-relaxed">{statusMessage.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        <div className="flex flex-col justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 sm:flex-row sm:items-center"><div><h3 className="text-sm font-bold text-amber-900">Credential secret migration</h3><p className="mt-1 text-xs text-amber-800">Move legacy plaintext secrets out of normal credential documents before staff use the vault.</p></div><button onClick={() => void handleMigrateSecrets()} disabled={migratingSecrets} className="rounded-lg bg-amber-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{migratingSecrets ? "Migrating…" : "Migrate legacy secrets"}</button></div>
        {/* Upload Custom Excel File Card */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold mb-3">
              <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
              <span>Custom Ingestion</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900">Upload New Asset Workbook</h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Upload an updated monthly asset workbook (.xlsx or .xls). The SheetJS parser will automatically normalize column headers and run completeness auditing.
            </p>
          </div>

          <div className="mt-6">
            <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl cursor-pointer bg-slate-50 hover:bg-blue-50/50 transition-all">
              <UploadCloud className="w-7 h-7 text-slate-400 mb-1" />
              <span className="text-xs font-bold text-slate-700">Choose .xlsx File or Drag Here</span>
              <span className="text-[11px] text-slate-400 mt-0.5">Supports multi-sheet Basechan workbooks</span>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                disabled={parsingFile}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Live System Data Counters */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-600" />
          <span>Active Ingestion State in Memory & Database</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-center">
            <span className="text-xs text-slate-500">Staff Records</span>
            <div className="text-xl font-bold text-slate-900 mt-1">{currentStats.staffCount}</div>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-center">
            <span className="text-xs text-slate-500">Hardware Assets</span>
            <div className="text-xl font-bold text-blue-700 mt-1">{currentStats.physicalCount}</div>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-center">
            <span className="text-xs text-slate-500">Digital Credentials</span>
            <div className="text-xl font-bold text-emerald-700 mt-1">{currentStats.digitalCount}</div>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-center">
            <span className="text-xs text-slate-500">Workbooks</span>
            <div className="text-xl font-bold text-sky-700 mt-1">{currentStats.workbookCount}</div>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-center">
            <span className="text-xs text-slate-500">Facilities</span>
            <div className="text-xl font-bold text-indigo-700 mt-1">{currentStats.facilityCount}</div>
          </div>
        </div>

        {parsedPreview && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col gap-4 lg:flex-row lg:justify-between lg:items-center">
            <div className="text-xs text-slate-600"><p className="font-semibold">Workbook parsed · {parsedPreview.physicalAssets.length} hardware rows (current database: {currentStats.physicalCount})</p><p className="mt-1 font-semibold">Import review · {importPreview?.added} new · {importPreview?.changed} changed · {importPreview?.unchanged} unchanged</p><p className="mt-1 text-amber-700">{importPreview?.accepted.physicalAssets.length} hardware rows are ready; {importPreview?.duplicates} duplicates and {importPreview?.invalid} invalid/skipped rows will be excluded.</p><div className="mt-2 flex flex-wrap gap-2">{importPreview?.summaries.map((group) => <span key={group.name} className="rounded-md bg-slate-100 px-2 py-1">{group.name}: +{group.added} / ~{group.changed} / ={group.unchanged} / !{group.invalid} / duplicate {group.duplicates}</span>)}</div>{parsedPreview.parseIssues?.slice(0, 12).map((issue, index) => <p key={`${issue.sheet}-${issue.row}-${index}`} className="mt-1 text-amber-700">{issue.sheet}, row {issue.row}: {issue.message}</p>)}</div>
            <div className="flex flex-col sm:flex-row gap-2 shrink-0">
            <button
              onClick={handleCommitPreviewToFirestore}
              disabled={seedingFirestore}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5"
            >
              <Database className="w-3.5 h-3.5" />
              <span>{seedingFirestore ? "Writing to Firestore..." : "Review and commit valid rows"}</span>
            </button>
            {userProfile?.role === "SUPER_ADMIN" && <button onClick={() => void handleReplaceActiveData()} disabled={seedingFirestore} className="px-4 py-2 bg-rose-700 hover:bg-rose-800 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-sm transition-all">{seedingFirestore ? "Replacing..." : "Replace active data"}</button>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
