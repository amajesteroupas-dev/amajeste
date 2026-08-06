"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatBRL } from "@/lib/utils";
import {
  FITNESS_HOOKS,
  type DayChecklist,
  type FunnelStats,
  type OfferProductOption,
  type OrganicDayPlan,
  type PreAdScore,
  type SalesCopyPack,
  type SalesOffer,
  type TodayTask,
} from "@/lib/sales-hub";
import type { TrafficHealth } from "@/lib/traffic-attribution";
import { trafficHealthCopy } from "@/lib/traffic-attribution";

export function SalesHojeTab({
  tasks,
  checklist,
  health,
}: {
  tasks: TodayTask[];
  checklist: DayChecklist;
  health: TrafficHealth;
}) {
  const router = useRouter();
  const [done, setDone] = useState(checklist.done);
  const healthCopy = trafficHealthCopy(health);
  const completed = tasks.filter((t) => done[t.id]).length;

  async function toggle(id: TodayTask["id"]) {
    const next = !done[id];
    setDone((d) => ({ ...d, [id]: next }));
    await fetch("/api/admin/traffic/checklist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, done: next }),
    });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="border border-black/8 bg-white p-4">
        <p className="text-[10px] uppercase tracking-wider text-[#8a7468]">
          Seu dia de vendas
        </p>
        <p className="text-lg font-semibold text-[#2a2420] mt-1">
          {completed}/{tasks.length} feitos · {healthCopy.title}
        </p>
        <p className="text-sm text-[#5c534c] mt-1">{healthCopy.detail}</p>
      </div>
      <ul className="space-y-2">
        {tasks.map((t) => (
          <li
            key={t.id}
            className={`border p-4 flex flex-wrap gap-3 items-start ${
              done[t.id]
                ? "border-emerald-700/20 bg-emerald-50/50"
                : "border-black/8 bg-white"
            }`}
          >
            <button
              type="button"
              onClick={() => toggle(t.id)}
              className={`mt-0.5 h-5 w-5 border shrink-0 ${
                done[t.id]
                  ? "bg-emerald-800 border-emerald-800"
                  : "border-black/30 bg-white"
              }`}
              aria-label={done[t.id] ? "Desmarcar" : "Marcar feito"}
            />
            <div className="flex-1 min-w-[200px]">
              <p
                className={`font-medium text-[#2a2420] ${
                  done[t.id] ? "line-through opacity-70" : ""
                }`}
              >
                {t.title}
              </p>
              <p className="text-xs text-[#5c534c] mt-1">{t.detail}</p>
            </div>
            <Link href={t.href} className="text-xs underline text-[#2a2420]">
              {t.hrefLabel}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SalesFunilTab({
  week,
  month,
}: {
  week: FunnelStats;
  month: FunnelStats;
}) {
  return (
    <div className="space-y-4">
      <div className="border border-[#c4a35a]/40 bg-[#faf6f0] p-4">
        <p className="text-sm font-medium text-[#2a2420]">O que fazer agora</p>
        <p className="text-sm text-[#5c534c] mt-1">{week.actionHint}</p>
        <p className="text-xs text-[#8a7468] mt-2">
          De cada 100 visitantes (7 dias),{" "}
          <strong>{week.conversionPer100.toFixed(1)}</strong> compram.
        </p>
      </div>
      <FunnelBlock title="Últimos 7 dias" f={week} />
      <FunnelBlock title="Mês atual" f={month} />
    </div>
  );
}

function FunnelBlock({ title, f }: { title: string; f: FunnelStats }) {
  const steps = [
    { label: "Visitantes únicos", value: String(f.uniqueVisitors) },
    { label: "Views em produtos (catálogo)", value: String(f.productPageViews) },
    { label: "Pedidos pagos", value: String(f.paidOrders) },
    { label: "Pedidos com UTM (tráfego)", value: String(f.attributedOrders) },
    { label: "Receita", value: formatBRL(f.revenue) },
    {
      label: "Ticket médio",
      value: f.avgTicket ? formatBRL(f.avgTicket) : "—",
    },
    {
      label: "Custo por pedido",
      value: f.costPerOrder != null ? formatBRL(f.costPerOrder) : "—",
    },
  ];
  return (
    <div className="border border-black/8 bg-white p-4">
      <h3 className="font-semibold text-[#2a2420] mb-3">{title}</h3>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((s) => (
          <div key={s.label} className="border border-black/5 p-3">
            <p className="text-[10px] uppercase tracking-wider text-[#8a7468]">
              {s.label}
            </p>
            <p className="text-lg font-semibold tabular-nums mt-1">{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SalesOfertaTab({
  offer: initialOffer,
  products,
  product: initialProduct,
  copy,
  siteUrl,
}: {
  offer: SalesOffer;
  products: OfferProductOption[];
  product: OfferProductOption | null;
  copy: SalesCopyPack;
  siteUrl: string;
}) {
  const router = useRouter();
  const [offer, setOffer] = useState(initialOffer);
  const [product, setProduct] = useState(initialProduct);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState<"meta" | "ig" | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch("/api/admin/traffic/offer", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(offer),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(data.error || "Falha ao salvar");
        return;
      }
      setOffer(data.offer);
      setProduct(data.product);
      setMsg("Oferta salva. Links e textos atualizados ao recarregar.");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  function copyText(text: string) {
    void navigator.clipboard.writeText(text);
    setMsg("Copiado!");
  }

  async function createMetaCampaign() {
    setBusy("meta");
    setMsg("");
    try {
      const res = await fetch("/api/admin/traffic/create-meta-campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dailyBudget: offer.dailyBudget }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(data.error || "Não foi possível criar a campanha");
        return;
      }
      setMsg(
        `Campanha Meta criada (pausada). ID ${data.campaignId}. Abra o Ads Manager para ativar.`
      );
      if (data.adsManagerUrl) window.open(data.adsManagerUrl, "_blank");
    } finally {
      setBusy(null);
    }
  }

  async function publishIg() {
    setBusy("ig");
    setMsg("");
    try {
      const res = await fetch("/api/admin/traffic/instagram-publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(data.error || "Falha no autopost Instagram");
        return;
      }
      setMsg(
        data.permalink
          ? `Publicado no Instagram: ${data.permalink}`
          : "Publicado no Instagram."
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <form
        onSubmit={save}
        className="border border-black/8 bg-white p-4 grid gap-3 sm:grid-cols-2"
      >
        <h3 className="sm:col-span-2 font-semibold text-[#2a2420]">
          Escolha 1 produto da semana
        </h3>
        <label className="text-xs text-[#5c534c] sm:col-span-2">
          Produto (com estoque)
          <select
            className="input mt-1"
            value={offer.productId || ""}
            onChange={(e) => {
              const id = e.target.value || null;
              const p = products.find((x) => x.id === id) || null;
              setOffer((o) => ({
                ...o,
                productId: id,
                headline: o.headline || (p ? p.name : ""),
                campaignSlug: p
                  ? `oferta-${p.slug}`.slice(0, 60)
                  : o.campaignSlug,
              }));
              setProduct(p);
            }}
          >
            <option value="">Selecione…</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · estoque {p.stock} · {p.viewCount} views
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-[#5c534c]">
          Headline / gancho
          <input
            className="input mt-1"
            value={offer.headline}
            onChange={(e) =>
              setOffer((o) => ({ ...o, headline: e.target.value }))
            }
            placeholder="Ex.: Conjunto que segura o treino"
          />
        </label>
        <label className="text-xs text-[#5c534c]">
          Orçamento diário sugerido (R$)
          <input
            className="input mt-1"
            value={offer.dailyBudget}
            onChange={(e) =>
              setOffer((o) => ({
                ...o,
                dailyBudget: Number(e.target.value) || 0,
              }))
            }
          />
        </label>
        <label className="text-xs text-[#5c534c]">
          Nome da campanha (UTM)
          <input
            className="input mt-1"
            value={offer.campaignSlug}
            onChange={(e) =>
              setOffer((o) => ({ ...o, campaignSlug: e.target.value }))
            }
          />
        </label>
        <label className="text-xs text-[#5c534c] sm:col-span-2">
          Notas
          <textarea
            className="input mt-1 min-h-[60px]"
            value={offer.notes}
            onChange={(e) => setOffer((o) => ({ ...o, notes: e.target.value }))}
          />
        </label>
        <div className="sm:col-span-2 flex flex-wrap gap-2 items-center">
          <button type="submit" className="btn" disabled={saving}>
            {saving ? "Salvando…" : "Salvar oferta"}
          </button>
          {product ? (
            <Link
              href={`/produto/${product.slug}`}
              className="text-xs underline"
              target="_blank"
            >
              Ver página na loja
            </Link>
          ) : null}
          {msg ? <span className="text-xs text-emerald-900">{msg}</span> : null}
        </div>
      </form>

      {product ? (
        <>
          <div className="border border-black/8 bg-white p-4 space-y-2">
            <h3 className="font-semibold text-[#2a2420]">Links com UTM</h3>
            <p className="text-xs text-[#5c534c]">
              Cole estes links nos anúncios. O pagamento vai marcar a origem
              automaticamente.
            </p>
            {copy.links.map((l) => (
              <div
                key={l.platform}
                className="flex flex-wrap gap-2 items-start border-t border-black/5 pt-2"
              >
                <div className="flex-1 min-w-[200px]">
                  <p className="text-xs font-medium">{l.platform}</p>
                  <p className="text-[11px] break-all text-[#5c534c]">{l.url}</p>
                </div>
                <button
                  type="button"
                  className="text-xs underline"
                  onClick={() => copyText(l.url)}
                >
                  Copiar
                </button>
              </div>
            ))}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {(
              [
                ["Anúncio curto", copy.adShort],
                ["Legenda Reel", copy.reel],
                ["Roteiro Story", copy.story],
                ["WhatsApp", copy.whatsapp],
              ] as const
            ).map(([title, text]) => (
              <div key={title} className="border border-black/8 bg-white p-4">
                <div className="flex justify-between gap-2 mb-2">
                  <h4 className="text-sm font-semibold">{title}</h4>
                  <button
                    type="button"
                    className="text-xs underline"
                    onClick={() => copyText(text)}
                  >
                    Copiar
                  </button>
                </div>
                <p className="text-xs text-[#5c534c] whitespace-pre-wrap">
                  {text}
                </p>
              </div>
            ))}
          </div>
          <div className="border border-black/8 bg-white p-4 flex flex-wrap gap-3 items-center">
            <p className="text-sm text-[#5c534c] flex-1 min-w-[200px]">
              Ações automáticas (requer tokens nas Integrações Ads)
            </p>
            <button
              type="button"
              className="btn"
              disabled={busy !== null}
              onClick={createMetaCampaign}
            >
              {busy === "meta" ? "Criando…" : "Criar campanha Meta (pausada)"}
            </button>
            <button
              type="button"
              className="btn"
              disabled={busy !== null}
              onClick={publishIg}
            >
              {busy === "ig" ? "Publicando…" : "Autopost Instagram"}
            </button>
          </div>
        </>
      ) : (
        <p className="text-sm text-[#5c534c]">
          Selecione um produto e salve para gerar links e textos. Site: {siteUrl}
        </p>
      )}
    </div>
  );
}

export function SalesOrganicoTab({
  week,
  productName,
}: {
  week: OrganicDayPlan[];
  productName: string | null;
}) {
  return (
    <div className="space-y-4">
      <div className="border border-black/8 bg-white p-4 flex flex-wrap gap-3">
        <p className="text-sm text-[#5c534c] flex-1 min-w-[200px]">
          Calendário da semana
          {productName ? ` · foco: ${productName}` : " · defina a oferta primeiro"}
          . Orgânico testa o criativo; pago escala o que funciona.
        </p>
        <Link href="/admin/stories" className="text-xs underline">
          Stories do dia
        </Link>
        <Link href="/admin/banco-videos" className="text-xs underline">
          Banco de vídeos
        </Link>
        <Link href="/admin/email-marketing" className="text-xs underline">
          E-mail marketing
        </Link>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {week.map((d) => (
          <article key={d.day} className="border border-black/8 bg-white p-4">
            <p className="text-[10px] uppercase tracking-wider text-[#8a7468]">
              {d.day} · {d.kind}
            </p>
            <h3 className="font-semibold text-[#2a2420] mt-1">{d.title}</h3>
            <p className="text-sm text-[#5c534c] mt-2">{d.caption}</p>
            <button
              type="button"
              className="text-xs underline mt-3"
              onClick={() => void navigator.clipboard.writeText(d.cta)}
            >
              Copiar link CTA
            </button>
          </article>
        ))}
      </div>
      <div className="border border-black/8 bg-white p-4">
        <h3 className="font-semibold text-[#2a2420] mb-2">Ganchos prontos</h3>
        <ul className="space-y-2 text-sm text-[#5c534c]">
          {FITNESS_HOOKS.map((h) => (
            <li key={h} className="flex gap-2 items-start">
              <span className="flex-1">{h}</span>
              <button
                type="button"
                className="text-xs underline shrink-0"
                onClick={() => void navigator.clipboard.writeText(h)}
              >
                Copiar
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function SalesPreTab({ score }: { score: PreAdScore }) {
  return (
    <div className="space-y-4">
      <div
        className={`border p-5 ${
          score.ready
            ? "border-emerald-700/30 bg-emerald-50 text-emerald-950"
            : "border-rose-700/30 bg-rose-50 text-rose-950"
        }`}
      >
        <p className="text-[10px] uppercase tracking-wider opacity-70">
          Score pré-anúncio
        </p>
        <p className="text-3xl font-semibold mt-1 tabular-nums">{score.score}/100</p>
        <p className="text-sm mt-2 font-medium">
          {score.ready ? "Pode anunciar" : "Não anuncie ainda"}
        </p>
        <p className="text-sm mt-1 opacity-90">{score.message}</p>
      </div>
      <ul className="space-y-2">
        {score.checks.map((c) => (
          <li
            key={c.id}
            className={`border p-4 flex flex-wrap gap-3 ${
              c.ok
                ? "border-emerald-700/20 bg-white"
                : "border-rose-700/25 bg-rose-50/40"
            }`}
          >
            <span
              className={`text-xs font-semibold uppercase ${
                c.ok ? "text-emerald-800" : "text-rose-800"
              }`}
            >
              {c.ok ? "Ok" : "Falta"}
            </span>
            <div className="flex-1 min-w-[180px]">
              <p className="font-medium text-[#2a2420]">{c.label}</p>
              <p className="text-xs text-[#5c534c] mt-1">{c.detail}</p>
            </div>
            {c.href ? (
              <Link href={c.href} className="text-xs underline">
                Abrir
              </Link>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
