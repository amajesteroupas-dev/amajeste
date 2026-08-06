import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { adminAuth } from "@/lib/admin-auth";
import { uploadRoot } from "@/lib/images";

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

function mimeFromExt(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  if (ext === ".avif") return "image/avif";
  if (ext === ".svg") return "image/svg+xml";
  return "image/jpeg";
}

const ALLOWED_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "equilibra.tech",
  "www.equilibra.tech",
  "amajeste.com.br",
  "www.amajeste.com.br",
]);

/** Proxy / leitura local da imagem para o canvas gerar PNG sem CORS. */
export async function GET(req: NextRequest) {
  const session = await requireStaff();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const raw = req.nextUrl.searchParams.get("url") || "";
  if (!raw) {
    return NextResponse.json({ error: "URL obrigatória" }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(raw, req.nextUrl.origin);
  } catch {
    return NextResponse.json({ error: "URL inválida" }, { status: 400 });
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL || "";
  let siteHost = "";
  try {
    siteHost = site ? new URL(site).hostname : "";
  } catch {
    siteHost = "";
  }

  const allowed =
    ALLOWED_HOSTS.has(target.hostname) ||
    target.hostname === req.nextUrl.hostname ||
    (siteHost && target.hostname === siteHost);

  if (!allowed) {
    return NextResponse.json(
      { error: "Domínio de imagem não permitido" },
      { status: 403 }
    );
  }

  // Preferência: ler /uploads direto do disco (evita loop HTTP no Docker)
  const pathname = decodeURIComponent(target.pathname);
  if (pathname.startsWith("/uploads/")) {
    const rel = pathname.slice("/uploads/".length);
    const filePath = path.join(uploadRoot(), rel);
    const root = path.resolve(uploadRoot());
    if (!path.resolve(filePath).startsWith(root + path.sep) && path.resolve(filePath) !== root) {
      return NextResponse.json({ error: "Caminho inválido" }, { status: 400 });
    }
    try {
      const buf = await fs.readFile(filePath);
      return new NextResponse(buf, {
        headers: {
          "Content-Type": mimeFromExt(filePath),
          "Cache-Control": "private, max-age=3600",
        },
      });
    } catch {
      // cai no fetch HTTP abaixo
    }
  }

  // Fallback: busca interna (mesmo app) ou URL pública
  const internalCandidates = [
    `http://127.0.0.1:3000${pathname}${target.search}`,
    `http://127.0.0.1:3001${pathname}${target.search}`,
    target.toString(),
  ];

  for (const url of internalCandidates) {
    try {
      const upstream = await fetch(url, {
        headers: { Accept: "image/*" },
        cache: "force-cache",
      });
      if (!upstream.ok) continue;
      const buf = await upstream.arrayBuffer();
      const type = upstream.headers.get("content-type") || "image/jpeg";
      return new NextResponse(buf, {
        headers: {
          "Content-Type": type,
          "Cache-Control": "private, max-age=3600",
        },
      });
    } catch {
      continue;
    }
  }

  return NextResponse.json(
    { error: "Não foi possível carregar a imagem" },
    { status: 502 }
  );
}
