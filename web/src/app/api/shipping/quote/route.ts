import { NextRequest, NextResponse } from "next/server";
import { quoteShipping } from "@/lib/shipping";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const toZip = String(body.toZip || "").replace(/\D/g, "");
    if (toZip.length < 8) {
      return NextResponse.json({ error: "CEP inválido" }, { status: 400 });
    }

    const quotes = await quoteShipping({
      fromZip: process.env.STORE_ZIP || "01310100",
      toZip,
      weightKg: Number(body.weightKg) || 0.5,
    });

    return NextResponse.json({ quotes });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Falha ao cotar frete" }, { status: 500 });
  }
}
