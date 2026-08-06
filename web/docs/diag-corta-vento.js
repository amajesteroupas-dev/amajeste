const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

const p = new PrismaClient();
const uploadRoot = process.env.UPLOAD_DIR || "/app/uploads";

function existsUpload(url) {
  if (!url) return false;
  if (url.startsWith("/placeholders/")) {
    const pub = path.join(process.cwd(), "public", url.replace(/^\//, ""));
    try {
      fs.accessSync(pub);
      return true;
    } catch {
      return false;
    }
  }
  if (!url.startsWith("/uploads/")) return true; // remote / other
  const rel = url.replace(/^\/uploads\//, "").split("?")[0];
  try {
    fs.accessSync(path.join(uploadRoot, rel));
    return true;
  } catch {
    return false;
  }
}

(async () => {
  console.log("=== BUSCA CORTA VENTO / WINDBREAKER ===");
  const corta = await p.product.findMany({
    where: {
      OR: [
        { name: { contains: "corta", mode: "insensitive" } },
        { name: { contains: "vento", mode: "insensitive" } },
        { slug: { contains: "corta", mode: "insensitive" } },
        { slug: { contains: "vento", mode: "insensitive" } },
      ],
    },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      variants: {
        select: {
          id: true,
          size: true,
          color: true,
          stock: true,
          active: true,
          sku: true,
        },
      },
      category: { select: { name: true } },
    },
  });
  console.log("produtos encontrados:", corta.length);
  for (const prod of corta) {
    console.log("\n---");
    console.log({
      id: prod.id,
      name: prod.name,
      slug: prod.slug,
      active: prod.active,
      deletedAt: prod.deletedAt || null,
      category: prod.category?.name,
      price: String(prod.price),
      images: prod.images.length,
      variants: prod.variants.length,
    });
    for (const img of prod.images) {
      console.log(
        " IMG",
        img.sortOrder,
        img.isPrimary ? "PRIMARY" : "",
        img.url,
        "alt=",
        img.alt || "",
        "file=",
        existsUpload(img.url) ? "OK" : "MISSING"
      );
    }
    for (const v of prod.variants) {
      console.log(
        " VAR",
        v.sku,
        v.size,
        v.color,
        "stock=",
        v.stock,
        v.active ? "on" : "OFF"
      );
    }
  }

  console.log("\n=== SAÚDE GLOBAL DE IMAGENS ===");
  const allImgs = await p.productImage.findMany({
    include: {
      product: {
        select: { id: true, name: true, slug: true, active: true, deletedAt: true },
      },
    },
  });
  let missing = 0;
  let placeholder = 0;
  let sdrShared = 0;
  const missingList = [];
  const byUrl = new Map();
  for (const img of allImgs) {
    byUrl.set(img.url, (byUrl.get(img.url) || 0) + 1);
    if (/placeholders/i.test(img.url)) placeholder += 1;
    if (!existsUpload(img.url)) {
      missing += 1;
      if (missingList.length < 40) {
        missingList.push({
          product: img.product.name,
          slug: img.product.slug,
          active: img.product.active,
          deleted: Boolean(img.product.deletedAt),
          url: img.url,
          primary: img.isPrimary,
        });
      }
    }
  }
  const shared = [...byUrl.entries()]
    .filter(([, c]) => c > 1)
    .sort((a, b) => b[1] - a[1]);
  for (const [url, c] of shared) {
    if (url.includes("products-sdr") || c >= 3) sdrShared += c;
  }

  console.log({
    totalImages: allImgs.length,
    missingFiles: missing,
    placeholders: placeholder,
    sharedUrlGroups: shared.length,
  });
  console.log("top shared urls:");
  for (const [url, c] of shared.slice(0, 15)) console.log(c, url);
  console.log("missing sample:");
  for (const m of missingList) console.log(JSON.stringify(m));

  console.log("\n=== PRODUTOS ATIVOS SEM FOTO OK ===");
  const active = await p.product.findMany({
    where: { active: true, deletedAt: null },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
    },
  });
  const badActive = [];
  for (const prod of active) {
    const usable = prod.images.filter(
      (i) => existsUpload(i.url) && !/placeholders/i.test(i.url)
    );
    const primary = prod.images.find((i) => i.isPrimary) || prod.images[0];
    const primaryOk =
      primary &&
      existsUpload(primary.url) &&
      !/placeholders/i.test(primary.url);
    if (!usable.length || !primaryOk) {
      badActive.push({
        name: prod.name,
        slug: prod.slug,
        total: prod.images.length,
        usable: usable.length,
        primary: primary?.url || null,
        primaryOk: Boolean(primaryOk),
      });
    }
  }
  console.log("ativos com problema de foto:", badActive.length);
  for (const b of badActive) console.log(JSON.stringify(b));

  console.log("\n=== AUDIT FOTOS (48h / remove / hdr / dedupe) ===");
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const logs = await p.auditLog.findMany({
    where: {
      createdAt: { gte: since },
      OR: [
        { summary: { contains: "Foto" } },
        { summary: { contains: "HDR" } },
        { summary: { contains: "dedupe" } },
        { summary: { contains: "imagem" } },
        { summary: { contains: "Imagem" } },
        { category: "products" },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 80,
    select: {
      createdAt: true,
      summary: true,
      detail: true,
      actorEmail: true,
      entityId: true,
    },
  });
  for (const l of logs) {
    const d = String(l.detail || "").slice(0, 160);
    if (
      /Foto|HDR|dedupe|removid|exclu|image|imagem/i.test(l.summary + d)
    ) {
      console.log(
        l.createdAt.toISOString(),
        l.actorEmail || "-",
        l.summary,
        d
      );
    }
  }

  console.log("\n=== PRODUTOS DESATIVADOS / LIXEIRA RECENTE ===");
  const deleted = await p.product.findMany({
    where: {
      OR: [{ deletedAt: { not: null } }, { active: false }],
    },
    select: {
      name: true,
      slug: true,
      active: true,
      deletedAt: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: "desc" },
    take: 30,
  });
  for (const d of deleted) {
    console.log(
      d.updatedAt.toISOString(),
      d.active ? "active" : "inactive",
      d.deletedAt ? "TRASH" : "",
      d.name,
      d.slug
    );
  }

  await p.$disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
