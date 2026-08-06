import { NextRequest, NextResponse } from "next/server";
import { InventoryType } from "@prisma/client";
import { adminAuth } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import {
  actorFromSession,
  requestIp,
  writeAuditLog,
} from "@/lib/audit-log";

async function requireAdmin() {
  const session = await adminAuth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return null;
  }
  return session;
}

type Action = "product_views" | "site_visits" | "orders";

/**
 * Reset de lançamento — só ADMIN.
 * Body: { action, confirm: "ZERAR" }
 *
 * Ao zerar pedidos: NÃO devolve estoque (estoque da loja já pode ter sido
 * corrigido manualmente após testes).
 */
export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json(
      { error: "Só o administrador pode zerar dados de lançamento." },
      { status: 401 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "") as Action;
  const confirm = String(body.confirm || "").trim().toUpperCase();

  if (confirm !== "ZERAR") {
    return NextResponse.json(
      { error: "Digite ZERAR para confirmar." },
      { status: 400 }
    );
  }

  if (
    action !== "product_views" &&
    action !== "site_visits" &&
    action !== "orders"
  ) {
    return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
  }

  try {
    if (action === "product_views") {
      const result = await prisma.product.updateMany({
        data: { viewCount: 0 },
      });
      void writeAuditLog({
        category: "system",
        action: "adjust",
        summary: "Lançamento: visitas dos produtos zeradas",
        entityType: "Product",
        detail: { productsUpdated: result.count },
        actor: actorFromSession(session),
        ip: requestIp(req),
      });
      return NextResponse.json({
        ok: true,
        action,
        message: `Visitas de ${result.count} produto(s) zeradas.`,
      });
    }

    if (action === "site_visits") {
      const result = await prisma.siteVisit.deleteMany({});
      void writeAuditLog({
        category: "system",
        action: "adjust",
        summary: "Lançamento: visitas do site zeradas",
        entityType: "SiteVisit",
        detail: { deleted: result.count },
        actor: actorFromSession(session),
        ip: requestIp(req),
      });
      return NextResponse.json({
        ok: true,
        action,
        message: `${result.count} visita(s) do site removida(s).`,
      });
    }

    // Pedidos: apaga registros e limpa vínculos — SEM mexer no estoque atual
    const orders = await prisma.order.findMany({
      select: { id: true, orderNumber: true },
    });
    const orderIds = orders.map((o) => o.id);
    const orderNumbers = orders.map((o) => o.orderNumber);

    await prisma.$transaction(async (tx) => {
      if (orderIds.length) {
        await tx.cashEntry.deleteMany({
          where: { orderId: { in: orderIds } },
        });
        await tx.complaint.updateMany({
          where: { orderId: { in: orderIds } },
          data: { orderId: null },
        });
        await tx.discountCoupon.updateMany({
          where: { orderId: { in: orderIds } },
          data: { orderId: null, used: false, usedAt: null },
        });
      }

      // Remove histórico de movimentações SALE ligadas aos pedidos (não altera stock)
      if (orderNumbers.length) {
        await tx.inventoryMovement.deleteMany({
          where: {
            type: { in: [InventoryType.SALE, InventoryType.RETURN] },
            OR: orderNumbers.flatMap((n) => [
              { note: { contains: n } },
              { note: { contains: `Pedido ${n}` } },
            ]),
          },
        });
      }

      if (orderIds.length) {
        await tx.order.deleteMany({ where: { id: { in: orderIds } } });
      }
    });

    void writeAuditLog({
      category: "system",
      action: "delete",
      summary: `Lançamento: ${orders.length} pedido(s) apagado(s) (estoque NÃO alterado)`,
      entityType: "Order",
      detail: {
        ordersDeleted: orders.length,
        stockUntouched: true,
      },
      actor: actorFromSession(session),
      ip: requestIp(req),
    });

    return NextResponse.json({
      ok: true,
      action,
      message: `${orders.length} pedido(s) removido(s). O estoque atual NÃO foi alterado. Pendências e vendas do painel zeradas.`,
      ordersDeleted: orders.length,
      stockUntouched: true,
    });
  } catch (err) {
    console.error("[launch-reset]", err);
    return NextResponse.json(
      { error: "Falha ao zerar. Tente de novo ou confira o log do servidor." },
      { status: 500 }
    );
  }
}
