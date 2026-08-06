import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import {
  importProfileMedia,
  itemsFromPastedLinks,
  type ProfileMediaItem,
} from "@/lib/instagram-fetch";

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

async function upsertItems(items: ProfileMediaItem[]) {
  let imported = 0;
  let updated = 0;

  for (const item of items) {
    const existing = await prisma.instagramPost.findFirst({
      where: {
        OR: [
          ...(item.igMediaId ? [{ igMediaId: item.igMediaId }] : []),
          { shortcode: item.shortcode },
        ],
      },
    });

    if (existing) {
      await prisma.instagramPost.update({
        where: { id: existing.id },
        data: {
          permalink: item.permalink,
          mediaType: item.mediaType,
          caption: item.caption || existing.caption,
          coverUrl: item.coverUrl || existing.coverUrl,
          mediaUrl: item.mediaUrl || existing.mediaUrl,
          thumbnailUrl: item.thumbnailUrl || existing.thumbnailUrl,
          igMediaId: item.igMediaId || existing.igMediaId,
          postedAt: item.postedAt || existing.postedAt,
          active: true,
        },
      });
      updated += 1;
    } else {
      const maxOrder = await prisma.instagramPost.aggregate({
        _max: { sortOrder: true },
      });
      await prisma.instagramPost.create({
        data: {
          permalink: item.permalink,
          shortcode: item.shortcode,
          mediaType: item.mediaType,
          caption: item.caption,
          coverUrl: item.coverUrl,
          mediaUrl: item.mediaUrl,
          thumbnailUrl: item.thumbnailUrl,
          igMediaId: item.igMediaId,
          postedAt: item.postedAt,
          sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
          active: true,
        },
      });
      imported += 1;
    }
  }

  return { imported, updated, total: items.length };
}

/** Importa feed do perfil OU vários links colados de uma vez */
export async function POST(req: NextRequest) {
  const session = await requireStaff();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const linksText = String(body.links || body.urls || "").trim();
  const profileUrl = String(body.profileUrl || body.url || "").trim();

  try {
    if (linksText) {
      const items = itemsFromPastedLinks(linksText);
      if (items.length === 0) {
        return NextResponse.json(
          {
            error:
              "Nenhum link válido encontrado. Cole URLs como https://www.instagram.com/reel/... ou /p/...",
          },
          { status: 400 }
        );
      }
      const result = await upsertItems(items);
      return NextResponse.json({
        ok: true,
        source: "links",
        username: null,
        ...result,
      });
    }

    if (!profileUrl) {
      return NextResponse.json(
        { error: "Informe o link do perfil ou cole vários links de posts." },
        { status: 400 }
      );
    }

    const { items, source, username } = await importProfileMedia(
      profileUrl,
      Number(body.limit) || 30
    );
    const result = await upsertItems(items);
    return NextResponse.json({
      ok: true,
      username,
      source,
      ...result,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Falha ao importar" },
      { status: 502 }
    );
  }
}
