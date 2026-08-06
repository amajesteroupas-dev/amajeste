"use client";

import { IG_FORMATS, type IgFormat } from "@/components/admin/MarketingPreviews";

export function absoluteSiteUrl(pathOrUrl: string) {
  const raw = String(pathOrUrl || "").trim();
  if (!raw) {
    return (
      (typeof window !== "undefined" ? window.location.origin : "") ||
      "https://equilibra.tech"
    );
  }
  if (/^https?:\/\//i.test(raw)) return raw;
  const origin =
    (typeof window !== "undefined" ? window.location.origin : "") ||
    "https://equilibra.tech";
  return `${origin}${raw.startsWith("/") ? raw : `/${raw}`}`;
}

function slugifyFilename(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  const abs = absoluteSiteUrl(src);
  const proxy = `/api/admin/marketing/image-proxy?url=${encodeURIComponent(abs)}`;

  return fetch(proxy, { credentials: "same-origin" })
    .then(async (res) => {
      if (!res.ok) throw new Error("Falha ao carregar imagem da arte");
      return res.blob();
    })
    .then(
      (blob) =>
        new Promise<HTMLImageElement>((resolve, reject) => {
          const objectUrl = URL.createObjectURL(blob);
          const img = new Image();
          img.onload = () => {
            URL.revokeObjectURL(objectUrl);
            resolve(img);
          };
          img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error("Falha ao carregar imagem da arte"));
          };
          img.src = objectUrl;
        })
    );
}

