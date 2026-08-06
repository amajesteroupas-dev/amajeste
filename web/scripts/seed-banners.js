const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.banner.count();
  if (count > 0) {
    console.log("Banners already exist:", count);
    return;
  }

  await prisma.banner.createMany({
    data: [
      {
        title: "Vista sua força",
        subtitle:
          "Modelagens que unem conforto, desempenho e feminilidade em cada movimento.",
        ctaLabel: "Comprar agora",
        ctaHref: "/categoria/conjunto-legging",
        imageUrl: "/brand/hero-photo-1.jpg",
        textAlign: "left",
        overlay: 0.1,
        sortOrder: 0,
        active: true,
      },
      {
        title: "Mova-se com estilo",
        subtitle: "Nova coleção com conforto, elegância e performance.",
        ctaLabel: "Ver macacões",
        ctaHref: "/categoria/macacao",
        imageUrl: "/brand/hero-photo-2.jpg",
        textAlign: "left",
        overlay: 0.1,
        sortOrder: 1,
        active: true,
      },
    ],
  });

  // Seed a few media assets pointing at existing product photos
  const imgs = await prisma.productImage.findMany({ take: 12 });
  for (const img of imgs) {
    await prisma.mediaAsset.create({
      data: {
        url: img.url,
        thumbUrl: img.url,
        alt: img.alt,
        source: "product",
      },
    });
  }

  console.log("Seeded default banners + media refs");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
