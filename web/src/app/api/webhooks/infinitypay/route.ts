import { NextRequest, NextResponse } from "next/server";

/** Webhook Infinity Pay / InfinitePay. */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    console.info("[infinitypay webhook]", JSON.stringify(body).slice(0, 2000));
    // TODO: conferir order_nsu e marcar pedido como pago
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, service: "infinitypay-webhook" });
}
