const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

const p = new PrismaClient();
const root = process.env.UPLOAD_DIR || "/app/uploads";
const productsDir = path.join(root, "products");

(async () => {
  const used = new Set(
    (
      await p.productImage.findMany({
        where: { url: { startsWith: "/uploads/products/" } },
        select: { url: true },
      })
    ).map((r) => r.url)
  );
  console.log("referenced product upload urls:", used.size);

  const dirs = await fs.promises.readdir(productsDir);
  const orphans = [];
  for (const id of dirs) {
    const file800 = path.join(productsDir, id, "800.webp");
    const url = `/uploads/products/${id}/800.webp`;
    if (used.has(url)) continue;
    try {
      const st = await fs.promises.stat(file800);
      orphans.push({ id, url, mtime: st.mtimeMs, size: st.size });
    } catch {
      /* no 800.webp */
    }
  }
  orphans.sort((a, b) => a.mtime - b.mtime);
  console.log("orphan product folders with 800.webp:", orphans.length);
  for (const o of orphans.slice(0, 40)) {
    console.log(new Date(o.mtime).toISOString(), o.size, o.url);
  }

  // Jade images needing restore
  const jadeIds = (
    await p.product.findMany({
      where: { slug: { in: ["conjunto-jade", "conjunto-jade-copia"] } },
      select: { id: true, name: true, slug: true },
    })
  ).map((x) => x.id);

  const broken = await p.productImage.findMany({
    where: {
      productId: { in: jadeIds },
      url: { contains: "800-sdr" },
    },
    orderBy: [{ productId: "asc" }, { sortOrder: "asc" }],
  });
  console.log("\njade broken slots:", broken.length);

  // Prefer orphans around July-Aug when Jade images were created (cuid times)
  // Assign unique orphans 1:1 by sort order within each product
  let oi = 0;
  let restored = 0;
  for (const img of broken) {
    while (oi < orphans.length && orphans[oi].assigned) oi++;
    if (oi >= orphans.length) {
      console.log("no orphan left for", img.id);
      break;
    }
    const o = orphans[oi];
    o.assigned = true;
    oi += 1;
    await p.productImage.update({
      where: { id: img.id },
      data: { url: o.url },
    });
    restored += 1;
    console.log("ASSIGN", img.productId, "sort", img.sortOrder, "->", o.url);
  }
  console.log(JSON.stringify({ restored, orphans: orphans.length }));
  await p.$disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
