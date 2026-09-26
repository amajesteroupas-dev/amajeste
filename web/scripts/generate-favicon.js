const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const toIco = require("to-ico");

const root = path.join(__dirname, "..");
const tabSvg = fs.readFileSync(path.join(root, "public/favicon.svg"));
const appSvg = fs.readFileSync(path.join(root, "public/favicon-app.svg"));

async function pngFrom(svg, size) {
  return sharp(svg).resize(size, size).png().toBuffer();
}

async function writePng(svg, size, out) {
  await sharp(svg).resize(size, size).png().toFile(out);
  console.log("wrote", path.relative(root, out));
}

async function main() {
  await writePng(tabSvg, 16, path.join(root, "public/favicon-16x16.png"));
  await writePng(tabSvg, 32, path.join(root, "public/favicon-32x32.png"));
  await writePng(tabSvg, 48, path.join(root, "public/favicon-48x48.png"));
  await writePng(appSvg, 180, path.join(root, "public/apple-touch-icon.png"));
  await writePng(appSvg, 192, path.join(root, "public/icon-192.png"));
  await writePng(appSvg, 512, path.join(root, "public/icon-512.png"));

  const ico = await toIco([
    await pngFrom(tabSvg, 16),
    await pngFrom(tabSvg, 32),
    await pngFrom(tabSvg, 48),
  ]);
  fs.writeFileSync(path.join(root, "public/favicon.ico"), ico);
  fs.writeFileSync(path.join(root, "src/app/favicon.ico"), ico);
  console.log("ico bytes", ico.length, "magic", ico.slice(0, 4).toString("hex"));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
