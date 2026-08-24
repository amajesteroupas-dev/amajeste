import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import {
  actorFromSession,
  requestIp,
  writeAuditLog,
} from "@/lib/audit-log";
import {
  getProductReadiness,
  readinessErrorPayload,
} from "@/lib/product-readiness";

type Props = { params: Promise<{ id: string }> };

function shippingOrNull(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return n > 0 && !Number.isNaN(n) ? n : null;
}

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

export async function PATCH(req: NextRequest, { params }: Props) {
  const session = await requireStaff();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  // Restaurar da lixeira
  if (body.restore === true) {
    const willBeActive =
      body.active !== undefined ? Boolean(body.active) : true;
    if (willBeActive) {
      const readiness = await getProductReadiness(id);
      if (!readiness.ok) {
        return NextResponse.json(
          {
            ...readinessErrorPayload(readiness),
            error:
              "Não dá para restaurar como ativo ainda. Corrija os itens abaixo (ou restaure como inativo).",
          },
          { status: 400 }
        );
      }
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        deletedAt: null,
        active: willBeActive,
      },
    });
    void writeAuditLog({
      category: "products",
      action: "restore",
      summary: `Produto restaurado: ${product.name}`,
      entityType: "Product",
      entityId: product.id,
      actor: actorFromSession(session),
      ip: requestIp(req),
    });
    return NextResponse.json({
      ok: true,
      restored: true,
      product,
      message: `Produto "${product.name}" restaurado.`,
    });
  }

  const existing = await prisma.product.findUnique({
    where: { id },
    select: { active: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });
  }

  const willBeActive =
    body.active !== undefined ? Boolean(body.active) : existing.active;

  const dimOverrides = {
    ...(body.weightKg !== undefined
      ? { weightKg: shippingOrNull(body.weightKg) }
      : {}),
    ...(body.lengthCm !== undefined
      ? { lengthCm: shippingOrNull(body.lengthCm) }
      : {}),
    ...(body.widthCm !== undefined
      ? { widthCm: shippingOrNull(body.widthCm) }
      : {}),
    ...(body.heightCm !== undefined
      ? { heightCm: shippingOrNull(body.heightCm) }
      : {}),
  };

  if (willBeActive) {
    const readiness = await getProductReadiness(id, {
      ...(body.price !== undefined ? { price: Number(body.price) } : {}),
      ...(body.categoryId !== undefined
        ? { categoryId: String(body.categoryId || "") || null }
        : {}),
      ...dimOverrides,
    });
    if (!readiness.ok) {
      return NextResponse.json(readinessErrorPayload(readiness), {
        status: 400,
      });
    }
  }

  const product = await prisma.product.update({
    where: { id },
    data: {
      name: body.name,
      description: body.description,
      price: body.price,
      costPrice: body.costPrice,
      categoryId: body.categoryId,
      featured: body.featured,
      ...(body.destaque !== undefined
        ? { destaque: Boolean(body.destaque) }
        : {}),
      ...(body.active !== undefined ? { active: Boolean(body.active) } : {}),
      ...(body.installmentsMax !== undefined
        ? { installmentsMax: Number(body.installmentsMax) }
        : {}),
      ...(body.interestFree !== undefined
        ? { interestFree: Boolean(body.interestFree) }
        : {}),
      ...(body.pixDiscountPercent !== undefined
        ? { pixDiscountPercent: Number(body.pixDiscountPercent) }
        : {}),
      ...(body.showPaymentFlags !== undefined
        ? { showPaymentFlags: Boolean(body.showPaymentFlags) }
        : {}),
      ...("weightKg" in dimOverrides
        ? { weightKg: dimOverrides.weightKg }
        : {}),
      ...("lengthCm" in dimOverrides
        ? { lengthCm: dimOverrides.lengthCm }
        : {}),
      ...("widthCm" in dimOverrides ? { widthCm: dimOverrides.widthCm } : {}),
      ...("heightCm" in dimOverrides
        ? { heightCm: dimOverrides.heightCm }
        : {}),
    },
  });

  // Preço do produto é a fonte da verdade no admin — limpa overrides
  // antigos das variantes (ex.: import Woo) para vitrine/PDP/checkout baterem.
  if (body.price !== undefined) {
    await prisma.productVariant.updateMany({
      where: { productId: id },
      data: { price: null },
    });
  }

  void writeAuditLog({
    category: "products",
    action: "update",
    summary: `Produto alterado: ${product.name}`,
    entityType: "Product",
    entityId: product.id,
    detail: {
      name: product.name,
      price: product.price,
      active: product.active,
      featured: product.featured,
      variantPricesCleared: body.price !== undefined,
    },
    actor: actorFromSession(session),
    ip: requestIp(req),
  });
  return NextResponse.json(product);
}

export async function DELETE(req: NextRequest, { params }: Props) {
  const session = await requireStaff();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const permanent =
    req.nextUrl.searchParams.get("permanent") === "1" ||
    req.nextUrl.searchParams.get("permanent") === "true";

  const product = await prisma.product.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      deletedAt: true,
      variants: { select: { id: true } },
    },
  });
  if (!product) {
    return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });
  }

  // Exclusão permanente (só da lixeira)
  if (permanent) {
    if (!product.deletedAt) {
      return NextResponse.json(
        { error: "Mova o produto para a lixeira antes de excluir definitivamente." },
        { status: 400 }
      );
    }

    const variantIds = product.variants.map((v) => v.id);
    const orderItems =
      variantIds.length > 0
        ? await prisma.orderItem.count({
            where: { variantId: { in: variantIds } },
          })
        : 0;

    if (orderItems > 0) {
      return NextResponse.json(
        {
          error:
            "Este produto tem pedidos vinculados e não pode ser apagado de forma definitiva. Mantenha na lixeira ou restaure como inativo.",
        },
        { status: 409 }
      );
    }

    await prisma.$transaction(async (tx) => {
      if (variantIds.length) {
        await tx.inventoryMovement.deleteMany({
          where: { variantId: { in: variantIds } },
        });
      }
      await tx.product.delete({ where: { id } });
    });

    void writeAuditLog({
      category: "products",
      action: "delete",
      summary: `Produto excluído definitivamente: ${product.name}`,
      entityType: "Product",
      entityId: product.id,
      detail: { permanent: true },
      actor: actorFromSession(session),
      ip: requestIp(req),
    });

    return NextResponse.json({
      ok: true,
      permanent: true,
      message: `Produto "${product.name}" excluído definitivamente.`,
    });
  }

  // Enviar para lixeira
  await prisma.product.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      active: false,
    },
  });

  void writeAuditLog({
    category: "products",
    action: "delete",
    summary: `Produto movido para lixeira: ${product.name}`,
    entityType: "Product",
    entityId: product.id,
    detail: { trashed: true },
    actor: actorFromSession(session),
    ip: requestIp(req),
  });

  return NextResponse.json({
    ok: true,
    trashed: true,
    message: `Produto "${product.name}" movido para a lixeira. Você pode restaurar depois.`,
  });
}
