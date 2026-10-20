"use client";

import React from "react";
import { Archive, CheckSquare, Pencil, Plus, RotateCcw, Square, Trash2, UserRoundCog } from "lucide-react";

export function RowActions({ onEdit, onArchive, onRestore, canEdit, archived = false }: { onEdit?: () => void; onArchive?: () => void; onRestore?: () => void; canEdit: boolean; archived?: boolean }) {
  return <div className="inline-flex items-center justify-end gap-1">
    {canEdit && onEdit && <button type="button" onClick={onEdit} title="Edit" aria-label="Edit" className="rounded-md p-1.5 text-[var(--text-muted)] hover:bg-blue-500/10 hover:text-blue-500"><Pencil className="h-4 w-4" /></button>}
    {archived ? (onRestore && <button type="button" onClick={onRestore} title="Restore" aria-label="Restore" className="rounded-md p-1.5 text-emerald-600 hover:bg-emerald-500/10"><RotateCcw className="h-4 w-4" /></button>) : (onArchive && <button type="button" onClick={onArchive} title="Archive" aria-label="Archive" className="rounded-md p-1.5 text-rose-500 hover:bg-rose-500/10"><Archive className="h-4 w-4" /></button>)}
  </div>;
}

export function BulkActionBar({ count, onSelectAll, onClear, onCreate, onEdit, onArchive, onRestore, showArchived, onToggleArchived, canCreate, canEdit, canArchive, canRestore }: { count: number; onSelectAll: () => void; onClear: () => void; onCreate?: () => void; onEdit?: () => void; onArchive?: () => void; onRestore?: () => void; showArchived: boolean; onToggleArchived: () => void; canCreate: boolean; canEdit: boolean; canArchive: boolean; canRestore: boolean }) {
  return <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-3 text-[var(--text-primary)]">
    {canCreate && onCreate && <button type="button" onClick={onCreate} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white"><Plus className="h-4 w-4" />Create</button>}
    <button type="button" onClick={onToggleArchived} className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs">{showArchived ? "Show active" : "Show archived"}</button>
    <span className="flex-1 text-xs text-[var(--text-muted)]">{count ? `${count} selected` : "Select records for batch actions"}</span>
    <button type="button" onClick={onSelectAll} className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs">Select filtered</button>
    {count > 0 && <button type="button" onClick={onClear} className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs">Clear</button>}
    {count > 0 && canEdit && onEdit && <button type="button" onClick={onEdit} className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-2 text-xs"><Pencil className="h-3.5 w-3.5" />Bulk edit</button>}
    {count > 0 && !showArchived && canArchive && onArchive && <button type="button" onClick={onArchive} className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white"><Trash2 className="h-3.5 w-3.5" />Archive selected</button>}
    {count > 0 && showArchived && canRestore && onRestore && <button type="button" onClick={onRestore} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white"><RotateCcw className="h-3.5 w-3.5" />Restore selected</button>}
  </div>;
}

export function SelectionCheckbox({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return <button type="button" role="checkbox" aria-checked={checked} aria-label={label} onClick={onChange} className="inline-flex rounded p-1 text-[var(--text-muted)] hover:text-blue-600">{checked ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}</button>;
}

export function CardRecordControls({ checked, onSelect, label, canEdit, onEdit, onArchive, onRestore, archived, onManageAccess }: {
  checked: boolean; onSelect: () => void; label: string; canEdit: boolean; onEdit?: () => void;
  onArchive?: () => void; onRestore?: () => void; archived?: boolean; onManageAccess?: () => void;
}) {
  return <div className="flex items-center justify-between gap-2" onClick={(event) => event.stopPropagation()}>
    <SelectionCheckbox checked={checked} onChange={onSelect} label={label} />
    <div className="flex items-center gap-1">
      <RowActions canEdit={canEdit} onEdit={onEdit} onArchive={onArchive} onRestore={onRestore} archived={archived} />
      {onManageAccess && <button type="button" onClick={onManageAccess} title="Manage access" aria-label="Manage access" className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] px-2 py-1 text-[10px] font-semibold text-blue-600 hover:bg-blue-500/10"><UserRoundCog className="h-3.5 w-3.5" /><span>Access</span></button>}
    </div>
  </div>;
}
