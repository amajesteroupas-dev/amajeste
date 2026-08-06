import path from "path";
import fs from "fs/promises";
import { spawn } from "child_process";
import { randomUUID } from "crypto";
import { uploadRoot } from "@/lib/images";

const ALLOWED = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-m4v",
]);

/** Limite do banco de vídeos (import/upload). */
export const VIDEO_BANK_MAX_BYTES = 120 * 1024 * 1024;

export function isAllowedVideoMime(mime: string) {
  return ALLOWED.has(mime.toLowerCase());
}

export function extForVideoMime(mime: string, originalName: string) {
  if (mime === "video/webm") return ".webm";
  if (mime === "video/quicktime") return ".mov";
  if (path.extname(originalName).toLowerCase() === ".m4v") return ".m4v";
  return ".mp4";
}

function runFfmpeg(
  args: string[],
  opts?: { timeoutMs?: number; cwd?: string }
): Promise<void> {
  const timeoutMs = opts?.timeoutMs ?? 300_000;
  return new Promise((resolve, reject) => {
    const child = spawn("ffmpeg", args, {
      env: process.env,
      windowsHide: true,
      cwd: opts?.cwd,
    });
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("Tempo esgotado ao converter o vídeo."));
    }, timeoutMs);
    child.stderr.on("data", (d) => {
      stderr += String(d);
      if (stderr.length > 8000) stderr = stderr.slice(-8000);
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(
        new Error(
          err.message.includes("ENOENT")
            ? "ffmpeg não está instalado no servidor."
            : err.message
        )
      );
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else {
        const tip = stderr
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean)
          .slice(-4)
          .join(" | ");
        reject(
          new Error(
            tip
              ? `Falha ao converter vídeo (ffmpeg ${code}): ${tip}`
              : `Falha ao converter vídeo (ffmpeg ${code}).`
          )
        );
      }
    });
  });
}

/**
 * Converte para MP4 H.264 baseline + AAC — toca no iPhone e Android.
 * MOV/HEVC (comum em iPhone) não roda na maioria dos Androids.
 */
export async function transcodeToMobileMp4(
  inputPath: string,
  outputPath: string
) {
  await runFfmpeg([
    "-y",
    "-i",
    inputPath,
    "-vf",
    "scale=w='min(1920,iw)':h='min(1080,ih)':force_original_aspect_ratio=decrease",
    "-c:v",
    "libx264",
    "-profile:v",
    "main",
    "-level",
    "4.0",
    "-pix_fmt",
    "yuv420p",
    "-preset",
    "medium",
    "-crf",
    "19",
    "-c:a",
    "aac",
    "-b:a",
    "160k",
    "-ac",
    "2",
    "-ar",
    "44100",
    "-movflags",
    "+faststart",
    outputPath,
  ]);
}

async function ensureMobileFriendlyMp4(
  dir: string,
  savedName: string
): Promise<{ filename: string; bytes: number }> {
  const src = path.join(dir, savedName);
  const destName = "playable.mp4";
  const dest = path.join(dir, destName);

  // Sempre gera H.264 baseline + faststart (iPhone + Android).
  // MP4 “pronto” da câmera/editor muitas vezes é HEVC ou High e falha no celular.
  await transcodeToMobileMp4(src, dest);
  if (path.resolve(src) !== path.resolve(dest)) {
    await fs.unlink(src).catch(() => undefined);
  }
  const st = await fs.stat(dest);
  return { filename: destName, bytes: st.size };
}

