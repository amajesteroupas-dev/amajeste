/**
 * Apply local high-res product image paths from product-image-map.json
 */
const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();
const mapPath = path.join(__dirname, "product-image-map.json");

(async () => {
  const map = JSON.parse(fs.readFileSync(mapPath, "utf8"));
  let updated = 0;
  for (const [slug, urls] of Object.entries(map.products || {})) {
    const product = await prisma.product.findUnique({ where: { slug } });
    if (!product) {
      console.log("MISS", slug);
      continue;
    }
    await prisma.productImage.deleteMany({ where: { productId: product.id } });
    await prisma.productImage.createMany({
      data: urls.map((url, i) => ({
        productId: product.id,
        url,
        alt: product.name,
        isPrimary: i === 0,
        sortOrder: i,
      })),
    });
    updated++;
    console.log("OK", slug, urls.length);
  }
  console.log("Updated products:", updated);
  await prisma.$disconnect();
})().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
