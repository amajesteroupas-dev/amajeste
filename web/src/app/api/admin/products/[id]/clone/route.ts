import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import {
  actorFromSession,
  requestIp,
  writeAuditLog,
} from "@/lib/audit-log";

type Props = { params: Promise<{ id: string }> };

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

async function uniqueProductSlug(baseName: string) {
  const slug = slugify(baseName) || `produto-${Date.now().toString(36)}`;
  const exists = await prisma.product.findUnique({ where: { slug } });
  if (!exists) return slug;
  return `${slug}-${Date.now().toString(36)}`;
}

/**
 * Clona só a “ficha” do produto: nome, descrição, preço, frete/medidas, pagamento, categoria.
 * Não copia fotos, vídeo nem variantes (cores/tamanhos).
 * Produto nasce inativo.
 */
export async function POST(req: NextRequest, { params }: Props) {
  const session = await requireStaff();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const source = await prisma.product.findUnique({ where: { id } });

  if (!source || source.deletedAt) {
    return NextResponse.json(
      { error: "Produto não encontrado" },
      { status: 404 }
    );
  }

  const copyName = `${source.name} (cópia)`;
  const slug = await uniqueProductSlug(copyName);

  try {
    const cloned = await prisma.product.create({
      data: {
        name: copyName,
        slug,
        description: source.description,
        price: source.price,
        costPrice: source.costPrice,
        compareAt: source.compareAt,
        featured: false,
        destaque: false,
        active: false,
        installmentsMax: source.installmentsMax,
        interestFree: source.interestFree,
        pixDiscountPercent: source.pixDiscountPercent,
        showPaymentFlags: source.showPaymentFlags,
        weightKg: source.weightKg,
        lengthCm: source.lengthCm,
        widthCm: source.widthCm,
        heightCm: source.heightCm,
        videoUrl: null,
        categoryId: source.categoryId,
        viewCount: 0,
      },
      include: {
        variants: true,
        images: true,
      },
    });

    void writeAuditLog({
      category: "products",
      action: "create",
      summary: `Produto clonado (só ficha): ${copyName} (de ${source.name})`,
      entityType: "Product",
      entityId: cloned.id,
      detail: {
        sourceId: source.id,
        sourceName: source.name,
        variants: 0,
        images: 0,
      },
      actor: actorFromSession(session),
      ip: requestIp(req),
    });

    return NextResponse.json({
      ok: true,
      product: cloned,
      message: `Cópia criada: "${copyName}". Só ficha (medidas/preço/etc.) — sem fotos e sem cores/tamanhos. Cadastre as variantes e ative quando quiser.`,
    });
  } catch (err) {
    console.error("[clone-product]", err);
    return NextResponse.json(
      { error: "Não foi possível clonar o produto (slug duplicado?)." },
      { status: 400 }
    );
  }
}

