import sharp from "sharp";
import path from "path";
import fs from "fs/promises";
import { randomUUID } from "crypto";

const SIZES = [400, 800, 1200, 1600] as const;

function uploadRoot() {
  return path.resolve(process.env.UPLOAD_DIR || "./uploads");
}

export async function processAndSaveImage(file: Buffer, originalName: string) {
  const id = randomUUID();
  const baseDir = path.join(uploadRoot(), "products", id);
  await fs.mkdir(baseDir, { recursive: true });

  const meta = await sharp(file).metadata();
  const originalExt = path.extname(originalName).toLowerCase() || ".jpg";
  const originalPath = path.join(baseDir, `original${originalExt}`);
  await fs.writeFile(originalPath, file);

  const variants: { width: number; format: string; path: string; url: string }[] = [];

  for (const width of SIZES) {
    if (meta.width && meta.width < width) continue;

    for (const format of ["webp", "avif"] as const) {
      const filename = `${width}.${format}`;
      const outPath = path.join(baseDir, filename);
      let pipeline = sharp(file).resize({ width, withoutEnlargement: true });
      if (format === "webp") pipeline = pipeline.webp({ quality: 82 });
      else pipeline = pipeline.avif({ quality: 65 });
      await pipeline.toFile(outPath);
      variants.push({
        width,
        format,
        path: outPath,
        url: `/uploads/products/${id}/${filename}`,
      });
    }
  }

  // Default display URL (webp 800 or closest)
  const primary =
    variants.find((v) => v.format === "webp" && v.width === 800) ||
    variants.find((v) => v.format === "webp") ||
    variants[0];

  return {
    id,
    originalUrl: `/uploads/products/${id}/original${originalExt}`,
    url: primary?.url || `/uploads/products/${id}/original${originalExt}`,
    variants,
  };
}

export async function ensureUploadDirs() {
  await fs.mkdir(path.join(uploadRoot(), "products"), { recursive: true });
}
