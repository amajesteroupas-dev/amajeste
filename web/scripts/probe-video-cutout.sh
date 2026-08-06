#!/bin/sh
set -e
cd /tmp
rm -rf fftest
mkdir fftest
cd fftest
# 1x1 transparent-ish PNG via printf hex is hard; use ffmpeg lavfi
ffmpeg -y -f lavfi -i color=c=red@0.5:s=64x64:d=0.5 -frames:v 1 frame_0001.png 2>/tmp/ff1.txt || true
ffmpeg -y -f lavfi -i color=c=blue@0.5:s=64x64:d=0.5 -frames:v 1 frame_0002.png 2>/tmp/ff2.txt || true
ls -la
echo "=== VP9 yuva ==="
ffmpeg -y -framerate 2 -i frame_%04d.png -c:v libvpx-vp9 -pix_fmt yuva420p -auto-alt-ref 0 -b:v 0 -crf 32 -an out.webm 2>/tmp/vp9.txt
echo VP9_EXIT:$?
tail -5 /tmp/vp9.txt
ls -la out.webm 2>/dev/null || true
echo "=== WEBP ==="
ffmpeg -y -framerate 2 -i frame_%04d.png -loop 0 -c:v libwebp -lossless 0 -q:v 80 -an out.webp 2>/tmp/webp.txt
echo WEBP_EXIT:$?
tail -5 /tmp/webp.txt
ls -la out.webp 2>/dev/null || true
echo "=== GIF ==="
ffmpeg -y -framerate 2 -i frame_%04d.png -loop 0 out.gif 2>/tmp/gif.txt
echo GIF_EXIT:$?
ls -la out.gif 2>/dev/null || true
echo "=== prisma kind ==="
cd /app
node <<'NODE'
const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
(async () => {
  try {
    const cols = await p.$queryRawUnsafe(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'VideoAsset' ORDER BY 1"
    );
    console.log("COLS", cols);
  } catch (e) {
    console.error("COL_ERR", e.message);
  }
  try {
    const row = await p.videoAsset.create({
      data: {
        url: "/uploads/video-cutout-bank/_probe/playable.webm",
        title: "_probe",
        platform: "cutout",
        kind: "cutout",
        bytes: 1,
      },
    });
    console.log("CREATE_OK", row.id);
    await p.videoAsset.delete({ where: { id: row.id } });
    console.log("DELETE_OK");
  } catch (e) {
    console.error("CREATE_ERR", e.message);
  }
  await p.$disconnect();
})();
NODE
