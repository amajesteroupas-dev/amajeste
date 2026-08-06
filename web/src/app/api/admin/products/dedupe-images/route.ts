import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import {
  isHdrCollisionSharedUrl,
  normalizeImageUrl,
} from "@/lib/product-image-duplicates";
import {
  actorFromSession,
  requestIp,
  writeAuditLog,
} from "@/lib/audit-log";

export const runtime = "nodejs";

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

/**
 * Mantém a foto só no produto indicado; remove dos demais.
 *
 * body: {
 *   keepProductId: string,
 *   kind: "url" | "arquivo",
 *   matchUrl?: string,       // kind=url — remove outras com mesma URL
 *   removeImageIds?: string[] // kind=arquivo — ids a remover (outros produtos)
 * }
 */
export async function POST(req: NextRequest) {
  const session = await requireStaff();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const keepProductId = String(body.keepProductId || "").trim();
  const kind = String(body.kind || "url") as "url" | "arquivo";

  if (!keepProductId) {
    return NextResponse.json(
      { error: "Selecione o produto que deve ficar com a foto" },
      { status: 400 }
    );
  }

  const keepProduct = await prisma.product.findFirst({
    where: { id: keepProductId, deletedAt: null },
    select: { id: true, name: true },
  });
  if (!keepProduct) {
    return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });
  }

  let removed = 0;
  let removedFrom: string[] = [];

  if (kind === "url") {
    const matchUrl = normalizeImageUrl(String(body.matchUrl || body.url || ""));
    if (!matchUrl) {
      return NextResponse.json({ error: "URL da foto obrigatória" }, { status: 400 });
    }

    if (isHdrCollisionSharedUrl(matchUrl)) {
      return NextResponse.json(
        {
          error:
            "Esta URL é colisão do conversor HDR (arquivo compartilhado por engano). Remover “duplicatas” apaga fotos de vários produtos. Reenvie as fotos de cada produto em vez de usar esta ferramenta.",
          code: "hdr_collision",
        },
        { status: 400 }
      );
    }

    const candidates = await prisma.productImage.findMany({
      where: {
        productId: { not: keepProductId },
        product: { deletedAt: null },
      },
      select: {
        id: true,
        url: true,
        productId: true,
        product: { select: { name: true } },
      },
    });

    const toDelete = candidates.filter(
      (c) => normalizeImageUrl(c.url) === matchUrl
    );
    if (toDelete.length === 0) {
      return NextResponse.json({
        ok: true,
        removed: 0,
        message: "Nada a remover — só este produto já tinha a foto.",
      });
    }

    // Bloqueia se algum produto ficaria sem nenhuma foto
    const deleteCountByProduct = new Map<string, number>();
    const nameByProduct = new Map<string, string>();
    for (const row of toDelete) {
      deleteCountByProduct.set(
        row.productId,
        (deleteCountByProduct.get(row.productId) || 0) + 1
      );
      nameByProduct.set(row.productId, row.product.name);
    }
    const wouldEmpty: string[] = [];
    for (const [productId, nDelete] of deleteCountByProduct) {
      const total = await prisma.productImage.count({ where: { productId } });
      if (total - nDelete <= 0) {
        wouldEmpty.push(nameByProduct.get(productId) || productId);
      }
    }
    if (wouldEmpty.length > 0) {
      return NextResponse.json(
        {
          error: `Operação bloqueada: estes produtos ficariam sem foto — ${wouldEmpty.join(", ")}. Se a URL foi compartilhada por bug (HDR), reenvie as fotos de cada um; não use remover duplicata.`,
          code: "would_empty_products",
          wouldEmpty,
        },
        { status: 400 }
      );
    }

    await prisma.productImage.deleteMany({
      where: { id: { in: toDelete.map((t) => t.id) } },
    });
    removed = toDelete.length;
    removedFrom = [...new Set(toDelete.map((t) => t.product.name))];
  } else {
    const removeImageIds = Array.isArray(body.removeImageIds)
      ? body.removeImageIds.map((id: unknown) => String(id)).filter(Boolean)
      : [];
    if (!removeImageIds.length) {
      return NextResponse.json(
        { error: "Nenhuma imagem para remover" },
        { status: 400 }
      );
    }

    const rows = await prisma.productImage.findMany({
      where: {
        id: { in: removeImageIds },
        productId: { not: keepProductId },
      },
      select: {
        id: true,
        productId: true,
        product: { select: { name: true } },
      },
    });

    const deleteCountByProduct = new Map<string, number>();
    const nameByProduct = new Map<string, string>();
    for (const row of rows) {
      deleteCountByProduct.set(
        row.productId,
        (deleteCountByProduct.get(row.productId) || 0) + 1
      );
      nameByProduct.set(row.productId, row.product.name);
    }
    const wouldEmpty: string[] = [];
    for (const [productId, nDelete] of deleteCountByProduct) {
      const total = await prisma.productImage.count({ where: { productId } });
      if (total - nDelete <= 0) {
        wouldEmpty.push(nameByProduct.get(productId) || productId);
      }
    }
    if (wouldEmpty.length > 0) {
      return NextResponse.json(
        {
          error: `Operação bloqueada: estes produtos ficariam sem foto — ${wouldEmpty.join(", ")}.`,
          code: "would_empty_products",
          wouldEmpty,
        },
        { status: 400 }
      );
    }

    await prisma.productImage.deleteMany({
      where: { id: { in: rows.map((r) => r.id) } },
    });
    removed = rows.length;
    removedFrom = [...new Set(rows.map((r) => r.product.name))];
  }

  void writeAuditLog({
    category: "products",
    action: "update",
    summary: `Foto duplicada: manteve em “${keepProduct.name}”, removeu de ${removedFrom.length} produto(s)`,
    entityType: "Product",
    entityId: keepProductId,
    detail: { kind, removed, removedFrom },
    actor: actorFromSession(session),
    ip: requestIp(req),
  });

  return NextResponse.json({
    ok: true,
    removed,
    keepProductName: keepProduct.name,
    removedFrom,
    message:
      removed === 0
        ? "Nada removido."
        : `Foto mantida em “${keepProduct.name}”. Removida de: ${removedFrom.join(", ")}.`,
  });
}