/** Desenha a marca Majesté (coroa + wordmark) — não depende do SVG no canvas. */
function drawBrandMark(
  ctx: CanvasRenderingContext2D,
  cx: number,
  top: number,
  scale = 1
) {
  const s = scale;
  ctx.save();
  ctx.translate(cx, top);

  const boxW = 360 * s;
  const boxH = 158 * s;
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  roundRect(ctx, -boxW / 2, -10 * s, boxW, boxH, 44 * s);
  ctx.fill();

  const gold = ctx.createLinearGradient(0, 0, 0, 70 * s);
  gold.addColorStop(0, "#f3e4b0");
  gold.addColorStop(0.45, "#d4af5a");
  gold.addColorStop(1, "#8f6f2c");
  ctx.strokeStyle = gold;
  ctx.fillStyle = gold;
  ctx.lineWidth = 2.4 * s;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  ctx.beginPath();
  ctx.moveTo(-36 * s, 42 * s);
  ctx.lineTo(-24 * s, 10 * s);
  ctx.lineTo(-12 * s, 26 * s);
  ctx.lineTo(0, 2 * s);
  ctx.lineTo(12 * s, 26 * s);
  ctx.lineTo(24 * s, 10 * s);
  ctx.lineTo(36 * s, 42 * s);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-42 * s, 46 * s);
  ctx.lineTo(42 * s, 46 * s);
  ctx.stroke();

  for (const [x, y, r] of [
    [-24, 8, 3.2],
    [0, 0, 3.6],
    [24, 8, 3.2],
  ] as const) {
    ctx.beginPath();
    ctx.arc(x * s, y * s, r * s, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.font = `500 ${44 * s}px Georgia, 'Times New Roman', serif`;
  ctx.fillStyle = gold;
  ctx.fillText("Majesté", 0, 98 * s);

  ctx.font = `600 ${12 * s}px system-ui, sans-serif`;
  ctx.fillStyle = "#c9a24a";
  ctx.fillText("F I T N E S S", 0, 122 * s);

  ctx.restore();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
      if (lines.length >= maxLines) break;
    } else {
      line = test;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  if (words.length && lines.length === maxLines) {
    const last = lines[maxLines - 1];
    if (ctx.measureText(last).width > maxWidth * 0.95) {
      lines[maxLines - 1] = `${last.replace(/\s+\S+$/, "")}…`;
    }
  }
  return lines;
}

/** E-mail HTML com botão/link clicáveis para o produto. */
export function downloadEmailHtmlArt(opts: {
  title: string;
  body: string;
  imageUrl: string;
  ctaLabel: string;
  ctaHref: string;
}) {
  const site = absoluteSiteUrl("/");
  const img = opts.imageUrl ? absoluteSiteUrl(opts.imageUrl) : "";
  const href = absoluteSiteUrl(opts.ctaHref || "/");
  const paragraphs = (opts.body || "")
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map(
      (p) =>
        `<p style="margin:0 0 14px;font-size:15px;line-height:1.55;color:#5c534c;">${escapeHtml(p)}</p>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:24px;background:#f4f1ec;font-family:Georgia,serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center">
      <table role="presentation" width="560" style="max-width:560px;width:100%;background:#fff;border:1px solid #e8e0d6;">
        <tr><td style="padding:28px;text-align:center;">
          <div style="font-size:28px;color:#c2a45b;">Majesté</div>
          <div style="font-family:system-ui,sans-serif;font-size:10px;letter-spacing:0.35em;color:#a8842f;margin-top:6px;">FITNESS</div>
        </td></tr>
        ${
          img
            ? `<tr><td style="padding:0 16px;"><a href="${escapeAttr(href)}" target="_blank" rel="noopener"><img src="${escapeAttr(img)}" alt="${escapeAttr(opts.title)}" width="528" style="display:block;width:100%;height:auto;border:0;"/></a></td></tr>`
            : ""
        }
        <tr><td style="padding:20px 28px;">
          <h1 style="margin:0 0 12px;font-size:22px;color:#2a2420;">${escapeHtml(opts.title || "Majesté")}</h1>
          ${paragraphs}
          <div style="text-align:center;padding:12px 0 8px;">
            <a href="${escapeAttr(href)}" target="_blank" rel="noopener" style="display:inline-block;background:#a85f64;color:#fff;text-decoration:none;padding:14px 28px;font-family:system-ui,sans-serif;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;">${escapeHtml(opts.ctaLabel || "Ver produto")}</a>
          </div>
        </td></tr>
        <tr><td style="padding:16px 28px;border-top:1px solid #eee6dc;font-family:system-ui,sans-serif;font-size:11px;color:#9a8f86;text-align:center;">
          <a href="${escapeAttr(href)}" style="color:#95752c;text-decoration:none;">Abrir na loja</a>
          · ${escapeHtml(site.replace(/^https?:\/\//, ""))}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  triggerDownload(
    blob,
    `majeste-email-${slugifyFilename(opts.title || "arte")}.html`
  );
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
function escapeAttr(s: string) {
  return escapeHtml(s).replace(/'/g, "&#39;");
}

/** PNG no tamanho oficial do Instagram. Link do produto é copiado para o sticker. */
export async function downloadInstagramPngArt(opts: {
  format: IgFormat;
  title: string;
  body: string;
  imageUrl: string;
  ctaLabel: string;
  ctaHref: string;
  hashtags?: string;
  showLogo?: boolean;
}) {
  const meta = IG_FORMATS.find((f) => f.id === opts.format) || IG_FORMATS[0];
  const link = absoluteSiteUrl(opts.ctaHref || "/");
  const canvas = document.createElement("canvas");
  canvas.width = meta.w;
  canvas.height = meta.h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponível");

  ctx.fillStyle = "#2a2420";
  ctx.fillRect(0, 0, meta.w, meta.h);

  if (!opts.imageUrl) {
    throw new Error("Escolha uma foto do produto antes de baixar");
  }

  const img = await loadImage(opts.imageUrl);
  const scale = Math.max(meta.w / img.naturalWidth, meta.h / img.naturalHeight);
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const dx = (meta.w - dw) / 2;
  const dy = (meta.h - dh) / 2;
  ctx.drawImage(img, dx, dy, dw, dh);

  const grad = ctx.createLinearGradient(0, meta.h * 0.5, 0, meta.h);
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(0.4, "rgba(0,0,0,0.4)");
  grad.addColorStop(1, "rgba(0,0,0,0.78)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, meta.h * 0.5, meta.w, meta.h * 0.5);

  const isStory = opts.format === "IG_STORY" || opts.format === "IG_REELS";

  if (opts.format === "IG_REELS") {
    ctx.beginPath();
    ctx.arc(meta.w / 2, meta.h / 2, 70, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.22)";
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(meta.w / 2 - 18, meta.h / 2 - 28);
    ctx.lineTo(meta.w / 2 - 18, meta.h / 2 + 28);
    ctx.lineTo(meta.w / 2 + 34, meta.h / 2);
    ctx.closePath();
    ctx.fillStyle = "#fff";
    ctx.fill();
  }

  if (isStory) {
    const barY = 48;
    const gap = 12;
    const barW = (meta.w - 80 - gap * 2) / 3;
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle =
        i === 0 ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.28)";
      ctx.fillRect(40 + i * (barW + gap), barY, barW, 6);
    }
  }

  // Logo oficial do site (opcional) — desenhada no canvas (SVG sumia)
  if (opts.showLogo) {
    drawBrandMark(ctx, meta.w / 2, isStory ? 100 : 48, isStory ? 1.15 : 1);
  }

  const pad = 72;
  let y = meta.h - (isStory ? 380 : 320);

  ctx.textAlign = "left";
  ctx.fillStyle = "#fff";
  ctx.font = "500 64px Georgia, serif";
  const titleLines = wrapText(
    ctx,
    opts.title || "Majesté",
    meta.w - pad * 2,
    2
  );
  for (const line of titleLines) {
    ctx.fillText(line, pad, y);
    y += 74;
  }

  if (opts.body) {
    y += 10;
    ctx.font = "400 34px system-ui, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    const bodyLines = wrapText(ctx, opts.body, meta.w - pad * 2, 3);
    for (const line of bodyLines) {
      ctx.fillText(line, pad, y);
      y += 44;
    }
  }

  // Botão visual “Comprar agora” — no Stories vira sticker de link no app
  const cta = opts.ctaLabel || "Comprar agora";
  ctx.font = "700 32px system-ui, sans-serif";
  const ctaW = Math.min(meta.w - pad * 2, Math.max(360, ctx.measureText(cta).width + 100));
  const ctaH = 88;
  const ctaX = (meta.w - ctaW) / 2;
  const ctaY = meta.h - 200;
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, ctaX, ctaY, ctaW, ctaH, 44);
  ctx.fill();
  ctx.fillStyle = "#2a2420";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`↗  ${cta}`, meta.w / 2, ctaY + ctaH / 2);
  ctx.textBaseline = "alphabetic";

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Falha ao gerar PNG"))),
      "image/png"
    );
  });
  triggerDownload(
    blob,
    `majeste-${opts.format.toLowerCase()}-${slugifyFilename(opts.title || "arte")}.png`
  );
  return link;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
