const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

const p = new PrismaClient();
const root = process.env.UPLOAD_DIR || "/app/uploads";

function exists(url) {
  if (!String(url).startsWith("/uploads/")) return false;
  try {
    fs.accessSync(path.join(root, url.replace(/^\/uploads\//, "")));
    return true;
  } catch {
    return false;
  }
}

(async () => {
  const products = await p.product.findMany({
    where: {
      OR: [
        { slug: "conjunto-jade" },
        { slug: "conjunto-jade-copia" },
        { name: { contains: "Jade" } },
      ],
    },
    select: { id: true, name: true, slug: true },
  });
  console.log("products", products);

  for (const prod of products) {
    console.log("\n===", prod.name, prod.id);
    const logs = await p.auditLog.findMany({
      where: {
        OR: [
          { detail: { contains: prod.id } },
          { entityId: prod.id },
        ],
      },
      orderBy: { createdAt: "asc" },
      take: 100,
    });
    console.log("audit rows", logs.length);
    const urls = [];
    for (const log of logs) {
      let d = null;
      try {
        d = JSON.parse(log.detail || "{}");
      } catch {
        /* */
      }
      const url = d && d.url ? String(d.url) : "";
      if (url.includes("/uploads/products/")) {
        urls.push({
          at: log.createdAt.toISOString(),
          summary: log.summary,
          entityId: log.entityId,
          url,
          exists: exists(url),
        });
      }
    }
    console.log("upload urls from audit:", urls.length);
    for (const u of urls) console.log(JSON.stringify(u));

    const imgs = await p.productImage.findMany({
      where: { productId: prod.id },
      orderBy: { sortOrder: "asc" },
    });
    console.log("current images:");
    for (const i of imgs) {
      console.log(i.sortOrder, i.id, i.isPrimary, i.url, "exists=", exists(i.url));
    }
  }

  await p.$disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
