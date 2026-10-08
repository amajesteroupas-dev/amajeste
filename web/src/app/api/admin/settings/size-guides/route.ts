import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/admin-auth";
import {
  getSizeGuidesCatalog,
  saveSizeGuidesCatalog,
} from "@/lib/site-settings";
import {
  emptySizeGuideDraft,
  sanitizeSizeGuide,
  type SizeGuide,
} from "@/lib/size-guides";
import { prisma } from "@/lib/prisma";

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

export async function GET() {
  if (!(await requireStaff())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const guides = await getSizeGuidesCatalog();
  return NextResponse.json({ guides });
}

/** PUT { guides: SizeGuide[] } — substitui o catálogo inteiro */
export async function PUT(req: NextRequest) {
  if (!(await requireStaff())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  if (!Array.isArray(body.guides)) {
    return NextResponse.json(
      { error: "Envie a lista de tabelas (guides)." },
      { status: 400 }
    );
  }
  if (!body.guides.length) {
    return NextResponse.json(
      { error: "Mantenha pelo menos uma tabela de medidas." },
      { status: 400 }
    );
  }
  const guides = await saveSizeGuidesCatalog(body.guides);
  return NextResponse.json({ ok: true, guides });
}

/**
 * POST { action: "add", guide? } — adiciona tabela
 * POST { action: "remove", id } — remove tabela (produtos voltam para a primeira)
 */
export async function POST(req: NextRequest) {
  if (!(await requireStaff())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "").trim();
  const current = await getSizeGuidesCatalog();

  if (action === "add") {
    const draft = emptySizeGuideDraft(current.map((g) => g.id));
    const incoming = body.guide
      ? sanitizeSizeGuide(body.guide, {
          existingIds: current.map((g) => g.id),
        })
      : draft;
    if (!incoming) {
      return NextResponse.json(
        { error: "Não foi possível criar a tabela." },
        { status: 400 }
      );
    }
    const guides = await saveSizeGuidesCatalog([...current, incoming]);
    return NextResponse.json({ ok: true, guides, createdId: incoming.id });
  }

  if (action === "remove") {
    const id = String(body.id || "").trim().toLowerCase();
    if (!id) {
      return NextResponse.json({ error: "Informe o id da tabela." }, { status: 400 });
    }
    if (current.length <= 1) {
      return NextResponse.json(
        { error: "Não é possível remover a última tabela." },
        { status: 400 }
      );
    }
    if (!current.some((g) => g.id === id)) {
      return NextResponse.json({ error: "Tabela não encontrada." }, { status: 404 });
    }
    const guides = await saveSizeGuidesCatalog(
      current.filter((g) => g.id !== id)
    );
    const fallback = guides[0]?.id || "mg";
    await prisma.product.updateMany({
      where: { sizeGuide: id },
      data: { sizeGuide: fallback },
    });
    return NextResponse.json({ ok: true, guides, fallback });
  }

  if (action === "upsert") {
    const guide = sanitizeSizeGuide(body.guide, {
      existingIds: current
        .map((g) => g.id)
        .filter((id) => id !== String(body.guide?.id || "").trim().toLowerCase()),
    });
    if (!guide) {
      return NextResponse.json({ error: "Tabela inválida." }, { status: 400 });
    }
    const idx = current.findIndex((g) => g.id === guide.id);
    let next: SizeGuide[];
    if (idx >= 0) {
      next = current.map((g, i) => (i === idx ? guide : g));
    } else {
      next = [...current, guide];
    }
    const guides = await saveSizeGuidesCatalog(next);
    return NextResponse.json({ ok: true, guides });
  }

  return NextResponse.json(
    { error: "Ação inválida. Use add, remove ou upsert." },
    { status: 400 }
  );
}
