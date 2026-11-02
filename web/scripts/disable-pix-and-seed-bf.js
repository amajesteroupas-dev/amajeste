/**
 * Zera o desconto Pix global/produto, atualiza textos de pagamento
 * e garante a categoria Black Friday.
 *
 * Uso: node scripts/disable-pix-and-seed-bf.js
 */
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const PAYMENT_COPY = {
  productCardLine: "No Pix · {price}",
  productCardLinePromo: "{percent}% OFF no site · {price}",
  pixHeadline: "Pague no Pix",
  pixDetail: "Pagamento instantâneo e seguro",
  pixHeadlinePromo: "{percent}% de desconto em todo o site",
  pixDetailPromo: "Válido também no Pix · Não acumulável com cupons",
  footerPaymentLine:
    "Aceitamos Pix e cartão. Pagamentos processados com segurança.",
};

function slugify(text) {
  return String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

async function main() {
  const products = await prisma.product.updateMany({
    data: { pixDiscountPercent: 0 },
  });
  console.log(`Pix zerado em ${products.count} produto(s).`);

  await prisma.siteSetting.upsert({
    where: { key: "paymentCopyJson" },
    create: { key: "paymentCopyJson", value: JSON.stringify(PAYMENT_COPY) },
    update: { value: JSON.stringify(PAYMENT_COPY) },
  });
  console.log("Textos de pagamento atualizados (sem 5% no Pix).");

  const existing = await prisma.category.findFirst({
    where: {
      OR: [
        { slug: "black-friday" },
        { name: { equals: "Black Friday", mode: "insensitive" } },
      ],
    },
  });
  if (existing) {
    console.log(`Categoria Black Friday já existe: ${existing.slug}`);
  } else {
    const base = slugify("Black Friday") || "black-friday";
    let slug = base;
    let n = 1;
    while (await prisma.category.findUnique({ where: { slug } })) {
      slug = `${base}-${n++}`;
    }
    const maxSort = await prisma.category.aggregate({ _max: { sortOrder: true } });
    const cat = await prisma.category.create({
      data: {
        name: "Black Friday",
        slug,
        sortOrder: (maxSort._max.sortOrder || 0) + 1,
      },
    });
    console.log(`Categoria criada: ${cat.name} (${cat.slug})`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
