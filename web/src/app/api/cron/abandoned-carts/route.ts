import { NextRequest, NextResponse } from "next/server";
import { processAbandonedCartReminders } from "@/lib/abandoned-cart";

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

  const result = await processAbandonedCartReminders(40);
  return NextResponse.json({ ok: true, ...result });
}

export async function GET(req: NextRequest) {
  return POST(req);
}
