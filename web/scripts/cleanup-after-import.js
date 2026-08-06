const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

(async () => {
  const demos = await p.product.findMany({
    where: {
      active: true,
      NOT: { images: { some: { url: { contains: "amajeste.com.br" } } } },
    },
    select: { id: true, name: true, slug: true },
  });
  console.log("Deactivating demos:", demos);
  if (demos.length) {
    await p.product.updateMany({
      where: { id: { in: demos.map((d) => d.id) } },
      data: { active: false, featured: false },
    });
  }

  // Mark first 8 woo products as featured for home
  const woo = await p.product.findMany({
    where: {
      active: true,
      images: { some: { url: { contains: "amajeste.com.br" } } },
    },
    orderBy: { updatedAt: "desc" },
    take: 8,
  });
  await p.product.updateMany({ data: { featured: false } });
  await p.product.updateMany({
    where: { id: { in: woo.map((w) => w.id) } },
    data: { featured: true },
  });

  const products = await p.product.count({ where: { active: true } });
  const stock = await p.productVariant.aggregate({
    _sum: { stock: true },
    where: { active: true, product: { active: true } },
  });
  console.log({ products, stock: stock._sum.stock, featured: woo.map((w) => w.name) });
  await p.$disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
