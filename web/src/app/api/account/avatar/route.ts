import { NextRequest, NextResponse } from "next/server";
import { requireCustomer } from "@/lib/customer";
import { prisma } from "@/lib/prisma";
import { processAndSaveImage } from "@/lib/images";

export async function POST(req: NextRequest) {
  const customer = await requireCustomer();
  if (!customer) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Arquivo obrigatório" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const saved = await processAndSaveImage(buffer, file.name || "avatar.jpg", "avatars");

  const updated = await prisma.customer.update({
    where: { id: customer.id },
    data: { avatarUrl: saved.url },
  });

  return NextResponse.json({ url: saved.url, thumbUrl: saved.thumbUrl, customer: updated });
}
