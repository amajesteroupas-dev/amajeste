"use client";

import { useMemo, useState } from "react";
import {
  emptySizeGuideDraft,
  type SizeGuide,
  type SizeGuideColumn,
  type SizeGuideRow,
} from "@/lib/size-guides";

type Props = {
  initialGuides: SizeGuide[];
  /** Tabela selecionada no produto (só realça). */
  selectedId?: string;
  onGuidesChange?: (guides: SizeGuide[]) => void;
  /** Se true, compacto para embutir no formulário do produto. */
  embedded?: boolean;
};

function blankValues(columns: SizeGuideColumn[]): Record<string, string> {
  return Object.fromEntries(columns.map((c) => [c.key, ""]));
}

export function SizeGuidesManager({
  initialGuides,
  selectedId,
  onGuidesChange,
  embedded,
}: Props) {
  const [guides, setGuides] = useState<SizeGuide[]>(() =>
    initialGuides.length ? initialGuides : [emptySizeGuideDraft([])]
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const editing = useMemo(
    () => guides.find((g) => g.id === editingId) || null,
    [guides, editingId]
  );

  function commitLocal(next: SizeGuide[]) {
    setGuides(next);
    onGuidesChange?.(next);
  }

  async function persist(next: SizeGuide[]) {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/admin/settings/size-guides", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guides: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(data.error || "Falha ao salvar tabelas.");
        return null;
      }
      commitLocal(data.guides as SizeGuide[]);
      setMsg("Tabelas salvas.");
      return data.guides as SizeGuide[];
    } finally {
      setBusy(false);
    }
  }

  async function addGuide() {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/admin/settings/size-guides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(data.error || "Falha ao criar tabela.");
        return;
      }
      const list = data.guides as SizeGuide[];
      commitLocal(list);
      setEditingId(data.createdId || list[list.length - 1]?.id || null);
      setMsg("Nova tabela criada. Preencha as medidas e salve.");
    } finally {
      setBusy(false);
    }
  }

  async function removeGuide(id: string) {
    if (guides.length <= 1) {
      setMsg("Mantenha pelo menos uma tabela.");
      return;
    }
    const guide = guides.find((g) => g.id === id);
    if (
      !confirm(
        `Remover a tabela “${guide?.adminLabel || id}”? Produtos que usavam ela passam a usar a primeira tabela da lista.`
      )
    ) {
      return;
    }
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/admin/settings/size-guides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove", id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(data.error || "Falha ao remover.");
        return;
      }
      const list = data.guides as SizeGuide[];
      commitLocal(list);
      if (editingId === id) setEditingId(null);
      setMsg("Tabela removida.");
    } finally {
      setBusy(false);
    }
  }

  function updateEditing(patch: Partial<SizeGuide>) {
    if (!editing) return;
    commitLocal(
      guides.map((g) => (g.id === editing.id ? { ...g, ...patch } : g))
    );
  }

  function setColumnsFromLabels(text: string) {
    if (!editing) return;
    const labels = text
      .split(/[,;/|]+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 8);
    if (!labels.length) return;
    const columns: SizeGuideColumn[] = labels.map((label, i) => {
      const key =
        label
          .normalize("NFD")
          .replace(/\p{M}/gu, "")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "")
          .slice(0, 12) || `c${i + 1}`;
      return { key, label: label.toUpperCase() };
    });
    const rows: SizeGuideRow[] = editing.rows.map((r) => ({
      label: r.label,
      values: Object.fromEntries(
        columns.map((c) => [c.key, r.values[c.key] || ""])
      ),
    }));
    updateEditing({ columns, rows });
  }

  function setRowLabel(index: number, label: string) {
    if (!editing) return;
    const rows = editing.rows.map((r, i) =>
      i === index ? { ...r, label: label.toUpperCase() } : r
    );
    updateEditing({ rows });
  }

  function setCell(rowIndex: number, colKey: string, value: string) {
    if (!editing) return;
    const rows = editing.rows.map((r, i) =>
      i === rowIndex
        ? { ...r, values: { ...r.values, [colKey]: value.toUpperCase() } }
        : r
    );
    updateEditing({ rows });
  }

  function addRow() {
    if (!editing) return;
    updateEditing({
      rows: [
        ...editing.rows,
        { label: "NOVA MEDIDA", values: blankValues(editing.columns) },
      ].slice(0, 12),
    });
  }

  function removeRow(index: number) {
    if (!editing || editing.rows.length <= 1) return;
    updateEditing({ rows: editing.rows.filter((_, i) => i !== index) });
  }

  return (
    <div
      className={`space-y-3 normal-case tracking-normal ${
        embedded ? "" : "admin-panel-card border border-black/10 bg-white p-5"
      }`}
    >
      {!embedded ? (
        <div>
          <h2
            className="text-xl text-[#2a2420]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Tabelas de medidas
          </h2>
          <p className="text-sm text-[#6b5f56] mt-1">
            Crie, edite ou remova tabelas. Depois escolha qual usar em cada
            produto.
          </p>
        </div>
      ) : (
        <p className="text-[11px] text-muted">
          Adicione ou remova tabelas abaixo. As mudanças valem para todos os
          produtos.
        </p>
      )}

      <div className="space-y-2">
        {guides.map((g) => (
          <div
            key={g.id}
            className={`flex flex-wrap items-center gap-2 border px-3 py-2 text-sm ${
              selectedId === g.id
                ? "border-[#c2a45b] bg-[#faf7f3]"
                : "border-black/10 bg-white"
            }`}
          >
            <div className="min-w-0 flex-1">
              <p className="font-medium text-[#2a2420] truncate">
                {g.adminLabel}
              </p>
              <p className="text-[11px] text-muted">
                id: {g.id} · {g.columns.map((c) => c.label).join(" / ")} ·{" "}
                {g.rows.length} medidas
              </p>
            </div>
            <button
              type="button"
              className="text-xs underline text-[#5c4336]"
              disabled={busy}
              onClick={() =>
                setEditingId((cur) => (cur === g.id ? null : g.id))
              }
            >
              {editingId === g.id ? "Fechar" : "Editar"}
            </button>
            <button
              type="button"
              className="text-xs underline text-red-800"
              disabled={busy || guides.length <= 1}
              onClick={() => removeGuide(g.id)}
            >
              Remover
            </button>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn btn-outline text-xs"
          disabled={busy || guides.length >= 30}
          onClick={addGuide}
        >
          + Adicionar nova tabela
        </button>
        {editing ? (
          <button
            type="button"
            className="btn btn-primary text-xs"
            disabled={busy}
            onClick={() => persist(guides)}
          >
            {busy ? "Salvando…" : "Salvar alterações desta edição"}
          </button>
        ) : null}
      </div>

      {editing ? (
        <div className="border border-black/10 bg-[#faf7f3] p-3 space-y-3">
          <label className="block text-xs text-[#5c4336]">
            Nome da tabela (aparece no admin)
            <input
              className="input mt-1 text-sm"
              value={editing.adminLabel}
              maxLength={80}
              onChange={(e) => updateEditing({ adminLabel: e.target.value })}
            />
          </label>

          <label className="block text-xs text-[#5c4336]">
            Tamanhos (colunas), separados por vírgula — ex: P, M, G
            <input
              className="input mt-1 text-sm"
              defaultValue={editing.columns.map((c) => c.label).join(", ")}
              key={`cols-${editing.id}-${editing.columns.map((c) => c.key).join("-")}`}
              onBlur={(e) => setColumnsFromLabels(e.target.value)}
            />
          </label>

          <label className="block text-xs text-[#5c4336]">
            Foto da tabela (URL opcional)
            <input
              className="input mt-1 text-sm"
              value={editing.imageUrl || ""}
              placeholder="/brand/size-guide-….png ou /uploads/…"
              onChange={(e) => updateEditing({ imageUrl: e.target.value })}
            />
          </label>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[280px] text-xs border-collapse bg-white">
              <thead>
                <tr>
                  <th className="border border-[#e0d4c8] p-1.5 text-left">
                    Medida
                  </th>
                  {editing.columns.map((c) => (
                    <th
                      key={c.key}
                      className="border border-[#e0d4c8] p-1.5 text-center"
                    >
                      {c.label}
                    </th>
                  ))}
                  <th className="border border-[#e0d4c8] p-1.5 w-8" />
                </tr>
              </thead>
              <tbody>
                {editing.rows.map((row, ri) => (
                  <tr key={`${editing.id}-row-${ri}`}>
                    <td className="border border-[#e0d4c8] p-1">
                      <input
                        className="input !py-1 text-xs w-full min-w-[5rem]"
                        value={row.label}
                        onChange={(e) => setRowLabel(ri, e.target.value)}
                      />
                    </td>
                    {editing.columns.map((c) => (
                      <td key={c.key} className="border border-[#e0d4c8] p-1">
                        <input
                          className="input !py-1 text-xs w-full min-w-[4rem] text-center"
                          value={row.values[c.key] || ""}
                          onChange={(e) => setCell(ri, c.key, e.target.value)}
                        />
                      </td>
                    ))}
                    <td className="border border-[#e0d4c8] p-1 text-center">
                      <button
                        type="button"
                        className="text-red-800"
                        disabled={editing.rows.length <= 1}
                        onClick={() => removeRow(ri)}
                        aria-label="Remover linha"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            className="text-xs underline text-[#5c4336]"
            onClick={addRow}
          >
            + Linha de medida
          </button>

          <label className="block text-xs text-[#5c4336]">
            Texto da modelo (uma linha por item)
            <textarea
              className="input mt-1 text-sm min-h-20"
              value={(editing.modelLines || []).join("\n")}
              onChange={(e) =>
                updateEditing({
                  modelLines: e.target.value
                    .split("\n")
                    .map((l) => l.trim())
                    .filter(Boolean)
                    .slice(0, 8),
                })
              }
            />
          </label>

          <label className="block text-xs text-[#5c4336]">
            Nota adicional
            <input
              className="input mt-1 text-sm"
              value={editing.note || ""}
              onChange={(e) => updateEditing({ note: e.target.value })}
            />
          </label>
        </div>
      ) : null}

      {msg ? (
        <p
          className={`text-xs ${
            /falha|erro|não|imposs/i.test(msg)
              ? "text-red-800"
              : "text-emerald-800"
          }`}
        >
          {msg}
        </p>
      ) : null}
    </div>
  );
}