/** Salva no banco exclusivo /uploads/video-bank/{uuid}/ */
export async function saveVideoBankFile(
  file: Buffer,
  originalName: string,
  mime: string,
  thumb?: Buffer | null
) {
  if (!isAllowedVideoMime(mime) && !/\.(mp4|webm|mov|m4v)$/i.test(originalName)) {
    throw new Error("Formato inválido. Use MP4, WebM ou MOV.");
  }
  if (file.length > VIDEO_BANK_MAX_BYTES) {
    throw new Error("Vídeo muito grande (máx. 120 MB).");
  }

  const id = randomUUID();
  const ext = extForVideoMime(mime, originalName);
  const dir = path.join(uploadRoot(), "video-bank", id);
  await fs.mkdir(dir, { recursive: true });

  const rawName = `video${ext}`;
  await fs.writeFile(path.join(dir, rawName), file);

  const { filename, bytes } = await ensureMobileFriendlyMp4(dir, rawName);

  let thumbUrl: string | null = null;
  if (thumb && thumb.length > 0) {
    const thumbName = "thumb.jpg";
    await fs.writeFile(path.join(dir, thumbName), thumb);
    thumbUrl = `/uploads/video-bank/${id}/${thumbName}`;
  }

  return {
    id,
    url: `/uploads/video-bank/${id}/${filename}`,
    thumbUrl,
    bytes,
  };
}

/**
 * Monta vídeo recortado (fundo transparente) a partir de PNGs sequenciais.
 * Tenta WebM VP9 → WebP animado → GIF (sempre com alpha quando possível).
 */
export async function saveVideoCutoutFromPngFrames(
  frames: Buffer[],
  opts?: { fps?: number; title?: string }
) {
  if (!frames.length) {
    throw new Error("Nenhum quadro para montar o vídeo recortado.");
  }
  const fps = Math.min(12, Math.max(2, Math.round(opts?.fps || 4)));
  const id = randomUUID();
  const root = uploadRoot();
  await fs.mkdir(root, { recursive: true });
  const dir = path.join(root, "video-cutout-bank", id);
  await fs.mkdir(dir, { recursive: true });

  for (let i = 0; i < frames.length; i++) {
    const name = `frame_${String(i + 1).padStart(4, "0")}.png`;
    await fs.writeFile(path.join(dir, name), frames[i]);
  }

  const thumbName = "thumb.png";
  await fs.writeFile(path.join(dir, thumbName), frames[0]);

  const attempts: { outName: string; args: string[] }[] = [
    {
      outName: "playable.webm",
      args: [
        "-y",
        "-framerate",
        String(fps),
        "-i",
        "frame_%04d.png",
        "-c:v",
        "libvpx-vp9",
        "-pix_fmt",
        "yuva420p",
        "-auto-alt-ref",
        "0",
        "-b:v",
        "0",
        "-crf",
        "32",
        "-an",
        "playable.webm",
      ],
    },
    {
      outName: "playable.webp",
      args: [
        "-y",
        "-framerate",
        String(fps),
        "-i",
        "frame_%04d.png",
        "-loop",
        "0",
        "-c:v",
        "libwebp",
        "-lossless",
        "0",
        "-q:v",
        "80",
        "-an",
        "playable.webp",
      ],
    },
    {
      outName: "playable.gif",
      args: [
        "-y",
        "-framerate",
        String(fps),
        "-i",
        "frame_%04d.png",
        "-loop",
        "0",
        "playable.gif",
      ],
    },
  ];

  const errors: string[] = [];
  let outName: string | null = null;
  for (const attempt of attempts) {
    try {
      await runFfmpeg(attempt.args, { cwd: dir, timeoutMs: 300_000 });
      const st = await fs.stat(path.join(dir, attempt.outName));
      if (st.size > 0) {
        outName = attempt.outName;
        break;
      }
      errors.push(`${attempt.outName}: arquivo vazio`);
    } catch (e) {
      errors.push(
        e instanceof Error ? e.message : `falha em ${attempt.outName}`
      );
    }
  }

  // Limpa frames intermediários
  for (let i = 0; i < frames.length; i++) {
    const name = `frame_${String(i + 1).padStart(4, "0")}.png`;
    await fs.unlink(path.join(dir, name)).catch(() => undefined);
  }

  if (!outName) {
    await fs.rm(dir, { recursive: true, force: true }).catch(() => undefined);
    throw new Error(
      `Não foi possível montar o vídeo recortado. ${errors.slice(0, 2).join(" / ")}`
    );
  }

  const st = await fs.stat(path.join(dir, outName));
  return {
    id,
    url: `/uploads/video-cutout-bank/${id}/${outName}`,
    thumbUrl: `/uploads/video-cutout-bank/${id}/${thumbName}`,
    bytes: st.size,
    durationSec: Math.max(1, Math.round(frames.length / fps)),
  };
}

