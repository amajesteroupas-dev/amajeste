import { prisma } from "@/lib/prisma";
import { mergeProductVideoUrls, resolveVideoPlayback } from "@/lib/videos";

/** Categoria sistema: vídeos da home (produtos de todas as categorias). */
export const HOME_VIDEO_CATEGORY_SLUG = "pagina-principal";
export const HOME_VIDEO_CATEGORY_NAME = "Página principal";

export async function ensureHomeVideoCategory() {
  const existing = await prisma.category.findUnique({
    where: { slug: HOME_VIDEO_CATEGORY_SLUG },
    select: { id: true, name: true, parentId: true, slug: true },
  });
  if (existing) return existing;

  return prisma.category.create({
    data: {
      name: HOME_VIDEO_CATEGORY_NAME,
      slug: HOME_VIDEO_CATEGORY_SLUG,
      sortOrder: -100,
      description: "Vídeos exibidos na página inicial (Ao Vivo).",
    },
    select: { id: true, name: true, parentId: true, slug: true },
  });
}

export function isHomeVideoCategorySlug(slug: string | null | undefined) {
  return slug === HOME_VIDEO_CATEGORY_SLUG;
}

/** Mapa categoryId → URLs de vídeo ativas e válidas. */
export async function getCategoryVideoMap(categoryIds: string[]) {
  const ids = [...new Set(categoryIds.filter(Boolean))];
  const map = new Map<string, string[]>();
  if (ids.length === 0) return map;

  const rows = await prisma.categoryVideo.findMany({
    where: { categoryId: { in: ids }, active: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    select: { categoryId: true, url: true },
  });

  for (const row of rows) {
    if (!resolveVideoPlayback(row.url)) continue;
    const list = map.get(row.categoryId) || [];
    list.push(row.url);
    map.set(row.categoryId, list);
  }
  return map;
}

/** URLs cadastradas em “Página principal”. */
export async function getHomePageVideoUrls(): Promise<string[]> {
  const home = await prisma.category.findUnique({
    where: { slug: HOME_VIDEO_CATEGORY_SLUG },
    select: { id: true },
  });
  if (!home) return [];
  const map = await getCategoryVideoMap([home.id]);
  return map.get(home.id) || [];
}

/**
 * Resolve vídeos por categoria: própria + pai + irmãos/filhos do mesmo ramo.
 */
export async function resolveProductVideoUrls(
  products: {
    categoryId: string;
    videoUrl?: string | null;
    category?: { parentId?: string | null } | null;
  }[]
): Promise<Map<string, string[]>> {
  const categoryIds = new Set<string>();
  for (const p of products) {
    if (p.categoryId) categoryIds.add(p.categoryId);
    if (p.category?.parentId) categoryIds.add(p.category.parentId);
  }

  const missingParents = [...categoryIds];
  if (missingParents.length > 0) {
    const cats = await prisma.category.findMany({
      where: { id: { in: missingParents } },
      select: { id: true, parentId: true },
    });
    for (const c of cats) {
      if (c.parentId) categoryIds.add(c.parentId);
    }
    const children = await prisma.category.findMany({
      where: { parentId: { in: [...categoryIds] } },
      select: { id: true, parentId: true },
    });
    for (const c of children) {
      categoryIds.add(c.id);
    }
  }

  const byCategory = await getCategoryVideoMap([...categoryIds]);

  const meta = await prisma.category.findMany({
    where: { id: { in: [...categoryIds] } },
    select: { id: true, parentId: true },
  });
  const parentOf = new Map(meta.map((c) => [c.id, c.parentId]));
  const childrenOf = new Map<string, string[]>();
  for (const c of meta) {
    if (!c.parentId) continue;
    const list = childrenOf.get(c.parentId) || [];
    list.push(c.id);
    childrenOf.set(c.parentId, list);
  }

  function urlsForCategory(categoryId: string): string[] {
    const out: string[] = [];
    const pushAll = (id: string) => {
      for (const u of byCategory.get(id) || []) {
        if (!out.includes(u)) out.push(u);
      }
    };
    pushAll(categoryId);
    const parentId = parentOf.get(categoryId);
    if (parentId) {
      pushAll(parentId);
      for (const sib of childrenOf.get(parentId) || []) pushAll(sib);
    }
    for (const childId of childrenOf.get(categoryId) || []) pushAll(childId);
    return out;
  }

  const result = new Map<string, string[]>();
  for (const id of categoryIds) {
    result.set(id, urlsForCategory(id));
  }
  return result;
}

/**
 * videoUrls finais por produto (produto + categoria + home opcional).
 */
export async function getVideoUrlsByProductId(
  products: {
    id: string;
    categoryId: string;
    videoUrl?: string | null;
    category?: { parentId?: string | null } | null;
  }[],
  options?: { includeHomePool?: boolean }
): Promise<Map<string, string[]>> {
  const catMap = await resolveProductVideoUrls(products);
  const homeUrls = options?.includeHomePool
    ? await getHomePageVideoUrls()
    : [];

  const out = new Map<string, string[]>();
  for (const p of products) {
    const categoryUrls = [
      ...(catMap.get(p.categoryId) || []),
      ...homeUrls,
    ];
    out.set(p.id, mergeProductVideoUrls(p.videoUrl, categoryUrls));
  }
  return out;
}

/**
 * Pool do ícone flutuante “Ao Vivo”: só vídeos de categoria / página principal
 * (não inclui vídeo cadastrado no produto).
 */
export async function getCatalogFloatVideoUrls(
  products: {
    categoryId: string;
    category?: { parentId?: string | null } | null;
  }[],
  options?: { includeHomePool?: boolean }
): Promise<string[]> {
  const catMap = await resolveProductVideoUrls(products);
  const homeUrls = options?.includeHomePool
    ? await getHomePageVideoUrls()
    : [];
  const out: string[] = [];
  const push = (u: string) => {
    if (u && !out.includes(u)) out.push(u);
  };
  for (const u of homeUrls) push(u);
  for (const list of catMap.values()) {
    for (const u of list) push(u);
  }
  return out;
}

/**
 * Pool global da bolinha Ao Vivo (todas as páginas da loja).
 * Inclui Página principal + vídeos de qualquer categoria.
 */
export async function getGlobalLiveVideoUrls(): Promise<string[]> {
  const rows = await prisma.categoryVideo.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    select: { url: true },
    take: 120,
  });
  const out: string[] = [];
  for (const r of rows) {
    if (!resolveVideoPlayback(r.url)) continue;
    if (!out.includes(r.url)) out.push(r.url);
  }
  return out;
}

export { mergeProductVideoUrls };
