const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

const p = new PrismaClient();

(async () => {
  const id = "cms296eeh000yof3cbiq7ts9z";
  const prod = await p.product.findUnique({
    where: { id },
    include: {
      variants: { orderBy: [{ size: "asc" }, { color: "asc" }] },
      images: { orderBy: { sortOrder: "asc" } },
    },
  });
  console.log("=== VARIANTES DETALHE ===");
  for (const v of prod.variants) {
    console.log(
      [v.active ? "ON" : "OFF", v.size, v.color, "stock=" + v.stock, v.sku].join(
        " | "
      )
    );
  }
  console.log(
    "\nprimary=",
    prod.images.find((i) => i.isPrimary)?.alt,
    prod.images.find((i) => i.isPrimary)?.url
  );

  // Simulate storefront: active variants orderBy size asc
  const activeVars = prod.variants
    .filter((v) => v.active)
    .sort((a, b) => a.size.localeCompare(b.size));
  const sizes = [...new Set(activeVars.map((v) => v.size))];
  const size0 = sizes[0];
  const colors0 = activeVars.filter((v) => v.size === size0);
  console.log("\nSTOREFRONT DEFAULT SIM");
  console.log("sizes order:", sizes.join(","));
  console.log(
    "first size colors:",
    colors0.map((v) => `${v.color}:${v.stock}`).join(", ")
  );
  console.log(
    "default combo:",
    size0,
    "/",
    colors0[0]?.color,
    "stock=",
    colors0[0]?.stock
  );

  const tables = await p.$queryRawUnsafe(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema='public' AND (
      table_name ILIKE '%stock%' OR table_name ILIKE '%audit%' OR table_name ILIKE '%invent%'
    ) ORDER BY 1`);
  console.log("\ntables", tables);

  const moves = await p.inventoryMovement.findMany({
    where: { variantId: { in: prod.variants.map((v) => v.id) } },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      variant: { select: { sku: true, size: true, color: true } },
    },
  });
  console.log("\n=== INVENTORY MOVES ===");
  for (const m of moves) {
    console.log(
      m.createdAt.toISOString(),
      m.type,
      "qty=" + m.quantity,
      m.note || "",
      m.variant.size,
      m.variant.color,
      m.variant.sku
    );
  }

  const audits = await p.auditLog.findMany({
    where: {
      OR: [
        { entityId: id },
        { detail: { contains: id } },
        { detail: { contains: "corta-vento" } },
        { detail: { contains: "Corta Vento" } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 60,
  });
  console.log("\n=== AUDIT CORTA ===");
  for (const a of audits) {
    console.log(
      a.createdAt.toISOString(),
      a.actorEmail || "-",
      a.summary,
      String(a.detail || "").slice(0, 180)
    );
  }

  const active = await p.product.findMany({
    where: { active: true, deletedAt: null },
    include: {
      variants: { where: { active: true }, orderBy: { size: "asc" } },
      images: true,
    },
  });
  console.log("\n=== ATIVOS ALL_ZERO STOCK ===");
  for (const pr of active) {
    if (!pr.variants.length) {
      console.log("NO_VARIANTS", pr.name, pr.slug);
      continue;
    }
    if (pr.variants.every((v) => v.stock <= 0)) {
      console.log("ALL_ZERO", pr.name, pr.slug, pr.variants.length);
    }
  }

  console.log("\n=== BAD DEFAULT (first size+first color zerado, tem outro estoque) ===");
  let bad = 0;
  for (const pr of active) {
    const variants = pr.variants;
    if (!variants.length) continue;
    const sizes2 = [...new Set(variants.map((v) => v.size))];
    const sizeA = sizes2[0];
    const colors = variants.filter((v) => v.size === sizeA);
    const c0 = colors[0];
    if (!c0) continue;
    if (c0.stock <= 0 && variants.some((v) => v.stock > 0)) {
      bad++;
      console.log(
        "BAD_DEFAULT",
        pr.name,
        pr.slug,
        sizeA + "/" + c0.color + " stock=" + c0.stock
      );
    }
  }
  console.log("total bad defaults:", bad);

  const imgs = await p.productImage.findMany({
    include: {
      product: {
        select: { name: true, slug: true, active: true, deletedAt: true },
      },
    },
  });
  const by = new Map();
  for (const i of imgs) {
    if (!by.has(i.url)) by.set(i.url, []);
    by.get(i.url).push(i);
  }
  console.log("\n=== SHARED URLS ===");
  for (const [url, list] of by) {
    if (list.length < 2) continue;
    console.log(
      list.length,
      url,
      list
        .map((x) => x.product.name + "(" + (x.product.active ? "A" : "I") + ")")
        .join(", ")
    );
  }

  const root = process.env.UPLOAD_DIR || "/app/uploads";
  let missing = 0;
  for (const i of imgs) {
    if (!i.url.startsWith("/uploads/")) continue;
    if (i.product.deletedAt || !i.product.active) continue;
    const rel = i.url.replace(/^\/uploads\//, "").split("?")[0];
    if (!fs.existsSync(path.join(root, rel))) {
      missing++;
      if (missing <= 40) {
        console.log("MISSING_FILE", i.product.name, i.url, "alt=" + i.alt);
      }
    }
  }
  console.log("missing files on active products:", missing);

  // held stock / pending orders for corta
  const holds = await p.orderItem.findMany({
    where: {
      variantId: { in: prod.variants.map((v) => v.id) },
      order: {
        OR: [
          { paymentStatus: "PENDING" },
          { status: { in: ["PENDING", "AWAITING_PAYMENT"] } },
        ],
      },
    },
    include: {
      order: {
        select: {
          id: true,
          status: true,
          paymentStatus: true,
          createdAt: true,
          stockReservedUntil: true,
        },
      },
      variant: { select: { size: true, color: true, stock: true } },
    },
    take: 30,
  }).catch((e) => {
    console.log("orderItem hold query failed:", e.message);
    return [];
  });
  console.log("\n=== PENDING ORDER HOLDS ===");
  for (const h of holds) {
    console.log(
      h.order.createdAt.toISOString(),
      h.order.status,
      h.order.paymentStatus,
      "qty=" + h.quantity,
      h.variant.size,
      h.variant.color,
      "stockNow=" + h.variant.stock,
      "reserveUntil=" + (h.order.stockReservedUntil || "-")
    );
  }

  await p.$disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
