import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Save } from "lucide-react";

export interface RecordField {
  key: string;
  label: string;
  type?: "text" | "email" | "number" | "date" | "textarea" | "select" | "password";
  required?: boolean;
  options?: string[];
  placeholder?: string;
}

interface RecordEditorModalProps {
  title: string;
  fields: RecordField[];
  initial?: Record<string, any> | null;
  bulk?: boolean;
  onClose: () => void;
  onSave: (values: Record<string, any>) => Promise<void>;
}

export const RecordEditorModal: React.FC<RecordEditorModalProps> = ({ title, fields, initial, bulk = false, onClose, onSave }) => {
  const [values, setValues] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    const defaults: Record<string, any> = {};
    fields.forEach((field) => { defaults[field.key] = initial?.[field.key] ?? ""; });
    setValues(defaults);
  }, [fields, initial]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const patch = bulk
        ? Object.fromEntries(Object.entries(values).filter(([, value]) => value !== "" && value !== undefined))
        : values;
      if (bulk && Object.keys(patch).length === 0) throw new Error("Choose at least one field to change.");
      await onSave(patch);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save this record.");
    } finally {
      setSaving(false);
    }
  };

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto" role="dialog" aria-modal="true" aria-label={title}>
      <form onSubmit={submit} className="relative my-auto w-full max-w-sm md:max-w-xl lg:max-w-2xl max-h-[85vh] flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150">
        <header className="flex shrink-0 items-center justify-between border-b border-[var(--border)] bg-[var(--bg-surface)] px-5 py-4">
          <h2 className="text-lg font-bold">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-[var(--text-muted)] hover:bg-[var(--bg-muted)]" aria-label="Close"><X className="h-4 w-4" /></button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {fields.map((field) => {
            const common = {
              value: values[field.key] ?? "",
              onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setValues((prev) => ({ ...prev, [field.key]: field.type === "number" ? (event.target.value === "" ? "" : Number(event.target.value)) : event.target.value })),
              required: !bulk && field.required,
              className: "mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-blue-500",
            };
            return <label key={field.key} className={field.type === "textarea" ? "sm:col-span-2 text-sm font-medium" : "text-sm font-medium"}>
              {field.label}{bulk && <span className="ml-1 text-xs text-[var(--text-muted)]">(leave blank to keep as-is)</span>}
              {field.type === "textarea" ? <textarea {...common} rows={3} placeholder={field.placeholder} /> : field.type === "select" ? <select {...common}><option value="">{bulk ? "No change" : "Select…"}</option>{field.options?.map((option) => <option key={option} value={option}>{option}</option>)}</select> : <input {...common} type={field.type || "text"} placeholder={field.placeholder} />}
            </label>;
          })}
        </div>
        {error && <p role="alert" className="mx-5 mb-3 rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        <footer className="flex shrink-0 justify-end gap-2 border-t border-[var(--border)] p-5">
          <button type="button" onClick={onClose} className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm">Cancel</button>
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"><Save className="h-4 w-4" />{saving ? "Saving…" : "Save"}</button>
        </footer>
      </form>
    </div>,
    document.body
  );
};
