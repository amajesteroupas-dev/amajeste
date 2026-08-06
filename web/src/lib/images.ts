import sharp from "sharp";
import path from "path";
import fs from "fs/promises";
import { randomUUID } from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";
import os from "os";
import { refineCutoutAlpha } from "@/lib/cutout-refine";

const execFileAsync = promisify(execFile);
const SIZES = [400, 800, 1200, 1600] as const;

export function uploadRoot() {
  return path.resolve(process.env.UPLOAD_DIR || "./uploads");
}

/**
 * Converte qualquer foto (HEIC/HDR/Display P3/gain map do iPhone) para SDR sRGB.
 * Remove ICC/metadata que fazem o Safari iOS “queimar” no print da tela.
 */
export async function encodeSdrSrgb(
  input: Buffer,
  format: "jpeg" | "webp" | "png" = "jpeg"
): Promise<Buffer> {
  let pipeline = sharp(input, { failOn: "none", unlimited: true })
    .rotate()
    .toColourspace("srgb");

  // Leve contenção de highlights — prints HDR no iPhone estouram o branco
  pipeline = pipeline.modulate({ brightness: 0.97, saturation: 0.98 });

  if (format === "png") {
    return pipeline.png({ compressionLevel: 8 }).toBuffer();
  }
  if (format === "webp") {
    return pipeline.webp({ quality: 88, effort: 4 }).toBuffer();
  }
  return pipeline
    .jpeg({ quality: 90, mozjpeg: true, chromaSubsampling: "4:2:0" })
    .toBuffer();
}

function looksLikeHeic(buf: Buffer, originalName: string) {
  const ext = path.extname(originalName).toLowerCase();
  if (ext === ".heic" || ext === ".heif") return true;
  // ISO BMFF: ftyp....heic / heif / mif1 / msf1
  if (buf.length < 12) return false;
  const brand = buf.slice(8, 12).toString("ascii");
  return ["heic", "heif", "mif1", "msf1", "heim", "heis"].includes(brand);
}

