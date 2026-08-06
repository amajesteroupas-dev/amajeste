import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/admin-auth";
import {
  canvaConfigured,
  createCustomDesign,
  getValidAccessToken,
} from "@/lib/canva";
import { CANVA_ART_SPECS, type CanvaSpecId } from "@/lib/banner-canva-specs";

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

export async function POST(req: NextRequest) {
  if (!(await requireStaff())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canvaConfigured()) {
    return NextResponse.json(
      { error: "Canva não configurado no servidor." },
      { status: 400 }
    );
  }

  const body = (await req.json().catch(() => ({}))) as {
    specId?: string;
    width?: number;
    height?: number;
    title?: string;
  };

  let width = Number(body.width) || 0;
  let height = Number(body.height) || 0;
  let title = (body.title || "Banner Majesté").trim() || "Banner Majesté";

  if (body.specId) {
    const spec = CANVA_ART_SPECS.find((s) => s.id === (body.specId as CanvaSpecId));
    if (spec) {
      width = spec.width;
      height = spec.height;
      title = `Majesté — ${spec.label}`;
    }
  }

  if (width < 40 || height < 40 || width > 8000 || height > 8000) {
    return NextResponse.json({ error: "Dimensões inválidas." }, { status: 400 });
  }
  if (width * height > 25_000_000) {
    return NextResponse.json(
      { error: "Área máxima do Canva excedida (25M px²)." },
      { status: 400 }
    );
  }

  const accessToken = await getValidAccessToken();
  if (!accessToken) {
    return NextResponse.json(
      {
        error: "Conta Canva não conectada. Clique em Conectar Canva.",
        needsConnect: true,
      },
      { status: 401 }
    );
  }

  try {
    const design = await createCustomDesign({
      accessToken,
      width,
      height,
      title,
    });
    return NextResponse.json({ ok: true, design });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Falha ao criar design" },
      { status: 502 }
    );
  }
}
