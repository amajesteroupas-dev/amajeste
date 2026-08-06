"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  DEFAULT_PAYMENT_COPY,
  type PaymentCopySettings,
} from "@/lib/payment-copy";

const FIELDS: {
  key: keyof PaymentCopySettings;
  label: string;
  where: string;
  example: string;
  rows?: number;
}[] = [
  {
    key: "productCardLine",
    label: "1. Texto nos cards",
    where: "Abaixo do preço em cada produto da vitrine / categorias.",
    example: "Parcele em 2x sem juros ou ganhe 5% de desconto no pix.",
    rows: 2,
  },
  {
    key: "pixHeadline",
    label: "2. Título do Pix (página do produto)",
    where: "Caixa de pagamento na página do produto, em destaque.",
    example: "{percent}% de desconto pagando com Pix",
  },
  {
    key: "pixDetail",
    label: "3. Detalhe do Pix (página do produto)",
    where: "Linha menor logo abaixo do título do Pix.",
    example: "{price} no Pix · Não acumulável com outras promoções",
  },
  {
    key: "productCardLinePromo",
    label: "4. Texto nos cards (promoção ligada)",
    where:
      "Substitui o texto 1 quando a promoção do site estiver ativa. Deixe vazio para não mostrar nenhuma linha no card. Não use só {percent} — vira um número solto (ex.: 15) e duplica o −15% do preço.",
    example:
      "{percent}% OFF no site · no Pix o desconto de {pixPercent}% já está incluso.",
    rows: 2,
  },
  {
    key: "pixHeadlinePromo",
    label: "5. Título Pix (promoção ligada)",
    where: "Substitui o texto 2 quando a promoção do site estiver ativa.",
    example: "{percent}% de desconto em todo o site",
  },
  {
    key: "pixDetailPromo",
    label: "6. Detalhe Pix (promoção ligada)",
    where: "Substitui o texto 3 quando a promoção do site estiver ativa.",
    example: "{price} · no Pix o desconto de {pixPercent}% já está incluso",
  },
  {
    key: "footerPaymentLine",
    label: "7. Texto do rodapé",
    where: "Rodapé do site, bloco “Meios de pagamento”.",
    example:
      "Parcele em 2x sem juros ou ganhe 5% de desconto no pix. Pagamentos processados com segurança via Mercado Pago.",
    rows: 3,
  },
];

