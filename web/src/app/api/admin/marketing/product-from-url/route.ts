import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { normalizeColor, pickImageForColor } from "@/lib/colors";
import { formatBRL } from "@/lib/utils";

async function requireStaff() {
  const session = await adminAuth();
  if (
    !session?.user ||
    (session.user.role !== "ADMIN" && session.user.role !== "STAFF")
  ) {
    return null;
  }
  return session;
}

/** Extrai slug (e cor opcional) de URL/caminho do produto. */
function parseProductLink(raw: string): {
  slug: string | null;
  color: string | null;
} {
  const input = String(raw || "").trim();
  if (!input) return { slug: null, color: null };

  let pathname = input;
  let search = "";
  try {
    if (/^https?:\/\//i.test(input)) {
      const u = new URL(input);
      pathname = u.pathname;
      search = u.search;
    } else if (input.includes("?")) {
      const [p, q] = input.split("?");
      pathname = p;
      search = `?${q}`;
    }
  } catch {
    pathname = input.split("?")[0];
  }

  const path = pathname.replace(/\/+$/, "");
  const match = path.match(/\/produto\/([^/?#]+)/i);
  const slug = match
    ? decodeURIComponent(match[1])
    : path.includes("/")
      ? null
      : decodeURIComponent(path);

  let color: string | null = null;
  if (search) {
    const params = new URLSearchParams(
      search.startsWith("?") ? search.slice(1) : search
    );
    const cor = params.get("cor") || params.get("color");
    if (cor) color = normalizeColor(cor);
  }

  return { slug: slug || null, color };
}

export async function GET(req: NextRequest) {
  const session = await requireStaff();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const url = req.nextUrl.searchParams.get("url") || "";
  const { slug, color } = parseProductLink(url);
  if (!slug) {
    return NextResponse.json(
      {
        error:
          "Cole o link do produto (ex.: https://equilibra.tech/produto/conjunto-gisele)",
      },
      { status: 400 }
    );
  }

  const product = await prisma.product.findFirst({
    where: {
      slug,
      deletedAt: null,
    },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      category: { select: { name: true } },
      variants: {
        where: { active: true },
        select: { color: true, colorHex: true },
      },
    },
  });

  if (!product) {
    return NextResponse.json(
      { error: `Produto não encontrado: ${slug}` },
      { status: 404 }
    );
  }

  let images = product.images.map((img, index) => ({
    id: img.id,
    url: img.url,
    alt: img.alt,
    sortOrder: img.sortOrder,
    index,
  }));

  if (color) {
    const preferred = pickImageForColor(product.images, color);
    if (preferred) {
      images = [...images].sort((a, b) =>
        a.url === preferred ? -1 : b.url === preferred ? 1 : 0
      );
    }
  }

  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL || "https://equilibra.tech"
  ).replace(/\/$/, "");
  const productPath = color
    ? `/produto/${product.slug}?cor=${encodeURIComponent(color)}`
    : `/produto/${product.slug}`;

  return NextResponse.json({
    id: product.id,
    name: product.name,
    slug: product.slug,
    price: formatBRL(Number(product.price)),
    category: product.category.name,
    focusColor: color,
    href: productPath,
    absoluteHref: `${siteUrl}${productPath}`,
    images,
  });
}
