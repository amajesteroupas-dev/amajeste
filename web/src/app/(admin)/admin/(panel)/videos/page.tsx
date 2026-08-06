import { prisma } from "@/lib/prisma";
import { CategoryVideosAdmin } from "@/components/admin/CategoryVideosAdmin";
import {
  ensureHomeVideoCategory,
  HOME_VIDEO_CATEGORY_SLUG,
} from "@/lib/category-videos";

export const dynamic = "force-dynamic";

export default async function AdminVideosPage() {
  await ensureHomeVideoCategory();

  const categories = await prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, parentId: true, slug: true },
  });

  const sorted = [...categories].sort((a, b) => {
    if (a.slug === HOME_VIDEO_CATEGORY_SLUG) return -1;
    if (b.slug === HOME_VIDEO_CATEGORY_SLUG) return 1;
    return a.name.localeCompare(b.name, "pt-BR");
  });

  return (
    <CategoryVideosAdmin
      categories={sorted.map((c) => ({
        id: c.id,
        name:
          c.slug === HOME_VIDEO_CATEGORY_SLUG
            ? "Página principal"
            : c.name,
        parentId: c.parentId,
      }))}
    />
  );
}
