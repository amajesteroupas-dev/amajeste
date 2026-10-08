import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/admin-auth";
import {
  getSizeGuideLabels,
  setSizeGuideLabels,
} from "@/lib/site-settings";
import { type SizeGuideLabelMap } from "@/lib/size-guides";

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
  const labels = await getSizeGuideLabels();
  return NextResponse.json({ labels, defaults: labels });
}

export async function PUT(req: NextRequest) {
  if (!(await requireStaff())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const incoming = (body.labels || {}) as SizeGuideLabelMap;
  if (!incoming || typeof incoming !== "object") {
    return NextResponse.json(
      { error: "Informe os nomes das tabelas." },
      { status: 400 }
    );
  }
  const labels = await setSizeGuideLabels(incoming);
  return NextResponse.json({ ok: true, labels });
}
