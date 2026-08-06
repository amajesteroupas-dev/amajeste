import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import {
  deleteUploadFolderFromUrl,
  saveVideoCutoutBankFile,
  saveVideoCutoutFromPngFrames,
} from "@/lib/video-upload";

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

type PackedMeta = {
  fps?: number;
  title?: string | null;
  sourceUrl?: string | null;
  sizes: number[];
};

function parsePackedMeta(raw: string | null): PackedMeta | null {
  if (!raw) return null;
  try {
    const decoded = raw.includes("%") ? decodeURIComponent(raw) : raw;
    const parsed = JSON.parse(decoded) as PackedMeta;
    if (!Array.isArray(parsed.sizes) || !parsed.sizes.length) return null;
    return parsed;
  } catch {
    try {
      const parsed = JSON.parse(raw) as PackedMeta;
      if (!Array.isArray(parsed.sizes) || !parsed.sizes.length) return null;
      return parsed;
    } catch {
      return null;
    }
  }
}

/** Formato novo: primeira linha JSON + \n + PNGs. Legado: só PNGs + header X-Cutout-Meta. */
function parseMetaPrefixedBody(body: Buffer): {
  meta: PackedMeta;
  framesBody: Buffer;
} | null {
  const nl = body.indexOf(0x0a); // \n
  if (nl <= 0 || nl > 256 * 1024) return null;
  const head = body.subarray(0, nl).toString("utf8").trim();
  if (!head.startsWith("{")) return null;
  const meta = parsePackedMeta(head);
  if (!meta) return null;
  return { meta, framesBody: body.subarray(nl + 1) };
}

function splitPackedFrames(body: Buffer, sizes: number[]): Buffer[] {
  const total = sizes.reduce((a, b) => a + b, 0);
  if (total !== body.length) {
    throw new Error(
      `Pacote incompleto: esperado ${total} bytes, recebido ${body.length}.`
    );
  }
  const frames: Buffer[] = [];
  let offset = 0;
  for (const size of sizes) {
    if (size <= 0 || size > 25 * 1024 * 1024) {
      throw new Error("Tamanho de quadro inválido.");
    }
    frames.push(body.subarray(offset, offset + size));
    offset += size;
  }
  return frames;
}

async function createCutoutAsset(input: {
  url: string;
  thumbUrl: string | null;
  title: string | null;
  sourceUrl: string | null;
  durationSec?: number | null;
  bytes: number;
}) {
  return prisma.videoAsset.create({
    data: {
      url: input.url,
      thumbUrl: input.thumbUrl,
      title: input.title || "Vídeo recortado",
      sourceUrl: input.sourceUrl,
      platform: "cutout",
      kind: "cutout",
      durationSec: input.durationSec ?? null,
      bytes: input.bytes,
    },
  });
}

