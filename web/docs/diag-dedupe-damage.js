const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");
const p = new PrismaClient();

(async () => {
  // Reconstruct what was wiped by Jade dedupe from audit
  const logs = await p.auditLog.findMany({
    where: {
      summary: { contains: "Foto duplicada" },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  console.log("=== DEDUPE AUDITS ===");
  for (const a of logs) {
    console.log(a.createdAt.toISOString(), a.summary);
    console.log(JSON.stringify(a.detail));
  }

  const affectedNames = [
    "Corta Vento",
    "Macaquinho Andressa",
    "Conjunto Lia",
    "Conjunto Manu",
    "Conjunto Gisele",
    "Conjunto Livia",
    "Conjunto Clara",
    "Macaquinho Zoe",
  ];

  console.log("\n=== HEALTH OF LIKELY AFFECTED PRODUCTS ===");
  const products = await p.product.findMany({
    where: {
      OR: [
        { name: { contains: "Corta", mode: "insensitive" } },
        { name: { contains: "Andressa", mode: "insensitive" } },
        { name: { contains: "Lia", mode: "insensitive" } },
        { name: { contains: "Manu", mode: "insensitive" } },
        { name: { contains: "Gisele", mode: "insensitive" } },
        { name: { contains: "Livia", mode: "insensitive" } },
        { name: { contains: "Clara", mode: "insensitive" } },
        { name: { contains: "Zoe", mode: "insensitive" } },
        { name: { contains: "Jade", mode: "insensitive" } },
      ],
      deletedAt: null,
    },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      variants: { where: { active: true } },
    },
  });

  const root = process.env.UPLOAD_DIR || "/app/uploads";
  for (const prod of products) {
    const real = prod.images.filter((i) => !/placeholders/i.test(i.url));
    let missing = 0;
    let sdrShared = 0;
    for (const i of real) {
      if (i.url.includes("800-sdr.jpg") || i.url.includes("products-sdr/800"))
        sdrShared++;
      if (i.url.startsWith("/uploads/")) {
        const rel = i.url.replace(/^\/uploads\//, "").split("?")[0];
        if (!fs.existsSync(path.join(root, rel))) missing++;
      }
    }
    const linked = new Set(
      real.map((i) => (i.alt || "").trim().toLowerCase()).filter(Boolean)
    );
    const colors = [
      ...new Set(prod.variants.map((v) => v.color.trim().toLowerCase())),
    ];
    const missingColors = colors.filter((c) => c && !linked.has(c));
    console.log(
      JSON.stringify({
        name: prod.name,
        slug: prod.slug,
        active: prod.active,
        images: real.length,
        missingFiles: missing,
        sdrSharedUrls: sdrShared,
        activeVariants: prod.variants.length,
        colorsMissingPhoto: missingColors,
      })
    );
  }

  await p.$disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
