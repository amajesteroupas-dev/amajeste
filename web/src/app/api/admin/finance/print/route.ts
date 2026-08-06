import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { enqueueOrderPrint } from "@/lib/order-print";

export async function GET() {
  const session = await adminAuth();
  if (
    !session?.user ||
    (session.user.role !== "ADMIN" && session.user.role !== "STAFF")
  ) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const jobs = await prisma.printJob.findMany({
    where: { status: { in: ["PENDING", "FAILED"] } },
    orderBy: { createdAt: "desc" },
    take: 40,
    include: {
      order: {
        select: {
          orderNumber: true,
          guestName: true,
          total: true,
          printStatus: true,
        },
      },
    },
  });

  return NextResponse.json({
    jobs: jobs.map((j) => ({
      id: j.id,
      status: j.status,
      provider: j.provider,
      error: j.error,
      createdAt: j.createdAt.toISOString(),
      orderId: j.orderId,
      orderNumber: j.order.orderNumber,
      guestName: j.order.guestName,
      total: Number(j.order.total),
      html: j.payload,
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await adminAuth();
  if (
    !session?.user ||
    (session.user.role !== "ADMIN" && session.user.role !== "STAFF")
  ) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const orderId = String(body.orderId || "").trim();
  if (!orderId) {
    return NextResponse.json({ error: "orderId obrigatório" }, { status: 400 });
  }
  const result = await enqueueOrderPrint(orderId);
  return NextResponse.json(result);
}
