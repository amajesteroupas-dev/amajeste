import { prisma } from "@/lib/prisma";
import type { TrafficIntegrations } from "@/lib/traffic-ads-settings";
import type { TrafficHealth } from "@/lib/traffic-attribution";

const OFFER_KEY = "salesOfferJson";
const CHECKLIST_KEY = "salesChecklistJson";

export type SalesOffer = {
  productId: string | null;
  headline: string;
  dailyBudget: number;
  campaignSlug: string;
  startedAt: string;
  notes: string;
};

export type ChecklistItemId =
  | "stock"
  | "story"
  | "reel"
  | "ads"
  | "orders"
  | "diagnose";

export type DayChecklist = {
  date: string;
  done: Partial<Record<ChecklistItemId, boolean>>;
};

export type OfferProductOption = {
  id: string;
  name: string;
  slug: string;
  price: number;
  viewCount: number;
  stock: number;
  imageUrl: string | null;
  hasImages: boolean;
};

export type FunnelStats = {
  uniqueVisitors: number;
  productPageViews: number;
  paidOrders: number;
  attributedOrders: number;
  revenue: number;
  avgTicket: number;
  costPerOrder: number | null;
  conversionPer100: number;
  actionHint: string;
};

export type PreAdCheck = {
  id: string;
  label: string;
  ok: boolean;
  detail: string;
  href?: string;
};

export type PreAdScore = {
  score: number;
  ready: boolean;
  checks: PreAdCheck[];
  message: string;
};

export type OrganicDayPlan = {
  day: string;
  kind: "Reel" | "Story" | "Post" | "WhatsApp";
  title: string;
  caption: string;
  cta: string;
};

export type SalesCopyPack = {
  adShort: string;
  reel: string;
  story: string;
  whatsapp: string;
  links: { platform: string; url: string }[];
};

function dayKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function emptyOffer(): SalesOffer {
  return {
    productId: null,
    headline: "",
    dailyBudget: 30,
    campaignSlug: "oferta-semana",
    startedAt: dayKey(),
    notes: "",
  };
}

export async function getSalesOffer(): Promise<SalesOffer> {
  try {
    const row = await prisma.siteSetting.findUnique({ where: { key: OFFER_KEY } });
    if (!row?.value) return emptyOffer();
    const parsed = JSON.parse(row.value) as Partial<SalesOffer>;
    return {
      ...emptyOffer(),
      ...parsed,
      dailyBudget: Number(parsed.dailyBudget) || 30,
    };
  } catch {
    return emptyOffer();
  }
}

export async function saveSalesOffer(
  input: Partial<SalesOffer>
): Promise<SalesOffer> {
  const current = await getSalesOffer();
  const next: SalesOffer = {
    productId:
      input.productId !== undefined ? input.productId : current.productId,
    headline:
      input.headline !== undefined
        ? String(input.headline).slice(0, 120)
        : current.headline,
    dailyBudget:
      input.dailyBudget !== undefined
        ? Math.max(0, Number(input.dailyBudget) || 0)
        : current.dailyBudget,
    campaignSlug: (
      input.campaignSlug !== undefined
        ? String(input.campaignSlug)
        : current.campaignSlug
    )
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "oferta-semana",
    startedAt: input.startedAt || current.startedAt || dayKey(),
    notes:
      input.notes !== undefined
        ? String(input.notes).slice(0, 500)
        : current.notes,
  };
  await prisma.siteSetting.upsert({
    where: { key: OFFER_KEY },
    create: { key: OFFER_KEY, value: JSON.stringify(next) },
    update: { value: JSON.stringify(next) },
  });
  return next;
}

export async function getDayChecklist(): Promise<DayChecklist> {
  const today = dayKey();
  try {
    const row = await prisma.siteSetting.findUnique({
      where: { key: CHECKLIST_KEY },
    });
    if (!row?.value) return { date: today, done: {} };
    const parsed = JSON.parse(row.value) as DayChecklist;
    if (parsed.date !== today) return { date: today, done: {} };
    return { date: today, done: parsed.done || {} };
  } catch {
    return { date: today, done: {} };
  }
}

export async function toggleChecklistItem(
  id: ChecklistItemId,
  done?: boolean
): Promise<DayChecklist> {
  const current = await getDayChecklist();
  const nextDone = { ...current.done };
  nextDone[id] = done === undefined ? !nextDone[id] : Boolean(done);
  const next: DayChecklist = { date: dayKey(), done: nextDone };
  await prisma.siteSetting.upsert({
    where: { key: CHECKLIST_KEY },
    create: { key: CHECKLIST_KEY, value: JSON.stringify(next) },
    update: { value: JSON.stringify(next) },
  });
  return next;
}

