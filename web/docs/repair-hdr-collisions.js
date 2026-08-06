const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

const p = new PrismaClient();
const root = process.env.UPLOAD_DIR || "/app/uploads";

function fileExists(url) {
  if (!url.startsWith("/uploads/")) return false;
  const rel = url.replace(/^\/uploads\//, "");
  try {
    fs.accessSync(path.join(root, rel));
    return true;
  } catch {
    return false;
  }
}

function parseDetail(detail) {
  if (!detail) return null;
  try {
    return typeof detail === "string" ? JSON.parse(detail) : detail;
  } catch {
    return null;
  }
}

(async () => {
  // 1) Shared products-sdr filenames (collision)
  const shared = await p.productImage.groupBy({
    by: ["url"],
    where: { url: { contains: "/uploads/products-sdr/" } },
    _count: { url: true },
    having: { url: { _count: { gt: 1 } } },
  });
  console.log("shared sdr urls:", shared.length);
  for (const g of shared) console.log(g._count.url, g.url);

  const broken = await p.productImage.findMany({
    where: {
      OR: [
        { url: { in: shared.map((s) => s.url) } },
        { url: { contains: "800-sdr" } },
      ],
    },
    include: { product: { select: { id: true, name: true } } },
  });
  console.log("broken image rows:", broken.length);

  let restored = 0;
  let unmatched = 0;

  for (const img of broken) {
    // Prefer audit by ProductImage entityId
    const byEntity = await p.auditLog.findMany({
      where: {
        entityId: img.id,
        summary: { contains: "Foto" },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    let candidate = null;
    for (const log of byEntity) {
      const d = parseDetail(log.detail);
      const url = d && d.url ? String(d.url) : "";
      if (url.includes("/uploads/products/") && fileExists(url)) {
        candidate = url;
        break;
      }
    }

    if (!candidate) {
      // Fallback: any upload audit for product that still exists and not already used uniquely
      const logs = await p.auditLog.findMany({
        where: {
          summary: { contains: "Foto enviada" },
          detail: { contains: img.productId },
        },
        orderBy: { createdAt: "asc" },
        take: 50,
      });
      for (const log of logs) {
        const d = parseDetail(log.detail);
        const url = d && d.url ? String(d.url) : "";
        if (!url.includes("/uploads/products/") || !fileExists(url)) continue;
        // Prefer unused by other images of same product (except this one)
        const used = await p.productImage.count({
          where: {
            productId: img.productId,
            url,
            NOT: { id: img.id },
          },
        });
        if (used === 0) {
          candidate = url;
          break;
        }
      }
    }

    if (candidate && candidate !== img.url) {
      await p.productImage.update({
        where: { id: img.id },
        data: { url: candidate },
      });
      restored += 1;
      console.log("RESTORED", img.product.name, img.id, "->", candidate);
    } else {
      unmatched += 1;
      console.log("UNMATCHED", img.product.name, img.id, img.url);
    }
  }

  console.log(JSON.stringify({ restored, unmatched, broken: broken.length }));
  await p.$disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
