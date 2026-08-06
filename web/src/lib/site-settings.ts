import { prisma } from "@/lib/prisma";

export const SIZE_GUIDE_IMAGE_KEY = "sizeGuideImageUrl";

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
