import { NextRequest, NextResponse } from "next/server";
import { upsertAbandonedCart } from "@/lib/abandoned-cart";

export const runtime = "nodejs";

/** Beacon do carrinho (loja) — sem auth. */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const result = await upsertAbandonedCart({
    sessionId: String(body.sessionId || ""),
    email: body.email ? String(body.email) : null,
    phone: body.phone ? String(body.phone) : null,
    items: Array.isArray(body.items) ? body.items : [],
  });
  if (!result.ok) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  return NextResponse.json(result);
}
