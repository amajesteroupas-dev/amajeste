const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");
const http = require("http");
const https = require("https");

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
  if (!url.startsWith("/uploads/")) return true;
  const rel = url.replace(/^\/uploads\//, "").split("?")[0];
  try {
    fs.accessSync(path.join(uploadRoot, rel));
    return true;
  } catch {
    return false;
  }
}

function fetchStatus(url) {
  return new Promise((resolve) => {
    try {
      const lib = url.startsWith("https") ? https : http;
      const req = lib.request(url, { method: "HEAD", timeout: 8000 }, (res) => {
        resolve(res.statusCode || 0);
        res.resume();
      });
      req.on("error", () => resolve(-1));
      req.on("timeout", () => {
        req.destroy();
        resolve(-2);
      });
      req.end();
    } catch {
      resolve(-3);
    }
  });
}

function fold(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

(async () => {
  const corta = await p.product.findMany({
    where: {
      OR: [
        { name: { contains: "corta", mode: "insensitive" } },
        { slug: { contains: "corta", mode: "insensitive" } },
      ],
    },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      variants: true,
      category: { select: { name: true } },
    },
  });

  console.log("=== CORTA VENTO DETAIL ===");
  console.log("produtos:", corta.length);

  for (const prod of corta) {
    console.log("\n###", prod.name, prod.slug, prod.id);
    console.log({
      active: prod.active,
      deletedAt: prod.deletedAt,
      price: String(prod.price),
      category: prod.category?.name,
      images: prod.images.length,
      variants: prod.variants.length,
    });

    const colorFromVariants = new Map();
    for (const v of prod.variants) {
      const c = fold(v.color);
      if (!colorFromVariants.has(c)) {
        colorFromVariants.set(c, {
          color: v.color,
          active: 0,
          inactive: 0,
          stockOn: 0,
          stockOff: 0,
          sizes: [],
        });
      }
      const row = colorFromVariants.get(c);
      if (v.active) {
        row.active += 1;
        row.stockOn += v.stock;
      } else {
        row.inactive += 1;
        row.stockOff += v.stock;
      }
      row.sizes.push(`${v.size}:${v.stock}${v.active ? "" : ":OFF"}`);
    }

    const linkedAlts = new Map();
    for (const img of prod.images) {
      const a = fold(img.alt || "");
      if (!a) continue;
      if (!linkedAlts.has(a)) linkedAlts.set(a, []);
      linkedAlts.get(a).push(img.url);
    }

    console.log("\n-- cores vs fotos --");
    for (const [c, row] of colorFromVariants) {
      const imgs = linkedAlts.get(c) || [];
      const diskOk = imgs.every((u) => existsUpload(u));
      console.log(
        JSON.stringify({
          color: row.color,
          activeVariants: row.active,
          inactiveVariants: row.inactive,
          stockActive: row.stockOn,
          stockInactive: row.stockOff,
          sizes: row.sizes.join(","),
          linkedPhotos: imgs.length,
          diskOk: imgs.length ? diskOk : null,
          warning:
            row.active > 0 && imgs.length === 0
              ? "COR_ATIVA_SEM_FOTO"
              : imgs.length > 0 && row.active === 0
                ? "FOTO_SEM_VARIANTE_ATIVA"
                : null,
        })
      );
    }

    console.log("\n-- fotos orfas (alt sem variante) --");
    for (const [a, urls] of linkedAlts) {
      if (!colorFromVariants.has(a)) {
        console.log("ORPHAN_ALT", a, urls[0]);
      }
    }

    console.log("\n-- cada imagem --");
    for (const img of prod.images) {
      const abs = img.url.startsWith("http")
        ? img.url
        : `https://amajeste.com.br${img.url}`;
      const status = await fetchStatus(abs);
      console.log(
        img.isPrimary ? "PRIMARY" : "IMG",
        img.sortOrder,
        "alt=",
        JSON.stringify(img.alt),
        "file=",
        existsUpload(img.url) ? "OK" : "MISSING",
        "http=",
        status,
        img.url
      );
    }

    // stock movements recent
    const vids = prod.variants.map((v) => v.id);
    const moves = await p.stockMovement.findMany({
      where: { variantId: { in: vids } },
      orderBy: { createdAt: "desc" },
      take: 40,
      include: {
        variant: { select: { sku: true, size: true, color: true } },
      },
    });
    console.log("\n-- movimentos estoque recentes --");
    for (const m of moves) {
      console.log(
        m.createdAt.toISOString(),
        m.type,
        m.delta > 0 ? `+${m.delta}` : m.delta,
        m.reason || "",
        m.variant.sku,
        m.variant.size,
        m.variant.color
      );
    }

    // audit for this product
    const audits = await p.auditLog.findMany({
      where: {
        OR: [
          { entityId: prod.id },
          { detail: { contains: prod.id } },
          { detail: { contains: prod.slug } },
          { summary: { contains: prod.name.slice(0, 20) } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    console.log("\n-- audit produto --");
    for (const a of audits) {
      console.log(
        a.createdAt.toISOString(),
        a.actorEmail || "-",
        a.summary,
        String(a.detail || "").slice(0, 140)
      );
    }
  }

  console.log("\n=== GLOBAL: ativos com foto quebrada / primary quebrada ===");
  const active = await p.product.findMany({
    where: { active: true, deletedAt: null },
    include: { images: true, variants: { where: { active: true } } },
  });
  let broken = 0;
  let noColorPhoto = 0;
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
      broken += 1;
      console.log(
        "BROKEN_PHOTOS",
        prod.name,
        prod.slug,
        "usable=",
        usable.length,
        "primary=",
        primary?.url
      );
    }
    const linked = new Set(
      usable.map((i) => fold(i.alt || "")).filter(Boolean)
    );
    const colors = [
      ...new Set(prod.variants.map((v) => fold(v.color)).filter(Boolean)),
    ];
    const missing = colors.filter((c) => c && !linked.has(c));
    if (missing.length) {
      noColorPhoto += 1;
      console.log(
        "MISSING_COLOR_LINK",
        prod.name,
        prod.slug,
        missing.slice(0, 12).join("|")
      );
    }
  }
  console.log({ brokenPhotoProducts: broken, productsMissingColorLinks: noColorPhoto });

  console.log("\n=== SHARED URLS (colisão) ===");
  const allImgs = await p.productImage.findMany({
    include: { product: { select: { name: true, slug: true, active: true } } },
  });
  const byUrl = new Map();
  for (const img of allImgs) {
    if (!byUrl.has(img.url)) byUrl.set(img.url, []);
    byUrl.get(img.url).push(img.product);
  }
  for (const [url, prods] of byUrl) {
    if (prods.length < 2) continue;
    console.log(
      prods.length,
      url,
      [...new Set(prods.map((x) => x.name))].join(" | ")
    );
  }

  console.log("\n=== STOCK AUTO (reserve/release/expire 48h) ===");
  const since = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
  const autoMoves = await p.stockMovement.findMany({
    where: {
      createdAt: { gte: since },
      OR: [
        { reason: { contains: "reserva", mode: "insensitive" } },
        { reason: { contains: "expir", mode: "insensitive" } },
        { reason: { contains: "liberta", mode: "insensitive" } },
        { reason: { contains: "liber", mode: "insensitive" } },
        { reason: { contains: "hold", mode: "insensitive" } },
        { reason: { contains: "checkout", mode: "insensitive" } },
        { reason: { contains: "pedido", mode: "insensitive" } },
        { reason: { contains: "Ajuste", mode: "insensitive" } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 60,
    include: {
      variant: {
        select: {
          sku: true,
          color: true,
          size: true,
          product: { select: { name: true } },
        },
      },
    },
  });
  for (const m of autoMoves) {
    console.log(
      m.createdAt.toISOString(),
      m.delta > 0 ? `+${m.delta}` : m.delta,
      m.reason,
      m.variant.product.name,
      m.variant.sku
    );
  }

  await p.$disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
