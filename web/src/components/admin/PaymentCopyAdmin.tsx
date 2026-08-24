"use client";

import { FormEvent, useEffect, useState, type ReactNode } from "react";
import {
  DEFAULT_PAYMENT_COPY,
  type PaymentCopySettings,
} from "@/lib/payment-copy";

type FieldPreviewKind =
  | "card"
  | "cardPromo"
  | "pixHeadline"
  | "pixDetail"
  | "pixHeadlinePromo"
  | "pixDetailPromo"
  | "footer";

const FIELDS: {
  key: keyof PaymentCopySettings;
  label: string;
  where: string;
  example: string;
  rows?: number;
  preview: FieldPreviewKind;
}[] = [
  {
    key: "productCardLine",
    label: "1. Texto nos cards",
    where:
      "Abaixo do preço na vitrine (home, categorias, busca). Sem promoção do site ligada.",
    example: "{pixPercent}% de desconto no Pix · Não acumulável · {price}",
    rows: 2,
    preview: "card",
  },
  {
    key: "pixHeadline",
    label: "2. Título do Pix (página do produto)",
    where:
      "Caixa bege na página do produto — linha de destaque do desconto Pix.",
    example: "{pixPercent}% de desconto comprando no Pix",
    preview: "pixHeadline",
  },
  {
    key: "pixDetail",
    label: "3. Detalhe do Pix (página do produto)",
    where:
      "Linha menor na mesma caixa. Preço cheio e valor no Pix aparecem em volta.",
    example: "Não acumulável com outras promoções",
    preview: "pixDetail",
  },
  {
    key: "productCardLinePromo",
    label: "4. Texto nos cards (promoção ligada)",
    where:
      "Substitui o texto 1 quando a Promoção do site estiver ativa. Vazio = some a linha.",
    example:
      "{percent}% OFF no site · no Pix o desconto de {pixPercent}% já está incluso · {price}",
    rows: 2,
    preview: "cardPromo",
  },
  {
    key: "pixHeadlinePromo",
    label: "5. Título Pix (promoção ligada)",
    where: "Substitui o texto 2 com a promoção do site ativa.",
    example: "{percent}% de desconto em todo o site",
    preview: "pixHeadlinePromo",
  },
  {
    key: "pixDetailPromo",
    label: "6. Detalhe Pix (promoção ligada)",
    where: "Substitui o texto 3 com a promoção do site ativa.",
    example:
      "No Pix o desconto de {pixPercent}% já está incluso · Não acumulável",
    preview: "pixDetailPromo",
  },
  {
    key: "footerPaymentLine",
    label: "7. Texto do rodapé",
    where: "Rodapé da loja, bloco “Meios de pagamento”.",
    example:
      "Ganhe 5% de desconto no Pix. Não acumulável com outras promoções.",
    rows: 3,
    preview: "footer",
  },
];

function Highlight({
  children,
  active,
}: {
  children: ReactNode;
  active?: boolean;
}) {
  if (!active) return <>{children}</>;
  return (
    <span className="relative inline-block rounded-sm ring-2 ring-[#a85f64] ring-offset-1 bg-[#a85f64]/10 px-0.5">
      {children}
      <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#a85f64] text-[9px] font-bold text-white">
        ✎
      </span>
    </span>
  );
}

