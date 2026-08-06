import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import {
  actorFromSession,
  requestIp,
  writeAuditLog,
} from "@/lib/audit-log";

type Ctx = { params: Promise<{ id: string }> };

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

async function uniqueSlug(base: string, excludeId: string) {
  const slug = slugify(base) || `cat-${Date.now()}`;
  let n = 0;
  while (true) {
    const candidate = n === 0 ? slug : `${slug}-${n}`;
    const exists = await prisma.category.findFirst({
      where: { slug: candidate, NOT: { id: excludeId } },
      select: { id: true },
    });
    if (!exists) return candidate;
    n += 1;
  }
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await requireStaff();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { children: true } } },
  });
  if (!existing) {
    return NextResponse.json({ error: "Categoria não encontrada" }, { status: 404 });
  }

  const body = await req.json();
  const data: {
    name?: string;
    slug?: string;
    description?: string | null;
    imageUrl?: string | null;
    sortOrder?: number;
    parentId?: string | null;
    priceAdjustPercent?: number;
  } = {};

  if (body.name !== undefined) {
    const name = String(body.name || "").trim();
    if (!name) {
      return NextResponse.json({ error: "Nome inválido" }, { status: 400 });
    }
    data.name = name;
  }

  if (body.slug !== undefined) {
    data.slug = await uniqueSlug(String(body.slug || existing.name), id);
  } else if (body.name !== undefined && body.regenSlug) {
    data.slug = await uniqueSlug(String(body.name), id);
  }

  if (body.description !== undefined) {
    data.description = body.description
      ? String(body.description)
      : null;
  }

  if (body.imageUrl !== undefined) {
    data.imageUrl = body.imageUrl ? String(body.imageUrl) : null;
  }

  if (body.sortOrder !== undefined) {
    data.sortOrder = Number(body.sortOrder) || 0;
  }

  if (body.priceAdjustPercent !== undefined) {
    const n = Number(body.priceAdjustPercent);
    if (!Number.isFinite(n)) {
      return NextResponse.json(
        { error: "Ajuste de preço inválido" },
        { status: 400 }
      );
    }
    data.priceAdjustPercent = Math.max(-90, Math.min(200, n));
  }

  if (body.parentId !== undefined) {
    const parentId: string | null = body.parentId
      ? String(body.parentId)
      : null;

    if (parentId === id) {
      return NextResponse.json(
        { error: "Categoria não pode ser pai de si mesma" },
        { status: 400 }
      );
    }

    if (parentId) {
      if (existing._count.children > 0) {
        return NextResponse.json(
          {
            error:
              "Mova ou remova as subcategorias antes de tornar esta uma subcategoria",
          },
          { status: 400 }
        );
      }
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
    data.parentId = parentId;
  }

  const category = await prisma.category.update({
    where: { id },
    data,
    include: {
      parent: { select: { id: true, name: true } },
      _count: { select: { products: true, children: true } },
    },
  });

  void writeAuditLog({
    category: "categories",
    action: "update",
    summary: `Categoria alterada: ${category.name}`,
    entityType: "Category",
    entityId: category.id,
    detail: data,
    actor: actorFromSession(session),
    ip: requestIp(req),
  });

  return NextResponse.json(category);
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await requireStaff();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.category.findUnique({
    where: { id },
    include: {
      _count: { select: { products: true, children: true } },
    },
  });
  if (!existing) {
    return NextResponse.json({ error: "Categoria não encontrada" }, { status: 404 });
  }

  if (existing._count.children > 0) {
    return NextResponse.json(
      { error: "Remova as subcategorias antes de excluir esta categoria" },
      { status: 400 }
    );
  }

  if (existing._count.products > 0) {
    return NextResponse.json(
      {
        error: `Há ${existing._count.products} produto(s) nesta categoria. Mova-os antes de excluir.`,
      },
      { status: 400 }
    );
  }

  await prisma.category.delete({ where: { id } });
  void writeAuditLog({
    category: "categories",
    action: "delete",
    summary: `Categoria excluída: ${existing.name}`,
    entityType: "Category",
    entityId: existing.id,
    actor: actorFromSession(session),
    ip: requestIp(_req),
  });
  return NextResponse.json({ ok: true });
}
