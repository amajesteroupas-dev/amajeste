const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

function fold(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}
function isPlaceholder(url) {
  const u = String(url || "").toLowerCase();
  return u.includes("/placeholders/") || /^placeholders\//.test(u);
}
function positive(n) {
  return n != null && Number(n) > 0 && !Number.isNaN(Number(n));
}

(async () => {
  const prod = await p.product.findFirst({
    where: {
      OR: [
        { slug: "macaquinho-msdn4hwz" },
        {
          AND: [
            { name: { contains: "Macaquinho", mode: "insensitive" } },
            { slug: { contains: "msdn4hwz" } },
          ],
        },
      ],
    },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      variants: true,
      category: { select: { id: true, name: true } },
    },
  });
  if (!prod) {
    console.log(JSON.stringify({ error: "not_found" }));
    await p.$disconnect();
    return;
  }

  const issues = [];
  const price = Number(prod.price);
  if (!positive(price))
    issues.push({ code: "price", message: "Preço inválido ou zerado." });
  if (!String(prod.categoryId || "").trim())
    issues.push({ code: "category", message: "Categoria obrigatória." });
  if (
    !positive(prod.weightKg) ||
    !positive(prod.lengthCm) ||
    !positive(prod.widthCm) ||
    !positive(prod.heightCm)
  ) {
    issues.push({
      code: "shipping",
      message: "Dimensões de frete incompletas.",
      detail: {
        weightKg: prod.weightKg,
        lengthCm: prod.lengthCm,
        widthCm: prod.widthCm,
        heightCm: prod.heightCm,
      },
    });
  }
  const activeVariants = prod.variants.filter((v) => v.active !== false);
  if (activeVariants.length === 0)
    issues.push({ code: "variants", message: "Nenhuma variante ativa." });

  const realImages = prod.images.filter(
    (img) => img.url && !isPlaceholder(img.url)
  );
  if (realImages.length === 0)
    issues.push({ code: "photos", message: "Falta foto real do produto." });

  if (activeVariants.length > 0 && realImages.length > 0) {
    const linked = new Set();
    for (const img of realImages) {
      if (img.alt?.trim()) linked.add(fold(img.alt));
    }
    const missing = [];
    const seen = new Set();
    for (const v of activeVariants) {
      const c = fold(v.color);
      if (!c || seen.has(c)) continue;
      seen.add(c);
      if (!linked.has(c)) missing.push(v.color);
    }
    if (missing.length) {
      issues.push({
        code: "photo_per_color",
        message: "Cores sem foto vinculada: " + missing.join(", "),
        missingColors: missing,
        linkedAlts: [...linked],
      });
    }
  }

  console.log(
    JSON.stringify(
      {
        id: prod.id,
        name: prod.name,
        slug: prod.slug,
        active: prod.active,
        price: String(prod.price),
        category: prod.category?.name || null,
        categoryId: prod.categoryId,
        weightKg: prod.weightKg,
        lengthCm: prod.lengthCm,
        widthCm: prod.widthCm,
        heightCm: prod.heightCm,
        images: prod.images.map((i) => ({
          url: i.url,
          alt: i.alt,
          primary: i.isPrimary,
        })),
        variants: prod.variants.map((v) => ({
          size: v.size,
          color: v.color,
          stock: v.stock,
          active: v.active,
          sku: v.sku,
        })),
        issues,
        ok: issues.length === 0,
      },
      null,
      2
    )
  );
  await p.$disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