export async function GET() {
  if (!(await requireStaff())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const videos = await prisma.videoAsset.findMany({
    where: { kind: "cutout" },
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
 * POST binário (preferido): body = PNGs concatenados
 *   headers: X-Cutout-Meta = { fps, title?, sourceUrl?, sizes: number[] }
 * POST multipart: frames[] ou file
 */
export async function POST(req: NextRequest) {
  if (!(await requireStaff())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const contentType = req.headers.get("content-type") || "";

  try {
    const headerMeta = parsePackedMeta(req.headers.get("x-cutout-meta"));
    const wantsPacked =
      Boolean(headerMeta) ||
      req.headers.get("x-cutout-packed") === "1" ||
      req.headers.get("x-cutout-format") === "meta-json-v1";

    if (wantsPacked) {
      const raw = Buffer.from(await req.arrayBuffer());
      if (!raw.length) {
        const cl = req.headers.get("content-length");
        return NextResponse.json(
          {
            error: cl
              ? `Pacote vazio (Content-Length ${cl}). Atualize a página e tente de novo.`
              : "Pacote de quadros vazio.",
          },
          { status: 400 }
        );
      }

      const prefixed = parseMetaPrefixedBody(raw);
      const packedMeta = prefixed?.meta || headerMeta;
      const framesBody = prefixed?.framesBody || raw;

      if (!packedMeta) {
        return NextResponse.json(
          {
            error:
              "Metadados do recorte ausentes. Atualize a página (Ctrl+F5) e tente de novo.",
          },
          { status: 400 }
        );
      }

      const frames = splitPackedFrames(
        framesBody,
        packedMeta.sizes.map(Number)
      );
      const saved = await saveVideoCutoutFromPngFrames(frames, {
        fps: packedMeta.fps,
        title: packedMeta.title || undefined,
      });
      const asset = await createCutoutAsset({
        url: saved.url,
        thumbUrl: saved.thumbUrl,
        title: packedMeta.title || "Vídeo recortado",
        sourceUrl: packedMeta.sourceUrl || null,
        durationSec: saved.durationSec,
        bytes: saved.bytes,
      });
      return NextResponse.json({ video: asset }, { status: 201 });
    }

    if (contentType.includes("multipart/form-data")) {
      let form: FormData | null = null;
      try {
        form = await req.formData();
      } catch (e) {
        const detail = e instanceof Error ? e.message : String(e);
        console.error("[video-cutout-bank] FormData:", detail);
        return NextResponse.json(
          {
            error:
              "Falha ao receber o formulário (arquivo grande demais?). Atualize a página e use Upload já recortado de novo.",
          },
          { status: 400 }
        );
      }

      const title = (form.get("title") as string)?.trim() || null;
      const sourceUrl = (form.get("sourceUrl") as string)?.trim() || null;
      const fpsRaw = Number(form.get("fps") || 4);

      const buffers: Buffer[] = [];
      for (const [key, value] of form.entries()) {
        if (key !== "frames" && !key.startsWith("frame")) continue;
        if (typeof value === "string") continue;
        const blob = value as Blob;
        if (!blob || typeof blob.arrayBuffer !== "function") continue;
        if (!blob.size) continue;
        buffers.push(Buffer.from(await blob.arrayBuffer()));
      }

      if (buffers.length > 0) {
        const saved = await saveVideoCutoutFromPngFrames(buffers, {
          fps: fpsRaw,
          title: title || undefined,
        });
        const asset = await createCutoutAsset({
          url: saved.url,
          thumbUrl: saved.thumbUrl,
          title: title || "Vídeo recortado",
          sourceUrl,
          durationSec: saved.durationSec,
          bytes: saved.bytes,
        });
        return NextResponse.json({ video: asset }, { status: 201 });
      }

      const file = form.get("file");
      if (file && typeof file !== "string") {
        const blob = file as Blob;
        const buffer = Buffer.from(await blob.arrayBuffer());
        const name =
          "name" in blob && typeof (blob as File).name === "string"
            ? (blob as File).name
            : "cutout.webm";
        const saved = await saveVideoCutoutBankFile(
          buffer,
          name,
          blob.type || "video/webm"
        );
        const asset = await createCutoutAsset({
          url: saved.url,
          thumbUrl: saved.thumbUrl,
          title: title || name,
          sourceUrl,
          bytes: saved.bytes,
        });
        return NextResponse.json({ video: asset }, { status: 201 });
      }

      return NextResponse.json(
        {
          error:
            "Nenhum quadro recebido. Atualize a página (Ctrl+F5) e tente recortar de novo.",
        },
        { status: 400 }
      );
    }

    // Upload binário de arquivo já recortado
    const rawNameHdr = req.headers.get("x-file-name");
    if (
      rawNameHdr ||
      contentType.startsWith("video/") ||
      contentType.includes("octet-stream") ||
      contentType.includes("webp") ||
      contentType.includes("gif") ||
      contentType.includes("quicktime")
    ) {
      const buffer = Buffer.from(await req.arrayBuffer());
      if (!buffer.length) {
        return NextResponse.json({ error: "Arquivo vazio." }, { status: 400 });
      }
      const filename = rawNameHdr
        ? decodeURIComponent(rawNameHdr)
        : "cutout.webm";
      const titleParam = req.nextUrl.searchParams.get("title")?.trim() || null;
      const saved = await saveVideoCutoutBankFile(
        buffer,
        filename,
        contentType.split(";")[0].trim() || "video/webm"
      );
      const asset = await createCutoutAsset({
        url: saved.url,
        thumbUrl: saved.thumbUrl,
        title: titleParam || filename,
        sourceUrl: null,
        bytes: saved.bytes,
      });
      return NextResponse.json({ video: asset }, { status: 201 });
    }

    return NextResponse.json(
      { error: "Envie os quadros do recorte ou um arquivo WebM/WebP/GIF." },
      { status: 400 }
    );
  } catch (e) {
    console.error("[video-cutout-bank]", e);
    return NextResponse.json(
      {
        error:
          e instanceof Error ? e.message : "Falha ao salvar vídeo recortado",
      },
      { status: 400 }
    );
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
  if (!asset || asset.kind !== "cutout") {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  }

  await prisma.videoAsset.delete({ where: { id } });
  await deleteUploadFolderFromUrl(asset.url);

  return NextResponse.json({ ok: true });
}

/** Renomeia o título de um vídeo recortado. */
export async function PATCH(req: NextRequest) {
  if (!(await requireStaff())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as { id?: string; title?: string | null };
    const id = String(body.id || "").trim();
    if (!id) {
      return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
    }

    const existing = await prisma.videoAsset.findUnique({ where: { id } });
    if (!existing || existing.kind !== "cutout") {
      return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    }

    const title =
      body.title == null
        ? null
        : String(body.title).trim().slice(0, 200) || null;

    const asset = await prisma.videoAsset.update({
      where: { id },
      data: { title },
    });

    return NextResponse.json({ video: asset });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Falha ao renomear" },
      { status: 400 }
    );
  }
}
