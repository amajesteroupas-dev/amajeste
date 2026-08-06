/** Cliente: remove fundo da foto e sobe PNG padronizado */

function isLightMatte(r: number, g: number, b: number, a: number) {
  if (a < 12) return false;
  const lum = (r + g + b) / 3;
  const sat = Math.max(r, g, b) - Math.min(r, g, b);
  return lum >= 188 && sat <= 55 && r >= 175 && g >= 170;
}

async function refineInBrowser(blob: Blob): Promise<Blob> {
  const bmp = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = bmp.width;
  canvas.height = bmp.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return blob;
  ctx.drawImage(bmp, 0, 0);
  bmp.close();

  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  const w = canvas.width;
  const h = canvas.height;
  const n = w * h;

  for (let i = 0; i < d.length; i += 4) {
    const a = d[i + 3];
    if (a < 30) {
      d[i] = 0;
      d[i + 1] = 0;
      d[i + 2] = 0;
      d[i + 3] = 0;
      continue;
    }
    const lum = (d[i] + d[i + 1] + d[i + 2]) / 3;
    const sat = Math.max(d[i], d[i + 1], d[i + 2]) - Math.min(d[i], d[i + 1], d[i + 2]);
    // Franja clara residual do estúdio
    if (a < 230 && lum >= 185 && sat <= 55) {
      d[i] = 0;
      d[i + 1] = 0;
      d[i + 2] = 0;
      d[i + 3] = 0;
      continue;
    }
    // Halo escuro / resto de fundo
    if (a < 130 && lum < 60) {
      d[i] = 0;
      d[i + 1] = 0;
      d[i + 2] = 0;
      d[i + 3] = 0;
      continue;
    }
    if (a > 230) {
      d[i + 3] = 255;
      continue;
    }
    const t = (a - 30) / (230 - 30);
    d[i + 3] = Math.round(40 + t * t * 215);
  }

  // Flood: remove caixa bege/branca ligada ao fundo transparente
  const remove = new Uint8Array(n);
  const stack: number[] = [];
  const mark = (p: number) => {
    if (remove[p]) return;
    remove[p] = 1;
    stack.push(p);
  };
  for (let p = 0; p < n; p++) {
    if (d[p * 4 + 3] < 28) mark(p);
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
      const a = d[i + 3];
      if (a < 28 || isLightMatte(d[i], d[i + 1], d[i + 2], a)) mark(q);
    }
  }
  for (let p = 0; p < n; p++) {
    if (!remove[p]) continue;
    const i = p * 4;
    if (d[i + 3] < 28 || isLightMatte(d[i], d[i + 1], d[i + 2], d[i + 3])) {
      d[i] = 0;
      d[i + 1] = 0;
      d[i + 2] = 0;
      d[i + 3] = 0;
    }
  }

  ctx.putImageData(img, 0, 0);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Falha ao limpar recorte"))),
      "image/png"
    );
  });
}

export async function removeBackgroundFromBlob(
  input: Blob,
  onProgress?: (msg: string) => void
): Promise<Blob> {
  onProgress?.("Carregando modelo de IA (qualidade alta)…");
  const { removeBackground } = await import("@imgly/background-removal");

  onProgress?.("Recortando o fundo (só o corpo)…");
  const raw = await removeBackground(input, {
    model: "isnet",
    output: { format: "image/png", quality: 1 },
    rescale: true,
    progress: (_key, current, total) => {
      if (!total) return;
      const pct = Math.round((current / total) * 100);
      onProgress?.(`Recortando… ${pct}%`);
    },
  });

  onProgress?.("Limpando bordas do recorte…");
  return refineInBrowser(raw);
}

export async function removeBackgroundFromUrl(
  imageUrl: string,
  onProgress?: (msg: string) => void
): Promise<Blob> {
  onProgress?.("Baixando foto…");
  const res = await fetch(imageUrl, { cache: "no-store" });
  if (!res.ok) {
    throw new Error("Não foi possível carregar a imagem para recorte.");
  }
  const input = await res.blob();
  return removeBackgroundFromBlob(input, onProgress);
}

/** Só padroniza tamanho (já transparente ou com fundo) */
export async function normalizeCutoutFromUrl(imageUrl: string): Promise<{
  url: string;
  thumbUrl: string;
}> {
  const res = await fetch(imageUrl, { cache: "no-store" });
  if (!res.ok) throw new Error("Falha ao carregar imagem");
  const blob = await res.blob();
  return uploadCutoutBlob(blob, "padronizada.png");
}

export async function uploadCutoutBlob(
  blob: Blob,
  filename = "cutout.png"
): Promise<{ url: string; thumbUrl: string; id?: string }> {
  const form = new FormData();
  form.append("file", new File([blob], filename, { type: "image/png" }));
  form.append("mode", "cutout");
  form.append("alt", "Modelo recortada");
  const res = await fetch("/api/admin/media", { method: "POST", body: form });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Falha ao salvar recorte");
  }
  return {
    id: data.id as string | undefined,
    url: data.url as string,
    thumbUrl: (data.thumbUrl || data.url) as string,
  };
}

export async function cutoutFromUrl(
  imageUrl: string,
  onProgress?: (msg: string) => void
): Promise<{ url: string; thumbUrl: string; id?: string }> {
  const blob = await removeBackgroundFromUrl(imageUrl, onProgress);
  onProgress?.("Padronizando tamanho…");
  return uploadCutoutBlob(blob);
}

export async function cutoutFromFile(
  file: File,
  onProgress?: (msg: string) => void
): Promise<{ url: string; thumbUrl: string; id?: string }> {
  const blob = await removeBackgroundFromBlob(file, onProgress);
  onProgress?.("Padronizando tamanho…");
  return uploadCutoutBlob(blob, file.name.replace(/\.\w+$/, "") + "-cutout.png");
}
