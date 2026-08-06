import { NextRequest, NextResponse } from "next/server";
import { fetchAddressByCep, digitsOnlyCep } from "@/lib/cep";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ cep: string }> }
) {
  const { cep } = await ctx.params;
  const clean = digitsOnlyCep(cep);
  if (clean.length !== 8) {
    return NextResponse.json({ error: "CEP inválido" }, { status: 400 });
  }

  const address = await fetchAddressByCep(clean);
  if (!address) {
    return NextResponse.json({ error: "CEP não encontrado" }, { status: 404 });
  }

  return NextResponse.json(address);
}
