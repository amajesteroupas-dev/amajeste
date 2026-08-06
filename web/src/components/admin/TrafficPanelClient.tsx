"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatBRL } from "@/lib/utils";
import {
  TRAFFIC_GUIDES,
  TRAFFIC_PLATFORMS,
  TRAFFIC_PLAYBOOK,
} from "@/lib/traffic-guides";
import {
  trafficHealthCopy,
  type TrafficHealth,
} from "@/lib/traffic-attribution";
import type { TrafficIntegrations } from "@/lib/traffic-ads-settings";
import {
  SalesFunilTab,
  SalesHojeTab,
  SalesOfertaTab,
  SalesOrganicoTab,
  SalesPreTab,
} from "@/components/admin/SalesHubTabs";
import type {
  DayChecklist,
  FunnelStats,
  OfferProductOption,
  OrganicDayPlan,
  PreAdScore,
  SalesCopyPack,
  SalesOffer,
  TodayTask,
} from "@/lib/sales-hub";

export type CampaignRow = {
  id: string;
  name: string;
  platform: string;
  kind: string;
  objective: string | null;
  spend: number;
  revenue: number;
  clicks: number;
  leads: number;
  orders: number;
  notes: string | null;
  startedAt: string;
  endedAt: string | null;
  active: boolean;
};

type SourceRow = {
  source: string;
  label: string;
  orders: number;
  revenue: number;
};

type SiteStats = {
  visitsToday: number;
  visitsWeek: number;
  uniqueIpsToday: number;
  uniqueIpsWeek: number;
  mobileToday: number;
  desktopToday: number;
  productViews: number;
  salesMonth: number;
  ordersMonth: number;
  attributedOrdersWeek: number;
  attributedRevenueWeek: number;
};

type Tab =
  | "hoje"
  | "funil"
  | "oferta"
  | "organico-cal"
  | "pre"
  | "resultados"
  | "pago"
  | "organico"
  | "campanhas"
  | "rotina"
  | "pixel"
  | "abandonados";

type HubProps = {
  todayTasks: TodayTask[];
  checklist: DayChecklist;
  funnelWeek: FunnelStats;
  funnelMonth: FunnelStats;
  offer: SalesOffer;
  offerProducts: OfferProductOption[];
  offerProduct: OfferProductOption | null;
  offerCopy: SalesCopyPack;
  organicWeek: OrganicDayPlan[];
  preScore: PreAdScore;
};

type Props = {
  stats: SiteStats;
  campaigns: CampaignRow[];
  bySourceWeek: SourceRow[];
  bySourceMonth: SourceRow[];
  health: TrafficHealth;
  siteUrl: string;
  integrations: TrafficIntegrations;
  hub: HubProps;
};

