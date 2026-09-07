import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import { createReadStream } from "fs";
import path from "path";
import { Readable } from "stream";
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
  ".m4v": "video/mp4",
};

type Ctx = { params: Promise<{ path: string[] }> };

function mimeFromExt(filePath: string) {
  return MIME[path.extname(filePath).toLowerCase()] || "application/octet-stream";
}

async function resolveSafePath(parts: string[]) {
  if (!parts.length) return null;
  if (parts.some((p) => p === ".." || p.includes("\0"))) return null;
  const root = path.resolve(uploadRoot());
  const filePath = path.resolve(path.join(root, ...parts));
  if (!filePath.startsWith(root + path.sep) && filePath !== root) return null;
  return filePath;
}

function nodeStreamToWeb(stream: ReturnType<typeof createReadStream>) {
  return Readable.toWeb(stream) as unknown as ReadableStream;
}

/** Serve arquivos do volume UPLOAD_DIR (rewrite /uploads → /api/uploads). */
export async function GET(req: NextRequest, ctx: Ctx) {
  const parts = (await ctx.params).path || [];
  const filePath = await resolveSafePath(parts);
  if (!filePath) {
    return NextResponse.json({ error: "Caminho inválido" }, { status: 400 });
  }

  let stat;
  try {
    stat = await fs.stat(filePath);
  } catch {
    return NextResponse.json({ error: "Arquivo não encontrado" }, { status: 404 });
  }
  if (!stat.isFile()) {
    return NextResponse.json({ error: "Arquivo não encontrado" }, { status: 404 });
  }

  const size = stat.size;
  const contentType = mimeFromExt(filePath);
  const cache = "public, max-age=86400, immutable";
  const range = req.headers.get("range");

  // iPhone/Safari exige Accept-Ranges + 206 Partial Content para <video>
  if (range) {
    const m = /^bytes=(\d*)-(\d*)$/i.exec(range.trim());
    if (!m) {
      return new NextResponse(null, {
        status: 416,
        headers: {
          "Content-Range": `bytes */${size}`,
          "Accept-Ranges": "bytes",
        },
      });
    }

    let start = m[1] === "" ? 0 : Number(m[1]);
    let end = m[2] === "" ? size - 1 : Number(m[2]);
    if (!Number.isFinite(start) || !Number.isFinite(end)) {
      return new NextResponse(null, {
        status: 416,
        headers: {
          "Content-Range": `bytes */${size}`,
          "Accept-Ranges": "bytes",
        },
      });
    }

    if (start < 0) start = 0;
    if (end >= size) end = size - 1;
    if (start >= size || start > end) {
      return new NextResponse(null, {
        status: 416,
        headers: {
          "Content-Range": `bytes */${size}`,
          "Accept-Ranges": "bytes",
        },
      });
    }

    const chunkSize = end - start + 1;
    const stream = createReadStream(filePath, { start, end });
    return new NextResponse(nodeStreamToWeb(stream), {
      status: 206,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(chunkSize),
        "Content-Range": `bytes ${start}-${end}/${size}`,
        "Accept-Ranges": "bytes",
        "Cache-Control": cache,
      },
    });
  }

  const stream = createReadStream(filePath);
  return new NextResponse(nodeStreamToWeb(stream), {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(size),
      "Accept-Ranges": "bytes",
      "Cache-Control": cache,
    },
  });
}

export async function HEAD(req: NextRequest, ctx: Ctx) {
  const parts = (await ctx.params).path || [];
  const filePath = await resolveSafePath(parts);
  if (!filePath) {
    return NextResponse.json({ error: "Caminho inválido" }, { status: 400 });
  }
  try {
    const stat = await fs.stat(filePath);
    if (!stat.isFile()) {
      return NextResponse.json({ error: "Arquivo não encontrado" }, { status: 404 });
    }
    return new NextResponse(null, {
      status: 200,
      headers: {
        "Content-Type": mimeFromExt(filePath),
        "Content-Length": String(stat.size),
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Arquivo não encontrado" }, { status: 404 });
  }
}
