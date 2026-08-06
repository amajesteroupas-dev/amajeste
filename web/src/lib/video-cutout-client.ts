/** Cliente: remove fundo quadro a quadro e sobe vídeo recortado (só o corpo). */

import { removeBackgroundFromBlob } from "@/lib/cutout-client";

const MAX_SECONDS = 6;
const FPS = 3;
const MAX_EDGE = 640;

function waitSeek(video: HTMLVideoElement, time: number) {
  return new Promise<void>((resolve, reject) => {
    const target = Math.max(0, time);
    if (
      Number.isFinite(video.currentTime) &&
      Math.abs(video.currentTime - target) < 0.08 &&
      video.readyState >= 2
    ) {
      resolve();
      return;
    }

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      cleanup();
      resolve();
    };
    const fail = () => {
      if (done) return;
      done = true;
      cleanup();
      reject(new Error("Falha ao ler o quadro do vídeo."));
    };
    const onSeeked = () => finish();
    const onError = () => fail();
    const timer = window.setTimeout(() => finish(), 2500);
    const cleanup = () => {
      window.clearTimeout(timer);
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("error", onError);
    };

    video.addEventListener("seeked", onSeeked);
    video.addEventListener("error", onError);
    try {
      video.currentTime = target;
    } catch {
      fail();
    }
  });
}

/** Baixa o vídeo como blob (evita CORS/crossOrigin) e cria object URL. */
async function toPlayableObjectUrl(
  src: string,
  onProgress?: (msg: string) => void
): Promise<{ url: string; revoke: () => void }> {
  if (src.startsWith("blob:") || src.startsWith("data:")) {
    return { url: src, revoke: () => undefined };
  }

  onProgress?.("Baixando vídeo para recortar…");
  const res = await fetch(src, { cache: "no-store", credentials: "same-origin" });
  if (!res.ok) {
    throw new Error(
      "Não foi possível baixar o vídeo. Confira se o arquivo ainda existe no banco."
    );
  }
  const blob = await res.blob();
  if (!blob.size) {
    throw new Error("Arquivo de vídeo vazio.");
  }
  const url = URL.createObjectURL(blob);
  return { url, revoke: () => URL.revokeObjectURL(url) };
}

async function loadVideoElement(src: string): Promise<HTMLVideoElement> {
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  // Sem crossOrigin: usamos blob URL local após fetch
  video.src = src;

  await new Promise<void>((resolve, reject) => {
    const ok = () => {
      cleanup();
      resolve();
    };
    const fail = () => {
      cleanup();
      reject(
        new Error(
          "Não foi possível abrir o vídeo no navegador. Tente outro arquivo MP4."
        )
      );
    };
    const cleanup = () => {
      video.removeEventListener("loadeddata", ok);
      video.removeEventListener("canplay", ok);
      video.removeEventListener("error", fail);
      window.clearTimeout(timer);
    };
    const timer = window.setTimeout(() => {
      if (video.readyState >= 2) ok();
      else fail();
    }, 20000);

    video.addEventListener("loadeddata", ok);
    video.addEventListener("canplay", ok);
    video.addEventListener("error", fail);
    video.load();
  });

  // Garante dimensões
  if (!video.videoWidth) {
    try {
      await video.play();
      video.pause();
    } catch {
      /* ignore */
    }
  }

  return video;
}

async function extractFrames(
  video: HTMLVideoElement,
  onProgress?: (msg: string) => void
): Promise<Blob[]> {
  const rawDur = Number.isFinite(video.duration) ? video.duration : MAX_SECONDS;
  const duration = Math.min(Math.max(rawDur, 0.4), MAX_SECONDS);
  const total = Math.max(1, Math.floor(duration * FPS));
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponível neste navegador.");

  const frames: Blob[] = [];
  for (let i = 0; i < total; i++) {
    const t = Math.min(duration - 0.05, i / FPS);
    await waitSeek(video, Math.max(0, t));

    const vw = video.videoWidth || 720;
    const vh = video.videoHeight || 1280;
    const scale = Math.min(1, MAX_EDGE / Math.max(vw, vh));
    canvas.width = Math.max(2, Math.round(vw * scale));
    canvas.height = Math.max(2, Math.round(vh * scale));
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Falha ao capturar quadro"))),
        "image/png"
      );
    });
    frames.push(blob);
    onProgress?.(`Extraindo quadros… ${i + 1}/${total}`);
  }
  return frames;
}

