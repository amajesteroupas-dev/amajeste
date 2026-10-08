import { prisma } from "@/lib/prisma";
import {
  BUILTIN_SIZE_GUIDES,
  cloneBuiltinSizeGuides,
  defaultSizeGuideLabels,
  findSizeGuide,
  normalizeSizeGuide,
  sanitizeSizeGuidesCatalog,
  type SizeGuide,
  type SizeGuideId,
  type SizeGuideLabelMap,
} from "@/lib/size-guides";

export const SIZE_GUIDE_IMAGE_KEY = "sizeGuideImageUrl";
export const SIZE_GUIDE_LABELS_KEY = "sizeGuideLabels";
export const SIZE_GUIDES_CATALOG_KEY = "sizeGuidesCatalog";

/** Foto padrão do guia (modelo recortada em pé — banco de imagens) */
export const DEFAULT_SIZE_GUIDE_IMAGE =
  "/uploads/media/177e0653-a34f-4ca6-8d8c-b4990039934a/cutout.png";

export async function getSizeGuideImageUrl(): Promise<string> {
  try {
    const row = await prisma.siteSetting.findUnique({
      where: { key: SIZE_GUIDE_IMAGE_KEY },
    });
    const url = row?.value?.trim();
    return url || DEFAULT_SIZE_GUIDE_IMAGE;
  } catch {
    return DEFAULT_SIZE_GUIDE_IMAGE;
  }
}

export async function setSizeGuideImageUrl(url: string) {
  const value = url.trim();
  await prisma.siteSetting.upsert({
    where: { key: SIZE_GUIDE_IMAGE_KEY },
    create: { key: SIZE_GUIDE_IMAGE_KEY, value },
    update: { value },
  });
  return value;
}

/** Catálogo completo de tabelas (editável no admin). */
export async function getSizeGuidesCatalog(): Promise<SizeGuide[]> {
  try {
    const row = await prisma.siteSetting.findUnique({
      where: { key: SIZE_GUIDES_CATALOG_KEY },
    });
    if (!row?.value?.trim()) return cloneBuiltinSizeGuides();
    const parsed = JSON.parse(row.value);
    const guides = sanitizeSizeGuidesCatalog(parsed);
    // Aplica renomes legados (sizeGuideLabels) se existirem
    const labels = await getSizeGuideLabelsRaw();
    if (!labels) return guides;
    return guides.map((g) => {
      const custom = labels[g.id]?.trim();
      return custom ? { ...g, adminLabel: custom } : g;
    });
  } catch {
    return cloneBuiltinSizeGuides();
  }
}

export async function saveSizeGuidesCatalog(
  guidesInput: unknown
): Promise<SizeGuide[]> {
  const guides = sanitizeSizeGuidesCatalog(guidesInput);
  await prisma.siteSetting.upsert({
    where: { key: SIZE_GUIDES_CATALOG_KEY },
    create: {
      key: SIZE_GUIDES_CATALOG_KEY,
      value: JSON.stringify(guides),
    },
    update: { value: JSON.stringify(guides) },
  });
  // Limpa renomes legados conflitantes — o nome oficial passa a ser adminLabel
  await prisma.siteSetting
    .upsert({
      where: { key: SIZE_GUIDE_LABELS_KEY },
      create: { key: SIZE_GUIDE_LABELS_KEY, value: "{}" },
      update: { value: "{}" },
    })
    .catch(() => undefined);
  return guides;
}

async function getSizeGuideLabelsRaw(): Promise<SizeGuideLabelMap | null> {
  try {
    const row = await prisma.siteSetting.findUnique({
      where: { key: SIZE_GUIDE_LABELS_KEY },
    });
    if (!row?.value?.trim()) return null;
    const parsed = JSON.parse(row.value) as SizeGuideLabelMap;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function getSizeGuideLabels(): Promise<Record<string, string>> {
  const guides = await getSizeGuidesCatalog();
  return defaultSizeGuideLabels(guides);
}

export async function setSizeGuideLabels(
  labels: SizeGuideLabelMap
): Promise<Record<string, string>> {
  const guides = await getSizeGuidesCatalog();
  const next = guides.map((g) => {
    const custom = labels[g.id];
    if (typeof custom !== "string") return g;
    const trimmed = custom.trim().slice(0, 80);
    if (!trimmed) return g;
    return { ...g, adminLabel: trimmed };
  });
  const saved = await saveSizeGuidesCatalog(next);
  return defaultSizeGuideLabels(saved);
}

export async function resolveProductSizeGuide(
  value: unknown
): Promise<SizeGuide> {
  const guides = await getSizeGuidesCatalog();
  return findSizeGuide(guides, value);
}

export async function normalizeSizeGuideAsync(
  value: unknown
): Promise<SizeGuideId> {
  const guides = await getSizeGuidesCatalog();
  return normalizeSizeGuide(value, guides);
}

export { BUILTIN_SIZE_GUIDES };
