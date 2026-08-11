import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { uploadRoot } from "@/lib/images";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".avif": "image/avif",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
};

type Ctx = { params: Promise<{ path: string[] }> };

function mimeFromExt(filePath: string) {
  return MIME[path.extname(filePath).toLowerCase()] || "application/octet-stream";
}

/** Serve arquivos do volume UPLOAD_DIR (rewrite /uploads → /api/uploads). */
export async function GET(_req: NextRequest, ctx: Ctx) {
  const parts = (await ctx.params).path || [];
  if (!parts.length) {
    return NextResponse.json({ error: "Arquivo não encontrado" }, { status: 404 });
  }

  // Bloqueia path traversal
  if (parts.some((p) => p === ".." || p.includes("\0"))) {
    return NextResponse.json({ error: "Caminho inválido" }, { status: 400 });
  }

  const root = path.resolve(uploadRoot());
  const filePath = path.resolve(path.join(root, ...parts));
  if (!filePath.startsWith(root + path.sep) && filePath !== root) {
    return NextResponse.json({ error: "Caminho inválido" }, { status: 400 });
  }

  try {
    const buf = await fs.readFile(filePath);
    return new NextResponse(buf, {
      headers: {
        "Content-Type": mimeFromExt(filePath),
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Arquivo não encontrado" }, { status: 404 });
  }
}
