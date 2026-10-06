import { prisma } from "@/lib/prisma";
import {
  SIZE_GUIDES,
  defaultSizeGuideLabels,
  type SizeGuideId,
  type SizeGuideLabelMap,
} from "@/lib/size-guides";

export const SIZE_GUIDE_IMAGE_KEY = "sizeGuideImageUrl";
export const SIZE_GUIDE_LABELS_KEY = "sizeGuideLabels";

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

export async function getSizeGuideLabels(): Promise<Record<SizeGuideId, string>> {
  const defaults = defaultSizeGuideLabels();
  try {
    const row = await prisma.siteSetting.findUnique({
      where: { key: SIZE_GUIDE_LABELS_KEY },
    });
    if (!row?.value?.trim()) return defaults;
    const parsed = JSON.parse(row.value) as SizeGuideLabelMap;
    if (!parsed || typeof parsed !== "object") return defaults;
    const out = { ...defaults };
    for (const guide of SIZE_GUIDES) {
      const custom = parsed[guide.id];
      if (typeof custom === "string" && custom.trim()) {
        out[guide.id] = custom.trim().slice(0, 80);
      }
    }
    return out;
  } catch {
    return defaults;
  }
}

export async function setSizeGuideLabels(
  labels: SizeGuideLabelMap
): Promise<Record<SizeGuideId, string>> {
  const defaults = defaultSizeGuideLabels();
  const cleaned: SizeGuideLabelMap = {};
  for (const guide of SIZE_GUIDES) {
    const raw = labels[guide.id];
    if (typeof raw !== "string") continue;
    const trimmed = raw.trim().slice(0, 80);
    if (trimmed && trimmed !== guide.adminLabel) {
      cleaned[guide.id] = trimmed;
    }
  }
  await prisma.siteSetting.upsert({
    where: { key: SIZE_GUIDE_LABELS_KEY },
    create: {
      key: SIZE_GUIDE_LABELS_KEY,
      value: JSON.stringify(cleaned),
    },
    update: { value: JSON.stringify(cleaned) },
  });
  const out = { ...defaults };
  for (const guide of SIZE_GUIDES) {
    if (cleaned[guide.id]) out[guide.id] = cleaned[guide.id]!;
  }
  return out;
}
