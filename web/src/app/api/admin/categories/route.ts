import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import {
  actorFromSession,
  requestIp,
  writeAuditLog,
} from "@/lib/audit-log";

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

async function uniqueSlug(base: string, excludeId?: string) {
  const slug = slugify(base) || `cat-${Date.now()}`;
  let n = 0;
  while (true) {
    const candidate = n === 0 ? slug : `${slug}-${n}`;
    const exists = await prisma.category.findFirst({
      where: {
        slug: candidate,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: { id: true },
    });
    if (!exists) return candidate;
    n += 1;
  }
}

export async function GET() {
  const session = await requireStaff();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const categories = await prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      parent: { select: { id: true, name: true } },
      _count: { select: { products: true, children: true } },
    },
  });
  return NextResponse.json(categories);
}

export async function POST(req: NextRequest) {
  const session = await requireStaff();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const name = String(body.name || "").trim();
  if (!name) {
    return NextResponse.json(
      { error: "Informe o nome da categoria" },
      { status: 400 }
    );
  }

  const parentId: string | null = body.parentId
    ? String(body.parentId)
    : null;

  if (parentId) {
    const parent = await prisma.category.findUnique({
      where: { id: parentId },
      select: { id: true, parentId: true },
    });
    if (!parent) {
      return NextResponse.json(
        { error: "Categoria pai não encontrada" },
        { status: 400 }
      );
    }
    if (parent.parentId) {
      return NextResponse.json(
        { error: "Só é permitido um nível de subcategoria" },
        { status: 400 }
      );
    }
  }

  const slug = await uniqueSlug(
    body.slug ? String(body.slug) : name
  );

  const max = await prisma.category.aggregate({
    where: { parentId },
    _max: { sortOrder: true },
  });

  let priceAdjustPercent = 0;
  if (body.priceAdjustPercent !== undefined && body.priceAdjustPercent !== null) {
    const n = Number(body.priceAdjustPercent);
    if (!Number.isFinite(n)) {
      return NextResponse.json(
        { error: "Ajuste de preço inválido" },
        { status: 400 }
      );
    }
    priceAdjustPercent = Math.max(-90, Math.min(200, n));
  }

  const category = await prisma.category.create({
    data: {
      name,
      slug,
      description: body.description ? String(body.description) : null,
      imageUrl: body.imageUrl ? String(body.imageUrl) : null,
      parentId,
      priceAdjustPercent,
      sortOrder:
        body.sortOrder !== undefined && body.sortOrder !== null
          ? Number(body.sortOrder)
          : (max._max.sortOrder ?? 0) + 1,
    },
    include: {
      parent: { select: { id: true, name: true } },
      _count: { select: { products: true, children: true } },
    },
  });

  void writeAuditLog({
    category: "categories",
    action: "create",
    summary: `Categoria criada: ${category.name}`,
    entityType: "Category",
    entityId: category.id,
    actor: actorFromSession(session),
    ip: requestIp(req),
  });

  return NextResponse.json(category);
}
