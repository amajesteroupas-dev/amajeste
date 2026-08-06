import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/admin-auth";
import {
  getSizeGuideImageUrl,
  setSizeGuideImageUrl,
} from "@/lib/site-settings";

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
  const url = await getSizeGuideImageUrl();
  return NextResponse.json({ url });
}

export async function PUT(req: NextRequest) {
  if (!(await requireStaff())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const url = String(body.url || "").trim();
  if (!url) {
    return NextResponse.json({ error: "Informe a URL da imagem." }, { status: 400 });
  }
  const saved = await setSizeGuideImageUrl(url);
  return NextResponse.json({ ok: true, url: saved });
}
