import { NextRequest, NextResponse } from "next/server";
import { lookupCpfName } from "@/lib/cpf";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ cpf: string }> }
) {
  const { cpf } = await ctx.params;
  const result = await lookupCpfName(cpf);

  if (!result.valid) {
    return NextResponse.json({ error: "CPF inválido", ...result }, { status: 400 });
  }

  return NextResponse.json(result);
}
