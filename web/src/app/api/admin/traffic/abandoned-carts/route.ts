import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { processAbandonedCartReminders } from "@/lib/abandoned-cart";

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

export async function GET() {
  if (!(await requireStaff())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const items = await prisma.abandonedCart.findMany({
    orderBy: { lastSeenAt: "desc" },
    take: 80,
  });
  return NextResponse.json({
    items: items.map((c) => ({
      ...c,
      subtotal: Number(c.subtotal),
      lastSeenAt: c.lastSeenAt.toISOString(),
      remindedAt: c.remindedAt?.toISOString() || null,
      recoveredAt: c.recoveredAt?.toISOString() || null,
      createdAt: c.createdAt.toISOString(),
    })),
  });
}

export async function POST() {
  if (!(await requireStaff())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const result = await processAbandonedCartReminders(40);
  return NextResponse.json(result);
}
