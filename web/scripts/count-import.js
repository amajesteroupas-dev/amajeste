const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

(async () => {
  const products = await p.product.count({ where: { active: true } });
  const variants = await p.productVariant.count({ where: { active: true } });
  const stock = await p.productVariant.aggregate({
    _sum: { stock: true },
    where: { active: true },
  });
  const withWoo = await p.product.count({
    where: {
      active: true,
      images: { some: { url: { contains: "amajeste.com.br" } } },
    },
  });
  const noImg = await p.product.findMany({
    where: { active: true, images: { none: {} } },
    select: { name: true, slug: true },
  });
  console.log(
    JSON.stringify(
      {
        products,
        variants,
        stock: stock._sum.stock,
        withWoo,
        noImgCount: noImg.length,
        noImg: noImg.slice(0, 20),
      },
      null,
      2
    )
  );

  const ana = await p.product.findFirst({
    where: { name: "Macacão Ana" },
    include: { images: true, variants: true },
  });
  console.log(
    "Ana",
    JSON.stringify(
      {
        slug: ana?.slug,
        imgs: ana?.images,
        stock: ana?.variants?.map((v) => ({
          size: v.size,
          color: v.color,
          stock: v.stock,
          sku: v.sku,
        })),
      },
      null,
      2
    )
  );

  await p.$disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
