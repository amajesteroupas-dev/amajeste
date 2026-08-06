import { parseInstagramUrl } from "@/lib/instagram";
import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

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
  const session = await requireStaff();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const posts = await prisma.instagramPost.findMany({
    orderBy: [{ sortOrder: "asc" }, { postedAt: "desc" }, { createdAt: "desc" }],
  });
  return NextResponse.json(posts);
}

export async function POST(req: NextRequest) {
  const session = await requireStaff();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = parseInstagramUrl(String(body.permalink || ""));
  if (!parsed) {
    return NextResponse.json(
      { error: "Cole um link válido do Instagram (post ou reel)." },
      { status: 400 }
    );
  }

  const coverUrl = body.coverUrl ? String(body.coverUrl) : null;
  const caption = body.caption ? String(body.caption) : null;
  const mediaType =
    body.mediaType === "VIDEO" || body.mediaType === "CAROUSEL"
      ? body.mediaType
      : parsed.mediaType;

  // Capa opcional — a loja exibe o embed do Instagram (foto/reel real)

  const maxOrder = await prisma.instagramPost.aggregate({
    _max: { sortOrder: true },
  });

  try {
    const post = await prisma.instagramPost.create({
      data: {
        permalink: parsed.permalink,
        shortcode: parsed.shortcode,
        mediaType,
        caption,
        coverUrl,
        thumbnailUrl: coverUrl,
        mediaUrl: body.mediaUrl ? String(body.mediaUrl) : null,
        active: body.active !== false,
        sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
        postedAt: body.postedAt ? new Date(String(body.postedAt)) : null,
      },
    });
    return NextResponse.json(post);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("Unique") || msg.includes("unique")) {
      return NextResponse.json(
        { error: "Este post já está cadastrado." },
        { status: 409 }
      );
    }
    throw e;
  }
}

export async function PATCH(req: NextRequest) {
  const session = await requireStaff();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await req.json();

  if (Array.isArray(body.order)) {
    await prisma.$transaction(
      (body.order as string[]).map((id, i) =>
        prisma.instagramPost.update({
          where: { id },
          data: { sortOrder: i },
        })
      )
    );
    return NextResponse.json({ ok: true });
  }

  const id = String(body.id || "");
  if (!id) {
    return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (body.active !== undefined) data.active = Boolean(body.active);
  if (body.caption !== undefined)
    data.caption = body.caption ? String(body.caption) : null;
  if (body.coverUrl !== undefined)
    data.coverUrl = body.coverUrl ? String(body.coverUrl) : null;
  if (body.mediaType !== undefined) {
    const t = String(body.mediaType);
    data.mediaType = ["IMAGE", "VIDEO", "CAROUSEL"].includes(t) ? t : "IMAGE";
  }
  if (body.permalink) {
    const parsed = parseInstagramUrl(String(body.permalink));
    if (!parsed) {
      return NextResponse.json({ error: "Link inválido" }, { status: 400 });
    }
    data.permalink = parsed.permalink;
    data.shortcode = parsed.shortcode;
  }

  const post = await prisma.instagramPost.update({ where: { id }, data });
  return NextResponse.json(post);
}

export async function DELETE(req: NextRequest) {
  const session = await requireStaff();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
  }
  await prisma.instagramPost.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
