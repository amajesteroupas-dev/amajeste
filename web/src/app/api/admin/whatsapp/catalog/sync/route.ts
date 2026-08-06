import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import {
  buildCatalogItems,
  getWhatsAppCatalogConfig,
  syncCatalogItems,
} from "@/lib/whatsapp-catalog";

/**
 * Sincroniza o catálogo da loja com o Commerce Manager da Meta
 * (mesmo catálogo usado pelo WhatsApp Business Platform).
 *
 * Requer META_CATALOG_ID + META_CATALOG_ACCESS_TOKEN
 * (ou WHATSAPP_CATALOG_* / INSTAGRAM_ACCESS_TOKEN como fallback do token).
 */
export async function POST() {
  const session = await adminAuth();
  if (
    !session?.user ||
    (session.user.role !== "ADMIN" && session.user.role !== "STAFF")
  ) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const config = getWhatsAppCatalogConfig();
  if (!config) {
    return NextResponse.json(
      {
        error:
          "Configure META_CATALOG_ID e META_CATALOG_ACCESS_TOKEN no servidor (Commerce Manager da Meta) para sincronizar o catálogo com o WhatsApp.",
        configured: false,
      },
      { status: 400 }
    );
  }

  const products = await prisma.product.findMany({
    where: { deletedAt: null },
    include: {
      images: {
        orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
      },
      variants: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  const { items, skipped } = buildCatalogItems(products);

  if (items.length === 0) {
    return NextResponse.json(
      {
        error:
          "Nenhum produto ativo com imagem para enviar. Cadastre foto e ative o produto antes de sincronizar.",
        synced: 0,
        skipped,
        configured: true,
      },
      { status: 400 }
    );
  }

  const result = await syncCatalogItems(config, items);

  if (!result.ok) {
    return NextResponse.json(
      {
        error: result.errors[0] || "Falha ao sincronizar com o catálogo Meta",
        synced: result.synced,
        skipped,
        batches: result.batches,
        errors: result.errors,
      },
      { status: 502 }
    );
  }

  return NextResponse.json({
    ok: true,
    message: `${result.synced} itens enviados ao catálogo Meta (WhatsApp Business + Loja do Instagram). ${skipped} ignorados.`,
    synced: result.synced,
    skipped,
    batches: result.batches,
    handle: result.handle,
  });
}

export async function GET() {
  const session = await adminAuth();
  if (
    !session?.user ||
    (session.user.role !== "ADMIN" && session.user.role !== "STAFF")
  ) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const config = getWhatsAppCatalogConfig();
  return NextResponse.json({
    configured: Boolean(config),
    catalogId: config?.catalogId
      ? `${config.catalogId.slice(0, 4)}…`
      : null,
  });
}
