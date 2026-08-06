import sharp from "sharp";

/** Neutro claro típico de fundo de estúdio / piso restante no PNG */
function isLightMatte(r: number, g: number, b: number, a: number) {
  if (a < 12) return false;
  const lum = (r + g + b) / 3;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const sat = max - min;
  // Areia / branco / pêssego claro do estúdio (inclusive quase opaco)
  return lum >= 188 && sat <= 55 && r >= 175 && g >= 170;
}

/**
 * Limpa franja/halo do recorte e remove “caixa” bege/branca residual
 * do fundo de estúdio (flood a partir do transparente).
 * Para em roupa/pele/sombra — não é matte claro.
 */
export async function refineCutoutAlpha(input: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = info.width;
  const h = info.height;
  const px = Buffer.from(data);
  const n = w * h;

  // Pass 1: limiar de alpha + halo / franja clara semi-transparente
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

    // Franja clara (resto de estúdio com alpha intermediário)
    if (a < 230 && lum >= 185 && sat <= 55) {
      px[i] = 0;
      px[i + 1] = 0;
      px[i + 2] = 0;
      px[i + 3] = 0;
      continue;
    }
    // Halo escuro semi-transparente
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

  // Pass 2: flood-fill de matte claro a partir do transparente
  const remove = new Uint8Array(n);
  const stack: number[] = [];
  const mark = (p: number) => {
    if (remove[p]) return;
    remove[p] = 1;
    stack.push(p);
  };

  for (let p = 0; p < n; p++) {
    if (px[p * 4 + 3] < 28) mark(p);
  }

  while (stack.length) {
    const p = stack.pop()!;
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
      if (a < 28) {
        mark(q);
        continue;
      }
      if (isLightMatte(px[i], px[i + 1], px[i + 2], a)) {
        mark(q);
      }
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

  // Pass 3: remove pixels isolados de baixa alpha (ruído)
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
