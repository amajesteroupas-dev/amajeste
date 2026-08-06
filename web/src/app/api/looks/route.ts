import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** Looks aprovados — público (sem login) */
export async function GET() {
  const looks = await prisma.lookPost.findMany({
    where: { status: "APPROVED" },
    orderBy: { createdAt: "desc" },
    take: 60,
    include: {
      customer: { select: { name: true } },
    },
  });

  return NextResponse.json({
    looks: looks.map((l) => ({
      id: l.id,
      imageUrl: l.imageUrl,
      caption: l.caption,
      productName: l.productName,
      createdAt: l.createdAt,
      customerName: (l.customer.name.split(" ")[0] || "Cliente").trim(),
    })),
  });
}
