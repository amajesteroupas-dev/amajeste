import { prisma } from "@/lib/prisma";
import { GaleriaLooksClient } from "@/components/store/GaleriaLooksClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Seja Influence Majesté" };

export default async function GaleriaPage() {
  const products = await prisma.product.findMany({
    where: { active: true, deletedAt: null },
    select: { id: true, name: true, slug: true },
    orderBy: { name: "asc" },
  });

  return <GaleriaLooksClient products={products} />;
}
