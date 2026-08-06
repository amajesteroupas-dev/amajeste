/**
 * Gera ícones PWA a partir da logo marca (brand/logo-hq.png).
 * Uso: node scripts/generate-pwa-icons.mjs
 */
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const logoPath = path.join(root, "public", "brand", "logo.png");
const outDir = path.join(root, "public");

async function makeIcon(size, outName) {
  const pad = Math.round(size * 0.12);
  const inner = size - pad * 2;

  const bg = await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 26, g: 22, b: 18, alpha: 1 },
    },
  })
    .png()
    .toBuffer();

  const logo = await sharp(logoPath)
    .resize(inner, inner, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  const borderSvg = Buffer.from(`
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="${size}" y2="${size}">
          <stop offset="0%" stop-color="#f0dfa8"/>
          <stop offset="50%" stop-color="#c9a24a"/>
          <stop offset="100%" stop-color="#8a6a28"/>
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="${size - 4}" height="${size - 4}" rx="${Math.round(size * 0.18)}"
        fill="none" stroke="url(#g)" stroke-width="${Math.max(2, Math.round(size * 0.012))}" opacity="0.65"/>
    </svg>
  `);

  await sharp(bg)
    .composite([
      { input: logo, top: pad, left: pad },
      { input: await sharp(borderSvg).png().toBuffer(), top: 0, left: 0 },
    ])
    .png()
    .toFile(path.join(outDir, outName));

  console.log("OK", outName, `${size}x${size}`);
}

await makeIcon(192, "icon-192.png");
await makeIcon(512, "icon-512.png");
await makeIcon(180, "apple-touch-icon.png");
console.log("Ícones PWA gerados com a logo marca.");