/** Aviso: não use só {percent} no texto 4 — vira um "15" solto no card. */
function ManualSide() {
  return (
    <aside className="border border-black/10 bg-[#faf7f3] p-5 space-y-5 text-sm text-[#3a322c] lg:sticky lg:top-6 h-fit">
      <div>
        <h2 className="text-base font-semibold text-[#2a2420]">
          Como usar
        </h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-[#5c534c]">
          Você edita o texto à esquerda e clica em <strong>Salvar textos</strong>.
          A mudança vale para <strong>todos os produtos</strong> de uma vez —
          não precisa abrir produto por produto.
        </p>
      </div>

      <div className="space-y-3">
        <h3 className="text-xs uppercase tracking-[0.12em] text-[#95752c]">
          Onde cada texto aparece
        </h3>
        <ol className="space-y-2.5 text-[13px] leading-snug list-decimal list-inside text-[#4a433c]">
          <li>
            <strong>Cards</strong> — listagem da home, categorias e busca.
          </li>
          <li>
            <strong>Título + detalhe Pix</strong> — página do produto (caixa
            bege de pagamento).
          </li>
          <li>
            <strong>Rodapé</strong> — em todas as páginas da loja.
          </li>
        </ol>
      </div>

      <div className="space-y-3">
        <h3 className="text-xs uppercase tracking-[0.12em] text-[#95752c]">
          Campos com “promoção ligada”
        </h3>
        <p className="text-[13px] leading-relaxed text-[#5c534c]">
          Os campos 4, 5 e 6 só aparecem na loja quando a{" "}
          <strong>Promoção do site</strong> estiver ativa (menu Promoções).
          Enquanto a promoção estiver desligada, a loja usa os campos 1, 2 e 3.
          O campo 4 pode ficar <strong>vazio</strong> — assim o card não mostra
          linha nenhuma embaixo das cores.
        </p>
      </div>

      <div className="space-y-3">
        <h3 className="text-xs uppercase tracking-[0.12em] text-[#95752c]">
          Códigos automáticos (opcional)
        </h3>
        <p className="text-[13px] leading-relaxed text-[#5c534c]">
          Se quiser que o sistema complete o número sozinho, escreva o código
          exatamente assim (com as chaves):
        </p>
        <ul className="space-y-2 text-[13px]">
          <li className="flex gap-2">
            <code className="shrink-0 bg-white border border-black/10 px-1.5 py-0.5 text-xs">
              {"{percent}"}
            </code>
            <span className="text-[#5c534c]">
              vira o % (ex.: 5 ou 20 da promoção)
            </span>
          </li>
          <li className="flex gap-2">
            <code className="shrink-0 bg-white border border-black/10 px-1.5 py-0.5 text-xs">
              {"{pixPercent}"}
            </code>
            <span className="text-[#5c534c]">
              % do Pix incluso (em geral 5)
            </span>
          </li>
          <li className="flex gap-2">
            <code className="shrink-0 bg-white border border-black/10 px-1.5 py-0.5 text-xs">
              {"{price}"}
            </code>
            <span className="text-[#5c534c]">
              preço com desconto (ex.: R$&nbsp;159,20)
            </span>
          </li>
        </ul>
        <div className="rounded border border-black/10 bg-white p-3 text-[12px] leading-relaxed text-[#5c534c]">
          <p className="font-medium text-[#2a2420] mb-1">Exemplo</p>
          <p>
            Você escreve:{" "}
            <code className="bg-[#faf7f3] px-1">
              {"{percent}% de desconto pagando com Pix"}
            </code>
          </p>
          <p className="mt-1">
            A cliente vê:{" "}
            <strong>5% de desconto pagando com Pix</strong>
          </p>
        </div>
        <p className="text-[12px] text-[#7a7168] leading-relaxed">
          Não é obrigatório usar códigos. Pode escrever o texto fixo, por
          exemplo: “5% de desconto pagando com Pix”.
        </p>
      </div>

      <div className="space-y-2 border-t border-black/10 pt-4">
        <h3 className="text-xs uppercase tracking-[0.12em] text-[#95752c]">
          Dica rápida
        </h3>
        <p className="text-[13px] leading-relaxed text-[#5c534c]">
          Errou? Clique em <strong>Restaurar padrão</strong> e depois em{" "}
          <strong>Salvar textos</strong> para voltar aos textos originais da
          loja.
        </p>
      </div>
    </aside>
  );
}

export function PaymentCopyAdmin() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState<PaymentCopySettings>({
    ...DEFAULT_PAYMENT_COPY,
  });

  async function load() {
    setLoading(true);
    setError("");
    const res = await fetch("/api/admin/settings/payment-copy");
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Erro ao carregar");
      return;
    }
    setForm({ ...DEFAULT_PAYMENT_COPY, ...data });
  }

  useEffect(() => {
    load();
  }, []);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    setError("");
    const res = await fetch("/api/admin/settings/payment-copy", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Erro ao salvar");
      return;
    }
    setForm({ ...DEFAULT_PAYMENT_COPY, ...data });
    setMsg("Textos salvos. Já valem para todos os produtos.");
  }

  function resetDefaults() {
    setForm({ ...DEFAULT_PAYMENT_COPY });
    setMsg("Padrão carregado — clique em Salvar textos para aplicar na loja.");
  }

  if (loading) {
    return <p className="text-sm text-muted">Carregando…</p>;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)] items-start">
      <form
        onSubmit={onSave}
        className="border border-black/10 bg-white p-5 space-y-5"
      >
        <p className="text-sm text-[#5c534c]">
          Edite os campos abaixo. O guia à direita explica cada um.
        </p>

        {FIELDS.map((f) => (
          <label key={f.key} className="block space-y-1.5">
            <span className="block text-sm font-medium text-[#2a2420]">
              {f.label}
            </span>
            <span className="block text-[12px] text-[#7a7168] leading-snug">
              {f.where}
            </span>
            {f.rows && f.rows > 1 ? (
              <textarea
                className="input mt-0.5 text-sm"
                rows={f.rows}
                value={form[f.key]}
                placeholder={f.example}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, [f.key]: e.target.value }))
                }
              />
            ) : (
              <input
                type="text"
                className="input mt-0.5 text-sm"
                value={form[f.key]}
                placeholder={f.example}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, [f.key]: e.target.value }))
                }
              />
            )}
          </label>
        ))}

        {error ? <p className="text-sm text-rose-700">{error}</p> : null}
        {msg ? <p className="text-sm text-emerald-800">{msg}</p> : null}

        <div className="flex flex-wrap gap-2 pt-1">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Salvando…" : "Salvar textos"}
          </button>
          <button
            type="button"
            className="btn btn-outline"
            onClick={resetDefaults}
            disabled={saving}
          >
            Restaurar padrão
          </button>
        </div>
      </form>

      <ManualSide />
    </div>
  );
}
