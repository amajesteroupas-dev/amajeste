import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/admin-auth";
import { emitSaleInvoice } from "@/lib/nfe";

type Ctx = { params: Promise<{ orderId: string }> };

export async function POST(_req: NextRequest, ctx: Ctx) {
  const session = await adminAuth();
  if (
    !session?.user ||
    (session.user.role !== "ADMIN" && session.user.role !== "STAFF")
  ) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const { orderId } = await ctx.params;
  const result = await emitSaleInvoice(orderId);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
