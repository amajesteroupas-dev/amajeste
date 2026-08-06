import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

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

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await requireStaff();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  const data: Record<string, unknown> = {};
  for (const key of [
    "title",
    "subject",
    "body",
    "imageUrl",
    "ctaLabel",
    "ctaHref",
    "hashtags",
    "status",
    "format",
  ] as const) {
    if (body[key] !== undefined) {
      data[key] = body[key] === null || body[key] === "" ? null : String(body[key]);
    }
  }
  if (body.channel === "EMAIL" || body.channel === "INSTAGRAM") {
    data.channel = body.channel;
  }

  const creative = await prisma.marketingCreative.update({
    where: { id },
    data,
  });
  return NextResponse.json(creative);
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await requireStaff();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const { id } = await params;
  await prisma.marketingCreative.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
