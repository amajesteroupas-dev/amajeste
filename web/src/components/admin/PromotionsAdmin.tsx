"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import type { PromoPaymentScope, SitePromotion } from "@/lib/promotion-pricing";
import { promoScheduleStatus, scopeLabel } from "@/lib/promotion-pricing";

type PromoRow = SitePromotion & { currentlyActive: boolean };

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(local: string): string | null {
  if (!local.trim()) return null;
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function ManualSide() {
  return (
    <aside className="border border-black/10 bg-[#faf7f3] p-5 space-y-5 text-sm text-[#3a322c] lg:sticky lg:top-6 h-fit">
      <div>
        <h2 className="text-base font-semibold text-[#2a2420]">Como usar</h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-[#5c534c]">
          Cadastre quantas promoções quiser. Cada uma pode valer para{" "}
          <strong>todo o site</strong>, só <strong>Pix</strong> ou só{" "}
          <strong>cartão</strong>. Nas promoções que aceitam cartão, escolha
          quantas parcelas sem juros serão permitidas.
        </p>
      </div>

      <div className="space-y-3">
        <h3 className="text-xs uppercase tracking-[0.12em] text-[#95752c]">
          Período
        </h3>
        <p className="text-[13px] leading-relaxed text-[#5c534c]">
          Defina <strong>início</strong> e <strong>fim</strong>. Antes do
          início, a loja mostra preços normais. Sem início = vale já; sem fim =
          não expira sozinha.
        </p>
      </div>

      <div className="space-y-3">
        <h3 className="text-xs uppercase tracking-[0.12em] text-[#95752c]">
          Exemplos
        </h3>
        <ul className="space-y-2 text-[13px] text-[#5c534c] leading-snug">
          <li>
            <strong>15% no site em 1x</strong> — escopo Todo o site + parcelas
            = 1x à vista.
          </li>
          <li>
            <strong>15% no cartão em 1x</strong> — escopo Cartão + parcelas =
            1x.
          </li>
          <li>
            <strong>10% em qualquer pagamento</strong> — escopo Todo o site +
            parcelas = 2x (ou o que preferir).
          </li>
        </ul>
      </div>

      <div className="space-y-3">
        <h3 className="text-xs uppercase tracking-[0.12em] text-[#95752c]">
          No checkout
        </h3>
        <p className="text-[13px] leading-relaxed text-[#5c534c]">
          O sistema aplica a promoção que combina com a forma de pagamento
          escolhida. Se duas forem válidas, vale a de{" "}
          <strong>maior percentual</strong>.
        </p>
        <p className="text-[13px] leading-relaxed text-[#5c534c]">
          No Pix, o desconto de 5% habitual{" "}
          <strong>não soma</strong> com uma promoção de Pix ou de site — já fica
          incluso.
        </p>
      </div>

      <div className="space-y-3">
        <h3 className="text-xs uppercase tracking-[0.12em] text-[#95752c]">
          Ativar / desativar
        </h3>
        <p className="text-[13px] leading-relaxed text-[#5c534c]">
          Use o interruptor de cada promoção. Desativar guarda o cadastro, mas
          tira da loja. Excluir apaga de vez.
        </p>
      </div>

      <div className="space-y-2 border-t border-black/10 pt-4">
        <h3 className="text-xs uppercase tracking-[0.12em] text-[#95752c]">
          Textos na loja
        </h3>
        <p className="text-[13px] leading-relaxed text-[#5c534c]">
          Frases dos cards e da página do produto:{" "}
          <Link
            href="/admin/produtos/textos"
            className="underline underline-offset-2 text-[#2a2420]"
          >
            Produtos → Textos de pagamento
          </Link>
          .
        </p>
      </div>
    </aside>
  );
}

const emptyForm = {
  label: "",
  percent: 15,
  scope: "all" as PromoPaymentScope,
  cardInstallmentsMax: 1,
  startsLocal: "",
  endsLocal: "",
  enabled: true,
};

export function PromotionsAdmin() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [items, setItems] = useState<PromoRow[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError("");
    const res = await fetch("/api/admin/settings/promotion");
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Erro ao carregar");
      return;
    }
    setItems(Array.isArray(data.items) ? data.items : []);
  }

  useEffect(() => {
    load();
  }, []);

  function startEdit(p: PromoRow) {
    setEditingId(p.id);
    setForm({
      label: p.label,
      percent: p.percent,
      scope: p.scope,
      cardInstallmentsMax: p.cardInstallmentsMax ?? 1,
      startsLocal: toLocalInput(p.startsAt ?? null),
      endsLocal: toLocalInput(p.endsAt),
      enabled: p.enabled,
    });
    setMsg("");
    setError("");
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    setError("");
    const payload = {
      label: form.label.trim() || undefined,
      percent: form.percent,
      scope: form.scope,
      cardInstallmentsMax:
        form.scope === "all" || form.scope === "card"
          ? form.cardInstallmentsMax
          : null,
      startsAt: fromLocalInput(form.startsLocal),
      endsAt: fromLocalInput(form.endsLocal),
      enabled: form.enabled,
    };

    const res = await fetch("/api/admin/settings/promotion", {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editingId ? { id: editingId, ...payload } : payload),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Erro ao salvar");
      return;
    }
    setMsg(editingId ? "Promoção atualizada." : "Nova promoção cadastrada.");
    setEditingId(null);
    setForm(emptyForm);
    await load();
  }

  async function toggleEnabled(p: PromoRow) {
    setError("");
    const res = await fetch("/api/admin/settings/promotion", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: p.id,
        enabled: !p.enabled,
        onlyToggle: true,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Erro ao atualizar");
      return;
    }
    setMsg(
      !p.enabled
        ? `“${p.label}” ativada.`
        : `“${p.label}” desativada (continua cadastrada).`
    );
    await load();
  }

  async function removePromo(p: PromoRow) {
    if (
      !confirm(
        `Excluir a promoção “${p.label}”? Esta ação não pode ser desfeita.`
      )
    ) {
      return;
    }
    const res = await fetch(
      `/api/admin/settings/promotion?id=${encodeURIComponent(p.id)}`,
      { method: "DELETE" }
    );
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Erro ao excluir");
      return;
    }
    if (editingId === p.id) cancelEdit();
    setMsg("Promoção excluída.");
    await load();
  }

  if (loading) {
    return <p className="text-sm text-muted">Carregando…</p>;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)] items-start">
      <div className="space-y-6">
        <section className="border border-black/10 bg-white p-5 space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-lg font-medium text-[#2a2420]">
              Promoções cadastradas
            </h2>
            <span className="text-xs text-muted">
              {items.filter((i) => i.currentlyActive).length} ativa(s) na loja
            </span>
          </div>

          {items.length === 0 ? (
            <p className="text-sm text-muted">
              Nenhuma promoção ainda. Cadastre a primeira abaixo.
            </p>
          ) : (
            <ul className="divide-y divide-black/8 border border-black/8">
              {items.map((p) => {
                const status = promoScheduleStatus(p);
                return (
                  <li
                    key={p.id}
                    className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 text-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-[#2a2420] truncate">
                        {p.label}{" "}
                        <span className="text-[#a85f64]">−{p.percent}%</span>
                      </p>
                      <p className="text-[12px] text-[#7a7168] mt-0.5">
                        {scopeLabel(p.scope)}
                        {(p.scope === "all" || p.scope === "card") &&
                        p.cardInstallmentsMax
                          ? p.cardInstallmentsMax === 1
                            ? " · 1x à vista"
                            : ` · ${p.cardInstallmentsMax}x sem juros`
                          : ""}
                        {p.startsAt
                          ? ` · de ${new Date(p.startsAt).toLocaleString("pt-BR")}`
                          : " · sem data início"}
                        {p.endsAt
                          ? ` · até ${new Date(p.endsAt).toLocaleString("pt-BR")}`
                          : " · sem data fim"}
                      </p>
                      <p
                        className={`text-[11px] mt-1 ${
                          status === "live"
                            ? "text-emerald-800"
                            : status === "scheduled"
                              ? "text-sky-800"
                              : "text-amber-900"
                        }`}
                      >
                        {status === "live"
                          ? "Válida e aplicada na loja"
                          : status === "scheduled"
                            ? `Agendada — começa em ${
                                p.startsAt
                                  ? new Date(p.startsAt).toLocaleString("pt-BR")
                                  : "—"
                              }`
                            : status === "expired"
                              ? "Expirada (fora do prazo)"
                              : "Desativada"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      <label className="inline-flex items-center gap-1.5 text-xs font-medium">
                        <input
                          type="checkbox"
                          checked={p.enabled}
                          onChange={() => toggleEnabled(p)}
                        />
                        {p.enabled ? "Ativa" : "Off"}
                      </label>
                      <button
                        type="button"
                        className="btn btn-outline !py-1.5 !px-2.5 text-xs"
                        onClick={() => startEdit(p)}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline !py-1.5 !px-2.5 text-xs text-rose-700 border-rose-200"
                        onClick={() => removePromo(p)}
                      >
                        Excluir
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <form
          onSubmit={onSubmit}
          className="border border-black/10 bg-white p-5 space-y-4"
        >
          <h2 className="text-lg font-medium text-[#2a2420]">
            {editingId ? "Editar promoção" : "Cadastrar nova promoção"}
          </h2>

          <label className="block text-sm font-medium text-[#2a2420]">
            Nome
            <span className="block text-[12px] font-normal text-[#7a7168] mt-0.5">
              Aparece no checkout (ex.: 20% OFF no Pix).
            </span>
            <input
              type="text"
              className="input mt-1.5"
              value={form.label}
              onChange={(e) =>
                setForm((f) => ({ ...f, label: e.target.value }))
              }
              placeholder="20% OFF no Pix"
            />
          </label>

          <label className="block text-sm font-medium text-[#2a2420]">
            Percentual
            <input
              type="number"
              min={1}
              max={90}
              step={1}
              className="input mt-1.5"
              value={form.percent}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  percent: Number(e.target.value) || 0,
                }))
              }
              required
            />
          </label>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-[#2a2420]">
              Onde vale
            </legend>
            {(
              [
                ["all", "Todo o site (Pix, cartão, etc.)"],
                ["pix", "Somente Pix"],
                ["card", "Somente cartão"],
              ] as const
            ).map(([value, label]) => (
              <label
                key={value}
                className="flex items-center gap-2 text-sm cursor-pointer"
              >
                <input
                  type="radio"
                  name="promo-scope"
                  checked={form.scope === value}
                  onChange={() => setForm((f) => ({ ...f, scope: value }))}
                />
                {label}
              </label>
            ))}
          </fieldset>

          {form.scope === "all" || form.scope === "card" ? (
            <label className="block text-sm font-medium text-[#2a2420]">
              Parcelas sem juros durante a promoção
              <span className="block text-[12px] font-normal text-[#7a7168] mt-0.5">
                A loja mostra essa quantidade na página do produto e divide
                automaticamente o <strong>preço promocional</strong>. Use{" "}
                <strong>1</strong> para à vista no cartão (ex.: “1x à vista”).
              </span>
              <select
                className="input mt-1.5"
                value={form.cardInstallmentsMax}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    cardInstallmentsMax: Math.max(
                      1,
                      Math.min(12, Number(e.target.value) || 1)
                    ),
                  }))
                }
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n === 1
                      ? "1x à vista (sem parcelamento)"
                      : `${n}x sem juros`}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label className="block text-sm font-medium text-[#2a2420]">
            Válida a partir de
            <span className="block text-[12px] font-normal text-[#7a7168] mt-0.5">
              Antes dessa data a loja mostra preço normal. Em branco = começa já.
            </span>
            <input
              type="datetime-local"
              className="input mt-1.5"
              value={form.startsLocal}
              onChange={(e) =>
                setForm((f) => ({ ...f, startsLocal: e.target.value }))
              }
            />
          </label>

          <label className="block text-sm font-medium text-[#2a2420]">
            Válida até
            <span className="block text-[12px] font-normal text-[#7a7168] mt-0.5">
              Deixe em branco para não expirar automaticamente.
            </span>
            <input
              type="datetime-local"
              className="input mt-1.5"
              value={form.endsLocal}
              onChange={(e) =>
                setForm((f) => ({ ...f, endsLocal: e.target.value }))
              }
            />
          </label>

          <label className="inline-flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) =>
                setForm((f) => ({ ...f, enabled: e.target.checked }))
              }
            />
            Já cadastrar como ativa
          </label>

          {error ? <p className="text-sm text-rose-700">{error}</p> : null}
          {msg ? <p className="text-sm text-emerald-800">{msg}</p> : null}

          <div className="flex flex-wrap gap-2">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving
                ? "Salvando…"
                : editingId
                  ? "Salvar alterações"
                  : "Cadastrar promoção"}
            </button>
            {editingId ? (
              <button
                type="button"
                className="btn btn-outline"
                onClick={cancelEdit}
                disabled={saving}
              >
                Cancelar edição
              </button>
            ) : null}
          </div>
        </form>
      </div>

      <ManualSide />
    </div>
  );
}