export async function listOfferProductOptions(
  take = 40
): Promise<OfferProductOption[]> {
  const products = await prisma.product.findMany({
    where: { deletedAt: null, active: true },
    orderBy: [{ viewCount: "desc" }, { updatedAt: "desc" }],
    take,
    select: {
      id: true,
      name: true,
      slug: true,
      price: true,
      viewCount: true,
      images: {
        orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
        take: 1,
        select: { url: true },
      },
      variants: {
        where: { active: true },
        select: { stock: true },
      },
    },
  });

  return products
    .map((p) => {
      const stock = p.variants.reduce((s, v) => s + (v.stock || 0), 0);
      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        price: Number(p.price),
        viewCount: p.viewCount || 0,
        stock,
        imageUrl: p.images[0]?.url || null,
        hasImages: p.images.length > 0,
      };
    })
    .filter((p) => p.stock > 0);
}

export function buildUtmLinks(input: {
  siteUrl: string;
  productSlug: string | null;
  campaignSlug: string;
}) {
  const base = (input.siteUrl || "https://amajeste.com.br").replace(/\/$/, "");
  const path = input.productSlug
    ? `/produto/${input.productSlug}`
    : "/";
  const campaign = input.campaignSlug || "oferta-semana";
  const mk = (source: string, medium: string) => {
    const u = new URL(`${base}${path}`);
    u.searchParams.set("utm_source", source);
    u.searchParams.set("utm_medium", medium);
    u.searchParams.set("utm_campaign", campaign);
    if (input.productSlug) {
      u.searchParams.set("utm_content", input.productSlug);
    }
    return u.toString();
  };
  return [
    { platform: "Meta (Instagram/Facebook)", url: mk("meta", "paid") },
    { platform: "Google Ads", url: mk("google", "cpc") },
    { platform: "TikTok", url: mk("tiktok", "paid") },
    { platform: "Pinterest", url: mk("pinterest", "paid") },
    { platform: "WhatsApp / Status", url: mk("whatsapp", "social") },
    { platform: "Orgânico Instagram", url: mk("instagram", "organic") },
  ];
}

export function buildOfferCopy(input: {
  productName: string;
  price: number;
  headline?: string;
  siteUrl: string;
}): Omit<SalesCopyPack, "links"> {
  const name = input.productName || "peça Majesté";
  const price = input.price
    ? input.price.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      })
    : "";
  const hook =
    input.headline?.trim() ||
    `${name} — modelagem que valoriza e tecido que acompanha o treino`;

  return {
    adShort: `${hook}. ${price ? `Por ${price}. ` : ""}Compre no site com Pix e frete calculado. Toque e escolha seu tamanho.`,
    reel: `Gancho: “Se o look de academia não te deixa confiante, troca o conjunto.”\nMostre o ${name} em movimento (10–15s).\nFeche: “Link na bio / compre no site — ${price || "valores no site"}.”`,
    story: `Story 1: close do tecido/costura do ${name}.\nStory 2: prova de uso (academia ou rua).\nStory 3: “Últimas unidades / tamanhos no site” + link adesivo.`,
    whatsapp: `Oi! Saiu a oferta da semana na Majesté: *${name}*${price ? ` · ${price}` : ""}. Quer o link do site pra ver tamanhos?`,
  };
}

