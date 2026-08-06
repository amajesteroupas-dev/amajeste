import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { colorToHex, normalizeColor } from "@/lib/colors";
import {
  actorFromSession,
  requestIp,
  writeAuditLog,
} from "@/lib/audit-log";

async function requireAdmin() {
  const session = await adminAuth();
  if (
    !session?.user ||
    (session.user.role !== "ADMIN" && session.user.role !== "STAFF")
  ) {
    return null;
  }
  return session;
}

function skuSlug(part: string) {
  return part
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-zA-Z0-9]+/g, "")
    .toUpperCase()
    .slice(0, 12);
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const {
    name,
    description,
    price,
    costPrice = 0,
    categoryId,
    featured = false,
    destaque = false,
    size,
    color,
    stock = 0,
    sku,
    skuPrefix,
    sizes,
    colors,
    installmentsMax = 2,
    interestFree = true,
    pixDiscountPercent = 5,
    showPaymentFlags = true,
    weightKg = null,
    lengthCm = null,
    widthCm = null,
    heightCm = null,
  } = body;

  if (!name || !description || !price || !categoryId) {
    return NextResponse.json({ error: "Campos obrigatórios faltando" }, { status: 400 });
  }

  // Novas variantes: sizes[] + colors[] OU legado size/color/sku
  type VariantInput = {
    sku: string;
    size: string;
    color: string;
    colorHex: string | null;
    stock: number;
  };

  const stockQty = Number(stock) || 0;
  const unitCost = Number(costPrice) || 0;
  const variantsToCreate: VariantInput[] = [];

  if (Array.isArray(sizes) && Array.isArray(colors) && sizes.length && colors.length) {
    const prefix =
      String(skuPrefix || "").trim().toUpperCase() ||
      skuSlug(String(name)) ||
      "SKU";
    for (const s of sizes) {
      const sizeName = String(s).trim();
      if (!sizeName) continue;
      for (const c of colors) {
        const colorName = normalizeColor(
          typeof c === "string" ? c : String(c?.name || "")
        );
        if (!colorName) continue;
        const hex =
          typeof c === "object" && c?.hex
            ? String(c.hex)
            : colorToHex(colorName);
        variantsToCreate.push({
          sku: `${prefix}-${skuSlug(sizeName) || "TAM"}-${skuSlug(colorName) || "COR"}`,
          size: sizeName,
          color: colorName,
          colorHex: hex,
          stock: stockQty,
        });
      }
    }
  } else if (sku && size && color) {
    variantsToCreate.push({
      sku: String(sku).trim(),
      size: String(size).trim(),
      color: normalizeColor(String(color)),
      colorHex: colorToHex(String(color)),
      stock: stockQty,
    });
  }

  if (variantsToCreate.length === 0) {
    return NextResponse.json(
      { error: "Informe ao menos um tamanho e uma cor (ou SKU/tamanho/cor)." },
      { status: 400 }
    );
  }

  // Garante SKUs únicos
  const seen = new Set<string>();
  for (const v of variantsToCreate) {
    let skuTry = v.sku;
    let n = 1;
    while (seen.has(skuTry)) {
      skuTry = `${v.sku}-${n++}`;
    }
    seen.add(skuTry);
    v.sku = skuTry;
  }

  let slug = slugify(name);
  const existing = await prisma.product.findUnique({ where: { slug } });
  if (existing) slug = `${slug}-${Date.now().toString(36)}`;

  try {
    const product = await prisma.product.create({
      data: {
        name,
        slug,
        description,
        price,
        costPrice: unitCost,
        categoryId,
        // Sempre rascunho: fotos reais e frete se completam na edição.
        active: false,
        featured: Boolean(featured),
        destaque: Boolean(destaque),
        installmentsMax: Number(installmentsMax) || 2,
        interestFree: Boolean(interestFree),
        pixDiscountPercent: Number(pixDiscountPercent) || 0,
        showPaymentFlags: showPaymentFlags !== false,
        weightKg:
          weightKg != null && Number(weightKg) > 0 ? Number(weightKg) : null,
        lengthCm:
          lengthCm != null && Number(lengthCm) > 0 ? Number(lengthCm) : null,
        widthCm:
          widthCm != null && Number(widthCm) > 0 ? Number(widthCm) : null,
        heightCm:
          heightCm != null && Number(heightCm) > 0 ? Number(heightCm) : null,
        images: {
          create: [
            {
              url: `/placeholders/${slug}.svg`,
              alt: name,
              isPrimary: true,
            },
          ],
        },
        variants: {
          create: variantsToCreate.map((v) => ({
            sku: v.sku,
            size: v.size,
            color: v.color,
            colorHex: v.colorHex,
            stock: v.stock,
            avgCost: unitCost,
          })),
        },
      },
      include: { variants: true },
    });

    if (stockQty > 0) {
      for (const variant of product.variants) {
        await prisma.inventoryMovement.create({
          data: {
            variantId: variant.id,
            type: "IN",
            quantity: stockQty,
            unitCost: unitCost > 0 ? unitCost : undefined,
            totalCost: unitCost > 0 ? unitCost * stockQty : undefined,
            purchaseDate: new Date(),
            note: "Estoque inicial",
          },
        });
      }
    }

    void writeAuditLog({
      category: "products",
      action: "create",
      summary: `Produto criado: ${product.name}`,
      entityType: "Product",
      entityId: product.id,
      detail: {
        price: product.price,
        categoryId: product.categoryId,
        variants: product.variants.length,
        stockInitial: stockQty,
      },
      actor: actorFromSession(session),
      ip: requestIp(req),
    });

    return NextResponse.json(product);
  } catch {
    return NextResponse.json(
      { error: "Não foi possível criar (SKU duplicado?). Tente outro prefixo." },
      { status: 400 }
    );
  }
}
