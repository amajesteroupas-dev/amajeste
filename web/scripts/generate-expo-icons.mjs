/**
 * Gera ícones e splash do app Expo a partir da logo marca.
 * Uso (na pasta web): node scripts/generate-expo-icons.mjs
 */
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.join(__dirname, "..");
const logoPath = path.join(webRoot, "public", "brand", "logo.png");
const outDir = path.join(webRoot, "..", "mobile", "assets", "images");

const BG = { r: 26, g: 22, b: 18, alpha: 1 };

fs.mkdirSync(outDir, { recursive: true });

async function solidIcon(size, outName, { border = true } = {}) {
  const pad = Math.round(size * 0.12);
  const inner = size - pad * 2;
  const bg = await sharp({
    create: { width: size, height: size, channels: 4, background: BG },
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

  const layers = [{ input: logo, top: pad, left: pad }];

  if (border) {
    const borderSvg = Buffer.from(`
      <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="${size}" y2="${size}">
            <stop offset="0%" stop-color="#f0dfa8"/>
            <stop offset="50%" stop-color="#c9a24a"/>
            <stop offset="100%" stop-color="#8a6a28"/>
          </linearGradient>
        </defs>
        <rect x="2" y="2" width="${size - 4}" height="${size - 4}"
          rx="${Math.round(size * 0.18)}" fill="none" stroke="url(#g)"
          stroke-width="${Math.max(2, Math.round(size * 0.012))}" opacity="0.65"/>
      </svg>
    `);
    layers.push({
      input: await sharp(borderSvg).png().toBuffer(),
      top: 0,
      left: 0,
    });
  }

  await sharp(bg)
    .composite(layers)
    .png()
    .toFile(path.join(outDir, outName));
  console.log("OK", outName, `${size}x${size}`);
}

/** Adaptive icon foreground: logo em fundo transparente (safe zone ~66%). */
async function adaptiveForeground(size, outName) {
  const pad = Math.round(size * 0.18);
  const inner = size - pad * 2;
  const transparent = await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
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

  await sharp(transparent)
    .composite([{ input: logo, top: pad, left: pad }])
    .png()
    .toFile(path.join(outDir, outName));
  console.log("OK", outName, `${size}x${size} (transparent)`);
}

async function solidBg(size, outName) {
  await sharp({
    create: { width: size, height: size, channels: 4, background: BG },
  })
    .png()
    .toFile(path.join(outDir, outName));
  console.log("OK", outName, `${size}x${size} bg`);
}

await solidIcon(1024, "icon.png");
await solidIcon(512, "splash-icon.png", { border: false });
await adaptiveForeground(1024, "android-icon-foreground.png");
await solidBg(1024, "android-icon-background.png");
await solidIcon(48, "favicon.png", { border: false });

// Logo limpa para a tela de entrada do app
await sharp(logoPath)
  .resize(512, 512, {
    fit: "contain",
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .png()
  .toFile(path.join(outDir, "logo.png"));
console.log("OK logo.png");

console.log("Ícones Expo gerados em mobile/assets/images/");
