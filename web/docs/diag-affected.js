const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
(async () => {
  const names = [
    "Andressa",
    "Lara",
    "Alícia",
    "Alicia",
    "Fabi",
    "Jade",
  ];
  for (const name of names) {
    const rows = await p.product.findMany({
      where: { name: { contains: name, mode: "insensitive" }, deletedAt: null },
      include: {
        images: true,
        variants: { where: { active: true } },
      },
    });
    for (const r of rows) {
      const colors = [...new Set(r.variants.map((v) => v.color))];
      const linked = new Set(
        r.images.map((i) => (i.alt || "").trim().toLowerCase()).filter(Boolean)
      );
      const miss = colors.filter((c) => !linked.has(c.toLowerCase()));
      const sdr = r.images.filter((i) => /800-sdr|products-sdr\/800/i.test(i.url))
        .length;
      console.log(
        JSON.stringify({
          name: r.name,
          slug: r.slug,
          active: r.active,
          images: r.images.length,
          sdrShared: sdr,
          miss,
        })
      );
    }
  }
  await p.$disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
