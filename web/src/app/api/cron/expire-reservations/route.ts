import { NextRequest, NextResponse } from "next/server";
import { expireStaleStockReservations } from "@/lib/order-stock-reserve";

/**
 * Expira reservas de estoque de pedidos PENDING sem pagamento.
 * Protegido por CRON_SECRET (header Authorization: Bearer …) ou chamado
 * internamente pelo checkout / admin.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (secret) {
    const auth = req.headers.get("authorization") || "";
    const token = auth.replace(/^Bearer\s+/i, "").trim();
    const q = req.nextUrl.searchParams.get("secret") || "";
    if (token !== secret && q !== secret) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
  }

  const result = await expireStaleStockReservations(100);
  return NextResponse.json({ ok: true, ...result });
}

export async function GET(req: NextRequest) {
  return POST(req);
}
