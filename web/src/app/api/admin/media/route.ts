import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { processAndSaveCutout, processAndSaveImage } from "@/lib/images";
import {
  actorFromSession,
  requestIp,
  writeAuditLog,
} from "@/lib/audit-log";

export const runtime = "nodejs";
export const maxDuration = 120;

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

export async function GET(req: NextRequest) {
  const session = await requireStaff();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const sourceParam = req.nextUrl.searchParams.get("source");
  const includeProducts =
    req.nextUrl.searchParams.get("includeProducts") === "1";
  const sources = sourceParam
    ? sourceParam
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : null;

  const media = await prisma.mediaAsset.findMany({
    where: sources?.length ? { source: { in: sources } } : undefined,
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const library = media.map((m) => ({
    id: m.id,
    url: m.url,
    thumbUrl: m.thumbUrl || m.url,
    alt: m.alt,
    source: m.source,
    productId: null as string | null,
    productName: null as string | null,
    productSlug: null as string | null,
  }));

  if (includeProducts) {
    const productImages = await prisma.productImage.findMany({
      orderBy: [{ product: { name: "asc" } }, { sortOrder: "asc" }],
      take: 800,
      select: {
        id: true,
        url: true,
        alt: true,
        productId: true,
        product: { select: { id: true, name: true, slug: true } },
      },
    });
    for (const img of productImages) {
      library.push({
        id: `product-${img.id}`,
        url: img.url,
        thumbUrl: img.url,
        alt: img.alt || img.product.name,
        source: "product",
        productId: img.product.id,
        productName: img.product.name,
        productSlug: img.product.slug,
      });
    }
  }

  const products = Array.from(
    new Map(
      library
        .filter((m) => m.productId && m.productName)
        .map((m) => [
          m.productId as string,
          { id: m.productId as string, name: m.productName as string },
        ])
    ).values()
  ).sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }));

  return NextResponse.json({
    media,
    library,
    products,
    banks: {
      cutout: library.filter((m) => m.source === "cutout").length,
      upload: library.filter(
        (m) => m.source === "upload" || m.source === "product"
      ).length,
    },
  });
}

