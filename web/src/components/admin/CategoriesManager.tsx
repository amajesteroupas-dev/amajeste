"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export type AdminCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  sortOrder: number;
  parentId: string | null;
  priceAdjustPercent?: number;
  parent?: { id: string; name: string } | null;
  _count: { products: number; children: number };
};

type Props = {
  initialCategories: AdminCategory[];
};

function formatAdjust(n: number | undefined) {
  const v = Number(n) || 0;
  if (v === 0) return "—";
  const sign = v > 0 ? "+" : "";
  return `${sign}${v}%`;
}

export function CategoriesManager({ initialCategories }: Props) {
  const router = useRouter();
  const [categories, setCategories] = useState(initialCategories);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [parentId, setParentId] = useState("");
  const [priceAdjustPercent, setPriceAdjustPercent] = useState("0");
  const [editingId, setEditingId] = useState<string | null>(null);

  const roots = useMemo(
    () =>
      categories
        .filter((c) => !c.parentId)
        .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
    [categories]
  );

  const childrenOf = (id: string) =>
    categories
      .filter((c) => c.parentId === id)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));

  async function reload() {
    const res = await fetch("/api/admin/categories");
    if (!res.ok) return;
    const data = (await res.json()) as AdminCategory[];
    setCategories(data);
    router.refresh();
  }

  function startEdit(cat: AdminCategory) {
    setEditingId(cat.id);
    setName(cat.name);
    setDescription(cat.description || "");
    setParentId(cat.parentId || "");
    setPriceAdjustPercent(String(cat.priceAdjustPercent ?? 0));
    setMsg(`Editando “${cat.name}”`);
  }

  function resetForm() {
    setEditingId(null);
    setName("");
    setDescription("");
    setParentId("");
    setPriceAdjustPercent("0");
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      alert("Informe o nome");
      return;
    }
    const adjust = Number(String(priceAdjustPercent).replace(",", "."));
    if (!Number.isFinite(adjust)) {
      alert("Ajuste de preço inválido");
      return;
    }
    setBusy(true);
    setMsg("");

    const payload = {
      name: trimmed,
      description: description.trim() || null,
      parentId: parentId || null,
      priceAdjustPercent: adjust,
    };

    const res = editingId
      ? await fetch(`/api/admin/categories/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      : await fetch("/api/admin/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      alert(data.error || "Falha ao salvar");
      return;
    }

    setMsg(editingId ? "Categoria atualizada" : "Categoria criada");
    resetForm();
    await reload();
  }

  async function move(cat: AdminCategory, dir: -1 | 1) {
    const siblings = cat.parentId
      ? childrenOf(cat.parentId)
      : roots;
    const idx = siblings.findIndex((c) => c.id === cat.id);
    const swap = siblings[idx + dir];
    if (!swap) return;

    setBusy(true);
    await Promise.all([
      fetch(`/api/admin/categories/${cat.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sortOrder: swap.sortOrder }),
      }),
      fetch(`/api/admin/categories/${swap.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sortOrder: cat.sortOrder }),
      }),
    ]);
    setBusy(false);
    await reload();
  }

  async function remove(cat: AdminCategory) {
    if (
      !confirm(
        `Excluir a categoria “${cat.name}”?${
          cat._count.children
            ? "\n(Remova as subcategorias primeiro.)"
            : ""
        }`
      )
    ) {
      return;
    }
    setBusy(true);
    const res = await fetch(`/api/admin/categories/${cat.id}`, {
      method: "DELETE",
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      alert(data.error || "Não foi possível excluir");
      return;
    }
    if (editingId === cat.id) resetForm();
    setMsg(`“${cat.name}” excluída`);
    await reload();
  }

  function Row({
    cat,
    depth,
  }: {
    cat: AdminCategory;
    depth: number;
  }) {
    const kids = childrenOf(cat.id);
    const adjust = Number(cat.priceAdjustPercent) || 0;
    return (
      <>
        <tr
          className={
            editingId === cat.id ? "bg-[#f7f1ea]" : "border-b border-[#f0ebe4]"
          }
        >
          <td className="px-3 py-3">
            <div
              className="flex items-center gap-2"
              style={{ paddingLeft: depth * 1.25 + "rem" }}
            >
              {depth > 0 && (
                <span className="text-[#b5a99c] text-xs">↳</span>
              )}
              <div>
                <p className="font-medium text-[#2a2420]">{cat.name}</p>
                <p className="text-xs text-[#6b5f56]">/{cat.slug}</p>
              </div>
            </div>
          </td>
          <td className="px-3 py-3 text-[#6b5f56] text-sm">
            {cat.parent?.name || "—"}
          </td>
          <td
            className={`px-3 py-3 tabular-nums text-sm ${
              adjust < 0
                ? "text-emerald-800"
                : adjust > 0
                  ? "text-amber-800"
                  : "text-[#6b5f56]"
            }`}
          >
            {formatAdjust(adjust)}
          </td>
          <td className="px-3 py-3 tabular-nums text-sm">
            {cat._count.products}
          </td>
          <td className="px-3 py-3 tabular-nums text-sm">
            {cat._count.children}
          </td>
          <td className="px-3 py-3 whitespace-nowrap">
            <div className="flex flex-wrap items-center gap-2 justify-end text-sm">
              <button
                type="button"
                className="text-[#6b5f56] hover:text-[#2a2420]"
                disabled={busy}
                onClick={() => move(cat, -1)}
                title="Subir"
              >
                ↑
              </button>
              <button
                type="button"
                className="text-[#6b5f56] hover:text-[#2a2420]"
                disabled={busy}
                onClick={() => move(cat, 1)}
                title="Descer"
              >
                ↓
              </button>
              <button
                type="button"
                className="text-rose-dark hover:underline"
                disabled={busy}
                onClick={() => startEdit(cat)}
              >
                Editar
              </button>
              {!cat.parentId && (
                <button
                  type="button"
                  className="text-[#6b5f56] hover:underline"
                  disabled={busy}
                  onClick={() => {
                    resetForm();
                    setParentId(cat.id);
                    setMsg(`Nova subcategoria de “${cat.name}”`);
                  }}
                >
                  + Sub
                </button>
              )}
              <button
                type="button"
                className="text-red-700/80 hover:underline"
                disabled={busy}
                onClick={() => remove(cat)}
              >
                Excluir
              </button>
            </div>
          </td>
        </tr>
        {kids.map((child) => (
          <Row key={child.id} cat={child} depth={depth + 1} />
        ))}
      </>
    );
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={onSubmit}
        className="border border-black/10 bg-white p-5 md:p-6 grid gap-4 md:grid-cols-2"
      >
        <div className="md:col-span-2">
          <h2 className="text-lg font-medium text-[#2a2420]">
            {editingId ? "Editar categoria" : "Nova categoria"}
          </h2>
          {msg && <p className="text-sm text-[#6b5f56] mt-1">{msg}</p>}
        </div>

        <label className="block text-xs uppercase tracking-wider text-muted">
          Nome
          <input
            className="input mt-1"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Conjuntos"
            required
          />
        </label>

        <label className="block text-xs uppercase tracking-wider text-muted">
          Categoria pai (opcional)
          <select
            className="input mt-1"
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
          >
            <option value="">Nenhuma — categoria principal</option>
            {roots
              .filter((c) => c.id !== editingId)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>
        </label>

        <label className="block text-xs uppercase tracking-wider text-muted">
          Ajuste de preço (%)
          <input
            className="input mt-1"
            type="number"
            step="0.1"
            min={-90}
            max={200}
            value={priceAdjustPercent}
            onChange={(e) => setPriceAdjustPercent(e.target.value)}
            placeholder="0"
          />
          <span className="mt-1 block normal-case tracking-normal text-[11px] text-[#6b5f56] font-normal">
            Negativo reduz o preço (ex: −10 = 10% off). Positivo aumenta.
            Aplicado antes da promoção do site — útil em OUTLET.
          </span>
        </label>

        <label className="block text-xs uppercase tracking-wider text-muted md:col-span-2">
          Descrição (opcional)
          <textarea
            className="input mt-1 min-h-[72px]"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Texto curto para a página da categoria"
          />
        </label>

        <div className="md:col-span-2 flex flex-wrap gap-3">
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy
              ? "Salvando…"
              : editingId
                ? "Salvar alterações"
                : parentId
                  ? "Criar subcategoria"
                  : "Criar categoria"}
          </button>
          {editingId && (
            <button
              type="button"
              className="btn btn-outline"
              disabled={busy}
              onClick={resetForm}
            >
              Cancelar edição
            </button>
          )}
        </div>
      </form>

      <div className="admin-panel-card border border-black/10 bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#e5dfd6] text-left text-xs uppercase tracking-wider text-[#6b5f56]">
              <th className="px-3 py-3">Categoria</th>
              <th className="px-3 py-3">Pai</th>
              <th className="px-3 py-3">Ajuste</th>
              <th className="px-3 py-3">Produtos</th>
              <th className="px-3 py-3">Subs</th>
              <th className="px-3 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {roots.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-10 text-center text-[#6b5f56]"
                >
                  Nenhuma categoria ainda. Crie a primeira acima.
                </td>
              </tr>
            )}
            {roots.map((cat) => (
              <Row key={cat.id} cat={cat} depth={0} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
