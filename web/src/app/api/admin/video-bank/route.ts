import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import {
  deleteUploadFolderFromUrl,
  saveVideoBankFile,
} from "@/lib/video-upload";
import {
  downloadSocialVideo,
  isSupportedSocialVideoUrl,
} from "@/lib/video-download";

export const runtime = "nodejs";
export const maxDuration = 300;

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

  const videos = await prisma.videoAsset.findMany({
    where: { NOT: { kind: "cutout" } },
    orderBy: { createdAt: "desc" },
    take: 300,
  });

  return NextResponse.json({
    videos: videos.map((v) => ({
      id: v.id,
      url: v.url,
      thumbUrl: v.thumbUrl || v.url,
      title: v.title,
      sourceUrl: v.sourceUrl,
      platform: v.platform,
      kind: v.kind,
      durationSec: v.durationSec,
      bytes: v.bytes,
      active: v.active,
      createdAt: v.createdAt,
    })),
  });
}

/**
 * POST JSON: { url, title? } — baixa YouTube/TikTok/Instagram
 * POST binário: body = arquivo, headers X-File-Name / Content-Type
 * POST multipart: file (+ title?) — legado
 */
export async function POST(req: NextRequest) {
  if (!(await requireStaff())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const contentType = req.headers.get("content-type") || "";

  try {
    if (contentType.includes("application/json")) {
      const body = await req.json();
      const url = String(body.url || "").trim();
      const titleOverride = body.title ? String(body.title).trim() : null;

      if (!url) {
        return NextResponse.json({ error: "URL obrigatória" }, { status: 400 });
      }
      if (!isSupportedSocialVideoUrl(url)) {
        return NextResponse.json(
          {
            error:
              "Link inválido. Use YouTube, TikTok ou Instagram (Reels/post público).",
          },
          { status: 400 }
        );
      }

      const downloaded = await downloadSocialVideo(url);
      const saved = await saveVideoBankFile(
        downloaded.buffer,
        downloaded.filename,
        downloaded.mime,
        downloaded.thumb
      );

      const asset = await prisma.videoAsset.create({
        data: {
          url: saved.url,
          thumbUrl: saved.thumbUrl,
          title: titleOverride || downloaded.title,
          sourceUrl: downloaded.sourceUrl,
          platform: downloaded.platform,
          kind: "full",
          durationSec: downloaded.durationSec,
          bytes: saved.bytes,
        },
      });

      return NextResponse.json({ video: asset }, { status: 201 });
    }

    // Upload binário (evita FormData — mais confiável no Next 15)
    const rawNameHdr = req.headers.get("x-file-name");
    const isBinaryUpload =
      Boolean(rawNameHdr) ||
      contentType.startsWith("video/") ||
      contentType.includes("octet-stream") ||
      contentType.includes("quicktime");

    if (isBinaryUpload) {
      const buffer = Buffer.from(await req.arrayBuffer());
      if (!buffer.length) {
        const cl = req.headers.get("content-length");
        return NextResponse.json(
          {
            error: cl
              ? `Arquivo vazio (servidor recebeu Content-Length ${cl} mas 0 bytes). Atualize a página (Ctrl+F5) e tente de novo.`
              : "Arquivo vazio ou upload incompleto. Tente de novo.",
          },
          { status: 400 }
        );
      }
      const filename = rawNameHdr
        ? decodeURIComponent(rawNameHdr)
        : "video.mp4";
      const titleParam = req.nextUrl.searchParams.get("title")?.trim() || null;
      const titleHdr = req.headers.get("x-title");
      const title =
        titleParam ||
        (titleHdr ? decodeURIComponent(titleHdr) : null) ||
        filename;

      const saved = await saveVideoBankFile(
        buffer,
        filename,
        contentType.includes("video/") || contentType.includes("quicktime")
          ? contentType.split(";")[0].trim()
          : "video/mp4",
        null
      );

      const asset = await prisma.videoAsset.create({
        data: {
          url: saved.url,
          thumbUrl: saved.thumbUrl,
          title,
          sourceUrl: null,
          platform: "upload",
          kind: "full",
          bytes: saved.bytes,
        },
      });

      return NextResponse.json({ video: asset }, { status: 201 });
    }

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData().catch(() => null);
      if (!form) {
        return NextResponse.json(
          {
            error:
              "Falha ao receber o arquivo. Atualize a página e tente de novo.",
          },
          { status: 400 }
        );
      }
      const file = form.get("file") as File | null;
      const title = (form.get("title") as string)?.trim() || null;
      if (!file) {
        return NextResponse.json(
          { error: "Arquivo ou URL obrigatório" },
          { status: 400 }
        );
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const saved = await saveVideoBankFile(
        buffer,
        file.name,
        file.type || "video/mp4",
        null
      );

      const asset = await prisma.videoAsset.create({
        data: {
          url: saved.url,
          thumbUrl: saved.thumbUrl,
          title: title || file.name,
          sourceUrl: null,
          platform: "upload",
          kind: "full",
          bytes: saved.bytes,
        },
      });

      return NextResponse.json({ video: asset }, { status: 201 });
    }

    return NextResponse.json(
      { error: "Envie um arquivo de vídeo ou um link." },
      { status: 400 }
    );
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : "Falha ao salvar vídeo no banco";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!(await requireStaff())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
  }

  const asset = await prisma.videoAsset.findUnique({ where: { id } });
  if (!asset) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  }

  await prisma.videoAsset.delete({ where: { id } });
  await deleteUploadFolderFromUrl(asset.url);

  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  if (!(await requireStaff())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const id = String(body.id || "").trim();
    if (!id) {
      return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
    }

    const data: { title?: string | null; active?: boolean } = {};
    if ("title" in body) data.title = body.title ? String(body.title) : null;
    if ("active" in body) data.active = Boolean(body.active);

    const asset = await prisma.videoAsset.update({
      where: { id },
      data,
    });
    return NextResponse.json({ video: asset });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Falha ao atualizar" },
      { status: 400 }
    );
  }
}
