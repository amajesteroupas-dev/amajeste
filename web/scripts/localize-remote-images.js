/**
 * Download remote ProductImage URLs into public/products and rewrite DB urls.
 */
const https = require("https");
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const OUT = path.join(process.cwd(), "public", "products");

function get(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https") ? https : http;
    const req = lib.get(
      url,
      {
        headers: { "User-Agent": "Mozilla/5.0 MajesteFix/1.0", Accept: "image/*" },
        timeout: 45000,
      },
      (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return get(res.headers.location).then(resolve, reject);
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const buf = Buffer.concat(chunks);
          if (res.statusCode >= 400 || buf.length < 800) {
            return reject(new Error(`HTTP ${res.statusCode} size=${buf.length}`));
          }
          resolve(buf);
        });
      }
    );
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("timeout"));
    });
  });
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const images = await prisma.productImage.findMany({
    where: { OR: [{ url: { startsWith: "http://" } }, { url: { startsWith: "https://" } }] },
    include: { product: { select: { slug: true } } },
  });
  console.log("Remote images:", images.length);
  let ok = 0;
  for (const img of images) {
    try {
      const buf = await get(img.url);
      const ext = (img.url.match(/\.(jpe?g|png|webp)/i) || [, "jpg"])[1].toLowerCase();
      const hash = crypto.createHash("md5").update(img.url).digest("hex").slice(0, 8);
      const colorPart = (img.alt || "img")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .slice(0, 24);
      const filename = `${img.product.slug}-${colorPart}-${hash}.${ext === "jpeg" ? "jpg" : ext}`;
      fs.writeFileSync(path.join(OUT, filename), buf);
      const local = `/products/${filename}`;
      await prisma.productImage.update({
        where: { id: img.id },
        data: { url: local },
      });
      ok++;
      console.log("OK", img.alt || "", "→", filename, buf.length);
    } catch (e) {
      console.log("FAIL", img.url.split("/").pop(), e.message);
    }
  }
  console.log({ ok, total: images.length });
  await prisma.$disconnect();
})().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
