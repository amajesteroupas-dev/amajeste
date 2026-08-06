import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/admin-auth";
import { processAndSaveImage } from "@/lib/images";
import { prisma } from "@/lib/prisma";
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

function decodeFileName(raw: string | null | undefined, fallback: string) {
  if (!raw) return fallback;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

/**
 * Aceita (em ordem de robustez no iPhone):
 * 1) JSON { dataBase64, fileName?, productId? }
 * 2) body binário (octet-stream / image/*) + headers X-File-Name / X-Product-Id
 * 3) multipart FormData (legado)
 */
export async function POST(req: NextRequest) {
  const session = await requireStaff();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const contentType = (req.headers.get("content-type") || "").toLowerCase();
    let buffer: Buffer | null = null;
    let fileName = "photo.jpg";
    let productId: string | null =
      req.headers.get("x-product-id")?.trim() || null;
    let receivedVia = "none";

    if (contentType.includes("application/json")) {
      const body = (await req.json().catch(() => null)) as {
        dataBase64?: string;
        fileName?: string;
        productId?: string;
        mimeType?: string;
      } | null;
      const b64 = String(body?.dataBase64 || "").replace(/\s/g, "");
      if (!b64) {
        return NextResponse.json(
          { error: "JSON sem dataBase64. Reenvie a foto." },
          { status: 400 }
        );
      }
      buffer = Buffer.from(b64, "base64");
      fileName = body?.fileName?.trim() || fileName;
      if (body?.productId?.trim()) productId = body.productId.trim();
      receivedVia = `json-base64(${buffer.length}b)`;
    } else if (
      contentType.startsWith("image/") ||
      contentType === "application/octet-stream" ||
      contentType.includes("heic") ||
      contentType.includes("heif")
    ) {
      const ab = await req.arrayBuffer();
      buffer = Buffer.from(ab);
      fileName = decodeFileName(req.headers.get("x-file-name"), fileName);
      receivedVia = `binary(${buffer.length}b,ct=${contentType})`;
    } else if (contentType.includes("multipart/form-data")) {
      let form: FormData;
      try {
        form = await req.formData();
      } catch (e) {
        const detail = e instanceof Error ? e.message : String(e);
        console.error("[upload] FormData parse failed:", detail);
        return NextResponse.json(
          {
            error:
              "Falha ao ler o arquivo (FormData). Tente de novo. " +
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
      const pid = form.get("productId");
      if (typeof pid === "string" && pid.trim()) productId = pid.trim();
      receivedVia = `multipart(${buffer.length}b)`;
    } else {
      const ab = await req.arrayBuffer();
      buffer = Buffer.from(ab);
      fileName = decodeFileName(req.headers.get("x-file-name"), fileName);
      receivedVia = `raw(${buffer.length}b,ct=${contentType || "empty"})`;
    }

    console.info("[upload]", receivedVia, "file=", fileName, "product=", productId);

    if (!buffer?.length) {
      return NextResponse.json(
        {
          error:
            "Arquivo vazio no servidor (corpo HTTP não chegou). Use o envio em base64 ou tente de novo.",
          detail: receivedVia,
        },
        { status: 400 }
      );
    }

    if (buffer.length > 40 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Imagem muito grande (máx. 40 MB)." },
        { status: 413 }
      );
    }

    const result = await processAndSaveImage(buffer, fileName);

    if (productId) {
      const existing = await prisma.productImage.findMany({
        where: { productId },
        select: { id: true, url: true, isPrimary: true },
        orderBy: { sortOrder: "asc" },
      });
      const placeholderIds = existing
        .filter((img) => /\/placeholders\//i.test(img.url))
        .map((img) => img.id);
      const realCount = existing.length - placeholderIds.length;
      const makePrimary = realCount === 0;

      if (placeholderIds.length) {
        await prisma.productImage.deleteMany({
          where: { id: { in: placeholderIds } },
        });
      }
      if (makePrimary) {
        await prisma.productImage.updateMany({
          where: { productId, isPrimary: true },
          data: { isPrimary: false },
        });
      }

      const sortOrder = await prisma.productImage.count({ where: { productId } });
      const image = await prisma.productImage.create({
        data: {
          productId,
          url: result.url,
          alt: fileName,
          isPrimary: makePrimary,
          sortOrder,
        },
      });
      void writeAuditLog({
        category: "products",
        action: "create",
        summary: `Foto enviada ao produto`,
        entityType: "ProductImage",
        entityId: image.id,
        detail: { productId, url: result.url, fileName },
        actor: actorFromSession(session),
        ip: requestIp(req),
      });
    }

    return NextResponse.json({ ...result, ok: true, receivedVia });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Falha ao processar imagem";
    console.error("[upload]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
