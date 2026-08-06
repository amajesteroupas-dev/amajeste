import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import {
  mapGraphMediaType,
  shortcodeFromPermalink,
} from "@/lib/instagram";

/**
 * Sincroniza o feed via Instagram Graph API.
 * Requer INSTAGRAM_ACCESS_TOKEN + INSTAGRAM_USER_ID (conta Business/Creator).
 */
export async function POST() {
  const session = await adminAuth();
  if (
    !session?.user ||
    (session.user.role !== "ADMIN" && session.user.role !== "STAFF")
  ) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  const userId = process.env.INSTAGRAM_USER_ID;
  if (!token || !userId) {
    return NextResponse.json(
      {
        error:
          "Configure INSTAGRAM_ACCESS_TOKEN e INSTAGRAM_USER_ID no servidor para sincronizar automaticamente.",
        configured: false,
      },
      { status: 400 }
    );
  }

  const fields =
    "id,caption,media_type,media_url,permalink,thumbnail_url,timestamp";
  let url: string | null =
    `https://graph.facebook.com/v21.0/${userId}/media?fields=${fields}&limit=50&access_token=${token}`;

  let imported = 0;
  let updated = 0;
  let pages = 0;

  while (url && pages < 10) {
    pages += 1;
    const res = await fetch(url, { next: { revalidate: 0 } });
    const json = (await res.json()) as {
      data?: Array<{
        id: string;
        caption?: string;
        media_type: string;
        media_url?: string;
        permalink: string;
        thumbnail_url?: string;
        timestamp?: string;
      }>;
      paging?: { next?: string };
      error?: { message?: string };
    };

    if (!res.ok || json.error) {
      return NextResponse.json(
        {
          error: json.error?.message || "Falha ao consultar Instagram Graph API",
        },
        { status: 502 }
      );
    }

    for (const item of json.data || []) {
      const shortcode =
        shortcodeFromPermalink(item.permalink) || item.id;
      const mediaType = mapGraphMediaType(item.media_type);
      const coverUrl =
        item.thumbnail_url ||
        (mediaType === "IMAGE" ? item.media_url : null) ||
        null;

      const existing = await prisma.instagramPost.findFirst({
        where: {
          OR: [{ igMediaId: item.id }, { shortcode }],
        },
      });

      const data = {
        permalink: item.permalink,
        shortcode,
        mediaType,
        caption: item.caption || null,
        mediaUrl: item.media_url || null,
        thumbnailUrl: item.thumbnail_url || null,
        coverUrl: existing?.coverUrl || coverUrl,
        igMediaId: item.id,
        postedAt: item.timestamp ? new Date(item.timestamp) : null,
        active: true,
      };

      if (existing) {
        await prisma.instagramPost.update({
          where: { id: existing.id },
          data: {
            ...data,
            // preserva capa manual se já existir upload local
            coverUrl: existing.coverUrl?.startsWith("/uploads")
              ? existing.coverUrl
              : data.coverUrl,
          },
        });
        updated += 1;
      } else {
        const maxOrder = await prisma.instagramPost.aggregate({
          _max: { sortOrder: true },
        });
        await prisma.instagramPost.create({
          data: {
            ...data,
            sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
          },
        });
        imported += 1;
      }
    }

    url = json.paging?.next || null;
  }

  return NextResponse.json({ ok: true, imported, updated, pages });
}
