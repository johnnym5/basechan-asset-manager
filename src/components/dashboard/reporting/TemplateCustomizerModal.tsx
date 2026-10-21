"use client";

import React, { useEffect, useState } from "react";
import {
  Columns,
  Lock,
  Plus,
  Save,
  Trash2,
  X,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { ColumnType, ReportColumnDef, ReportSectionDef } from "@/types/reporting";
import {
  fetchGlobalAdminTemplate,
  fetchUserTemplate,
  saveGlobalAdminTemplate,
  saveUserTemplate,
} from "@/lib/reportingService";

interface Props {
  userId: string;
  userEmail: string;
  isAdmin: boolean;
  onClose: () => void;
  onTemplateSaved?: () => void;
}

// Sub-component for adding columns to a section
function AddColumnInlineForm({
  onAddColumn,
}: {
  onAddColumn: (label: string, type: ColumnType) => void;
}) {
  const [label, setLabel] = useState("");
  const [type, setType] = useState<ColumnType>("text");
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline pt-1"
      >
        <Plus className="h-3 w-3" />
        Add Column Header
      </button>
    );
  }

  const handleAdd = () => {
    if (label.trim()) {
      onAddColumn(label.trim(), type);
      setLabel("");
      setOpen(false);
    }
  };

  return (
    <div className="flex items-center gap-2 pt-1 flex-wrap">
      <input
        type="text"
        placeholder="Column Title (e.g. Cost)"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        className="rounded border border-[var(--border)] bg-[var(--bg-surface)] px-2 py-1 text-xs font-medium focus:outline-none"
      />
      <select
        value={type}
        onChange={(e) => setType(e.target.value as ColumnType)}
        className="rounded border border-[var(--border)] bg-[var(--bg-surface)] px-2 py-1 text-xs font-medium focus:outline-none"
      >
        <option value="text">Text</option>
        <option value="number">Number</option>
        <option value="currency">Currency ($)</option>
        <option value="date">Date</option>
      </select>
      <button
        type="button"
        onClick={handleAdd}
        disabled={!label.trim()}
        className="px-2.5 py-1 rounded bg-blue-600 text-white text-xs font-semibold disabled:opacity-50"
      >
        Add
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="px-2 py-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
      >
        Cancel
      </button>
    </div>
  );
}

// Sub-component for adding default pre-filled row items to a section
function AddRowItemInlineForm({
  firstColLabel,
  onAddRowItem,
}: {
  firstColLabel: string;
  onAddRowItem: (itemTitle: string) => void;
}) {
  const [itemTitle, setItemTitle] = useState("");
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline pt-1"
      >
        <Plus className="h-3 w-3" />
        Add Pre-filled Default Row ({firstColLabel})
      </button>
    );
  }

  const handleAdd = () => {
    if (itemTitle.trim()) {
      onAddRowItem(itemTitle.trim());
      setItemTitle("");
      setOpen(false);
    }
  };

  return (
    <div className="flex items-center gap-2 pt-1 flex-wrap">
      <input
        type="text"
        placeholder={`Item Name (e.g. ${firstColLabel})`}
        value={itemTitle}
        onChange={(e) => setItemTitle(e.target.value)}
        className="rounded border border-[var(--border)] bg-[var(--bg-surface)] px-2.5 py-1 text-xs font-medium focus:outline-none"
      />
      <button
        type="button"
        onClick={handleAdd}
        disabled={!itemTitle.trim()}
        className="px-2.5 py-1 rounded bg-blue-600 text-white text-xs font-semibold disabled:opacity-50"
      >
        Add Row Item
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="px-2 py-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
      >
        Cancel
      </button>
    </div>
  );
}

