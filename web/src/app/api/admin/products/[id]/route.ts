import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Props) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "STAFF")) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const product = await prisma.product.update({
    where: { id },
    data: {
      name: body.name,
      description: body.description,
      price: body.price,
      costPrice: body.costPrice,
      categoryId: body.categoryId,
      featured: body.featured,
      active: body.active,
    },
  });
  return NextResponse.json(product);
}