async function uploadCutoutFrames(
  frames: Blob[],
  opts: {
    fps: number;
    title?: string;
    sourceUrl?: string;
    onProgress?: (msg: string) => void;
  }
) {
  opts.onProgress?.(
    `Empacotando ${frames.length} quadro(s) para enviar…`
  );
  const buffers = await Promise.all(
    frames.map(async (blob) => new Uint8Array(await blob.arrayBuffer()))
  );
  const sizes = buffers.map((b) => b.length);
  const total = sizes.reduce((a, b) => a + b, 0);
  const packed = new Uint8Array(total);
  let offset = 0;
  for (const buf of buffers) {
    packed.set(buf, offset);
    offset += buf.length;
  }

  const meta = {
    fps: opts.fps,
    title: opts.title || null,
    sourceUrl: opts.sourceUrl || null,
    sizes,
  };

  opts.onProgress?.(
    `Enviando ${(total / (1024 * 1024)).toFixed(1)} MB ao banco de vídeos recortados…`
  );

  // Body = JSON meta + \n + PNGs concatenados (evita header gigante / limite nginx)
  const metaBytes = new TextEncoder().encode(JSON.stringify(meta) + "\n");
  const body = new Uint8Array(metaBytes.length + packed.length);
  body.set(metaBytes, 0);
  body.set(packed, metaBytes.length);

  const res = await fetch("/api/admin/video-cutout-bank", {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Length": String(body.byteLength),
      "X-Cutout-Packed": "1",
      "X-Cutout-Format": "meta-json-v1",
    },
    body,
  });

  let data: { error?: string; video?: unknown } = {};
  try {
    data = await res.json();
  } catch {
    /* corpo não-JSON (proxy/nginx) */
  }
  if (!res.ok) {
    throw new Error(
      data.error ||
        (res.status === 413
          ? "Arquivo grande demais para o servidor."
          : res.status === 401
            ? "Sessão expirada. Entre de novo no admin."
            : `Falha ao salvar vídeo recortado (HTTP ${res.status}).`)
    );
  }
  return data.video as {
    id: string;
    url: string;
    thumbUrl: string | null;
    durationSec: number | null;
    title: string | null;
  };
}

/**
 * Recorta fundo do vídeo (IA) e salva no banco de vídeos recortados
 * (separado do banco de vídeos e do banco de imagens).
 * Limite: ~6s a 3 fps para o processo no navegador.
 */
export async function cutoutVideoFromUrl(
  videoUrl: string,
  onProgress?: (msg: string) => void,
  opts?: { title?: string }
) {
  onProgress?.("Iniciando recorte do vídeo (só o corpo)…");
  const playable = await toPlayableObjectUrl(videoUrl, onProgress);
  try {
    onProgress?.("Abrindo vídeo…");
    const video = await loadVideoElement(playable.url);
    onProgress?.("Extraindo quadros do vídeo…");
    const frames = await extractFrames(video, onProgress);
    video.removeAttribute("src");
    video.load();

    if (!frames.length) {
      throw new Error("Nenhum quadro extraído do vídeo.");
    }

    const cutFrames: Blob[] = [];
    for (let i = 0; i < frames.length; i++) {
      onProgress?.(
        `Recortando corpo (IA)… quadro ${i + 1} de ${frames.length}`
      );
      const cut = await removeBackgroundFromBlob(frames[i], (msg) => {
        onProgress?.(
          `Quadro ${i + 1}/${frames.length}: ${msg}`
        );
      });
      cutFrames.push(cut);
    }

    return await uploadCutoutFrames(cutFrames, {
      fps: FPS,
      title: opts?.title,
      sourceUrl: videoUrl.startsWith("blob:") ? undefined : videoUrl,
      onProgress,
    });
  } finally {
    playable.revoke();
  }
}

export async function cutoutVideoFromFile(
  file: File,
  onProgress?: (msg: string) => void
) {
  onProgress?.(`Arquivo selecionado: ${file.name}. Preparando…`);
  const objectUrl = URL.createObjectURL(file);
  try {
    return await cutoutVideoFromUrl(objectUrl, onProgress, {
      title: file.name.replace(/\.\w+$/, "") + " (recortado)",
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