export function TemplateCustomizerModal({
  userId,
  userEmail,
  isAdmin,
  onClose,
  onTemplateSaved,
}: Props) {
  const [editMode, setEditMode] = useState<"personal" | "global_admin">(
    isAdmin ? "global_admin" : "personal"
  );
  const [globalSections, setGlobalSections] = useState<ReportSectionDef[]>([]);
  const [userSections, setUserSections] = useState<ReportSectionDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // New section form state
  const [newSectionTitle, setNewSectionTitle] = useState("");

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setMessage(null);
      try {
        const [gSecs, uSecs] = await Promise.all([
          fetchGlobalAdminTemplate(),
          fetchUserTemplate(userId),
        ]);
        setGlobalSections(gSecs);
        setUserSections(uSecs);
      } catch (err) {
        setMessage({
          type: "error",
          text: err instanceof Error ? err.message : "Failed to load report templates.",
        });
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [userId]);

  const activeSections = editMode === "global_admin" ? globalSections : userSections;
  const setActiveSections = editMode === "global_admin" ? setGlobalSections : setUserSections;

  const handleAddSection = () => {
    if (!newSectionTitle.trim()) return;
    const secId = `sec_cust_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newSec: ReportSectionDef = {
      id: secId,
      title: newSectionTitle.trim(),
      isRequired: editMode === "global_admin",
      columns: [
        { key: "col_item", label: "Item / Task", type: "text" },
        { key: "col_qty", label: "Quantity", type: "number", isCalculatedTotal: true },
        { key: "col_notes", label: "Notes", type: "text" },
      ],
    };
    setActiveSections((prev) => [...prev, newSec]);
    setNewSectionTitle("");
  };

  const handleDeleteSection = (secId: string) => {
    setActiveSections((prev) => prev.filter((s) => s.id !== secId));
  };

  const handleAddColumn = (secId: string, label: string, type: ColumnType) => {
    if (!label.trim()) return;
    const colKey = `col_${type}_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
    const newCol: ReportColumnDef = {
      key: colKey,
      label: label.trim(),
      type,
      isCalculatedTotal: type === "number" || type === "currency",
    };

    setActiveSections((prev) =>
      prev.map((sec) => {
        if (sec.id === secId) {
          return { ...sec, columns: [...sec.columns, newCol] };
        }
        return sec;
      })
    );
  };

  const handleDeleteColumn = (secId: string, colKey: string) => {
    setActiveSections((prev) =>
      prev.map((sec) => {
        if (sec.id === secId) {
          return { ...sec, columns: sec.columns.filter((c) => c.key !== colKey) };
        }
        return sec;
      })
    );
  };

  const handleAddDefaultRowItem = (secId: string, itemTitle: string) => {
    if (!itemTitle.trim()) return;
    setActiveSections((prev) =>
      prev.map((sec) => {
        if (sec.id === secId) {
          const firstColKey = sec.columns[0]?.key || "item";
          const newRow = { [firstColKey]: itemTitle.trim() };
          return { ...sec, defaultRows: [...(sec.defaultRows || []), newRow] };
        }
        return sec;
      })
    );
  };

  const handleDeleteDefaultRowItem = (secId: string, rowIndex: number) => {
    setActiveSections((prev) =>
      prev.map((sec) => {
        if (sec.id === secId) {
          const updatedRows = [...(sec.defaultRows || [])];
          updatedRows.splice(rowIndex, 1);
          return { ...sec, defaultRows: updatedRows };
        }
        return sec;
      })
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      if (editMode === "global_admin") {
        await saveGlobalAdminTemplate(globalSections, userEmail);
        setMessage({ type: "success", text: "Global admin mandatory template saved successfully!" });
      } else {
        await saveUserTemplate(userId, userSections, userEmail);
        setMessage({ type: "success", text: "Your personal custom template saved successfully!" });
      }
      if (onTemplateSaved) onTemplateSaved();
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to save template.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/75 p-2 backdrop-blur-sm sm:p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex max-h-[calc(100dvh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-2xl">
        {/* Header */}
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--bg-muted)]/60 px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center gap-2.5">
            <Columns className="h-5 w-5 text-blue-500" />
            <div>
              <h2 className="font-bold text-base sm:text-lg">Customize Report Template</h2>
              <p className="text-xs text-[var(--text-muted)]">
                Configure custom section headers and multi-column tables for weekly reports
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-[var(--text-muted)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {/* Edit Mode Toggle for Admins */}
        {isAdmin && (
          <div className="border-b border-[var(--border)] bg-[var(--bg-muted)]/30 px-6 py-2.5 flex items-center gap-3">
            <span className="text-xs font-semibold text-[var(--text-muted)]">Editing Target:</span>
            <div className="inline-flex rounded-lg border border-[var(--border)] p-1 bg-[var(--bg-surface)]">
              <button
                onClick={() => setEditMode("personal")}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                  editMode === "personal"
                    ? "bg-blue-600 text-white"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
              >
                My Personal Template
              </button>
              <button
                onClick={() => setEditMode("global_admin")}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                  editMode === "global_admin"
                    ? "bg-amber-600 text-white"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
              >
                Global Mandatory Template (Admin)
              </button>
            </div>
          </div>
        )}

        {/* Content Body */}
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {loading ? (
            <p className="p-6 text-center text-sm text-[var(--text-muted)]">Loading template configuration...</p>
          ) : (
            <>
              {/* Mandatory Admin Sections Notice (If editing Personal mode) */}
              {editMode === "personal" && globalSections.length > 0 && (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 space-y-2">
                  <div className="flex items-center gap-2 font-semibold text-xs text-amber-700 dark:text-amber-400">
                    <Lock className="h-4 w-4 shrink-0" />
                    <span>Mandatory Global Admin Sections</span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">
                    The following sections are set by organization administrators and will automatically appear in your weekly reports:
                  </p>
                  <ul className="list-disc list-inside text-xs font-medium text-[var(--text-primary)] space-y-1 pl-1">
                    {globalSections.map((sec) => (
                      <li key={sec.id}>
                        <span className="font-semibold">{sec.title}</span> ({sec.columns.map((c) => c.label).join(", ")})
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Active Sections Editor */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">
                    {editMode === "global_admin" ? "Global Required Sections" : "Your Custom Personal Sections"}
                  </h3>
                  <span className="text-xs text-[var(--text-muted)]">
                    {activeSections.length} {activeSections.length === 1 ? "section" : "sections"} configured
                  </span>
                </div>

                {activeSections.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[var(--border)] p-6 text-center text-xs text-[var(--text-muted)]">
                    No custom sections configured yet. Add your first section below.
                  </div>
                ) : (
                  activeSections.map((sec, secIdx) => (
                    <div
                      key={sec.id}
                      className="rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500/10 text-[10px] font-bold text-blue-600">
                            {secIdx + 1}
                          </span>
                          <span className="font-bold text-sm text-[var(--text-primary)]">{sec.title}</span>
                          {sec.isRequired && (
                            <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold">
                              Required
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => handleDeleteSection(sec.id)}
                          className="p-1 rounded text-rose-500 hover:bg-rose-500/10 transition-colors"
                          title="Delete Section"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Columns List */}
                      <div className="space-y-2">
                        <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                          Table Columns
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {sec.columns.map((col) => (
                            <div
                              key={col.key}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] text-xs font-medium"
                            >
                              <span>{col.label}</span>
                              <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase px-1 rounded bg-[var(--bg-muted)]">
                                {col.type}
                              </span>
                              {sec.columns.length > 1 && (
                                <button
                                  onClick={() => handleDeleteColumn(sec.id, col.key)}
                                  className="text-rose-500 hover:text-rose-700 ml-0.5"
                                  title="Remove Column"
                                >
                                  ×
                                </button>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Add Column Inline */}
                        <AddColumnInlineForm onAddColumn={(label, type) => handleAddColumn(sec.id, label, type)} />
                      </div>

                      {/* Default Pre-filled Rows Manager */}
                      <div className="space-y-2 border-t border-[var(--border)] pt-2.5">
                        <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                          Default Pre-filled Row Items
                        </p>
                        {sec.defaultRows && sec.defaultRows.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {sec.defaultRows.map((row, rIdx) => {
                              const firstKey = sec.columns[0]?.key || Object.keys(row)[0] || "";
                              const itemLabel = row[firstKey] || `Row ${rIdx + 1}`;
                              return (
                                <div
                                  key={rIdx}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[var(--border)] bg-[var(--bg-muted)]/60 text-xs font-medium text-[var(--text-primary)]"
                                >
                                  <span>{itemLabel}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteDefaultRowItem(sec.id, rIdx)}
                                    className="text-rose-500 hover:text-rose-700 ml-0.5"
                                    title="Remove Default Row"
                                  >
                                    ×
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-[11px] text-[var(--text-muted)] italic">
                            No default rows configured. Rows will start blank in new weekly reports.
                          </p>
                        )}

                        <AddRowItemInlineForm
                          firstColLabel={sec.columns[0]?.label || "Item Label"}
                          onAddRowItem={(itemTitle) => handleAddDefaultRowItem(sec.id, itemTitle)}
                        />
                      </div>
                    </div>
                  ))
                )}

                {/* Add New Section Form */}
                <div className="pt-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. Project Milestones & Expenditure"
                      value={newSectionTitle}
                      onChange={(e) => setNewSectionTitle(e.target.value)}
                      className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={handleAddSection}
                      disabled={!newSectionTitle.trim()}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Section
                    </button>
                  </div>
                </div>
              </div>

              {/* Feedback Message */}
              {message && (
                <div
                  className={`flex items-center gap-2 rounded-xl p-3 text-xs font-semibold border ${
                    message.type === "success"
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {message.type === "success" ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0" />
                  )}
                  <span>{message.text}</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        <footer className="flex shrink-0 items-center justify-between border-t border-[var(--border)] bg-[var(--bg-muted)]/40 px-4 py-3 sm:px-6">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-xs font-semibold text-[var(--text-muted)] hover:bg-[var(--bg-muted)]"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-5 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" />
            {saving ? "Saving Template..." : "Save Template Changes"}
          </button>
        </footer>
      </div>
    </div>
  );
}
