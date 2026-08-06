import { spawn } from "child_process";
import path from "path";
import fs from "fs/promises";
import os from "os";
import { randomUUID } from "crypto";
import { VIDEO_BANK_MAX_BYTES } from "@/lib/video-upload";

export type SocialPlatform = "youtube" | "tiktok" | "instagram" | "other";

export function detectVideoPlatform(url: string): SocialPlatform {
  const u = url.trim();
  if (/(?:youtube\.com|youtu\.be)\//i.test(u)) return "youtube";
  if (/tiktok\.com\//i.test(u)) return "tiktok";
  if (/instagram\.com\//i.test(u)) return "instagram";
  return "other";
}

export function isSupportedSocialVideoUrl(url: string) {
  const p = detectVideoPlatform(url);
  return p === "youtube" || p === "tiktok" || p === "instagram";
}

function runCommand(
  cmd: string,
  args: string[],
  opts?: { cwd?: string; timeoutMs?: number }
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: opts?.cwd,
      env: process.env,
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("Tempo esgotado ao baixar o vídeo (máx. 3 min)."));
    }, opts?.timeoutMs ?? 180_000);

    child.stdout.on("data", (d) => {
      stdout += String(d);
    });
    child.stderr.on("data", (d) => {
      stderr += String(d);
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(
        new Error(
          err.message.includes("ENOENT")
            ? "Ferramenta de download (yt-dlp) não está instalada no servidor."
            : err.message
        )
      );
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve({ stdout, stderr });
      else
        reject(
          new Error(
            extractYtDlpError(stderr || stdout) ||
              `Falha ao baixar (código ${code}).`
          )
        );
    });
  });
}

function extractYtDlpError(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const err = [...lines].reverse().find((l) => /error/i.test(l));
  if (!err) return null;
  if (/private|login|sign in|cookies/i.test(err)) {
    return "Vídeo privado ou exige login. Tente outro link público.";
  }
  if (/unsupported url|no video/i.test(err)) {
    return "Link não suportado ou sem vídeo público.";
  }
  return err.slice(0, 280);
}

async function extractThumbWithFfmpeg(videoPath: string, outPath: string) {
  try {
    await runCommand(
      "ffmpeg",
      [
        "-y",
        "-ss",
        "00:00:01",
        "-i",
        videoPath,
        "-frames:v",
        "1",
        "-q:v",
        "3",
        outPath,
      ],
      { timeoutMs: 60_000 }
    );
    return await fs.readFile(outPath);
  } catch {
    return null;
  }
}

export type DownloadedSocialVideo = {
  buffer: Buffer;
  mime: string;
  filename: string;
  title: string | null;
  platform: SocialPlatform;
  sourceUrl: string;
  thumb: Buffer | null;
  durationSec: number | null;
};

/** Baixa vídeo público de YouTube / TikTok / Instagram com yt-dlp. */
export async function downloadSocialVideo(
  sourceUrl: string
): Promise<DownloadedSocialVideo> {
  const url = sourceUrl.trim();
  if (!isSupportedSocialVideoUrl(url)) {
    throw new Error(
      "Use um link público do YouTube, TikTok ou Instagram (Reels/post)."
    );
  }

  const platform = detectVideoPlatform(url);
  const workDir = path.join(os.tmpdir(), `majeste-vid-${randomUUID()}`);
  await fs.mkdir(workDir, { recursive: true });

  try {
    // Metadados (título / duração)
    let title: string | null = null;
    let durationSec: number | null = null;
    try {
      const meta = await runCommand(
        "yt-dlp",
        ["-j", "--no-playlist", "--no-warnings", url],
        { cwd: workDir, timeoutMs: 60_000 }
      );
      const info = JSON.parse(meta.stdout.split("\n").find((l) => l.startsWith("{")) || "{}");
      title = typeof info.title === "string" ? info.title.slice(0, 180) : null;
      if (typeof info.duration === "number") {
        durationSec = Math.round(info.duration);
      }
    } catch {
      // segue mesmo sem meta
    }

    const outTpl = path.join(workDir, "video.%(ext)s");
    await runCommand(
      "yt-dlp",
      [
        "--no-playlist",
        "--no-warnings",
        "-f",
        "bv*[height<=1080][ext=mp4]+ba[ext=m4a]/b[ext=mp4]/best",
        "--merge-output-format",
        "mp4",
        "--max-filesize",
        String(VIDEO_BANK_MAX_BYTES),
        "-o",
        outTpl,
        url,
      ],
      { cwd: workDir, timeoutMs: 180_000 }
    );

    const files = await fs.readdir(workDir);
    let videoName = files.find((f) => /\.(mp4|webm|mov|m4v)$/i.test(f));
    if (!videoName) {
      const other = files.find((f) => /\.(mkv|mp4|webm|mov|m4v)$/i.test(f));
      if (other) {
        const src = path.join(workDir, other);
        const dest = path.join(workDir, "video.mp4");
        try {
          await runCommand(
            "ffmpeg",
            ["-y", "-i", src, "-c", "copy", dest],
            { timeoutMs: 90_000 }
          );
          videoName = "video.mp4";
        } catch {
          await runCommand(
            "ffmpeg",
            ["-y", "-i", src, "-c:v", "libx264", "-c:a", "aac", "-movflags", "+faststart", dest],
            { timeoutMs: 180_000 }
          );
          videoName = "video.mp4";
        }
      }
    }
    if (!videoName) {
      throw new Error("Download concluído, mas nenhum arquivo de vídeo foi gerado.");
    }

    const videoPath = path.join(workDir, videoName);
    const buffer = await fs.readFile(videoPath);
    if (buffer.length === 0) {
      throw new Error("Arquivo de vídeo vazio.");
    }
    if (buffer.length > VIDEO_BANK_MAX_BYTES) {
      throw new Error("Vídeo baixado ultrapassa 120 MB.");
    }

    const thumbPath = path.join(workDir, "thumb.jpg");
    const thumb = await extractThumbWithFfmpeg(videoPath, thumbPath);

    const ext = path.extname(videoName).toLowerCase() || ".mp4";
    const mime =
      ext === ".webm"
        ? "video/webm"
        : ext === ".mov"
          ? "video/quicktime"
          : "video/mp4";

    return {
      buffer,
      mime,
      filename: `import${ext === ".mkv" ? ".mp4" : ext}`,
      title,
      platform,
      sourceUrl: url,
      thumb,
      durationSec,
    };
  } finally {
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => undefined);
  }
}
