import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import {
  actorFromSession,
  requestIp,
  writeAuditLog,
} from "@/lib/audit-log";

type Props = { params: Promise<{ id: string }> };

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

export async function POST(req: NextRequest, { params }: Props) {
  const session = await requireStaff();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const sku = String(body.sku || "").trim();
  const size = String(body.size || "").trim();
  const color = String(body.color || "").trim();
  if (!sku || !size || !color) {
    return NextResponse.json(
      { error: "SKU, tamanho e cor são obrigatórios" },
      { status: 400 }
    );
  }

  try {
    const product = await prisma.product.findUnique({ where: { id } });
    const unitCost = Number(product?.costPrice || 0);
    const stockQty = Number(body.stock || 0);

    const variant = await prisma.productVariant.create({
      data: {
        productId: id,
        sku,
        size,
        color,
        colorHex: body.colorHex ? String(body.colorHex) : null,
        stock: stockQty,
        avgCost: unitCost,
        active: body.active !== false,
      },
    });

    if (stockQty > 0) {
      await prisma.inventoryMovement.create({
        data: {
          variantId: variant.id,
          type: "IN",
          quantity: stockQty,
          unitCost: unitCost > 0 ? unitCost : undefined,
          totalCost: unitCost > 0 ? unitCost * stockQty : undefined,
          purchaseDate: new Date(),
          note: "Estoque inicial variante",
          createdBy: session.user.email || undefined,
        },
      });
    }

    void writeAuditLog({
      category: "products",
      action: "create",
      summary: `Variante criada: ${sku} (${size}/${color})`,
      entityType: "ProductVariant",
      entityId: variant.id,
      detail: { productId: id, stock: stockQty },
      actor: actorFromSession(session),
      ip: requestIp(req),
    });

    return NextResponse.json(variant);
  } catch {
    return NextResponse.json(
      { error: "SKU ou combinação tamanho/cor já existe" },
      { status: 400 }
    );
  }
}

export async function PATCH(req: NextRequest, { params }: Props) {
  const session = await requireStaff();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id: productId } = await params;
  const body = await req.json();
  const variantId = String(body.id || body.variantId || "").trim();
  if (!variantId) {
    return NextResponse.json({ error: "id da variante obrigatório" }, { status: 400 });
  }

  const existing = await prisma.productVariant.findFirst({
    where: { id: variantId, productId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Variante não encontrada" }, { status: 404 });
  }

  const data: {
    sku?: string;
    size?: string;
    color?: string;
    colorHex?: string | null;
    stock?: number;
    active?: boolean;
  } = {};

  if (body.sku !== undefined) data.sku = String(body.sku).trim();
  if (body.size !== undefined) data.size = String(body.size).trim();
  if (body.color !== undefined) data.color = String(body.color).trim();
  if (body.colorHex !== undefined) {
    data.colorHex = body.colorHex ? String(body.colorHex) : null;
  }
  if (body.active !== undefined) data.active = Boolean(body.active);

  let stockDelta = 0;
  // Só altera estoque se vier número válido (string vazia / null = manter)
  if (
    body.stock !== undefined &&
    body.stock !== null &&
    String(body.stock).trim() !== ""
  ) {
    const nextStock = Math.max(0, Math.floor(Number(body.stock)));
    if (Number.isNaN(nextStock)) {
      return NextResponse.json({ error: "Estoque inválido" }, { status: 400 });
    }
    data.stock = nextStock;
    stockDelta = nextStock - existing.stock;
  }

  const deactivating =
    data.active === false && existing.active !== false;
  if (deactivating) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { active: true },
    });
    if (product?.active) {
      const otherActive = await prisma.productVariant.count({
        where: {
          productId,
          active: true,
          id: { not: variantId },
        },
      });
      if (otherActive === 0) {
        return NextResponse.json(
          {
            error:
              "Não dá para desativar a última variante enquanto o produto está ativo na loja.",
            issues: [
              {
                code: "variants",
                message: "Última variante ativa.",
                hint: "Desmarque “Ativo na loja” no produto ou reative outra variante antes.",
              },
            ],
          },
          { status: 400 }
        );
      }
    }
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const variant = await tx.productVariant.update({
        where: { id: variantId },
        data,
      });
      if (stockDelta !== 0) {
        await tx.inventoryMovement.create({
          data: {
            variantId,
            type: stockDelta > 0 ? "IN" : "OUT",
            quantity: stockDelta,
            note: "Ajuste ao editar variante",
            createdBy: session.user.email || undefined,
          },
        });
      }
      return variant;
    });
    void writeAuditLog({
      category: "products",
      action: "update",
      summary: `Variante alterada: ${updated.sku}`,
      entityType: "ProductVariant",
      entityId: updated.id,
      detail: { ...data, stockDelta },
      actor: actorFromSession(session),
      ip: requestIp(req),
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json(
      { error: "Não foi possível salvar (SKU ou tamanho/cor duplicados?)" },
      { status: 400 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: Props) {
  const session = await requireStaff();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id: productId } = await params;
  const variantId = req.nextUrl.searchParams.get("variantId");
  if (!variantId) {
    return NextResponse.json({ error: "variantId obrigatório" }, { status: 400 });
  }

  const existing = await prisma.productVariant.findFirst({
    where: { id: variantId, productId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Variante não encontrada" }, { status: 404 });
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { active: true },
  });
  if (product?.active && existing.active !== false) {
    const otherActive = await prisma.productVariant.count({
      where: {
        productId,
        active: true,
        id: { not: variantId },
      },
    });
    if (otherActive === 0) {
      return NextResponse.json(
        {
          error:
            "Não dá para remover a última variante enquanto o produto está ativo na loja.",
          issues: [
            {
              code: "variants",
              message: "Última variante ativa.",
              hint: "Desmarque “Ativo na loja” no produto antes de excluir ou desativar esta opção.",
            },
          ],
        },
        { status: 400 }
      );
    }
  }

  try {
    await prisma.$transaction([
      prisma.inventoryMovement.deleteMany({ where: { variantId } }),
      prisma.productVariant.delete({ where: { id: variantId } }),
    ]);
    void writeAuditLog({
      category: "products",
      action: "delete",
      summary: `Variante excluída: ${existing.sku}`,
      entityType: "ProductVariant",
      entityId: variantId,
      actor: actorFromSession(session),
      ip: requestIp(req),
    });
    return NextResponse.json({ ok: true });
  } catch {
    // Pode ter pedido vinculado — desativa sem zerar o estoque
    if (product?.active && existing.active !== false) {
      const otherActive = await prisma.productVariant.count({
        where: {
          productId,
          active: true,
          id: { not: variantId },
        },
      });
      if (otherActive === 0) {
        return NextResponse.json(
          {
            error:
              "Variante usada em pedidos e é a última ativa — desative o produto antes.",
            issues: [
              {
                code: "variants",
                message: "Última variante ativa (com pedidos).",
                hint: "Desmarque “Ativo na loja” e então desative esta variante.",
              },
            ],
          },
          { status: 400 }
        );
      }
    }
    await prisma.productVariant.update({
      where: { id: variantId },
      data: { active: false },
    });
    void writeAuditLog({
      category: "products",
      action: "update",
      summary: `Variante desativada: ${existing.sku}`,
      entityType: "ProductVariant",
      entityId: variantId,
      detail: { deactivated: true },
      actor: actorFromSession(session),
      ip: requestIp(req),
    });
    return NextResponse.json({
      ok: true,
      deactivated: true,
      message:
        "Variante desativada (já usada em pedidos). O estoque foi mantido.",
    });
  }
}
