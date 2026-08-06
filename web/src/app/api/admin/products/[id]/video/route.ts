import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { saveProductVideoFile } from "@/lib/video-upload";
import { resolveVideoPlayback } from "@/lib/videos";

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

/** POST: multipart file OU JSON { url } (YouTube/Vimeo/MP4). */
export async function POST(req: NextRequest, { params }: Props) {
  if (!(await requireStaff())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product || product.deletedAt) {
    return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });
  }

  const contentType = req.headers.get("content-type") || "";

  try {
    if (contentType.includes("application/json")) {
      const body = await req.json();
      const url = String(body.url || "").trim();
      if (!url || !resolveVideoPlayback(url)) {
        return NextResponse.json(
          { error: "URL de vídeo inválida" },
          { status: 400 }
        );
      }
      const updated = await prisma.product.update({
        where: { id },
        data: { videoUrl: url },
        select: { id: true, videoUrl: true },
      });
      return NextResponse.json({ ok: true, videoUrl: updated.videoUrl });
    }

    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "Arquivo obrigatório" }, { status: 400 });
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const saved = await saveProductVideoFile(
      buffer,
      file.name,
      file.type || "video/mp4"
    );
    const updated = await prisma.product.update({
      where: { id },
      data: { videoUrl: saved.url },
      select: { id: true, videoUrl: true },
    });
    return NextResponse.json({ ok: true, videoUrl: updated.videoUrl });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao salvar vídeo";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Props) {
  if (!(await requireStaff())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;
  await prisma.product.update({
    where: { id },
    data: { videoUrl: null },
  });
  return NextResponse.json({ ok: true, videoUrl: null });
}
