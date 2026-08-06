import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ id: string }> };

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

export async function PATCH(req: NextRequest, { params }: Props) {
  if (!(await requireStaff())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const data: { title?: string | null; active?: boolean; sortOrder?: number } =
    {};
  if (body.title !== undefined) {
    data.title = body.title ? String(body.title).trim() : null;
  }
  if (typeof body.active === "boolean") data.active = body.active;
  if (typeof body.sortOrder === "number") data.sortOrder = body.sortOrder;

  try {
    const video = await prisma.categoryVideo.update({
      where: { id },
      data,
    });
    return NextResponse.json({ ok: true, video });
  } catch {
    return NextResponse.json({ error: "Vídeo não encontrado" }, { status: 404 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Props) {
  if (!(await requireStaff())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const { id } = await params;
  try {
    await prisma.categoryVideo.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Vídeo não encontrado" }, { status: 404 });
  }
}
