import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { fetchPostCover } from "@/lib/instagram-fetch";

/** Atualiza miniaturas dos posts sem capa (mostra as pessoas) */
export async function POST() {
  const session = await adminAuth();
  if (
    !session?.user ||
    (session.user.role !== "ADMIN" && session.user.role !== "STAFF")
  ) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const posts = await prisma.instagramPost.findMany({
    where: {
      OR: [{ coverUrl: null }, { coverUrl: "" }],
    },
    take: 40,
  });

  let updated = 0;
  const errors: string[] = [];

  for (const post of posts) {
    try {
      const meta = await fetchPostCover(post.permalink);
      if (meta.coverUrl) {
        await prisma.instagramPost.update({
          where: { id: post.id },
          data: {
            coverUrl: meta.coverUrl,
            thumbnailUrl: meta.coverUrl,
            caption: post.caption || meta.caption,
            mediaType: meta.mediaTypeHint || post.mediaType,
          },
        });
        updated += 1;
      }
    } catch (e) {
      errors.push(
        `${post.shortcode}: ${e instanceof Error ? e.message : "erro"}`
      );
    }
  }

  return NextResponse.json({
    ok: true,
    checked: posts.length,
    updated,
    errors: errors.slice(0, 5),
  });
}
