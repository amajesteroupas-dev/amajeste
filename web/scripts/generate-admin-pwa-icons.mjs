/**
 * Ícones distintos do PWA do painel (selo ADMIN).
 * Uso: node scripts/generate-admin-pwa-icons.mjs
 */
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const logoPath = path.join(root, "public", "brand", "logo.png");
const outDir = path.join(root, "public");
const BG = { r: 26, g: 22, b: 18, alpha: 1 };

async function makeAdminIcon(size, outName) {
  const pad = Math.round(size * 0.12);
  const badgeH = Math.round(size * 0.17);
  const logoArea = size - pad * 2 - Math.round(badgeH * 0.65);
  const logoSize = Math.max(32, logoArea);

  const bg = await sharp({
    create: { width: size, height: size, channels: 4, background: BG },
  })
    .png()
    .toBuffer();

  const logo = await sharp(logoPath)
    .resize(logoSize, logoSize, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  const badgeY = size - badgeH - Math.round(size * 0.07);
  const fontSize = Math.max(10, Math.round(size * 0.085));
  const badgeSvg = Buffer.from(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="${size}" y2="0">
          <stop offset="0%" stop-color="#f0dfa8"/>
          <stop offset="100%" stop-color="#c9a24a"/>
        </linearGradient>
      </defs>
      <rect x="${Math.round(size * 0.14)}" y="${badgeY}"
        width="${Math.round(size * 0.72)}" height="${badgeH}"
        rx="${Math.round(badgeH / 2)}" fill="url(#g)"/>
      <text x="50%" y="${badgeY + badgeH / 2 + fontSize * 0.08}"
        text-anchor="middle" dominant-baseline="middle"
        font-family="Arial, Helvetica, sans-serif" font-weight="700"
        font-size="${fontSize}" letter-spacing="${Math.round(size * 0.018)}"
        fill="#1a1612">ADMIN</text>
      <rect x="2" y="2" width="${size - 4}" height="${size - 4}"
        rx="${Math.round(size * 0.18)}" fill="none" stroke="#c9a24a"
        stroke-width="${Math.max(2, Math.round(size * 0.012))}" opacity="0.55"/>
    </svg>`
  );

  const logoTop = Math.round((badgeY - logoSize) / 2);
  await sharp(bg)
    .composite([
      {
        input: logo,
        top: Math.max(pad, logoTop),
        left: Math.round((size - logoSize) / 2),
      },
      { input: await sharp(badgeSvg).png().toBuffer(), top: 0, left: 0 },
    ])
    .png()
    .toFile(path.join(outDir, outName));

  console.log("OK", outName, `${size}x${size}`);
}

await makeAdminIcon(180, "admin-apple-touch-icon.png");
await makeAdminIcon(192, "admin-icon-192.png");
await makeAdminIcon(512, "admin-icon-512.png");
console.log("Ícones do painel gerados.");
