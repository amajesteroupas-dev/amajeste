const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

const p = new PrismaClient();
const root = path.join(process.env.UPLOAD_DIR || "/app/uploads", "products");

(async () => {
  const used = new Set(
    (
      await p.productImage.findMany({
        where: { url: { startsWith: "/uploads/products/" } },
        select: { url: true },
      })
    ).map((r) => r.url)
  );
  const dirs = await fs.promises.readdir(root);
  let orphans = 0;
  for (const id of dirs) {
    const url = `/uploads/products/${id}/800.webp`;
    if (used.has(url)) continue;
    try {
      await fs.promises.access(path.join(root, id, "800.webp"));
      orphans += 1;
    } catch {
      /* */
    }
  }
  console.log(
    JSON.stringify({
      dirs: dirs.length,
      usedUrls: used.size,
      orphanFoldersWith800: orphans,
    })
  );
  await p.$disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
