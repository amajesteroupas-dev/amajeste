import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { saveProductVideoFile } from "@/lib/video-upload";
import { resolveVideoPlayback } from "@/lib/videos";

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

/** Lista vídeos (opcionalmente filtrados por categoria). */
export async function GET(req: NextRequest) {
  if (!(await requireStaff())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const categoryId = req.nextUrl.searchParams.get("categoryId");
  const videos = await prisma.categoryVideo.findMany({
    where: categoryId ? { categoryId } : undefined,
    include: {
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
          parentId: true,
          parent: { select: { name: true } },
        },
      },
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({
    videos: videos.map((v) => ({
      id: v.id,
      categoryId: v.categoryId,
      url: v.url,
      title: v.title,
      sortOrder: v.sortOrder,
      active: v.active,
      createdAt: v.createdAt,
      categoryLabel: v.category.parent
        ? `${v.category.parent.name} › ${v.category.name}`
        : v.category.name,
    })),
  });
}

/** Cria vídeo: multipart (file + categoryId) ou JSON { categoryId, url, title? }. */
export async function POST(req: NextRequest) {
  if (!(await requireStaff())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const contentType = req.headers.get("content-type") || "";

  try {
    if (contentType.includes("application/json")) {
      const body = await req.json();
      const categoryId = String(body.categoryId || "").trim();
      const url = String(body.url || "").trim();
      const title = body.title ? String(body.title).trim() : null;
      if (!categoryId) {
        return NextResponse.json(
          { error: "Categoria obrigatória" },
          { status: 400 }
        );
      }
      if (!url || !resolveVideoPlayback(url)) {
        return NextResponse.json(
          { error: "URL de vídeo inválida" },
          { status: 400 }
        );
      }
      const cat = await prisma.category.findUnique({ where: { id: categoryId } });
      if (!cat) {
        return NextResponse.json(
          { error: "Categoria não encontrada" },
          { status: 404 }
        );
      }
      const max = await prisma.categoryVideo.aggregate({
        where: { categoryId },
        _max: { sortOrder: true },
      });
      const video = await prisma.categoryVideo.create({
        data: {
          categoryId,
          url,
          title,
          sortOrder: (max._max.sortOrder ?? -1) + 1,
        },
      });
      return NextResponse.json({ ok: true, video });
    }

    const form = await req.formData();
    const categoryId = String(form.get("categoryId") || "").trim();
    const titleRaw = form.get("title");
    const title = titleRaw ? String(titleRaw).trim() : null;
    const file = form.get("file") as File | null;
    if (!categoryId) {
      return NextResponse.json(
        { error: "Categoria obrigatória" },
        { status: 400 }
      );
    }
    if (!file) {
      return NextResponse.json({ error: "Arquivo obrigatório" }, { status: 400 });
    }
    const cat = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!cat) {
      return NextResponse.json(
        { error: "Categoria não encontrada" },
        { status: 404 }
      );
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const saved = await saveProductVideoFile(
      buffer,
      file.name,
      file.type || "video/mp4"
    );
    const max = await prisma.categoryVideo.aggregate({
      where: { categoryId },
      _max: { sortOrder: true },
    });
    const video = await prisma.categoryVideo.create({
      data: {
        categoryId,
        url: saved.url,
        title: title || file.name,
        sortOrder: (max._max.sortOrder ?? -1) + 1,
      },
    });
    return NextResponse.json({ ok: true, video });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao salvar vídeo";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