/** Converte buffer (incl. HEIC do iPhone) para JPEG via sharp ou ffmpeg */
export async function decodeToProcessableBuffer(
  file: Buffer,
  originalName: string
): Promise<{ buffer: Buffer; ext: string }> {
  const heic = looksLikeHeic(file, originalName);

  try {
    const buffer = await encodeSdrSrgb(file, "jpeg");
    return { buffer, ext: ".jpg" };
  } catch (sharpErr) {
    if (!heic) {
      const ext = path.extname(originalName).toLowerCase() || ".jpg";
      if (
        [".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif", ".tif", ".tiff"].includes(
          ext
        )
      ) {
        return { buffer: file, ext };
      }
      throw sharpErr;
    }
  }

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "majeste-img-"));
  const inExt = path.extname(originalName).toLowerCase() || ".heic";
  const inPath = path.join(tmpDir, `in${inExt}`);
  const outPath = path.join(tmpDir, "out.jpg");
  try {
    await fs.writeFile(inPath, file);
    await execFileAsync(
      "ffmpeg",
      ["-y", "-i", inPath, "-frames:v", "1", "-q:v", "2", outPath],
      { timeout: 60_000 }
    );
    const raw = await fs.readFile(outPath);
    if (!raw.length) {
      throw new Error("Conversão HEIC vazia");
    }
    const buffer = await encodeSdrSrgb(raw, "jpeg");
    return { buffer, ext: ".jpg" };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(
      `Não foi possível ler a foto do iPhone (HEIC). Tente “Mais compatível” nas Ajustes da Câmera ou envie JPG/PNG. (${msg.slice(0, 120)})`
    );
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

export async function processAndSaveImage(
  file: Buffer,
  originalName: string,
  folder:
    | "products"
    | "media"
    | "avatars"
    | "looks"
    | "progress"
    | "instagram" = "products"
) {
  const id = randomUUID();
  const baseDir = path.join(uploadRoot(), folder, id);
  await fs.mkdir(baseDir, { recursive: true });

  const decoded = await decodeToProcessableBuffer(file, originalName);
  const work = decoded.buffer;
  const originalExt = decoded.ext;

  const originalPath = path.join(baseDir, `original${originalExt}`);
  await fs.writeFile(originalPath, work);

  if (
    looksLikeHeic(file, originalName) &&
    originalExt !== path.extname(originalName).toLowerCase()
  ) {
    const rawExt = path.extname(originalName).toLowerCase() || ".heic";
    await fs
      .writeFile(path.join(baseDir, `source${rawExt}`), file)
      .catch(() => {});
  }

  const meta = await sharp(work, { failOn: "none" }).metadata();
  const variants: { width: number; format: string; path: string; url: string }[] =
    [];

  const targetWidths = [...SIZES].filter(
    (width) => !meta.width || meta.width >= width
  );
  if (targetWidths.length === 0) {
    targetWidths.push(400);
  }

  for (const width of targetWidths) {
    const filename = `${width}.webp`;
    const outPath = path.join(baseDir, filename);
    // Força sRGB SDR — fotos de iPhone (HEIC/HDR/P3) no Safari “queimam” em HDR
    await sharp(work, { failOn: "none" })
      .rotate()
      .toColourspace("srgb")
      .modulate({ brightness: 0.97, saturation: 0.98 })
      .resize({
        width,
        withoutEnlargement: true,
        kernel: sharp.kernel.lanczos3,
      })
      .webp({ quality: 88, effort: 4 })
      .toFile(outPath);
    variants.push({
      width,
      format: "webp",
      path: outPath,
      url: `/uploads/${folder}/${id}/${filename}`,
    });
  }

  const primary =
    variants.find((v) => v.format === "webp" && v.width === 800) ||
    variants.find((v) => v.format === "webp") ||
    variants[0];

  const thumb =
    variants.find((v) => v.format === "webp" && v.width === 400) || primary;

  if (!primary?.url) {
    throw new Error("Falha ao gerar a imagem otimizada (WebP).");
  }

  return {
    id,
    originalUrl: `/uploads/${folder}/${id}/original${originalExt}`,
    url: primary.url,
    thumbUrl: thumb?.url || primary.url,
    width: meta.width || null,
    height: meta.height || null,
    variants,
  };
}

/** Canvas padrão das modelos no banner (todas com a mesma “altura útil”) */
export const CUTOUT_CANVAS = { width: 900, height: 1600 } as const;

/**
 * Salva PNG transparente padronizado: mesma altura de canvas,
 * pessoa alinhada embaixo e centralizada. Assim todas as modelos
 * ficam no mesmo padrão visual no layout cutouts.
 */
export async function processAndSaveCutout(
  file: Buffer,
  originalName = "cutout.png"
) {
  const id = randomUUID();
  const baseDir = path.join(uploadRoot(), "media", id);
  await fs.mkdir(baseDir, { recursive: true });

  const { width: cw, height: ch } = CUTOUT_CANVAS;
  const maxPersonH = Math.round(ch * 0.94);

  let input = file;
  if (looksLikeHeic(file, originalName)) {
    try {
      const decoded = await decodeToProcessableBuffer(file, originalName);
      input = decoded.buffer;
    } catch {
      /* tenta o buffer original */
    }
  }

  const cleaned = await refineCutoutAlpha(input).catch(() => input);

  const trimmed = await sharp(cleaned)
    .rotate()
    .toColourspace("srgb")
    .ensureAlpha()
    .trim({ threshold: 12 })
    .toBuffer()
    .catch(() =>
      sharp(cleaned).rotate().toColourspace("srgb").ensureAlpha().toBuffer()
    );

  const resized = await sharp(trimmed)
    .resize({
      height: maxPersonH,
      width: cw,
      fit: "inside",
      withoutEnlargement: false,
      kernel: sharp.kernel.lanczos3,
    })
    .png()
    .toBuffer({ resolveWithObject: true });

  const refinedResize = await refineCutoutAlpha(resized.data).catch(
    () => resized.data
  );
  const refinedMeta = await sharp(refinedResize).metadata();
  const rw = refinedMeta.width || resized.info.width;
  const rh = refinedMeta.height || resized.info.height;

  const left = Math.max(0, Math.round((cw - rw) / 2));
  const top = Math.max(0, ch - rh);

  const outPath = path.join(baseDir, "cutout.png");
  await sharp({
    create: {
      width: cw,
      height: ch,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: refinedResize, left, top }])
    .png({ compressionLevel: 8 })
    .toFile(outPath);

  const thumbPath = path.join(baseDir, "cutout-400.webp");
  await sharp(outPath)
    .resize({ width: 400, withoutEnlargement: true })
    .webp({ quality: 90, alphaQuality: 100 })
    .toFile(thumbPath);

  const url = `/uploads/media/${id}/cutout.png`;
  return {
    id,
    url,
    thumbUrl: `/uploads/media/${id}/cutout-400.webp`,
    originalUrl: url,
    width: cw,
    height: ch,
    variants: [],
    sourceName: originalName,
  };
}

export async function ensureUploadDirs() {
  await fs.mkdir(path.join(uploadRoot(), "products"), { recursive: true });
  await fs.mkdir(path.join(uploadRoot(), "media"), { recursive: true });
  await fs.mkdir(path.join(uploadRoot(), "avatars"), { recursive: true });
  await fs.mkdir(path.join(uploadRoot(), "looks"), { recursive: true });
  await fs.mkdir(path.join(uploadRoot(), "progress"), { recursive: true });
  await fs.mkdir(path.join(uploadRoot(), "instagram"), { recursive: true });
  await fs.mkdir(path.join(uploadRoot(), "products-sdr"), { recursive: true });
}