/** Miniatura do card da vitrine, com a linha editável marcada. */
function CardPreview({
  promo,
  highlightLine,
}: {
  promo?: boolean;
  highlightLine?: boolean;
}) {
  return (
    <div className="w-full max-w-[200px] border border-black/10 bg-white p-2.5 shadow-sm">
      <div className="aspect-[3/4] w-full bg-gradient-to-b from-[#e8e0d6] to-[#d4c8bc] flex items-end justify-center pb-3">
        <span className="text-[9px] uppercase tracking-wider text-[#8a7468]/80">
          Foto do produto
        </span>
      </div>
      <p className="mt-2 text-[9px] font-medium uppercase tracking-[0.12em] text-[#2a2420]">
        Conjunto exemplo
      </p>
      <div className="mt-1 flex items-center gap-1.5">
        <span className="text-[11px] font-semibold text-[#1a1a1a]">
          {promo ? "R$ 127,42" : "R$ 149,90"}
        </span>
        {promo ? (
          <>
            <span className="text-[9px] text-[#8a7468] line-through">
              R$ 149,90
            </span>
            <span className="text-[8px] font-semibold text-[#a85f64]">−15%</span>
          </>
        ) : null}
      </div>
      <div className="mt-1.5 flex gap-1">
        <span className="h-2.5 w-2.5 rounded-full bg-[#1a1a1a] ring-1 ring-black/30" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#7a1f2e]" />
      </div>
      <p className="mt-1.5 text-[8px] leading-snug text-[#6b5f56] min-h-[2rem]">
        <Highlight active={highlightLine}>
          {promo
            ? "15% OFF no site · no Pix o 5% já está incluso · R$ 127,42"
            : "5% de desconto no Pix · Não acumulável · R$ 142,40"}
        </Highlight>
      </p>
      <div className="mt-1.5 h-5 w-full bg-[#2a2420] text-[8px] font-medium uppercase tracking-wider text-white flex items-center justify-center">
        Ver opções
      </div>
      <p className="mt-1.5 text-[8px] text-[#95752c] font-medium">
        ← Você edita a frase marcada
      </p>
    </div>
  );
}

/** Miniatura da caixa Pix na página do produto. */
function ProductPixPreview({
  promo,
  highlightHeadline,
  highlightDetail,
}: {
  promo?: boolean;
  highlightHeadline?: boolean;
  highlightDetail?: boolean;
}) {
  return (
    <div className="w-full max-w-[240px] space-y-1.5">
      <p className="text-[9px] text-[#8a7468]">Página do produto → caixa bege</p>
      <div className="border border-black/10 bg-[#faf8f5] px-2.5 py-2 space-y-1">
        <p className="text-[9px] text-[#8a7468]">R$ 149,90</p>
        <p className="text-[10px] font-semibold text-[#2a2420] leading-snug">
          <Highlight active={highlightHeadline}>
            {promo
              ? "15% de desconto em todo o site"
              : "5% de desconto comprando no Pix"}
          </Highlight>
        </p>
        <p className="text-[9px] text-[#6b5f56] leading-snug">
          <Highlight active={highlightDetail}>
            {promo
              ? "No Pix o desconto de 5% já está incluso · Não acumulável"
              : "Não acumulável com outras promoções"}
          </Highlight>
        </p>
        <p className="text-[11px] font-semibold text-[#2a2420]">
          {promo ? "R$ 127,42" : "R$ 142,40"}{" "}
          <span className="text-[8px] font-medium uppercase text-[#5a7a4a]">
            no Pix
          </span>
        </p>
        <p className="text-[8px] underline text-[#2a2420]/60">
          Ver meios de pagamento
        </p>
      </div>
      <p className="text-[8px] text-[#95752c] font-medium">
        ← Área marcada = este campo
      </p>
    </div>
  );
}

/** Miniatura do rodapé. */
function FooterPreview({ highlight }: { highlight?: boolean }) {
  return (
    <div className="w-full max-w-[240px] space-y-1.5">
      <p className="text-[9px] text-[#8a7468]">Rodapé da loja</p>
      <div className="border border-black/10 bg-[#2a2420] px-2.5 py-2.5 text-white">
        <p className="text-[9px] font-medium uppercase tracking-wider text-[#c4a574]">
          Meios de pagamento
        </p>
        <p className="mt-1.5 text-[8px] leading-snug text-white/80">
          <Highlight active={highlight}>
            Ganhe 5% de desconto no Pix. Não acumulável com outras promoções.
          </Highlight>
        </p>
        <div className="mt-2 flex gap-1 opacity-70">
          <span className="h-3 w-5 rounded-[2px] bg-white/20" />
          <span className="h-3 w-5 rounded-[2px] bg-white/20" />
          <span className="h-3 w-5 rounded-[2px] bg-white/20" />
        </div>
      </div>
      <p className="text-[8px] text-[#95752c] font-medium">
        ← Você edita este parágrafo
      </p>
    </div>
  );
}

