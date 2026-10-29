/**
 * Substitui a capa da home por slides com duas modelos e texto no centro.
 * Uso no container: node scripts/create-capa-stage.js
 */
const { PrismaClient } = require("@prisma/client");

const STYLE = {
  title: {
    bold: false,
    font: "display",
    size: 54,
    color: "#5c4336",
    italic: false,
    uppercase: false,
  },
  subtitle: {
    bold: false,
    font: "sans",
    size: 16,
    color: "#5c534c",
    italic: false,
    uppercase: false,
  },
  highlight: {
    bold: false,
    font: "display",
    size: 28,
    color: "#5c4336",
    italic: false,
    uppercase: false,
  },
  promo: {
    bold: false,
    font: "body",
    size: 15,
    color: "#5c534c",
    italic: false,
  },
  tagline: {
    bold: true,
    font: "sans",
    size: 12,
    color: "#8a7468",
    italic: false,
    uppercase: true,
    letterSpacing: 0.28,
  },
  cta: {
    bold: true,
    font: "sans",
    size: 12,
    color: "#ffffff",
    bgColor: "#5c4336",
    borderRadius: 0,
    paddingX: 16,
    paddingY: 11,
  },
};

const SLIDES = [
  {
    title: "Seja bem\u2011vinda",
    subtitle: "A sua loja de moda fitness com presença",
    tagline: "Majesté",
    ctaLabel: "Comprar agora",
    left: "/brand/capa/shorts-magenta.jpg",
    right: "/brand/capa/jaqueta-azul.jpg",
  },
  {
    title: "Vista\u2011se com estilo",
    subtitle: "Cores e caimento para treinar com presença",
    tagline: "Movimento",
    ctaLabel: "Ver looks",
    left: "/brand/capa/conjunto-azul.jpg",
    right: "/brand/capa/macacao-magenta.jpg",
  },
  {
    title: "Do treino ao dia",
    subtitle: "Modelagem que valoriza cada movimento",
    tagline: "Majesté",
    ctaLabel: "Ver a coleção",
    left: "/brand/capa/wrap-azul.jpg",
    right: "/brand/capa/calca-azul.jpg",
  },
  {
    title: "Feita para você",
    subtitle: "Peças que acompanham o seu ritmo",
    tagline: "Novidades",
    ctaLabel: "Comprar agora",
    left: "/brand/capa/scallop-preto.jpg",
    right: "/brand/capa/scallop-rosa.jpg",
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
          imageUrl: s.left,
          layout: "stage",
          textAlign: "center",
          overlay: 0,
          bgColor: "#f6f1ea",
          panelColor: "#f6f1ea",
          bannerSize: "tall",
          imageFit: "cover",
          focalX: 50,
          focalY: 8,
          imageZoom: 1,
          textStyle: STYLE,
          cutoutImages: [{ url: s.right, x: 50, y: 0, scale: 1 }],
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
