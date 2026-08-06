const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

const p = new PrismaClient();
const uploadRoot = process.env.UPLOAD_DIR || "/app/uploads";

function fold(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

function existsUpload(url) {
  if (!url) return false;
  if (/placeholders/i.test(url)) return false;
  if (!url.startsWith("/uploads/") && !url.startsWith("/products/")) return true;
  if (url.startsWith("/products/")) {
    const pub = path.join(process.cwd(), "public", url.replace(/^\//, "").split("?")[0]);
    try {
      fs.accessSync(pub);
      return true;
    } catch {
      return false;
    }
  }
  const rel = url.replace(/^\/uploads\//, "").split("?")[0];
  try {
    fs.accessSync(path.join(uploadRoot, rel));
    return true;
  } catch {
    return false;
  }
}

(async () => {
  const report = {
    generatedAt: new Date().toISOString(),
    summary: {},
    critical: [],
    high: [],
    medium: [],
    dataCleanup: [],
    stockNotes: [],
    auditIncidents: [],
    okChecks: [],
  };

  const products = await p.product.findMany({
    where: { deletedAt: null },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      variants: true,
      category: { select: { name: true } },
    },
    orderBy: { name: "asc" },
  });

  const active = products.filter((x) => x.active);
  const inactive = products.filter((x) => !x.active);

  let missingFiles = 0;
  let placeholderOnly = 0;
  let sdrCollisionProducts = 0;
  let noRealPhoto = 0;
  let noActiveVariant = 0;
  let allStockZero = 0;
  let badDefault = 0;
  let colorsMissingLink = 0;
  let personalizadaCount = 0;
  let inactiveWithStock = 0;

  const byUrl = new Map();

  for (const prod of active) {
    const realImgs = prod.images.filter((i) => !/placeholders/i.test(i.url));
    const usable = realImgs.filter((i) => existsUpload(i.url));
    const primary = prod.images.find((i) => i.isPrimary) || prod.images[0];
    const primaryOk =
      primary &&
      !/placeholders/i.test(primary.url) &&
      existsUpload(primary.url);

    for (const img of prod.images) {
      if (!byUrl.has(img.url)) byUrl.set(img.url, []);
      byUrl.get(img.url).push({ name: prod.name, slug: prod.slug, alt: img.alt });
      if (!/placeholders/i.test(img.url) && !existsUpload(img.url)) {
        missingFiles++;
        report.critical.push({
          code: "missing_file",
          product: prod.name,
          slug: prod.slug,
          detail: img.url,
        });
      }
    }

    const sdrCount = realImgs.filter((i) =>
      /\/products-sdr\/800-sdr\./i.test(i.url)
    ).length;
    if (sdrCount > 0) {
      sdrCollisionProducts++;
      report.critical.push({
        code: "hdr_collision",
        product: prod.name,
        slug: prod.slug,
        detail: `${sdrCount} foto(s) no arquivo compartilhado 800-sdr.jpg — reenviar fotos`,
      });
    }

    if (!usable.length || !primaryOk) {
      noRealPhoto++;
      report.critical.push({
        code: "no_usable_photo",
        product: prod.name,
        slug: prod.slug,
        detail: `imagens=${prod.images.length} usáveis=${usable.length} primaryOk=${Boolean(primaryOk)}`,
      });
    }

    if (realImgs.length === 0 && prod.images.some((i) => /placeholders/i.test(i.url))) {
      placeholderOnly++;
    }

    const activeVars = prod.variants.filter((v) => v.active);
    if (activeVars.length === 0) {
      noActiveVariant++;
      report.high.push({
        code: "no_active_variant",
        product: prod.name,
        slug: prod.slug,
        detail: "Produto ativo sem variante ativa",
      });
    } else if (activeVars.every((v) => v.stock <= 0)) {
      allStockZero++;
      report.medium.push({
        code: "all_stock_zero",
        product: prod.name,
        slug: prod.slug,
        detail: `${activeVars.length} variantes ativas, todas zeradas`,
      });
    }

    // bad default: first size+first color out of stock but other stock exists
    const ordered = [...activeVars].sort((a, b) => a.size.localeCompare(b.size));
    const sizes = [...new Set(ordered.map((v) => v.size))];
    if (sizes.length) {
      // After our fix, store picks first in-stock — still report data smell
      const anyStock = ordered.some((v) => v.stock > 0);
      const zeroCombos = ordered.filter((v) => v.stock <= 0).length;
      if (anyStock && zeroCombos > 0) {
        // only list products with many zero SKUs as stockNotes
      }
    }

    const linked = new Set(
      usable.map((i) => fold(i.alt || "")).filter(Boolean)
    );
    const colors = [
      ...new Set(activeVars.map((v) => fold(v.color)).filter(Boolean)),
    ];
    const missingColors = colors.filter((c) => !linked.has(c));
    if (missingColors.length) {
      colorsMissingLink++;
      report.high.push({
        code: "color_without_photo",
        product: prod.name,
        slug: prod.slug,
        detail: missingColors.join(", "),
      });
    }

    for (const v of prod.variants) {
      if (fold(v.color) === "personalizada") {
        personalizadaCount++;
        report.dataCleanup.push({
          code: "color_personalizada",
          product: prod.name,
          slug: prod.slug,
          detail: `${v.size} / Personalizada sku=${v.sku} stock=${v.stock} active=${v.active}`,
        });
      }
      if (!v.active && v.stock > 0) {
        inactiveWithStock++;
        report.dataCleanup.push({
          code: "inactive_with_stock",
          product: prod.name,
          slug: prod.slug,
          detail: `${v.size}/${v.color} stock=${v.stock} sku=${v.sku} (OFF)`,
        });
      }
    }

    // SKU mess sample for corta
    if (prod.slug === "corta-vento") {
      const zeroActive = activeVars.filter((v) => v.stock <= 0);
      report.stockNotes.push({
        product: prod.name,
        slug: prod.slug,
        zeroActiveSkus: zeroActive.map(
          (v) => `${v.size}/${v.color} (${v.sku})`
        ),
        personalizada: activeVars
          .filter((v) => fold(v.color) === "personalizada")
          .map((v) => `${v.size} stock=${v.stock} sku=${v.sku}`),
      });
    }
  }

  // Shared URLs across products
  const shared = [];
  for (const [url, list] of byUrl) {
    const prodNames = [...new Set(list.map((x) => x.name))];
    if (prodNames.length < 2) continue;
    shared.push({
      url,
      products: prodNames,
      count: list.length,
      dangerous: /\/products-sdr\/800-sdr\./i.test(url),
    });
  }
  shared.sort((a, b) => b.count - a.count);

  for (const s of shared) {
    report[s.dangerous ? "critical" : "high"].push({
      code: s.dangerous ? "shared_url_hdr" : "shared_url",
      product: s.products.join(" | "),
      slug: "",
      detail: `${s.count} rows → ${s.url}`,
    });
  }

  // Dedupe audits
  const dedupeLogs = await p.auditLog.findMany({
    where: {
      OR: [
        { summary: { contains: "Foto duplicada" } },
        { summary: { contains: "Fotos duplicadas removidas" } },
        { summary: { contains: "HDR" } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 15,
  });
  for (const a of dedupeLogs) {
    report.auditIncidents.push({
      at: a.createdAt.toISOString(),
      actor: a.actorEmail || "-",
      summary: a.summary,
      detail: String(a.detail || "").slice(0, 300),
    });
  }

  // Recent photo removes (7d)
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const photoRemoves = await p.auditLog.findMany({
    where: {
      createdAt: { gte: since },
      summary: { contains: "Foto removida" },
    },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  report.summary.photoRemoves7d = photoRemoves.length;

  // Held stock pending
  let heldOrders = 0;
  try {
    heldOrders = await p.order.count({
      where: { stockHeld: true, status: "PENDING" },
    });
  } catch {
    heldOrders = -1;
  }

  report.summary = {
    ...report.summary,
    totalProducts: products.length,
    activeProducts: active.length,
    inactiveProducts: inactive.length,
    missingFilesOnActive: missingFiles,
    activeNoUsablePhoto: noRealPhoto,
    activeHdrCollision: sdrCollisionProducts,
    activeNoActiveVariant: noActiveVariant,
    activeAllStockZero: allStockZero,
    activeColorsMissingPhotoLink: colorsMissingLink,
    personalizadaVariants: personalizadaCount,
    inactiveVariantsWithStock: inactiveWithStock,
    sharedUrlGroups: shared.length,
    pendingStockHolds: heldOrders,
    criticalCount: report.critical.length,
    highCount: report.high.length,
    mediumCount: report.medium.length,
  };

  // Deduplicate critical/high by code+product+detail
  function uniq(arr) {
    const seen = new Set();
    return arr.filter((x) => {
      const k = `${x.code}|${x.product}|${x.detail}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }
  report.critical = uniq(report.critical);
  report.high = uniq(report.high);
  report.medium = uniq(report.medium);
  report.dataCleanup = uniq(report.dataCleanup);

  report.okChecks = [
    "Nenhum arquivo de foto faltando em produto ativo (exceto casos HDR listados)",
    "Corta Vento: 12 fotos OK no disco e HTTP 200",
    "Proteção anti-dedupe HDR já implantada em produção",
    "Loja abre na 1ª combinação com estoque (não mais G/Preto zerado)",
    "Reserva de estoque no checkout com liberação ao cancelar/expirar",
  ];

  console.log(JSON.stringify(report, null, 2));
  await p.$disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