export async function POST(req: NextRequest) {
  const session = await requireStaff();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const contentType = (req.headers.get("content-type") || "").toLowerCase();
    let buffer: Buffer | null = null;
    let fileName = "photo.jpg";
    let alt =
      req.headers.get("x-alt")?.trim() ||
      req.nextUrl.searchParams.get("alt") ||
      null;
    let mode =
      req.headers.get("x-mode")?.trim() ||
      req.nextUrl.searchParams.get("mode") ||
      "upload";

    if (contentType.includes("application/json")) {
      const body = (await req.json().catch(() => null)) as {
        dataBase64?: string;
        fileName?: string;
        mimeType?: string;
        mode?: string;
        alt?: string;
      } | null;
      const b64 = String(body?.dataBase64 || "").replace(/\s/g, "");
      if (!b64) {
        return NextResponse.json(
          { error: "JSON sem dataBase64." },
          { status: 400 }
        );
      }
      buffer = Buffer.from(b64, "base64");
      fileName = body?.fileName?.trim() || fileName;
      if (body?.mode) mode = String(body.mode);
      if (body?.alt) alt = String(body.alt);
    } else if (
      contentType.startsWith("image/") ||
      contentType === "application/octet-stream" ||
      contentType.includes("heic") ||
      contentType.includes("heif")
    ) {
      buffer = Buffer.from(await req.arrayBuffer());
      const headerName = req.headers.get("x-file-name");
      if (headerName) {
        try {
          fileName = decodeURIComponent(headerName);
        } catch {
          fileName = headerName;
        }
      }
    } else if (contentType.includes("multipart/form-data")) {
      let form: FormData;
      try {
        form = await req.formData();
      } catch (e) {
        const detail = e instanceof Error ? e.message : String(e);
        console.error("[admin/media] FormData parse failed:", detail);
        return NextResponse.json(
          {
            error:
              "Falha ao ler o arquivo (FormData). Tente novamente. " +
              detail.slice(0, 160),
          },
          { status: 400 }
        );
      }
      const file = form.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json(
          { error: "Arquivo obrigatório (campo file)." },
          { status: 400 }
        );
      }
      buffer = Buffer.from(await file.arrayBuffer());
      fileName = file.name || fileName;
      alt = (form.get("alt") as string) || alt;
      mode = String(form.get("mode") || mode);
    } else {
      const ab = await req.arrayBuffer();
      if (ab.byteLength > 0) {
        buffer = Buffer.from(ab);
        const headerName = req.headers.get("x-file-name");
        if (headerName) {
          try {
            fileName = decodeURIComponent(headerName);
          } catch {
            fileName = headerName;
          }
        }
      }
    }

    if (!buffer?.length) {
      return NextResponse.json(
        { error: "Arquivo vazio ou não recebido." },
        { status: 400 }
      );
    }
    if (buffer.length > 40 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Imagem muito grande (máx. 40 MB)." },
        { status: 413 }
      );
    }

    const result =
      mode === "cutout"
        ? await processAndSaveCutout(buffer, fileName || "cutout.png")
        : await processAndSaveImage(buffer, fileName || "photo.jpg", "media");

    const asset = await prisma.mediaAsset.create({
      data: {
        url: result.url,
        thumbUrl: result.thumbUrl || result.url,
        alt: alt || (mode === "cutout" ? "Modelo recortada" : fileName),
        width: result.width,
        height: result.height,
        source: mode === "cutout" ? "cutout" : "upload",
      },
    });

    void writeAuditLog({
      category: "media",
      action: "create",
      summary: `Mídia enviada: ${asset.alt || fileName || asset.url}`,
      entityType: "MediaAsset",
      entityId: asset.id,
      detail: { source: asset.source, mode },
      actor: actorFromSession(session),
      ip: requestIp(req),
    });

    return NextResponse.json({ ...asset, ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Falha ao processar imagem";
    console.error("[admin/media]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await requireStaff();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const id = req.nextUrl.searchParams.get("id");
  if (!id || id.startsWith("product-")) {
    return NextResponse.json(
      { error: "Só é possível excluir uploads do banco (não fotos de produto)." },
      { status: 400 }
    );
  }

  const asset = await prisma.mediaAsset.findUnique({ where: { id } });
  if (!asset) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  }

  // Apaga pasta /uploads/media/{uuid}/ se existir
  try {
    const m = asset.url.match(/\/uploads\/media\/([^/]+)\//);
    if (m?.[1]) {
      const { uploadRoot } = await import("@/lib/images");
      const fs = await import("fs/promises");
      const path = await import("path");
      await fs.rm(path.join(uploadRoot(), "media", m[1]), {
        recursive: true,
        force: true,
      });
    }
  } catch {
    /* ignore disk errors */
  }

  await prisma.mediaAsset.delete({ where: { id } });
  void writeAuditLog({
    category: "media",
    action: "delete",
    summary: `Mídia excluída: ${asset.alt || asset.url}`,
    entityType: "MediaAsset",
    entityId: id,
    actor: actorFromSession(session),
    ip: requestIp(req),
  });
  return NextResponse.json({ ok: true });
}

/** Renomeia o nome exibido da imagem (`alt`) no banco. */
export async function PATCH(req: NextRequest) {
  const session = await requireStaff();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as { id?: string; alt?: string | null };
    const id = String(body.id || "").trim();
    if (!id || id.startsWith("product-")) {
      return NextResponse.json(
        {
          error:
            "Só é possível renomear imagens do banco (Adicionadas / Recortadas).",
        },
        { status: 400 }
      );
    }

    const alt =
      body.alt == null ? null : String(body.alt).trim().slice(0, 200) || null;

    const asset = await prisma.mediaAsset.update({
      where: { id },
      data: { alt },
    });

    void writeAuditLog({
      category: "media",
      action: "update",
      summary: `Mídia renomeada: ${asset.alt || asset.url}`,
      entityType: "MediaAsset",
      entityId: id,
      detail: { alt: asset.alt },
      actor: actorFromSession(session),
      ip: requestIp(req),
    });

    return NextResponse.json({
      ok: true,
      media: {
        id: asset.id,
        url: asset.url,
        thumbUrl: asset.thumbUrl || asset.url,
        alt: asset.alt,
        source: asset.source,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Falha ao renomear" },
      { status: 400 }
    );
  }
}
