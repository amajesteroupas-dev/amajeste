/**
 * Converte AVIFs existentes para WebP sRGB (evita HDR “queimado” no Safari iOS).
 * Uso no container: node scripts/reencode-avif-to-webp.mjs
 */
import fs from "fs/promises";
import path from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const sharp = require("sharp");

const root = process.env.UPLOAD_DIR || "/app/uploads";

async function walk(dir, out = []) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) await walk(full, out);
    else if (e.isFile() && e.name.toLowerCase().endsWith(".avif")) out.push(full);
  }
  return out;
}

async function main() {
  const files = await walk(root);
  console.log(`Found ${files.length} AVIF files under ${root}`);
  let ok = 0;
  let fail = 0;
  for (const file of files) {
    const dest = file.replace(/\.avif$/i, ".webp");
    try {
      await sharp(file)
        .rotate()
        .toColourspace("srgb")
        .webp({ quality: 88, effort: 4 })
        .toFile(dest);
      ok++;
      console.log("ok", path.relative(root, dest));
    } catch (e) {
      fail++;
      console.error("fail", file, e instanceof Error ? e.message : e);
    }
  }
  console.log(`Done. ok=${ok} fail=${fail}`);
}

main();
