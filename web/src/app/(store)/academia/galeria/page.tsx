import { prisma } from "@/lib/prisma";
import { GaleriaLooksClient } from "@/components/store/GaleriaLooksClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Seja Influence Majesté" };

export default async function GaleriaPage() {
  // Qualquer produto cadastrado (sem vínculo com estoque / active)
  const products = await prisma.product.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true, slug: true },
    orderBy: { name: "asc" },
  });

  return <GaleriaLooksClient products={products} />;
}