export function computeFunnel(input: {
  uniqueVisitors: number;
  productPageViews: number;
  paidOrders: number;
  attributedOrders: number;
  revenue: number;
  campaignSpend: number;
}): FunnelStats {
  const {
    uniqueVisitors,
    productPageViews,
    paidOrders,
    attributedOrders,
    revenue,
    campaignSpend,
  } = input;
  const avgTicket = paidOrders > 0 ? revenue / paidOrders : 0;
  const costPerOrder =
    paidOrders > 0 && campaignSpend > 0 ? campaignSpend / paidOrders : null;
  const conversionPer100 =
    uniqueVisitors > 0 ? (paidOrders / uniqueVisitors) * 100 : 0;

  let actionHint = "Defina a oferta da semana e poste 1 Story hoje.";
  if (uniqueVisitors >= 20 && paidOrders === 0) {
    actionHint =
      "Tem visita, mas ainda sem venda. Revise a página do produto, frete e oferta (Pix/frete).";
  } else if (uniqueVisitors >= 30 && conversionPer100 < 1) {
    actionHint =
      "Muita visita, pouca compra. Confira se o anúncio aponta para o produto certo e se o estoque bate com o criativo.";
  } else if (attributedOrders === 0 && campaignSpend > 0) {
    actionHint =
      "Há gasto em anúncio sem venda com UTM. Use os links prontos da Oferta da semana.";
  } else if (paidOrders >= 3 && conversionPer100 >= 1.5) {
    actionHint =
      "Funil saudável. Escalone o criativo vencedor com orçamento constante.";
  } else if (uniqueVisitors < 10) {
    actionHint =
      "Poucas visitas. Priorize orgânico (Reels/Stories) e um anúncio Meta com orçamento diário fixo.";
  }

  return {
    uniqueVisitors,
    productPageViews,
    paidOrders,
    attributedOrders,
    revenue,
    avgTicket,
    costPerOrder,
    conversionPer100,
    actionHint,
  };
}

export function computePreAdScore(input: {
  integrations: TrafficIntegrations;
  offer: SalesOffer;
  product: OfferProductOption | null;
  campaignSpend: number;
  pendingOrders: number;
  openComplaints: number;
  health: TrafficHealth;
}): PreAdScore {
  const checks: PreAdCheck[] = [];

  const pixelOk =
    Boolean(input.integrations.meta.pixelId) &&
    input.integrations.meta.hasCapiToken;
  checks.push({
    id: "pixel",
    label: "Pixel Meta / CAPI",
    ok: pixelOk,
    detail: pixelOk
      ? "Conversões no pagamento configuradas."
      : "Configure Pixel + token em Integrações Ads.",
    href: undefined,
  });

  const offerOk = Boolean(input.offer.productId && input.product);
  checks.push({
    id: "offer",
    label: "Oferta da semana definida",
    ok: offerOk,
    detail: offerOk
      ? `Oferta: ${input.product!.name}`
      : "Escolha um produto com estoque na aba Oferta.",
  });

  const stockOk = Boolean(input.product && input.product.stock > 0);
  checks.push({
    id: "stock",
    label: "Estoque da oferta",
    ok: stockOk,
    detail: stockOk
      ? `${input.product!.stock} un. disponíveis`
      : "Sem estoque — não anuncie.",
    href: "/admin/estoque",
  });

  const photosOk = Boolean(input.product?.hasImages);
  checks.push({
    id: "photos",
    label: "Fotos do produto",
    ok: photosOk || !offerOk,
    detail: photosOk || !offerOk
      ? photosOk
        ? "Produto com imagem."
        : "Defina a oferta primeiro."
      : "Cadastre foto no produto antes de anunciar.",
    href: input.product ? `/admin/produtos/${input.product.id}` : "/admin/produtos",
  });

  const utmOk = offerOk;
  checks.push({
    id: "utm",
    label: "Link com UTM pronto",
    ok: utmOk,
    detail: utmOk
      ? "Use os links da aba Oferta nos anúncios."
      : "Sem oferta não há link rastreável.",
  });

  const spendOk = input.campaignSpend > 0 || input.offer.dailyBudget > 0;
  checks.push({
    id: "budget",
    label: "Orçamento definido",
    ok: spendOk,
    detail: spendOk
      ? input.offer.dailyBudget > 0
        ? `Sugestão: R$ ${input.offer.dailyBudget}/dia`
        : "Há gasto registrado nas campanhas."
      : "Defina um orçamento diário na oferta.",
  });

  const opsOk = input.openComplaints < 5;
  checks.push({
    id: "ops",
    label: "Operação sob controle",
    ok: opsOk,
    detail:
      input.openComplaints >= 5
        ? `${input.openComplaints} reclamações abertas — resolva antes de escalar ads.`
        : input.pendingOrders > 10
          ? `${input.pendingOrders} pedidos em aberto — acompanhe atendimento.`
          : "Pedidos e reclamações sob controle.",
    href: input.openComplaints >= 5 ? "/admin/reclamacoes" : "/admin/pedidos",
  });

  const weights = [20, 20, 20, 15, 10, 10, 5];
  let score = 0;
  checks.forEach((c, i) => {
    if (c.ok) score += weights[i] || 0;
  });

  const ready = score >= 70;
  return {
    score,
    ready,
    checks,
    message: ready
      ? "Pode anunciar. Comece com orçamento diário fixo e 3 criativos."
      : "Não anuncie ainda. Resolva os itens em vermelho para não queimar verba.",
  };
}

