import fs from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { encodeSdrSrgb, uploadRoot } from "@/lib/images";

const IMAGE_EXT = /\.(jpe?g|png|webp|avif|heic|heif|tiff?)$/i;

function publicRoot() {
  return path.join(process.cwd(), "public");
}

/** Resolve URL da loja para caminho no disco (public ou uploads). */
export function resolveLocalImagePath(url: string): string | null {
  try {
    const u = url.startsWith("http") ? new URL(url).pathname : url;
    const clean = u.split("?")[0] || "";
    if (clean.startsWith("/products/")) {
      return path.join(publicRoot(), clean.replace(/^\//, ""));
    }
    if (clean.startsWith("/uploads/")) {
      return path.join(uploadRoot(), clean.replace(/^\/uploads\//, ""));
    }
    if (clean.startsWith("/brand/") || clean.startsWith("/banners/")) {
      return path.join(publicRoot(), clean.replace(/^\//, ""));
    }
  } catch {
    /* ignore */
  }
  return null;
}

async function fileExists(p: string) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

/**
 * Regrava a foto em SDR sRGB (sem ICC/HDR).
 * Fotos em /products/ vão para o volume /uploads/products-sdr/ (sobrevive ao rebuild)
 * e a URL no banco é atualizada.
 */
export async function reencodeLocalImageToSdr(
  absolutePath: string,
  opts?: { preferJpeg?: boolean }
): Promise<{ outPath: string; bytes: number }> {
  const input = await fs.readFile(absolutePath);
  const ext = path.extname(absolutePath).toLowerCase();
  const format =
    ext === ".png"
      ? ("png" as const)
      : ext === ".webp"
        ? ("webp" as const)
        : ("jpeg" as const);
  const outBuf = await encodeSdrSrgb(
    input,
    opts?.preferJpeg ? "jpeg" : format === "png" ? "png" : format === "webp" ? "webp" : "jpeg"
  );

  // AVIF → JPEG no mesmo lugar com nova extensão fica complexo; grava .jpg ao lado se avif
  let outPath = absolutePath;
  if (ext === ".avif" || ext === ".heic" || ext === ".heif") {
    outPath = absolutePath.replace(/\.(avif|heic|heif)$/i, ".jpg");
  } else if (format === "jpeg" && !/\.jpe?g$/i.test(ext)) {
    outPath = absolutePath.replace(/\.[^.]+$/, ".jpg");
  }

  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, outBuf);
  return { outPath, bytes: outBuf.length };
}

export type FixHdrResult = {
  scanned: number;
  fixed: number;
  skipped: number;
  failed: number;
  updatedUrls: number;
  errors: string[];
};

export async function fixProductImagesHdr(limit = 80): Promise<FixHdrResult> {
  const result: FixHdrResult = {
    scanned: 0,
    fixed: 0,
    skipped: 0,
    failed: 0,
    updatedUrls: 0,
    errors: [],
  };

  const sdrDir = path.join(uploadRoot(), "products-sdr");
  await fs.mkdir(sdrDir, { recursive: true });

  const images = await prisma.productImage.findMany({
    orderBy: { id: "asc" },
    select: { id: true, url: true },
  });

  for (const img of images) {
    if (result.fixed >= limit) break;
    result.scanned += 1;

    // Já migrada para SDR?
    if (img.url.includes("/uploads/products-sdr/")) {
      result.skipped += 1;
      continue;
    }

    const local = resolveLocalImagePath(img.url);
    if (!local || !(await fileExists(local))) {
      result.skipped += 1;
      continue;
    }

    try {
      // Nome único por imagem — basename "800.webp" colidia e sobrescrevia o mesmo arquivo.
      const destName = `${img.id}-sdr.jpg`;
      const destPath = path.join(sdrDir, destName);
      const input = await fs.readFile(local);
      const outBuf = await encodeSdrSrgb(input, "jpeg");
      await fs.writeFile(destPath, outBuf);
      const nextUrl = `/uploads/products-sdr/${destName}`;
      await prisma.productImage.update({
        where: { id: img.id },
        data: { url: nextUrl },
      });
      result.fixed += 1;
      result.updatedUrls += 1;
    } catch (e) {
      result.failed += 1;
      const msg = e instanceof Error ? e.message : String(e);
      if (result.errors.length < 12) {
        result.errors.push(`${img.url}: ${msg.slice(0, 120)}`);
      }
    }
  }

  return result;
}

/** Reprocessa arquivos soltos em uploads (variantes webp) sem mudar URL. */
export async function fixUploadsInPlace(limit = 60): Promise<FixHdrResult> {
  const result: FixHdrResult = {
    scanned: 0,
    fixed: 0,
    skipped: 0,
    failed: 0,
    updatedUrls: 0,
    errors: [],
  };

  const root = uploadRoot();
  const queue: string[] = [];

  async function walk(dir: string) {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name === "products-sdr") continue;
        await walk(full);
      } else if (IMAGE_EXT.test(e.name)) {
        queue.push(full);
      }
    }
  }

  await walk(root);

  for (const file of queue) {
    if (result.fixed + result.failed >= limit) break;
    result.scanned += 1;
    try {
      await reencodeLocalImageToSdr(file);
      result.fixed += 1;
    } catch (e) {
      result.failed += 1;
      const msg = e instanceof Error ? e.message : String(e);
      if (result.errors.length < 8) {
        result.errors.push(`${path.basename(file)}: ${msg.slice(0, 100)}`);
      }
    }
  }

  return result;
}

