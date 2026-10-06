import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { saveProductVideoFile } from "@/lib/video-upload";
import { resolveVideoPlayback } from "@/lib/videos";

export const runtime = "nodejs";
export const maxDuration = 300;

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

async function attachVideo(id: string, videoUrl: string) {
  return prisma.product.update({
    where: { id },
    data: { videoUrl },
    select: { id: true, videoUrl: true },
  });
}

/** POST: JSON { url } | binário (X-File-Name) | multipart file */
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
      const updated = await attachVideo(id, url);
      return NextResponse.json({ ok: true, videoUrl: updated.videoUrl });
    }

    // Upload binário (mesmo fluxo do Banco de vídeos — funciona no iPhone)
    const rawNameHdr = req.headers.get("x-file-name");
    const isBinaryUpload =
      Boolean(rawNameHdr) ||
      contentType.startsWith("video/") ||
      contentType.includes("octet-stream") ||
      contentType.includes("quicktime");

    if (isBinaryUpload) {
      const buffer = Buffer.from(await req.arrayBuffer());
      if (!buffer.length) {
        return NextResponse.json(
          {
            error:
              "Arquivo vazio ou upload incompleto. Atualize a página (Ctrl+F5) e tente de novo.",
          },
          { status: 400 }
        );
      }
      const filename = rawNameHdr
        ? decodeURIComponent(rawNameHdr)
        : "video.mp4";
      const mime =
        contentType.includes("video/") || contentType.includes("quicktime")
          ? contentType.split(";")[0].trim()
          : "video/mp4";
      const saved = await saveProductVideoFile(buffer, filename, mime);
      const updated = await attachVideo(id, saved.url);
      return NextResponse.json({ ok: true, videoUrl: updated.videoUrl });
    }

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData().catch(() => null);
      if (!form) {
        return NextResponse.json(
          {
            error:
              "Falha ao receber o arquivo. Atualize a página e tente de novo, ou use o Banco de vídeos.",
          },
          { status: 400 }
        );
      }
      const file = form.get("file") as File | null;
      if (!file) {
        return NextResponse.json(
          { error: "Arquivo obrigatório" },
          { status: 400 }
        );
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      const saved = await saveProductVideoFile(
        buffer,
        file.name,
        file.type || "video/mp4"
      );
      const updated = await attachVideo(id, saved.url);
      return NextResponse.json({ ok: true, videoUrl: updated.videoUrl });
    }

    return NextResponse.json(
      { error: "Envie um arquivo de vídeo ou um link." },
      { status: 400 }
    );
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
