/**
 * Capa editorial: uma modelo por slide, texto ao lado no desktop
 * e sobre a foto no celular.
 * Uso no container: node scripts/create-capa-stage.js
 */
const { PrismaClient } = require("@prisma/client");

const STYLE = {
  title: {
    bold: false,
    font: "display",
    size: 64,
    color: "#f4efe9",
    italic: false,
    uppercase: false,
  },
  subtitle: {
    bold: false,
    font: "sans",
    size: 16,
    color: "#e4d9cf",
    italic: false,
    uppercase: false,
  },
  highlight: {
    bold: false,
    font: "display",
    size: 28,
    color: "#f4efe9",
    italic: false,
    uppercase: false,
  },
  promo: {
    bold: false,
    font: "body",
    size: 15,
    color: "#e4d9cf",
    italic: false,
  },
  tagline: {
    bold: true,
    font: "sans",
    size: 12,
    color: "#c6a56a",
    italic: false,
    uppercase: true,
    letterSpacing: 0.34,
  },
  cta: {
    bold: true,
    font: "sans",
    size: 12,
    color: "#241c18",
    bgColor: "#f4efe9",
    borderRadius: 0,
    paddingX: 18,
    paddingY: 12,
  },
};

const SLIDES = [
  {
    title: "Seja bem\u2011vinda",
    subtitle: "Moda fitness com presença",
    tagline: "Majesté",
    ctaLabel: "Comprar agora",
    image: "/brand/capa/shorts-magenta.jpg",
    focalY: 18,
  },
  {
    title: "Vista\u2011se com estilo",
    subtitle: "Modelagem que acompanha o corpo",
    tagline: "A coleção",
    ctaLabel: "Ver looks",
    image: "/brand/capa/macacao-magenta.jpg",
    focalY: 16,
  },
  {
    title: "Do treino ao dia",
    subtitle: "Peças para o movimento inteiro",
    tagline: "Majesté",
    ctaLabel: "Ver a coleção",
    image: "/brand/capa/wrap-azul.jpg",
    focalY: 16,
  },
  {
    title: "Feita para você",
    subtitle: "Caimento que valoriza cada detalhe",
    tagline: "Novidades",
    ctaLabel: "Comprar agora",
    image: "/brand/capa/scallop-preto.jpg",
    focalY: 16,
  },
  {
    title: "Presença em cada cor",
    subtitle: "Do rosa ao azul, o mesmo caimento",
    tagline: "Looks",
    ctaLabel: "Ver looks",
    image: "/brand/capa/rosa-reto.jpg",
    focalY: 16,
  },
  {
    title: "Leve para onde for",
    subtitle: "Conforto com a cara da Majesté",
    tagline: "Majesté",
    ctaLabel: "Comprar agora",
    image: "/brand/capa/calca-azul.jpg",
    focalY: 16,
  },
];

async function main() {
  const prisma = new PrismaClient();
  try {
    const cat = await prisma.category.findFirst({
      where: { slug: "conjunto-legging" },
      select: { slug: true },
    });
    const href = cat?.slug ? `/categoria/${cat.slug}` : "/";

    const off = await prisma.banner.updateMany({
      where: { active: true },
      data: { active: false },
    });
    console.log("banners antigos desativados:", off.count, "cta", href);

    for (let i = 0; i < SLIDES.length; i++) {
      const s = SLIDES[i];
      const row = await prisma.banner.create({
        data: {
          title: s.title,
          subtitle: s.subtitle,
          tagline: s.tagline,
          ctaLabel: s.ctaLabel,
          ctaHref: href,
          imageUrl: s.image,
          layout: "stage",
          textAlign: "left",
          overlay: 0,
          bgColor: "#241c18",
          panelColor: "#241c18",
          bannerSize: "tall",
          imageFit: "cover",
          focalX: 50,
          focalY: s.focalY,
          imageZoom: 1,
          textStyle: STYLE,
          cutoutImages: [],
          sortOrder: i,
          active: true,
        },
      });
      console.log("criado", row.id, s.title);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
