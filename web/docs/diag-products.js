const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

const p = new PrismaClient();
const uploadRoot = process.env.UPLOAD_DIR || "/app/uploads";

async function exists(rel) {
  try {
    await fs.promises.access(path.join(uploadRoot, rel.replace(/^\/uploads\//, "")));
    return true;
  } catch {
    return false;
  }
}

(async () => {
  console.log("UPLOAD_DIR=", uploadRoot);
  try {
    const top = await fs.promises.readdir(uploadRoot);
    console.log("uploads children:", top.slice(0, 30).join(", "));
  } catch (e) {
    console.log("uploads read fail:", e.message);
  }

  const placeholders = await p.productImage.findMany({
    where: { url: { contains: "/placeholders/" } },
    select: {
      id: true,
      productId: true,
      url: true,
      isPrimary: true,
      product: { select: { name: true, slug: true } },
    },
    take: 80,
  });
  console.log("\nplaceholder rows:", placeholders.length);
  let primaryWithOthers = 0;
  for (const row of placeholders) {
    const others = await p.productImage.count({
      where: { productId: row.productId, NOT: { id: row.id } },
    });
    if (row.isPrimary && others > 0) {
      primaryWithOthers += 1;
      console.log(
        "PRIMARY PLACEHOLDER + real photos:",
        row.product.name,
        "| others=",
        others,
        "|",
        row.url
      );
    }
  }
  console.log("products with primary placeholder AND other images:", primaryWithOthers);

  const sdr = await p.productImage.groupBy({
    by: ["url"],
    where: { url: { contains: "products-sdr" } },
    _count: { url: true },
    orderBy: { _count: { url: "desc" } },
    take: 15,
  });
  console.log("\ntop shared products-sdr urls:");
  for (const g of sdr) {
    console.log(g._count.url, g.url);
  }

  const shared800 = await p.productImage.count({
    where: { url: { contains: "800-sdr" } },
  });
  console.log("rows with 800-sdr in url:", shared800);

  // sample missing files
  const recent = await p.productImage.findMany({
    orderBy: { id: "desc" },
    take: 40,
    select: {
      url: true,
      isPrimary: true,
      product: { select: { name: true } },
    },
  });
  let missing = 0;
  for (const img of recent) {
    if (img.url.startsWith("/placeholders/")) continue;
    if (img.url.startsWith("/uploads/")) {
      const ok = await exists(img.url);
      if (!ok) {
        missing += 1;
        console.log("MISSING FILE:", img.product.name, img.url, "primary=", img.isPrimary);
      }
    }
  }
  console.log("missing files in last 40 images sample:", missing);

  const moves = await p.inventoryMovement.findMany({
    orderBy: { createdAt: "desc" },
    take: 30,
    select: {
      createdAt: true,
      type: true,
      quantity: true,
      note: true,
      variant: {
        select: {
          size: true,
          color: true,
          stock: true,
          product: { select: { name: true } },
        },
      },
    },
  });
  console.log("\nrecent inventory moves:");
  for (const m of moves) {
    console.log(
      [
        m.createdAt.toISOString(),
        m.type,
        m.quantity,
        m.variant.product.name,
        m.variant.size + "/" + m.variant.color,
        "now=" + m.variant.stock,
        (m.note || "").slice(0, 70),
      ].join(" | ")
    );
  }

  const held = await p.order.findMany({
    where: { stockHeld: true },
    select: {
      orderNumber: true,
      status: true,
      reservedUntil: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 25,
  });
  console.log("\nstockHeld orders:", held.length);
  for (const o of held) {
    console.log(
      o.orderNumber,
      o.status,
      "until=",
      o.reservedUntil && o.reservedUntil.toISOString(),
      "created=",
      o.createdAt.toISOString()
    );
  }

  // negative stock
  const neg = await p.productVariant.findMany({
    where: { stock: { lt: 0 } },
    select: {
      stock: true,
      size: true,
      color: true,
      product: { select: { name: true } },
    },
    take: 20,
  });
  console.log("\nnegative stock variants:", neg.length);
  for (const v of neg) {
    console.log(v.product.name, v.size, v.color, v.stock);
  }

  await p.$disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
