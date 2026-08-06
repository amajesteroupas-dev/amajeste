const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

const p = new PrismaClient();
const root = process.env.UPLOAD_DIR || "/app/uploads";

(async () => {
  const rows = await p.productImage.findMany({
    where: { url: { contains: "800-sdr" } },
    include: {
      product: { select: { id: true, name: true, slug: true } },
    },
    orderBy: { id: "asc" },
  });
  console.log("affected images:", rows.length);

  for (const r of rows) {
    const all = await p.productImage.findMany({
      where: { productId: r.productId },
      orderBy: { sortOrder: "asc" },
      select: { id: true, url: true, isPrimary: true, sortOrder: true },
    });
    console.log("---");
    console.log(r.product.name, "(", r.product.slug, ")");
    console.log("broken id", r.id, "primary", r.isPrimary);
    console.log(
      "gallery:",
      all.map((x) => `${x.sortOrder}:${x.isPrimary ? "P" : "-"}:${x.url}`).join(" | ")
    );
  }

  // list product upload dirs count
  const productsDir = path.join(root, "products");
  const dirs = await fs.promises.readdir(productsDir);
  console.log("\nproduct upload folders:", dirs.length);

  // audit logs mentioning 800.webp or products-sdr
  try {
    const logs = await p.auditLog.findMany({
      where: {
        OR: [
          { detail: { contains: "800.webp" } },
          { summary: { contains: "HDR" } },
          { summary: { contains: "Foto" } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: { createdAt: true, summary: true, detail: true, entityId: true },
    });
    console.log("\naudit sample:", logs.length);
    for (const l of logs.slice(0, 15)) {
      console.log(
        l.createdAt.toISOString(),
        l.summary,
        String(l.detail || "").slice(0, 120)
      );
    }
  } catch (e) {
    console.log("auditLog query fail", e.message);
  }

  await p.$disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
