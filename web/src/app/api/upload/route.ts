import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { processAndSaveImage } from "@/lib/images";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "STAFF")) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const productId = form.get("productId") as string | null;

  if (!file) {
    return NextResponse.json({ error: "Arquivo obrigatório" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const result = await processAndSaveImage(buffer, file.name);

  if (productId) {
    const count = await prisma.productImage.count({ where: { productId } });
    await prisma.productImage.create({
      data: {
        productId,
        url: result.url,
        alt: file.name,
        isPrimary: count === 0,
        sortOrder: count,
      },
    });
  }

  return NextResponse.json(result);
}