export function buildOrganicWeek(input: {
  productName: string;
  productSlug: string | null;
  siteUrl: string;
  metaLink: string;
}): OrganicDayPlan[] {
  const name = input.productName || "peça em destaque";
  const link = input.metaLink;
  return [
    {
      day: "Segunda",
      kind: "Story",
      title: "Escolha da semana",
      caption: `Mostre o ${name} e diga: “Oferta da semana — link no site”.`,
      cta: link,
    },
    {
      day: "Terça",
      kind: "Reel",
      title: "Detalhe que vende",
      caption: `Close do tecido/costura + movimento. CTA: compre no site.`,
      cta: link,
    },
    {
      day: "Quarta",
      kind: "Post",
      title: "Prova social",
      caption: `Depoimento ou look de cliente (Looks) com o ${name}.`,
      cta: link,
    },
    {
      day: "Quinta",
      kind: "Story",
      title: "Estoque / tamanhos",
      caption: `Enquete de tamanho + “últimas unidades” se fizer sentido.`,
      cta: link,
    },
    {
      day: "Sexta",
      kind: "Reel",
      title: "Bastidor",
      caption: `Embalagem, envio ou prova de uso — humaniza a marca.`,
      cta: link,
    },
    {
      day: "Sábado",
      kind: "WhatsApp",
      title: "Status + atendimento",
      caption: `Status com foto do ${name} e link. Responda DMs rápido.`,
      cta: link,
    },
    {
      day: "Domingo",
      kind: "Story",
      title: "Lembrete suave",
      caption: `“Ainda dá tempo de garantir o look da semana” + link.`,
      cta: link,
    },
  ];
}

export const FITNESS_HOOKS = [
  "Se o conjunto marca no lugar errado, o problema não é você — é a modelagem.",
  "Treino pesado pede tecido que segura e não marca suor demais.",
  "O look que você usa na academia e ainda sai pra um café.",
  "Últimas unidades do tamanho que mais vende — corre no site.",
  "Antes: foto do produto. Depois: você se sentindo pronta. Escolha o depois.",
  "Costura reforçada + caimento que valoriza — detalhes que o anúncio não inventa.",
];

export type TodayTask = {
  id: ChecklistItemId;
  title: string;
  detail: string;
  href: string;
  hrefLabel: string;
};

export function buildTodayTasks(input: {
  productName: string | null;
  preReady: boolean;
  health: TrafficHealth;
  pendingOrders: number;
}): TodayTask[] {
  return [
    {
      id: "stock",
      title: "Conferir estoque da oferta",
      detail: input.productName
        ? `Garanta tamanhos do ${input.productName} antes de postar/anunciar.`
        : "Defina a oferta da semana e confira o estoque.",
      href: "/admin/estoque",
      hrefLabel: "Estoque",
    },
    {
      id: "story",
      title: "Postar 1 Story",
      detail: "Use a ideia do calendário orgânico ou Stories do dia.",
      href: "/admin/stories",
      hrefLabel: "Stories",
    },
    {
      id: "reel",
      title: "Postar ou preparar 1 Reel",
      detail: "Teste o criativo no orgânico antes de pagar anúncio.",
      href: "/admin/banco-videos",
      hrefLabel: "Banco de vídeos",
    },
    {
      id: "ads",
      title: input.preReady
        ? "Checar / rodar anúncio"
        : "Preparar anúncio (score ainda baixo)",
      detail: input.preReady
        ? "Use o link UTM da oferta e orçamento diário fixo."
        : "Complete o Pré-anúncio antes de gastar.",
      href: "/admin/trafego",
      hrefLabel: "Pré-anúncio",
    },
    {
      id: "orders",
      title: "Pedidos e WhatsApp",
      detail:
        input.pendingOrders > 0
          ? `${input.pendingOrders} pedido(s) em aberto — responda rápido.`
          : "Olhe pedidos pendentes e DMs do dia.",
      href: "/admin/pedidos",
      hrefLabel: "Pedidos",
    },
    {
      id: "diagnose",
      title: "Olhar diagnóstico do funil",
      detail:
        input.health === "good"
          ? "Resultados ok — mantenha o que funciona."
          : "Veja o funil e a ação sugerida.",
      href: "/admin/trafego",
      hrefLabel: "Funil",
    },
  ];
}