/** Upload direto de arquivo já recortado (WebM/PNG animado) no banco de cutouts. */
export async function saveVideoCutoutBankFile(
  file: Buffer,
  originalName: string,
  mime: string
) {
  if (file.length > VIDEO_BANK_MAX_BYTES) {
    throw new Error("Vídeo muito grande (máx. 120 MB).");
  }
  const id = randomUUID();
  const dir = path.join(uploadRoot(), "video-cutout-bank", id);
  await fs.mkdir(dir, { recursive: true });

  const lower = originalName.toLowerCase();
  const isWebm =
    mime.includes("webm") || lower.endsWith(".webm");
  const isWebp =
    mime.includes("webp") || lower.endsWith(".webp");

  if (isWebm || isWebp) {
    const outName = isWebp ? "playable.webp" : "playable.webm";
    await fs.writeFile(path.join(dir, outName), file);
    const st = await fs.stat(path.join(dir, outName));
    // thumb: primeiro frame via ffmpeg se possível
    let thumbUrl: string | null = null;
    try {
      const thumbPath = path.join(dir, "thumb.png");
      await runFfmpeg([
        "-y",
        "-i",
        path.join(dir, outName),
        "-frames:v",
        "1",
        thumbPath,
      ]);
      thumbUrl = `/uploads/video-cutout-bank/${id}/thumb.png`;
    } catch {
      /* ok sem thumb */
    }
    return {
      id,
      url: `/uploads/video-cutout-bank/${id}/${outName}`,
      thumbUrl,
      bytes: st.size,
    };
  }

  // MP4/MOV: converte para H.264 (sem alpha) — útil se já veio com fundo sólido
  const ext = extForVideoMime(mime, originalName);
  const rawName = `video${ext}`;
  await fs.writeFile(path.join(dir, rawName), file);
  const { filename, bytes } = await ensureMobileFriendlyMp4(dir, rawName);
  return {
    id,
    url: `/uploads/video-cutout-bank/${id}/${filename}`,
    thumbUrl: null as string | null,
    bytes,
  };
}

/** Salva vídeo de produto/categoria (legado). */
export async function saveProductVideoFile(
  file: Buffer,
  originalName: string,
  mime: string
) {
  if (!isAllowedVideoMime(mime)) {
    throw new Error("Formato inválido. Use MP4, WebM ou MOV.");
  }
  if (file.length > 45 * 1024 * 1024) {
    throw new Error("Vídeo muito grande (máx. 45 MB). Use o Banco de vídeos.");
  }

  const id = randomUUID();
  const ext = extForVideoMime(mime, originalName);
  const dir = path.join(uploadRoot(), "videos", id);
  await fs.mkdir(dir, { recursive: true });
  const rawName = `video${ext}`;
  await fs.writeFile(path.join(dir, rawName), file);
  const { filename, bytes } = await ensureMobileFriendlyMp4(dir, rawName);
  return { url: `/uploads/videos/${id}/${filename}`, bytes };
}

export async function deleteUploadFolderFromUrl(url: string) {
  const m = url.match(
    /^\/uploads\/(video-bank|video-cutout-bank|videos)\/([^/]+)\//
  );
  if (!m) return;
  const dir = path.join(uploadRoot(), m[1], m[2]);
  await fs.rm(dir, { recursive: true, force: true }).catch(() => undefined);
}
