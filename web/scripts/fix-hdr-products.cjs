/**
 * Reprocessa ProductImage (/products/...) → /uploads/products-sdr/ em SDR sRGB.
 * Uso: docker compose -p majeste exec -T web node scripts/fix-hdr-products.cjs
 */
const { PrismaClient } = require("@prisma/client");
const sharp = require("sharp");
const fs = require("fs/promises");
const path = require("path");

const prisma = new PrismaClient();
const uploadRoot = process.env.UPLOAD_DIR || "/app/uploads";
const publicRoot = path.join(process.cwd(), "public");
const LIMIT = Number(process.env.FIX_HDR_LIMIT || 500);

async function encodeSdr(input) {
  return sharp(input, { failOn: "none", unlimited: true })
    .rotate()
    .toColourspace("srgb")
    .modulate({ brightness: 0.97, saturation: 0.98 })
    .jpeg({ quality: 90, mozjpeg: true, chromaSubsampling: "4:2:0" })
    .toBuffer();
}

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

function resolveLocal(url) {
  const clean = (url.split("?")[0] || "").replace(/^https?:\/\/[^/]+/, "");
  if (clean.startsWith("/products/")) {
    return path.join(publicRoot, clean.slice(1));
  }
  if (clean.startsWith("/uploads/")) {
    return path.join(uploadRoot, clean.replace(/^\/uploads\//, ""));
  }
  return null;
}

async function main() {
  const sdrDir = path.join(uploadRoot, "products-sdr");
  await fs.mkdir(sdrDir, { recursive: true });

  const images = await prisma.productImage.findMany({
    orderBy: { id: "asc" },
    select: { id: true, url: true },
  });

  let fixed = 0;
  let skipped = 0;
  let failed = 0;

  for (const img of images) {
    if (fixed >= LIMIT) break;
    if (img.url.includes("/uploads/products-sdr/")) {
      skipped++;
      continue;
    }
    const local = resolveLocal(img.url);
    if (!local || !(await exists(local))) {
      skipped++;
      continue;
    }
    try {
      const base = path.basename(local).replace(/\.[^.]+$/, "") || img.id;
      const destName = `${base}-sdr.jpg`;
      const destPath = path.join(sdrDir, destName);
      const buf = await fs.readFile(local);
      const out = await encodeSdr(buf);
      await fs.writeFile(destPath, out);
      await prisma.productImage.update({
        where: { id: img.id },
        data: { url: `/uploads/products-sdr/${destName}` },
      });
      fixed++;
      console.log("ok", img.url, "->", destName);
    } catch (e) {
      failed++;
      console.error("fail", img.url, e.message || e);
    }
  }

  console.log(JSON.stringify({ fixed, skipped, failed, total: images.length }));
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});

