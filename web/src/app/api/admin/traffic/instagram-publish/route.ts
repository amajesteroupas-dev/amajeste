import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/admin-auth";
import { publishInstagramPhoto } from "@/lib/instagram-publish";
import {
  buildOfferCopy,
  buildUtmLinks,
  getSalesOffer,
  listOfferProductOptions,
} from "@/lib/sales-hub";
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

  let imageUrl = body.imageUrl ? String(body.imageUrl) : "";
  let caption = body.caption ? String(body.caption) : "";

  if (!imageUrl || !caption) {
    const offer = await getSalesOffer();
    const products = await listOfferProductOptions(50);
    const product =
      products.find((p) => p.id === (body.productId || offer.productId)) ||
      null;
    if (!product?.imageUrl) {
      return NextResponse.json(
        {
          error:
            "Informe imageUrl + caption, ou defina a oferta da semana com foto.",
        },
        { status: 400 }
      );
    }
    imageUrl = product.imageUrl;
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
    caption =
      caption ||
      `${copy.adShort}\n\nLink na bio / site: ${links.find((l) => l.platform.includes("Orgânico"))?.url || links[0]?.url || siteUrl}`;
  }

  const result = await publishInstagramPhoto({ imageUrl, caption });
  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 400 });
  }

  void writeAuditLog({
    category: "marketing",
    action: "create",
    summary: "Autopost Instagram publicado",
    entityType: "InstagramPost",
    entityId: result.mediaId,
    detail: result,
    actor: actorFromSession(session),
    ip: requestIp(req),
  });

  return NextResponse.json(result);
}
