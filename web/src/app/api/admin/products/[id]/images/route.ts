import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { normalizeColor } from "@/lib/colors";
import { normalizeImageUrl } from "@/lib/product-image-duplicates";
import {
  actorFromSession,
  requestIp,
  writeAuditLog,
} from "@/lib/audit-log";

type Props = { params: Promise<{ id: string }> };

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

/** Anexa URL do banco de imagens ao produto (não duplica a mesma URL). */
export async function POST(req: NextRequest, { params }: Props) {
  const session = await requireStaff();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id: productId } = await params;
  const body = await req.json();
  const url = String(body.url || "").trim();
  if (!url) {
    return NextResponse.json({ error: "URL obrigatória" }, { status: 400 });
  }

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) {
    return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });
  }

  const norm = normalizeImageUrl(url);
  const existingRows = await prisma.productImage.findMany({
    where: { productId },
    select: { id: true, url: true, alt: true },
  });
  const already = existingRows.find((r) => normalizeImageUrl(r.url) === norm);
  if (already) {
    return NextResponse.json(
      {
        error:
          "Esta foto já está neste produto. Não adicione de novo — só escolha a cor na foto existente.",
        existingId: already.id,
        duplicate: true,
      },
      { status: 409 }
    );
  }

  const count = existingRows.length;
  const alt = body.alt ? String(body.alt) : product.name;
  const image = await prisma.productImage.create({
    data: {
      productId,
      url,
      alt,
      isPrimary: count === 0,
      sortOrder: count,
    },
  });

  void writeAuditLog({
    category: "products",
    action: "create",
    summary: `Foto anexada a “${product.name}”`,
    entityType: "ProductImage",
    entityId: image.id,
    detail: { productId, url, alt },
    actor: actorFromSession(session),
    ip: requestIp(req),
  });

  return NextResponse.json(image);
}

export async function DELETE(req: NextRequest, { params }: Props) {
  const session = await requireStaff();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id: productId } = await params;
  const imageId = req.nextUrl.searchParams.get("imageId");
  const dedupe = req.nextUrl.searchParams.get("dedupe") === "1";

  if (dedupe) {
    const rows = await prisma.productImage.findMany({
      where: { productId },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      select: { id: true, url: true, alt: true },
    });
    const keep = new Set<string>();
    const remove: string[] = [];
    const seenUrl = new Map<string, string>();

    function hasColorAlt(alt: string | null) {
      if (!alt?.trim()) return false;
      const n = normalizeColor(alt);
      return Boolean(n) && n.length <= 40;
    }

    for (const row of rows) {
      const norm = normalizeImageUrl(row.url);
      const prevId = seenUrl.get(norm);
      if (!prevId) {
        seenUrl.set(norm, row.id);
        keep.add(row.id);
        continue;
      }
      const prevRow = rows.find((r) => r.id === prevId)!;
      // Preferir a cópia que já tem cor vinculada
      if (!hasColorAlt(prevRow.alt) && hasColorAlt(row.alt)) {
        remove.push(prevId);
        keep.delete(prevId);
        seenUrl.set(norm, row.id);
        keep.add(row.id);
      } else {
        remove.push(row.id);
      }
    }

    if (remove.length) {
      await prisma.productImage.deleteMany({
        where: { productId, id: { in: remove } },
      });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { name: true },
    });
    void writeAuditLog({
      category: "products",
      action: "delete",
      summary: `Fotos duplicadas removidas de “${product?.name || productId}” (${remove.length})`,
      entityType: "Product",
      entityId: productId,
      detail: { removed: remove.length, kept: keep.size },
      actor: actorFromSession(session),
      ip: requestIp(req),
    });

    return NextResponse.json({
      ok: true,
      removed: remove.length,
      kept: keep.size,
      message:
        remove.length === 0
          ? "Nenhuma foto duplicada neste produto."
          : `${remove.length} foto(s) repetida(s) removida(s). Ficaram ${keep.size}.`,
    });
  }

  if (!imageId) {
    return NextResponse.json({ error: "imageId obrigatório" }, { status: 400 });
  }

  const existing = await prisma.productImage.findFirst({
    where: { id: imageId, productId },
    select: { id: true, url: true },
  });
  await prisma.productImage.deleteMany({
    where: { id: imageId, productId },
  });

  if (existing) {
    void writeAuditLog({
      category: "products",
      action: "delete",
      summary: `Foto removida do produto`,
      entityType: "ProductImage",
      entityId: imageId,
      detail: { productId, url: existing.url },
      actor: actorFromSession(session),
      ip: requestIp(req),
    });
  }

  return NextResponse.json({ ok: true });
}

/** Atualiza alt (vincular foto a uma cor). Uma cor = no máximo uma foto. */
export async function PATCH(req: NextRequest, { params }: Props) {
  const session = await requireStaff();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id: productId } = await params;
  const body = await req.json();
  const imageId = String(body.imageId || "");
  if (!imageId) {
    return NextResponse.json({ error: "imageId obrigatório" }, { status: 400 });
  }

  const alt =
    body.alt === null || body.alt === undefined
      ? null
      : String(body.alt).trim() || null;

  const target = await prisma.productImage.findFirst({
    where: { id: imageId, productId },
  });
  if (!target) {
    return NextResponse.json({ error: "Imagem não encontrada" }, { status: 404 });
  }

  // Se vincular cor, tirar essa cor de outras fotos do mesmo produto
  if (alt) {
    const color = normalizeColor(alt);
    const siblings = await prisma.productImage.findMany({
      where: { productId, id: { not: imageId } },
      select: { id: true, alt: true },
    });
    const clearIds = siblings
      .filter((s) => s.alt && normalizeColor(s.alt) === color)
      .map((s) => s.id);
    if (clearIds.length) {
      await prisma.productImage.updateMany({
        where: { id: { in: clearIds } },
        data: { alt: null },
      });
    }
  }

  await prisma.productImage.update({
    where: { id: imageId },
    data: { alt: alt ? normalizeColor(alt) : null },
  });

  void writeAuditLog({
    category: "products",
    action: "update",
    summary: alt
      ? `Foto vinculada à cor “${normalizeColor(alt)}”`
      : `Vínculo de cor removido da foto`,
    entityType: "ProductImage",
    entityId: imageId,
    detail: { productId, alt },
    actor: actorFromSession(session),
    ip: requestIp(req),
  });

  return NextResponse.json({ ok: true, alt: alt ? normalizeColor(alt) : null });
}

