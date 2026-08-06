import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Props) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  try {
    const updated = await prisma.product.updateMany({
      where: { id, deletedAt: null, active: true },
      data: { viewCount: { increment: 1 } },
    });
    if (updated.count === 0) {
      return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Falha ao registrar visita" }, { status: 500 });
  }
}
