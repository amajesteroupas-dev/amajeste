/**
 * Download WooCommerce product images at maximum resolution into public/products/
 * and emit a JSON map slug -> local urls for DB update.
 */
const https = require("https");
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.join(__dirname, "..");
const WOO = path.join(ROOT, "woo-products.json");
const OUT_DIR = path.join(ROOT, "public", "products");
const MAP_OUT = path.join(ROOT, "scripts", "product-image-map.json");

function fullUrl(u) {
  return String(u)
    .replace(/-scaled(\.[a-z0-9]+)$/i, "$1")
    .replace(/-\d+x\d+(\.[a-z0-9]+)$/i, "$1");
}

function get(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https") ? https : http;
    const req = lib.get(
      url,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 MajesteImageSync/1.0",
          Accept: "image/*,*/*",
        },
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
          if (res.statusCode >= 400 || buf.length < 1000) {
            return reject(
              new Error(`HTTP ${res.statusCode} ${url} size=${buf.length}`)
            );
          }
          resolve(buf);
        });
      }
    );
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("timeout " + url));
    });
  });
}

function slugify(input) {
  return String(input)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const products = JSON.parse(fs.readFileSync(WOO, "utf8"));
  const map = {};
  let ok = 0;
  let fail = 0;

  for (const p of products) {
    const slug = p.slug || slugify(p.name);
    const urls = (p.images || []).slice(0, 6).map((i) => fullUrl(i.src));
    const local = [];
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const ext = (url.match(/\.(jpe?g|png|webp)/i) || [, "jpg"])[1].toLowerCase();
      const hash = crypto.createHash("md5").update(url).digest("hex").slice(0, 8);
      const filename = `${slug}-${i}-${hash}.${ext === "jpeg" ? "jpg" : ext}`;
      const dest = path.join(OUT_DIR, filename);
      try {
        if (!fs.existsSync(dest) || fs.statSync(dest).size < 5000) {
          // try full URL first, fallback to original if 404
          let buf;
          try {
            buf = await get(url);
          } catch {
            buf = await get(p.images[i].src);
          }
          fs.writeFileSync(dest, buf);
          console.log("OK", filename, buf.length);
        } else {
          console.log("SKIP", filename);
        }
        local.push(`/products/${filename}`);
        ok++;
      } catch (e) {
        console.log("FAIL", slug, i, e.message);
        fail++;
        // keep remote as fallback
        local.push(p.images[i].src);
      }
    }
    if (local.length) map[slug] = local;
  }

  // Hero picks: three strong full-body shots for homepage
  const heroDir = path.join(ROOT, "public", "brand");
  const heroCandidates = [
    "Macacão Fernanda",
    "Macacão Cecília",
    "Conjunto Gisele",
    "Macacão Gringo",
    "Corta Vento",
    "Conjunto Aurora",
  ];
  const heroFiles = [];
  for (const name of heroCandidates) {
    const p = products.find((x) => x.name === name);
    if (!p?.images?.[0]) continue;
    const url = fullUrl(p.images[0].src);
    const dest = path.join(heroDir, `hero-photo-${heroFiles.length + 1}.jpg`);
    try {
      let buf;
      try {
        buf = await get(url);
      } catch {
        buf = await get(p.images[0].src);
      }
      fs.writeFileSync(dest, buf);
      heroFiles.push(`/brand/hero-photo-${heroFiles.length + 1}.jpg`);
      console.log("HERO", dest, buf.length);
      if (heroFiles.length >= 3) break;
    } catch (e) {
      console.log("HERO FAIL", name, e.message);
    }
  }

  fs.writeFileSync(
    MAP_OUT,
    JSON.stringify({ products: map, hero: heroFiles }, null, 2)
  );
  console.log(JSON.stringify({ ok, fail, products: Object.keys(map).length, hero: heroFiles }, null, 2));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
