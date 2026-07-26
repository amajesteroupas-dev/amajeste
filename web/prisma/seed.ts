import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL || "admin@amajeste.com.br";
  const password = process.env.ADMIN_PASSWORD || "admin123";
  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.upsert({
    where: { email },
    update: { passwordHash, role: "ADMIN", name: "Administrador Majesté" },
    create: {
      email,
      passwordHash,
      name: "Administrador Majesté",
      role: "ADMIN",
    },
  });

  const categories = [
    { name: "Conjunto Legging", slug: "conjunto-legging", sortOrder: 1 },
    { name: "Conjunto Short", slug: "conjunto-short", sortOrder: 2 },
    { name: "Macacão", slug: "macacao", sortOrder: 3 },
    { name: "Macaquinho", slug: "macaquinho", sortOrder: 4 },
    { name: "Diversos", slug: "diversos", sortOrder: 5 },
    { name: "Outlet", slug: "outlet", sortOrder: 6 },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, sortOrder: cat.sortOrder },
      create: cat,
    });
  }

  const legging = await prisma.category.findUniqueOrThrow({
    where: { slug: "conjunto-legging" },
  });
  const diversos = await prisma.category.findUniqueOrThrow({
    where: { slug: "diversos" },
  });
  const macacao = await prisma.category.findUniqueOrThrow({
    where: { slug: "macacao" },
  });

  const products = [
    {
      name: "Conjunto Aurora",
      slug: "conjunto-aurora",
      description:
        "Conjunto fitness com modelagem que une conforto, desempenho e feminilidade. Tecido de alta compressão com toque macio.",
      price: 179.9,
      costPrice: 75,
      featured: true,
      categoryId: legging.id,
      variants: [
        { sku: "AUR-M-PRETO", size: "M", color: "Preto", colorHex: "#111111", stock: 12 },
        { sku: "AUR-G-PRETO", size: "G", color: "Preto", colorHex: "#111111", stock: 8 },
      ],
    },
    {
      name: "Conjunto Legging",
      slug: "conjunto-legging-classico",
      description:
        "Conjunto legging clássico Majesté. Cintura alta e acabamento premium para treinos e uso diário.",
      price: 159.9,
      costPrice: 68,
      featured: true,
      categoryId: legging.id,
      variants: [
        { sku: "LEG-U-PRETO", size: "Único (36 ao 40)", color: "Preto", colorHex: "#111111", stock: 20 },
      ],
    },
    {
      name: "Conjunto Gisele",
      slug: "conjunto-gisele",
      description: "Conjunto versátil com opções de cores vibrantes. Ideal para academia e streetwear.",
      price: 149.9,
      costPrice: 62,
      featured: true,
      categoryId: legging.id,
      variants: [
        { sku: "GIS-U-AZUL", size: "Único (36 ao 40)", color: "Azul", colorHex: "#3b6ea5", stock: 10 },
        { sku: "GIS-U-CINZA", size: "Único (36 ao 40)", color: "Cinza claro", colorHex: "#c4c4c4", stock: 7 },
        { sku: "GIS-U-LARANJA", size: "Único (36 ao 40)", color: "Laranjado", colorHex: "#e07a3d", stock: 5 },
      ],
    },
    {
      name: "Macacão Paloma",
      slug: "macacao-paloma",
      description: "Macacão elegante com caimento sofisticado. Peça statement da coleção Majesté.",
      price: 199.9,
      costPrice: 85,
      featured: true,
      categoryId: macacao.id,
      variants: [
        { sku: "PAL-U-PRETO", size: "Único (36 ao 42)", color: "Preto", colorHex: "#111111", stock: 9 },
      ],
    },
    {
      name: "Corta Vento",
      slug: "corta-vento",
      description: "Corta vento leve e resistente, disponível em várias cores. Proteção e estilo.",
      price: 99.9,
      costPrice: 40,
      featured: true,
      categoryId: diversos.id,
      variants: [
        { sku: "CV-G-AZULBEBE", size: "G", color: "Azul bebê", colorHex: "#a8d4e6", stock: 6 },
        { sku: "CV-M-AZULBEBE", size: "M", color: "Azul bebê", colorHex: "#a8d4e6", stock: 4 },
        { sku: "CV-G-VERMELHO", size: "G", color: "Vermelho", colorHex: "#c62828", stock: 5 },
        { sku: "CV-G-ROSA", size: "G", color: "Rosa pink", colorHex: "#e91e8c", stock: 3 },
      ],
    },
    {
      name: "Casaco",
      slug: "casaco",
      description: "Casaco confortável para dias mais frios. Toque macio e visual clean.",
      price: 129.9,
      costPrice: 55,
      featured: false,
      categoryId: diversos.id,
      variants: [
        { sku: "CAS-P-PRETO", size: "P", color: "Preto", colorHex: "#111111", stock: 4 },
        { sku: "CAS-M-PRETO", size: "M", color: "Preto", colorHex: "#111111", stock: 6 },
        { sku: "CAS-G-PRETO", size: "G", color: "Preto", colorHex: "#111111", stock: 5 },
      ],
    },
    {
      name: "Conjunto Mari",
      slug: "conjunto-mari",
      description: "Conjunto Mari com modelagem moderna e tecido de compressão média.",
      price: 189.9,
      costPrice: 80,
      featured: true,
      categoryId: legging.id,
      variants: [
        { sku: "MAR-M-PRETO", size: "M", color: "Preto", colorHex: "#111111", stock: 11 },
      ],
    },
    {
      name: "Conjunto Nina",
      slug: "conjunto-nina",
      description: "Conjunto Nina em vermelho vibrante. Destaque garantido no treino.",
      price: 149.9,
      costPrice: 65,
      featured: true,
      categoryId: legging.id,
      variants: [
        { sku: "NIN-U-VERM", size: "Único (36 ao 40)", color: "Vermelho", colorHex: "#c62828", stock: 8 },
      ],
    },
  ];

  for (const p of products) {
    const { variants, ...productData } = p;
    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: {
        name: productData.name,
        description: productData.description,
        price: productData.price,
        costPrice: productData.costPrice,
        featured: productData.featured,
        categoryId: productData.categoryId,
        active: true,
      },
      create: {
        ...productData,
        images: {
          create: [
            {
              url: `/placeholders/${p.slug}.svg`,
              alt: p.name,
              isPrimary: true,
              sortOrder: 0,
            },
          ],
        },
      },
    });

    for (const v of variants) {
      await prisma.productVariant.upsert({
        where: { sku: v.sku },
        update: {
          size: v.size,
          color: v.color,
          colorHex: v.colorHex,
          stock: v.stock,
          active: true,
        },
        create: {
          ...v,
          productId: product.id,
        },
      });
    }
  }

  console.log("Seed OK — admin:", email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