function FieldPreview({ kind }: { kind: FieldPreviewKind }) {
  switch (kind) {
    case "card":
      return <CardPreview highlightLine />;
    case "cardPromo":
      return <CardPreview promo highlightLine />;
    case "pixHeadline":
      return <ProductPixPreview highlightHeadline />;
    case "pixDetail":
      return <ProductPixPreview highlightDetail />;
    case "pixHeadlinePromo":
      return <ProductPixPreview promo highlightHeadline />;
    case "pixDetailPromo":
      return <ProductPixPreview promo highlightDetail />;
    case "footer":
      return <FooterPreview highlight />;
    default:
      return null;
  }
}

function ManualSide() {
  return (
    <aside className="border border-black/10 bg-[#faf7f3] p-5 space-y-5 text-sm text-[#3a322c] lg:sticky lg:top-6 h-fit">
      <div>
        <h2 className="text-base font-semibold text-[#2a2420]">Como usar</h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-[#5c534c]">
          Em cada campo há uma <strong>foto de exemplo</strong> com a área
          editável marcada em rosa. Edite à esquerda, confira o desenho e clique
          em <strong>Salvar textos</strong> — vale para todos os produtos.
        </p>
      </div>

      <div className="space-y-3">
        <h3 className="text-xs uppercase tracking-[0.12em] text-[#95752c]">
          Dois modos
        </h3>
        <ul className="space-y-2 text-[13px] text-[#5c534c] leading-snug">
          <li>
            <strong>Campos 1–3</strong> — loja sem promoção do site (só o 5%
            Pix).
          </li>
          <li>
            <strong>Campos 4–6</strong> — quando a{" "}
            <strong>Promoção do site</strong> estiver ligada (menu Promoções).
          </li>
          <li>
            <strong>Campo 7</strong> — rodapé, sempre.
          </li>
        </ul>
      </div>

      <div className="space-y-3">
        <h3 className="text-xs uppercase tracking-[0.12em] text-[#95752c]">
          Códigos automáticos
        </h3>
        <ul className="space-y-2 text-[13px]">
          <li className="flex gap-2">
            <code className="shrink-0 bg-white border border-black/10 px-1.5 py-0.5 text-xs">
              {"{pixPercent}"}
            </code>
            <span className="text-[#5c534c]">% do Pix (ex.: 5)</span>
          </li>
          <li className="flex gap-2">
            <code className="shrink-0 bg-white border border-black/10 px-1.5 py-0.5 text-xs">
              {"{percent}"}
            </code>
            <span className="text-[#5c534c]">% da promoção do site</span>
          </li>
          <li className="flex gap-2">
            <code className="shrink-0 bg-white border border-black/10 px-1.5 py-0.5 text-xs">
              {"{price}"}
            </code>
            <span className="text-[#5c534c]">valor no Pix (ex.: R$ 142,40)</span>
          </li>
          <li className="flex gap-2">
            <code className="shrink-0 bg-white border border-black/10 px-1.5 py-0.5 text-xs">
              {"{listPrice}"}
            </code>
            <span className="text-[#5c534c]">preço cheio (ex.: R$ 149,90)</span>
          </li>
        </ul>
      </div>

      <div className="space-y-2 border-t border-black/10 pt-4">
        <p className="text-[13px] leading-relaxed text-[#5c534c]">
          Errou? <strong>Restaurar padrão</strong> e depois{" "}
          <strong>Salvar textos</strong>.
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
        className="border border-black/10 bg-white p-5 space-y-6"
      >
        <p className="text-sm text-[#5c534c]">
          Cada campo tem uma <strong>miniatura</strong> mostrando onde o texto
          aparece na loja (área marcada em rosa).
        </p>

        {FIELDS.map((f) => (
          <div
            key={f.key}
            className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(180px,220px)] items-start border-t border-black/8 pt-5 first:border-t-0 first:pt-0"
          >
            <label className="block space-y-1.5 min-w-0">
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
            <div className="flex justify-center sm:justify-end bg-[#faf7f3]/80 border border-black/6 p-3 rounded-sm">
              <FieldPreview kind={f.preview} />
            </div>
          </div>
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
