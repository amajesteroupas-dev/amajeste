import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/admin-auth";
import { createMetaSalesCampaign } from "@/lib/meta-ads-create";
import {
  buildOfferCopy,
  buildUtmLinks,
  getSalesOffer,
  listOfferProductOptions,
} from "@/lib/sales-hub";
import { getTrafficIntegrationSecrets } from "@/lib/traffic-ads-settings";
import {
  actorFromSession,
  requestIp,
  writeAuditLog,
} from "@/lib/audit-log";

async function requireStaff() {
  const session = await adminAuth();
  if (
    !session?.user ||
    (session.user.role !== "ADMIN" && session.user.role !== "STAFF")
  ) {
    return null;
  }
  return session;
}

export async function POST(req: NextRequest) {
  const session = await requireStaff();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL || "https://amajeste.com.br"
  ).replace(/\/$/, "");

  const offer = await getSalesOffer();
  const products = await listOfferProductOptions(50);
  const product =
    products.find((p) => p.id === (body.productId || offer.productId)) || null;
  if (!product) {
    return NextResponse.json(
      { error: "Defina a oferta da semana (produto com estoque) antes." },
      { status: 400 }
    );
  }

  const secrets = await getTrafficIntegrationSecrets();
  const pageId = String(body.pageId || secrets.meta.pageId || "").trim();
  const links = buildUtmLinks({
    siteUrl,
    productSlug: product.slug,
    campaignSlug: offer.campaignSlug,
  });
  const copy = buildOfferCopy({
    productName: product.name,
    price: product.price,
    headline: offer.headline || product.name,
    siteUrl,
  });

  const result = await createMetaSalesCampaign({
    name: `Majesté · ${product.name}`.slice(0, 180),
    dailyBudgetBrl: Number(body.dailyBudget) || offer.dailyBudget || 30,
    linkUrl: links[0]?.url || `${siteUrl}/produto/${product.slug}`,
    message: copy.adShort,
    headline: offer.headline || product.name,
    description: "Compre no site com Pix e frete calculado.",
    imageUrl: product.imageUrl,
    pageId,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 400 });
  }

  void writeAuditLog({
    category: "marketing",
    action: "create",
    summary: `Campanha Meta criada (pausada): ${product.name}`,
    entityType: "MetaCampaign",
    entityId: result.campaignId,
    detail: result,
    actor: actorFromSession(session),
    ip: requestIp(req),
  });

  return NextResponse.json(result);
}
