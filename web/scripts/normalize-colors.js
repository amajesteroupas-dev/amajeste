/**
 * Normalize messy WooCommerce color names on ProductVariant rows.
 */
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const ALIASES = {
  azul: "Azul",
  azul3: "Azul",
  "azul marinho": "Azul Marinho",
  "azul bebê": "Azul bebê",
  "azul bebe": "Azul bebê",
  "azul agua": "Azul água",
  "azul água": "Azul água",
  rosa: "Rosa",
  "rosa bebê": "Rosa bebê",
  "rosa bebe": "Rosa bebê",
  rosabb: "Rosa bebê",
  "rosa pink": "Rosa pink",
  "rosa claro": "Rosa claro",
  "rosa ciclete": "Rosa chiclete",
  "rosa chiclete": "Rosa chiclete",
  "rosa salmao": "Rosa salmão",
  "rosa salmão": "Rosa salmão",
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
  "roxo medio": "Roxo médio",
  laranja: "Laranja",
  laranjado: "Laranja",
};

function normalizeColor(raw) {
  const key = String(raw || "")
    .trim()
    .toLowerCase();
  if (ALIASES[key]) return ALIASES[key];
  if (/^padr[aã]o$/i.test(key)) return "Padrão";
  return String(raw || "").trim().replace(/\s+/g, " ");
}

async function main() {
  const variants = await prisma.productVariant.findMany();
  let updated = 0;
  const collisions = [];

  for (const v of variants) {
    const next = normalizeColor(v.color);
    if (next === v.color) continue;

    const clash = await prisma.productVariant.findUnique({
      where: {
        productId_size_color: {
          productId: v.productId,
          size: v.size,
          color: next,
        },
      },
    });

    if (clash && clash.id !== v.id) {
      // Merge stock into canonical, deactivate duplicate dirty row
      await prisma.productVariant.update({
        where: { id: clash.id },
        data: { stock: clash.stock + v.stock, active: true },
      });
      await prisma.productVariant.update({
        where: { id: v.id },
        data: { active: false, color: `${next} (dup ${v.id.slice(-4)})` },
      });
      collisions.push({ from: v.color, to: next, sku: v.sku });
      updated++;
      continue;
    }

    await prisma.productVariant.update({
      where: { id: v.id },
      data: { color: next },
    });
    updated++;
    console.log("OK", v.sku, v.color, "→", next);
  }

  console.log(JSON.stringify({ updated, collisions }, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
