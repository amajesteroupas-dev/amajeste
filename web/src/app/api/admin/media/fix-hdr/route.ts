import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/admin-auth";
import {
  fixProductImagesHdr,
  fixUploadsInPlace,
} from "@/lib/fix-hdr-images";
import {
  actorFromSession,
  requestIp,
  writeAuditLog,
} from "@/lib/audit-log";

export const runtime = "nodejs";
export const maxDuration = 300;

async function requireAdmin() {
  const session = await adminAuth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return null;
  }
  return session;
}

/**
 * POST /api/admin/media/fix-hdr
 * body: { scope?: "products" | "uploads" | "all", limit?: number }
 *
 * Reprocessa fotos para SDR sRGB (corrige print “queimado” no iPhone).
 * Produtos em /products/ migram para /uploads/products-sdr/ (volume persistente).
 */
export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Só ADMIN" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const scope = String(body.scope || "products") as
    | "products"
    | "uploads"
    | "all";
  const limit = Math.min(200, Math.max(1, Number(body.limit) || 80));

  const products =
    scope === "products" || scope === "all"
      ? await fixProductImagesHdr(limit)
      : null;
  const uploads =
    scope === "uploads" || scope === "all"
      ? await fixUploadsInPlace(Math.min(40, limit))
      : null;

  void writeAuditLog({
    category: "products",
    action: "update",
    summary: `Correção HDR/print iPhone (${scope})`,
    detail: { scope, limit, products, uploads },
    actor: actorFromSession(session),
    ip: requestIp(req),
  });

  const fixed =
    (products?.fixed || 0) + (uploads?.fixed || 0);

  return NextResponse.json({
    ok: true,
    scope,
    products,
    uploads,
    message:
      fixed === 0
        ? "Nenhuma foto nova para corrigir (já em SDR ou arquivo ausente)."
        : `${fixed} foto(s) corrigida(s) para print no iPhone.`,
    runAgain: Boolean(products && products.fixed >= limit),
  });
}

