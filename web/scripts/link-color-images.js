/**
 * Fetch WooCommerce variation images and set ProductImage.alt = color
 * so the category filter can show the correct photo per color.
 *
 * Env: WOO_KEY, WOO_SECRET
 */
const https = require("https");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const BASE = "https://amajeste.com.br/wp-json/wc/v3";
const KEY = process.env.WOO_KEY;
const SECRET = process.env.WOO_SECRET;
const AUTH = Buffer.from(`${KEY}:${SECRET}`).toString("base64");

const ALIASES = {
  azul: "Azul",
  azul3: "Azul",
  "azul marinho": "Azul Marinho",
  "azul bebe": "Azul bebê",
  "azul bebê": "Azul bebê",
  "azul agua": "Azul água",
  rosa: "Rosa",
  "rosa bebe": "Rosa bebê",
  "rosa bebê": "Rosa bebê",
  rosabb: "Rosa bebê",
  "rosa pink": "Rosa pink",
  "rosa claro": "Rosa claro",
  "rosa ciclete": "Rosa chiclete",
  "rosa salmao": "Rosa salmão",
  vermelho: "Vermelho",
  vermelhovaness: "Vermelho",
  bordo: "Bordô",
  bordô: "Bordô",
  marrom: "Marrom",
  marrom1: "Marrom",
  marromvaness: "Marrom",
  chocolate: "Chocolate",
  preto: "Preto",
  branco: "Branco",
  off: "Off-white",
  bege: "Bege",
  cinza: "Cinza",
  "cinza claro": "Cinza claro",
  verde: "Verde",
  "verde militar": "Verde militar",
  "verde siciliano": "Verde siciliano",
  "verde florescente": "Verde fluorescente",
  roxo: "Roxo",
  roxo1: "Roxo",
  "roxo médio": "Roxo médio",
  laranja: "Laranja",
  laranjado: "Laranja",
};

function normalizeColor(raw) {
  const key = String(raw || "").trim().toLowerCase();
  return ALIASES[key] || String(raw || "").trim().replace(/\s+/g, " ");
}

function get(url) {
  return new Promise((resolve, reject) => {
    https
      .get(
        url,
        {
          headers: {
            Authorization: `Basic ${AUTH}`,
            "User-Agent": "Majeste-ColorSync/1.0",
          },
        },
        (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            return get(res.headers.location).then(resolve, reject);
          }
          const chunks = [];
          res.on("data", (c) => chunks.push(c));
          res.on("end", () => {
            const body = Buffer.concat(chunks).toString("utf8");
            if (res.statusCode >= 400) {
              return reject(new Error(`HTTP ${res.statusCode} ${body.slice(0, 200)}`));
            }
            resolve(JSON.parse(body));
          });
        }
      )
      .on("error", reject);
  });
}

function fullUrl(u) {
  return String(u)
    .replace(/-scaled(\.[a-z0-9]+)$/i, "$1")
    .replace(/-\d+x\d+(\.[a-z0-9]+)$/i, "$1");
}

(async () => {
  if (!KEY || !SECRET) {
    console.error("Missing WOO_KEY / WOO_SECRET");
    process.exit(1);
  }

  let page = 1;
  let totalPages = 1;
  let linked = 0;

  do {
    const batch = await get(
      `${BASE}/products?per_page=50&page=${page}&status=publish`
    );
    // Woo returns array; total pages from previous export we know ~1-2
    if (!Array.isArray(batch) || batch.length === 0) break;
    totalPages = page; // will break when empty
    if (batch.length === 50) totalPages = page + 1;

    for (const p of batch) {
      const slug = p.slug;
      const product = await prisma.product.findUnique({
        where: { slug },
        include: { images: true, variants: true },
      });
      if (!product) {
        console.log("skip missing", slug);
        continue;
      }

      if (p.type !== "variable") continue;

      let vpage = 1;
      let vars = [];
      for (;;) {
        const chunk = await get(
          `${BASE}/products/${p.id}/variations?per_page=100&page=${vpage}`
        );
        if (!Array.isArray(chunk) || !chunk.length) break;
        vars = vars.concat(chunk);
        if (chunk.length < 100) break;
        vpage++;
      }

      let sortBase = product.images.length;
      for (const v of vars) {
        const colorAttr = (v.attributes || []).find((a) =>
          /cor|color/i.test(a.name)
        );
        if (!colorAttr?.option) continue;
        const color = normalizeColor(colorAttr.option);
        const imgSrc = v.image?.src;
        if (!imgSrc) continue;
        const url = fullUrl(imgSrc);

        // Update variant colorHex if we can leave as-is
        await prisma.productVariant.updateMany({
          where: { productId: product.id, color },
          data: { color },
        });

        const existing = product.images.find(
          (img) =>
            img.url === url ||
            img.url.includes(url.split("/").pop().replace(/\.[^.]+$/, "")) ||
            (img.alt || "").toLowerCase() === color.toLowerCase()
        );

        if (existing) {
          await prisma.productImage.update({
            where: { id: existing.id },
            data: { alt: color },
          });
        } else {
          // Prefer local /products/ copy if exists with same basename
          const basename = url.split("/").pop();
          const localGuess = product.images.find((img) =>
            img.url.includes(basename.replace(/\.[^.]+$/, ""))
          );
          if (localGuess) {
            await prisma.productImage.update({
              where: { id: localGuess.id },
              data: { alt: color },
            });
          } else {
            await prisma.productImage.create({
              data: {
                productId: product.id,
                url,
                alt: color,
                isPrimary: false,
                sortOrder: sortBase++,
              },
            });
          }
        }
        linked++;
        console.log("LINK", slug, color, "←", url.split("/").pop());
      }
    }
    page++;
  } while (page <= totalPages && page < 10);

  console.log("Linked color images:", linked);
  await prisma.$disconnect();
})().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