export function TrafficPanelClient({
  stats,
  campaigns: initial,
  bySourceWeek,
  bySourceMonth,
  health,
  siteUrl,
  integrations: initialIntegrations,
  hub,
}: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("hoje");
  const [campaigns, setCampaigns] = useState(initial);
  const [guideId, setGuideId] = useState(TRAFFIC_GUIDES[0]?.id || "basics");
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");
  const [integrations, setIntegrations] = useState(initialIntegrations);
  const [formMsg, setFormMsg] = useState("");
  const [metaForm, setMetaForm] = useState({
    pixelId: initialIntegrations.meta.pixelId,
    adAccountId: initialIntegrations.meta.adAccountId,
    pageId: initialIntegrations.meta.pageId || "",
    capiToken: "",
    adsToken: "",
  });
  const [googleForm, setGoogleForm] = useState({
    customerId: initialIntegrations.google.customerId,
    developerToken: "",
    clientId: "",
    clientSecret: "",
    refreshToken: "",
  });
  const [tiktokForm, setTiktokForm] = useState({
    pixelId: initialIntegrations.tiktok.pixelId,
    accessToken: "",
  });
  const [pinterestForm, setPinterestForm] = useState({
    adAccountId: initialIntegrations.pinterest.adAccountId,
    accessToken: "",
  });
  const [igForm, setIgForm] = useState({
    userId: initialIntegrations.instagram?.userId || "",
    accessToken: "",
  });
  const [abandonItems, setAbandonItems] = useState<
    {
      id: string;
      email: string | null;
      phone: string | null;
      itemCount: number;
      subtotal: number;
      status: string;
      lastSeenAt: string;
    }[]
  >([]);
  const [abandonMsg, setAbandonMsg] = useState("");
  const [form, setForm] = useState({
    name: "",
    platform: "meta",
    kind: "paid",
    objective: "Vendas no site",
    spend: "",
    revenue: "",
    clicks: "",
    leads: "",
    orders: "",
    notes: "",
  });

  const healthCopy = trafficHealthCopy(health);
  const exampleLink = `${siteUrl}/?utm_source=meta&utm_campaign=conjuntos&utm_medium=paid`;

  const paidGuides = TRAFFIC_GUIDES.filter(
    (g) => g.kind === "paid" || g.kind === "basics"
  );
  const organicGuides = TRAFFIC_GUIDES.filter(
    (g) => g.kind === "organic" || g.kind === "basics"
  );
  const guidesForTab = tab === "organico" ? organicGuides : paidGuides;
  const activeGuide =
    guidesForTab.find((g) => g.id === guideId) || guidesForTab[0];

  const totals = useMemo(() => {
    const spend = campaigns.reduce((s, c) => s + (c.spend || 0), 0);
    const revenue = campaigns.reduce((s, c) => s + (c.revenue || 0), 0);
    const orders = campaigns.reduce((s, c) => s + (c.orders || 0), 0);
    const roas = spend > 0 ? revenue / spend : 0;
    return { spend, revenue, orders, roas };
  }, [campaigns]);

  async function createCampaign(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/traffic/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          platform: form.platform,
          kind: form.kind,
          objective: form.objective,
          spend: form.spend,
          revenue: form.revenue,
          clicks: form.clicks,
          leads: form.leads,
          orders: form.orders,
          notes: form.notes,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || "Não foi possível salvar");
        return;
      }
      setCampaigns((list) => [data.item, ...list]);
      setForm({
        name: "",
        platform: "meta",
        kind: "paid",
        objective: "Vendas no site",
        spend: "",
        revenue: "",
        clicks: "",
        leads: "",
        orders: "",
        notes: "",
      });
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function removeCampaign(id: string) {
    if (!window.confirm("Excluir esta campanha?")) return;
    const res = await fetch(
      `/api/admin/traffic/campaigns?id=${encodeURIComponent(id)}`,
      { method: "DELETE" }
    );
    if (!res.ok) {
      alert("Não foi possível excluir");
      return;
    }
    setCampaigns((list) => list.filter((c) => c.id !== id));
    router.refresh();
  }

  async function saveIntegrations(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormMsg("");
    try {
      const res = await fetch("/api/admin/traffic/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metaPixelId: metaForm.pixelId,
          metaAdAccountId: metaForm.adAccountId,
          metaPageId: metaForm.pageId,
          metaCapiToken: metaForm.capiToken || undefined,
          metaAdsToken: metaForm.adsToken || undefined,
          googleCustomerId: googleForm.customerId,
          googleDeveloperToken: googleForm.developerToken || undefined,
          googleClientId: googleForm.clientId || undefined,
          googleClientSecret: googleForm.clientSecret || undefined,
          googleRefreshToken: googleForm.refreshToken || undefined,
          tiktokPixelId: tiktokForm.pixelId,
          tiktokAccessToken: tiktokForm.accessToken || undefined,
          pinterestAdAccountId: pinterestForm.adAccountId,
          pinterestAccessToken: pinterestForm.accessToken || undefined,
          instagramUserId: igForm.userId,
          instagramAccessToken: igForm.accessToken || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormMsg(data.error || "Falha ao salvar");
        return;
      }
      if (data.integrations) setIntegrations(data.integrations);
      setMetaForm((f) => ({ ...f, capiToken: "", adsToken: "" }));
      setGoogleForm((f) => ({
        ...f,
        developerToken: "",
        clientId: "",
        clientSecret: "",
        refreshToken: "",
      }));
      setTiktokForm((f) => ({ ...f, accessToken: "" }));
      setPinterestForm((f) => ({ ...f, accessToken: "" }));
      setIgForm((f) => ({ ...f, accessToken: "" }));
      setFormMsg("Integrações salvas.");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function loadAbandoned() {
    const res = await fetch("/api/admin/traffic/abandoned-carts");
    const data = await res.json().catch(() => ({}));
    if (res.ok) setAbandonItems(data.items || []);
  }

  async function runAbandonedReminders() {
    setAbandonMsg("");
    const res = await fetch("/api/admin/traffic/abandoned-carts", {
      method: "POST",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setAbandonMsg(data.error || "Falha ao disparar lembretes");
      return;
    }
    setAbandonMsg(
      `Processados: ${data.scanned} · e-mails: ${data.emailed}`
    );
    await loadAbandoned();
  }

  async function syncSpend() {
    setSyncing(true);
    setSyncMsg("");
    try {
      const res = await fetch("/api/admin/traffic/sync-spend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: 7 }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSyncMsg(data.error || "Falha na sincronização");
        return;
      }
      const parts: string[] = [];
      if (data.meta?.ok) {
        parts.push(`Meta: ${data.meta.updated} campanha(s)`);
      } else if (data.meta?.reason) {
        parts.push(`Meta: ${data.meta.reason}`);
      }
      if (data.google?.ok) {
        parts.push(`Google: ${data.google.updated} campanha(s)`);
      } else if (data.google?.reason) {
        parts.push(`Google: ${data.google.reason}`);
      }
      setSyncMsg(parts.join(" · ") || "Sync concluído");
      router.refresh();
    } finally {
      setSyncing(false);
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "hoje", label: "Hoje" },
    { id: "funil", label: "Funil" },
    { id: "oferta", label: "Oferta da semana" },
    { id: "organico-cal", label: "Calendário orgânico" },
    { id: "pre", label: "Pré-anúncio" },
    { id: "resultados", label: "Resultados" },
    { id: "pago", label: "Guias pago" },
    { id: "organico", label: "Guias orgânico" },
    { id: "campanhas", label: "Campanhas" },
    { id: "pixel", label: "Integrações Ads" },
    { id: "abandonados", label: "Carrinhos" },
    { id: "rotina", label: "Fórmula" },
  ];

  const healthClass =
    health === "good"
      ? "border-emerald-700/30 bg-emerald-50 text-emerald-950"
      : health === "warn"
        ? "border-amber-700/30 bg-amber-50 text-amber-950"
        : health === "bad"
          ? "border-rose-700/30 bg-rose-50 text-rose-950"
          : "border-black/10 bg-white text-[#2a2420]";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setTab(t.id);
              if (t.id === "pago") setGuideId("meta-paid");
              if (t.id === "organico") setGuideId("organic-ig");
              if (t.id === "resultados") setGuideId("basics");
              if (t.id === "abandonados") void loadAbandoned();
            }}
            className={`px-3 py-1.5 text-xs uppercase tracking-wider border ${
              tab === t.id
                ? "bg-[#2a2420] text-white border-[#2a2420]"
                : "bg-white border-black/15 text-[#3a322c]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "hoje" ? (
        <SalesHojeTab
          tasks={hub.todayTasks}
          checklist={hub.checklist}
          health={health}
        />
      ) : null}

      {tab === "funil" ? (
        <SalesFunilTab week={hub.funnelWeek} month={hub.funnelMonth} />
      ) : null}

      {tab === "oferta" ? (
        <SalesOfertaTab
          offer={hub.offer}
          products={hub.offerProducts}
          product={hub.offerProduct}
          copy={hub.offerCopy}
          siteUrl={siteUrl}
        />
      ) : null}

      {tab === "organico-cal" ? (
        <SalesOrganicoTab
          week={hub.organicWeek}
          productName={hub.offerProduct?.name || null}
        />
      ) : null}

      {tab === "pre" ? <SalesPreTab score={hub.preScore} /> : null}

      {tab === "resultados" ? (
        <div className="space-y-4">
          <div className={`border p-4 ${healthClass}`}>
            <p className="text-[10px] uppercase tracking-wider opacity-70">
              Diagnóstico (7 dias)
            </p>
            <p className="text-lg font-semibold mt-1">{healthCopy.title}</p>
            <p className="text-sm mt-1 opacity-90">{healthCopy.detail}</p>
            <p className="text-xs mt-3 opacity-80">
              Vendas com UTM: {stats.attributedOrdersWeek} pedido(s) ·{" "}
              {formatBRL(stats.attributedRevenueWeek)}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label="Visitas do site (hoje)"
              value={String(stats.visitsToday)}
              sub={`${stats.uniqueIpsToday} IPs · ${stats.mobileToday} mobile / ${stats.desktopToday} PC`}
            />
            <Stat
              label="Visitantes (7 dias)"
              value={String(stats.uniqueIpsWeek)}
              sub={`${stats.visitsWeek} pageviews`}
            />
            <Stat
              label="Visitas em produtos"
              value={String(stats.productViews)}
              sub="Soma no catálogo"
            />
            <Stat
              label="Vendas no mês"
              value={formatBRL(stats.salesMonth)}
              sub={`${stats.ordersMonth} pedidos pagos`}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label="Investido (campanhas)"
              value={formatBRL(totals.spend)}
              sub="Registro manual do gasto"
            />
            <Stat
              label="Receita nas campanhas"
              value={formatBRL(totals.revenue)}
              sub="Atualiza no pagamento com UTM"
            />
            <Stat
              label="ROAS"
              value={totals.roas ? `${totals.roas.toFixed(2)}x` : "—"}
              sub="Receita ÷ investimento (meta ~2x)"
            />
            <Stat
              label="Pedidos nas campanhas"
              value={String(totals.orders)}
              sub={`${campaigns.length} campanha(s)`}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <SourceTable title="Vendas por origem (7 dias)" rows={bySourceWeek} />
            <SourceTable title="Vendas por origem (mês)" rows={bySourceMonth} />
          </div>

          <div className="border border-black/8 bg-white p-4 text-sm text-[#5c534c]">
            <p className="font-medium text-[#2a2420]">Como o controle automático funciona</p>
            <ul className="mt-2 list-disc pl-5 space-y-1 text-xs">
              <li>
                No anúncio, use link com UTM, por exemplo:{" "}
                <code className="text-[11px] bg-black/5 px-1 break-all">
                  {exampleLink}
                </code>
              </li>
              <li>
                A cliente clica → o site guarda a origem → no pagamento aprovado
                a venda entra aqui e na campanha.
              </li>
              <li>
                Cadastre o <strong>gasto</strong> em Minhas campanhas para ver o
                ROAS. A receita pode ser preenchida sozinha no pagamento.
              </li>
            </ul>
          </div>
        </div>
      ) : null}

      {tab === "pixel" ? (
        <div className="space-y-4">
          <div className="border border-black/8 bg-white p-4 flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[200px]">
              <p className="font-medium text-[#2a2420]">Puxar gasto automático</p>
              <p className="text-xs text-[#5c534c] mt-1">
                Busca os últimos 7 dias na Meta Marketing API e no Google Ads e
                atualiza o investimento nas campanhas do painel.
              </p>
            </div>
            <button
              type="button"
              className="btn"
              disabled={syncing}
              onClick={syncSpend}
            >
              {syncing ? "Sincronizando…" : "Sincronizar gasto agora"}
            </button>
            {syncMsg ? (
              <p className="w-full text-xs text-[#5c534c]">{syncMsg}</p>
            ) : null}
          </div>

          <form onSubmit={saveIntegrations} className="space-y-4">
            <fieldset className="border border-black/8 bg-white p-5 space-y-3">
              <legend className="px-1 text-sm font-semibold text-[#2a2420]">
                Meta (Pixel + Ads)
              </legend>
              <p className="text-xs text-[#5c534c]">
                Pixel/CAPI: envia Purchase no pagamento. Account ID + token com{" "}
                <code>ads_read</code>: puxa gasto. Token CAPI pode ser o mesmo se
                tiver as duas permissões.
                {integrations.meta.hasCapiToken ? (
                  <span className="text-emerald-800"> · CAPI ok</span>
                ) : null}
                {integrations.meta.hasAdsToken ? (
                  <span className="text-emerald-800"> · Ads token ok</span>
                ) : null}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs text-[#5c534c] block">
                  Pixel ID
                  <input
                    className="input mt-1"
                    value={metaForm.pixelId}
                    onChange={(e) =>
                      setMetaForm((f) => ({ ...f, pixelId: e.target.value }))
                    }
                    placeholder="123456789012345"
                  />
                </label>
                <label className="text-xs text-[#5c534c] block">
                  Ad Account ID
                  <input
                    className="input mt-1"
                    value={metaForm.adAccountId}
                    onChange={(e) =>
                      setMetaForm((f) => ({ ...f, adAccountId: e.target.value }))
                    }
                    placeholder="sem o prefixo act_"
                  />
                </label>
                <label className="text-xs text-[#5c534c] block">
                  Facebook Page ID
                  <input
                    className="input mt-1"
                    value={metaForm.pageId}
                    onChange={(e) =>
                      setMetaForm((f) => ({ ...f, pageId: e.target.value }))
                    }
                    placeholder="necessário p/ criar anúncio"
                  />
                </label>
                <label className="text-xs text-[#5c534c] block">
                  Token Conversions API
                  <input
                    className="input mt-1"
                    type="password"
                    value={metaForm.capiToken}
                    onChange={(e) =>
                      setMetaForm((f) => ({ ...f, capiToken: e.target.value }))
                    }
                    placeholder={
                      integrations.meta.hasCapiToken
                        ? "•••• (deixe vazio p/ manter)"
                        : "Cole o token"
                    }
                  />
                </label>
                <label className="text-xs text-[#5c534c] block">
                  Token Marketing API (gasto)
                  <input
                    className="input mt-1"
                    type="password"
                    value={metaForm.adsToken}
                    onChange={(e) =>
                      setMetaForm((f) => ({ ...f, adsToken: e.target.value }))
                    }
                    placeholder={
                      integrations.meta.hasAdsToken
                        ? "•••• (deixe vazio p/ manter)"
                        : "Opcional se CAPI já tem ads_read"
                    }
                  />
                </label>
              </div>
            </fieldset>

            <fieldset className="border border-black/8 bg-white p-5 space-y-3">
              <legend className="px-1 text-sm font-semibold text-[#2a2420]">
                Google Ads
              </legend>
              <p className="text-xs text-[#5c534c]">
                Precisa de Developer Token (conta Google Ads) + OAuth (Client ID,
                Secret, Refresh Token). Customer ID sem hífens.
                {integrations.google.hasOAuth ? (
                  <span className="text-emerald-800"> · OAuth ok</span>
                ) : null}
                {integrations.google.hasDeveloperToken ? (
                  <span className="text-emerald-800"> · Dev token ok</span>
                ) : null}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs text-[#5c534c] block">
                  Customer ID
                  <input
                    className="input mt-1"
                    value={googleForm.customerId}
                    onChange={(e) =>
                      setGoogleForm((f) => ({
                        ...f,
                        customerId: e.target.value,
                      }))
                    }
                    placeholder="1234567890"
                  />
                </label>
                <label className="text-xs text-[#5c534c] block">
                  Developer Token
                  <input
                    className="input mt-1"
                    type="password"
                    value={googleForm.developerToken}
                    onChange={(e) =>
                      setGoogleForm((f) => ({
                        ...f,
                        developerToken: e.target.value,
                      }))
                    }
                    placeholder={
                      integrations.google.hasDeveloperToken
                        ? "•••• (manter)"
                        : ""
                    }
                  />
                </label>
                <label className="text-xs text-[#5c534c] block">
                  OAuth Client ID
                  <input
                    className="input mt-1"
                    value={googleForm.clientId}
                    onChange={(e) =>
                      setGoogleForm((f) => ({ ...f, clientId: e.target.value }))
                    }
                    placeholder={integrations.google.hasOAuth ? "••••" : ""}
                  />
                </label>
                <label className="text-xs text-[#5c534c] block">
                  OAuth Client Secret
                  <input
                    className="input mt-1"
                    type="password"
                    value={googleForm.clientSecret}
                    onChange={(e) =>
                      setGoogleForm((f) => ({
                        ...f,
                        clientSecret: e.target.value,
                      }))
                    }
                  />
                </label>
                <label className="text-xs text-[#5c534c] block sm:col-span-2">
                  Refresh Token
                  <input
                    className="input mt-1"
                    type="password"
                    value={googleForm.refreshToken}
                    onChange={(e) =>
                      setGoogleForm((f) => ({
                        ...f,
                        refreshToken: e.target.value,
                      }))
                    }
                  />
                </label>
              </div>
            </fieldset>

            <fieldset className="border border-black/8 bg-white p-5 space-y-3">
              <legend className="px-1 text-sm font-semibold text-[#2a2420]">
                TikTok Events API
              </legend>
              <p className="text-xs text-[#5c534c]">
                Envia CompletePayment no pagamento aprovado.
                {integrations.tiktok.hasToken ? (
                  <span className="text-emerald-800"> · Token ok</span>
                ) : null}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs text-[#5c534c] block">
                  Pixel / Event Source ID
                  <input
                    className="input mt-1"
                    value={tiktokForm.pixelId}
                    onChange={(e) =>
                      setTiktokForm((f) => ({ ...f, pixelId: e.target.value }))
                    }
                  />
                </label>
                <label className="text-xs text-[#5c534c] block">
                  Access Token
                  <input
                    className="input mt-1"
                    type="password"
                    value={tiktokForm.accessToken}
                    onChange={(e) =>
                      setTiktokForm((f) => ({
                        ...f,
                        accessToken: e.target.value,
                      }))
                    }
                    placeholder={
                      integrations.tiktok.hasToken ? "•••• (manter)" : ""
                    }
                  />
                </label>
              </div>
            </fieldset>

            <fieldset className="border border-black/8 bg-white p-5 space-y-3">
              <legend className="px-1 text-sm font-semibold text-[#2a2420]">
                Pinterest Conversions API
              </legend>
              <p className="text-xs text-[#5c534c]">
                Envia evento checkout no pagamento aprovado.
                {integrations.pinterest.hasToken ? (
                  <span className="text-emerald-800"> · Token ok</span>
                ) : null}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs text-[#5c534c] block">
                  Ad Account ID
                  <input
                    className="input mt-1"
                    value={pinterestForm.adAccountId}
                    onChange={(e) =>
                      setPinterestForm((f) => ({
                        ...f,
                        adAccountId: e.target.value,
                      }))
                    }
                  />
                </label>
                <label className="text-xs text-[#5c534c] block">
                  Access Token
                  <input
                    className="input mt-1"
                    type="password"
                    value={pinterestForm.accessToken}
                    onChange={(e) =>
                      setPinterestForm((f) => ({
                        ...f,
                        accessToken: e.target.value,
                      }))
                    }
                    placeholder={
                      integrations.pinterest.hasToken ? "•••• (manter)" : ""
                    }
                  />
                </label>
              </div>
            </fieldset>

            <fieldset className="border border-black/8 bg-white p-5 space-y-3">
              <legend className="px-1 text-sm font-semibold text-[#2a2420]">
                Instagram Autopost
              </legend>
              <p className="text-xs text-[#5c534c]">
                Conta Business/Creator + token com publicação de conteúdo.
                {integrations.instagram?.hasToken ? (
                  <span className="text-emerald-800"> · Token ok</span>
                ) : null}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs text-[#5c534c] block">
                  Instagram User ID
                  <input
                    className="input mt-1"
                    value={igForm.userId}
                    onChange={(e) =>
                      setIgForm((f) => ({ ...f, userId: e.target.value }))
                    }
                  />
                </label>
                <label className="text-xs text-[#5c534c] block">
                  Access Token
                  <input
                    className="input mt-1"
                    type="password"
                    value={igForm.accessToken}
                    onChange={(e) =>
                      setIgForm((f) => ({ ...f, accessToken: e.target.value }))
                    }
                    placeholder={
                      integrations.instagram?.hasToken ? "•••• (manter)" : ""
                    }
                  />
                </label>
              </div>
            </fieldset>

            <button type="submit" className="btn" disabled={saving}>
              {saving ? "Salvando…" : "Salvar integrações"}
            </button>
            {formMsg ? (
              <p className="text-xs text-emerald-900">{formMsg}</p>
            ) : null}
          </form>
        </div>
      ) : null}

      {tab === "abandonados" ? (
        <div className="space-y-4">
          <div className="border border-black/8 bg-white p-4 flex flex-wrap gap-3 items-center">
            <p className="text-sm text-[#5c534c] flex-1 min-w-[200px]">
              Carrinhos abandonados (após 60 min sem compra). Com SMTP, envia
              e-mail automático. Cron:{" "}
              <code className="text-[11px]">/api/cron/abandoned-carts</code>
            </p>
            <button type="button" className="btn" onClick={loadAbandoned}>
              Atualizar
            </button>
            <button type="button" className="btn" onClick={runAbandonedReminders}>
              Disparar lembretes agora
            </button>
            {abandonMsg ? (
              <p className="w-full text-xs text-[#5c534c]">{abandonMsg}</p>
            ) : null}
          </div>
          <div className="border border-black/8 bg-white overflow-x-auto">
            <table className="table text-sm min-w-[640px]">
              <thead>
                <tr>
                  <th>Contato</th>
                  <th>Itens</th>
                  <th>Subtotal</th>
                  <th>Status</th>
                  <th>Visto</th>
                </tr>
              </thead>
              <tbody>
                {abandonItems.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div>{c.email || "—"}</div>
                      <div className="text-[11px] text-muted">{c.phone || ""}</div>
                    </td>
                    <td>{c.itemCount}</td>
                    <td>{formatBRL(c.subtotal)}</td>
                    <td>{c.status}</td>
                    <td className="text-[11px]">
                      {new Date(c.lastSeenAt).toLocaleString("pt-BR")}
                    </td>
                  </tr>
                ))}
                {abandonItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center text-muted py-8">
                      Nenhum carrinho ainda. Clique em Atualizar.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {tab === "pago" || tab === "organico" ? (
        <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
          <nav className="space-y-1" aria-label="Guias">
            {(tab === "pago" ? paidGuides : organicGuides).map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setGuideId(g.id)}
                className={`w-full text-left px-3 py-2 text-sm border ${
                  guideId === g.id
                    ? "bg-[#2a2420] text-white border-[#2a2420]"
                    : "bg-white border-black/10 text-[#3a322c]"
                }`}
              >
                {g.title}
              </button>
            ))}
          </nav>
          {activeGuide ? (
            <article className="border border-black/8 bg-white p-5 space-y-4">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-[#8a7468]">
                  {activeGuide.platforms.join(" · ")}
                </p>
                <h2
                  className="text-2xl mt-1"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {activeGuide.title}
                </h2>
                <p className="text-sm text-[#5c534c] mt-2 max-w-2xl">
                  {activeGuide.summary}
                </p>
              </div>
              <GuideList title="Passo a passo" items={activeGuide.steps} />
              <GuideList title="Dicas que funcionam" items={activeGuide.tips} tone="ok" />
              <GuideList
                title="Erros comuns"
                items={activeGuide.mistakes}
                tone="bad"
              />
            </article>
          ) : null}
        </div>
      ) : null}

      {tab === "rotina" ? (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="border border-black/8 bg-white p-5">
            <h2 className="font-semibold text-[#2a2420] mb-3">
              Semana tipo (Majesté)
            </h2>
            <ol className="space-y-2 text-sm text-[#5c534c] list-decimal pl-5">
              {TRAFFIC_PLAYBOOK.weekly.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ol>
          </div>
          <div className="border border-black/8 bg-white p-5">
            <h2 className="font-semibold text-[#2a2420] mb-3">
              Fórmula do que dá certo
            </h2>
            <ul className="space-y-2 text-sm text-[#5c534c]">
              {TRAFFIC_PLAYBOOK.successFormula.map((s) => (
                <li key={s} className="border-l-2 border-[#c4a35a] pl-3">
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {tab === "campanhas" ? (
        <div className="space-y-6">
          <form
            onSubmit={createCampaign}
            className="border border-black/8 bg-white p-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          >
            <h3 className="sm:col-span-2 lg:col-span-3 font-medium text-[#2a2420]">
              Registrar campanha / resultado
            </h3>
            <label className="text-xs text-[#5c534c]">
              Nome
              <input
                className="input mt-1"
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ex.: Conjuntos — Meta março"
              />
            </label>
            <label className="text-xs text-[#5c534c]">
              Plataforma
              <select
                className="input mt-1"
                value={form.platform}
                onChange={(e) =>
                  setForm((f) => ({ ...f, platform: e.target.value }))
                }
              >
                {TRAFFIC_PLATFORMS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-[#5c534c]">
              Tipo
              <select
                className="input mt-1"
                value={form.kind}
                onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value }))}
              >
                <option value="paid">Pago</option>
                <option value="organic">Orgânico</option>
              </select>
            </label>
            <label className="text-xs text-[#5c534c]">
              Objetivo
              <input
                className="input mt-1"
                value={form.objective}
                onChange={(e) =>
                  setForm((f) => ({ ...f, objective: e.target.value }))
                }
              />
            </label>
            <label className="text-xs text-[#5c534c]">
              Investimento (R$)
              <input
                className="input mt-1"
                value={form.spend}
                onChange={(e) => setForm((f) => ({ ...f, spend: e.target.value }))}
                placeholder="0"
              />
            </label>
            <label className="text-xs text-[#5c534c]">
              Receita gerada (R$)
              <input
                className="input mt-1"
                value={form.revenue}
                onChange={(e) =>
                  setForm((f) => ({ ...f, revenue: e.target.value }))
                }
                placeholder="0"
              />
            </label>
            <label className="text-xs text-[#5c534c]">
              Cliques
              <input
                className="input mt-1"
                value={form.clicks}
                onChange={(e) =>
                  setForm((f) => ({ ...f, clicks: e.target.value }))
                }
              />
            </label>
            <label className="text-xs text-[#5c534c]">
              Leads / contatos
              <input
                className="input mt-1"
                value={form.leads}
                onChange={(e) => setForm((f) => ({ ...f, leads: e.target.value }))}
              />
            </label>
            <label className="text-xs text-[#5c534c]">
              Pedidos
              <input
                className="input mt-1"
                value={form.orders}
                onChange={(e) =>
                  setForm((f) => ({ ...f, orders: e.target.value }))
                }
              />
            </label>
            <label className="text-xs text-[#5c534c] sm:col-span-2 lg:col-span-3">
              Anotações
              <textarea
                className="input mt-1 min-h-[70px]"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="O que testou, criativo vencedor, público…"
              />
            </label>
            <div className="sm:col-span-2 lg:col-span-3">
              <button type="submit" className="btn" disabled={saving}>
                {saving ? "Salvando…" : "Salvar campanha"}
              </button>
            </div>
          </form>

          <div className="border border-black/8 bg-white overflow-x-auto">
            <table className="table text-sm min-w-[800px]">
              <thead>
                <tr>
                  <th>Campanha</th>
                  <th>Plataforma</th>
                  <th>Tipo</th>
                  <th>Invest.</th>
                  <th>Receita</th>
                  <th>ROAS</th>
                  <th>Pedidos</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => {
                  const roas = c.spend > 0 ? c.revenue / c.spend : 0;
                  const plat =
                    TRAFFIC_PLATFORMS.find((p) => p.id === c.platform)?.label ||
                    c.platform;
                  return (
                    <tr key={c.id}>
                      <td>
                        <div className="font-medium">{c.name}</div>
                        {c.objective ? (
                          <div className="text-[11px] text-muted">{c.objective}</div>
                        ) : null}
                      </td>
                      <td>{plat}</td>
                      <td>{c.kind === "organic" ? "Orgânico" : "Pago"}</td>
                      <td>{formatBRL(c.spend)}</td>
                      <td>{formatBRL(c.revenue)}</td>
                      <td>{roas ? `${roas.toFixed(2)}x` : "—"}</td>
                      <td>{c.orders}</td>
                      <td>
                        <button
                          type="button"
                          className="text-xs text-rose-800 hover:underline"
                          onClick={() => removeCampaign(c.id)}
                        >
                          Excluir
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {campaigns.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-muted text-center py-8">
                      Nenhuma campanha ainda. Cadastre a primeira acima.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SourceTable({
  title,
  rows,
}: {
  title: string;
  rows: { source: string; label: string; orders: number; revenue: number }[];
}) {
  return (
    <div className="border border-black/8 bg-white p-4">
      <h3 className="text-sm font-semibold text-[#2a2420] mb-3">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-xs text-muted">
          Nenhuma venda paga neste período ainda.
        </p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-wider text-[#8a7468]">
              <th className="pb-2">Origem</th>
              <th className="pb-2">Pedidos</th>
              <th className="pb-2">Receita</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.source} className="border-t border-black/5">
                <td className="py-2">{r.label}</td>
                <td className="py-2 tabular-nums">{r.orders}</td>
                <td className="py-2 tabular-nums">{formatBRL(r.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="border border-black/8 bg-white p-4">
      <p className="text-[10px] uppercase tracking-wider text-[#8a7468]">{label}</p>
      <p className="text-xl font-semibold text-[#2a2420] mt-1 tabular-nums">
        {value}
      </p>
      <p className="text-[11px] text-muted mt-1">{sub}</p>
    </div>
  );
}

function GuideList({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone?: "ok" | "bad";
}) {
  return (
    <div>
      <h3
        className={`text-sm font-semibold mb-2 ${
          tone === "bad"
            ? "text-rose-900"
            : tone === "ok"
              ? "text-emerald-900"
              : "text-[#2a2420]"
        }`}
      >
        {title}
      </h3>
      <ul className="space-y-1.5 text-sm text-[#5c534c] list-disc pl-5">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
