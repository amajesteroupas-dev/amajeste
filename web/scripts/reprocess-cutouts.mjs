/**
 * Reprocessa cutout.png: remove fundo claro residual (caixa bege/branca).
 * Uso no container: UPLOAD_DIR=/app/uploads node scripts/reprocess-cutouts.mjs
 */
import fs from "fs/promises";
import path from "path";
import sharp from "sharp";

function isLightMatte(r, g, b, a) {
  if (a < 12) return false;
  const lum = (r + g + b) / 3;
  const sat = Math.max(r, g, b) - Math.min(r, g, b);
  return lum >= 188 && sat <= 55 && r >= 175 && g >= 170;
}

async function refineCutoutAlpha(input) {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = info.width;
  const h = info.height;
  const px = Buffer.from(data);
  const n = w * h;

  for (let i = 0; i < px.length; i += 4) {
    const a = px[i + 3];
    if (a < 28) {
      px[i] = 0;
      px[i + 1] = 0;
      px[i + 2] = 0;
      px[i + 3] = 0;
      continue;
    }
    const lum = (px[i] + px[i + 1] + px[i + 2]) / 3;
    const sat =
      Math.max(px[i], px[i + 1], px[i + 2]) -
      Math.min(px[i], px[i + 1], px[i + 2]);
    if (a < 230 && lum >= 185 && sat <= 55) {
      px[i] = 0;
      px[i + 1] = 0;
      px[i + 2] = 0;
      px[i + 3] = 0;
      continue;
    }
    if (a < 120 && lum < 55) {
      px[i] = 0;
      px[i + 1] = 0;
      px[i + 2] = 0;
      px[i + 3] = 0;
      continue;
    }
    if (a > 235) {
      px[i + 3] = 255;
      continue;
    }
    const t = (a - 28) / (235 - 28);
    px[i + 3] = Math.round(28 + t * t * (255 - 28));
  }

  const remove = new Uint8Array(n);
  const stack = [];
  const mark = (p) => {
    if (remove[p]) return;
    remove[p] = 1;
    stack.push(p);
  };
  for (let p = 0; p < n; p++) {
    if (px[p * 4 + 3] < 28) mark(p);
  }
  while (stack.length) {
    const p = stack.pop();
    const x = p % w;
    const y = (p / w) | 0;
    const neigh = [
      x > 0 ? p - 1 : -1,
      x < w - 1 ? p + 1 : -1,
      y > 0 ? p - w : -1,
      y < h - 1 ? p + w : -1,
    ];
    for (const q of neigh) {
      if (q < 0 || remove[q]) continue;
      const i = q * 4;
      const a = px[i + 3];
      if (a < 28 || isLightMatte(px[i], px[i + 1], px[i + 2], a)) mark(q);
    }
  }
  for (let p = 0; p < n; p++) {
    if (!remove[p]) continue;
    const i = p * 4;
    if (px[i + 3] < 28 || isLightMatte(px[i], px[i + 1], px[i + 2], px[i + 3])) {
      px[i] = 0;
      px[i + 1] = 0;
      px[i + 2] = 0;
      px[i + 3] = 0;
    }
  }

  const out = Buffer.from(px);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = (y * w + x) * 4;
      const a = px[i + 3];
      if (a === 0 || a > 180) continue;
      let opaqueN = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const j = ((y + dy) * w + (x + dx)) * 4;
          if (px[j + 3] > 160) opaqueN += 1;
        }
      }
      if (opaqueN <= 1) {
        out[i] = 0;
        out[i + 1] = 0;
        out[i + 2] = 0;
        out[i + 3] = 0;
      }
    }
  }

  return sharp(out, { raw: { width: w, height: h, channels: 4 } })
    .png({ compressionLevel: 8 })
    .toBuffer();
}

async function walkCutouts(dir) {
  const out = [];
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walkCutouts(full)));
    else if (e.name === "cutout.png") out.push(full);
  }
  return out;
}

const root = path.resolve(process.env.UPLOAD_DIR || "./uploads");
const media = path.join(root, "media");
console.log("Scanning", media);
const files = await walkCutouts(media);
console.log("Found", files.length, "cutouts");

let ok = 0;
let fail = 0;
for (const file of files) {
  try {
    const input = await fs.readFile(file);
    const cleaned = await refineCutoutAlpha(input);
    await sharp(cleaned).png({ compressionLevel: 8 }).toFile(file);
    const thumb = path.join(path.dirname(file), "cutout-400.webp");
    await sharp(file)
      .resize({ width: 400, withoutEnlargement: true })
      .webp({ quality: 90, alphaQuality: 100 })
      .toFile(thumb);
    ok++;
    console.log("OK", path.relative(root, file));
  } catch (e) {
    fail++;
    console.error("FAIL", file, e);
  }
}
console.log(JSON.stringify({ ok, fail, total: files.length }));
