"use client";

import { useEffect, useState, type KeyboardEvent } from "react";
import { Pencil } from "lucide-react";

type Props = {
  value: string;
  placeholder?: string;
  disabled?: boolean;
  onSave: (next: string) => Promise<void> | void;
  className?: string;
};

/** Campo inline para renomear nome/título de mídia no admin. */
export function AssetNameEditor({
  value,
  placeholder = "Nome do arquivo",
  disabled,
  onSave,
  className = "",
}: Props) {
  const [draft, setDraft] = useState(value);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  async function commit() {
    const next = draft.trim();
    const prev = (value || "").trim();
    if (next === prev) {
      setEditing(false);
      setDraft(value);
      return;
    }
    setSaving(true);
    try {
      await onSave(next);
      setEditing(false);
    } catch {
      setDraft(value);
    } finally {
      setSaving(false);
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      void commit();
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setDraft(value);
      setEditing(false);
    }
  }

  if (!editing) {
    return (
      <div className={`flex items-start gap-1.5 min-w-0 ${className}`}>
        <p className="text-sm font-medium text-[#2a2420] line-clamp-2 flex-1 min-w-0">
          {value.trim() || placeholder}
        </p>
        <button
          type="button"
          className="shrink-0 p-1 text-muted hover:text-ink hover:bg-black/5 disabled:opacity-40"
          disabled={disabled || saving}
          title="Renomear"
          aria-label="Renomear"
          onClick={(e) => {
            e.stopPropagation();
            setEditing(true);
          }}
        >
          <Pencil size={13} />
        </button>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col gap-1 min-w-0 ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      <input
        className="input !py-1.5 text-sm w-full"
        value={draft}
        autoFocus
        disabled={disabled || saving}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => void commit()}
      />
      <p className="text-[10px] text-muted">Enter salva · Esc cancela</p>
    </div>
  );
}
