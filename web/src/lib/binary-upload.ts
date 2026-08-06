/**
 * Upload binário robusto (iPhone Safari frequentemente envia File vazio via fetch).
 * Lê o arquivo no cliente e manda ArrayBuffer com Content-Length explícito.
 */
export async function postBinaryFile(
  url: string,
  file: File,
  opts?: {
    title?: string;
    extraHeaders?: Record<string, string>;
  }
): Promise<Response> {
  const buffer = await file.arrayBuffer();
  if (!buffer.byteLength) {
    throw new Error(
      "Não foi possível ler o arquivo neste aparelho. Tente outro formato (MP4) ou use um computador."
    );
  }

  const qs =
    opts?.title && opts.title.trim()
      ? `${url.includes("?") ? "&" : "?"}title=${encodeURIComponent(opts.title.trim())}`
      : "";

  const contentType =
    file.type && file.type !== "application/octet-stream"
      ? file.type
      : guessVideoMime(file.name);

  return fetch(`${url}${qs}`, {
    method: "POST",
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(buffer.byteLength),
      "X-File-Name": encodeURIComponent(file.name || "video.mp4"),
      ...(opts?.title?.trim()
        ? { "X-Title": encodeURIComponent(opts.title.trim()) }
        : {}),
      ...(opts?.extraHeaders || {}),
    },
    body: buffer,
  });
}

function guessVideoMime(name: string) {
  const lower = name.toLowerCase();
  if (lower.endsWith(".webm")) return "video/webm";
  if (lower.endsWith(".mov")) return "video/quicktime";
  if (lower.endsWith(".m4v")) return "video/x-m4v";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  return "video/mp4";
}

export async function readJsonSafe<T extends { error?: string }>(
  res: Response
): Promise<T> {
  try {
    return (await res.json()) as T;
  } catch {
    return {} as T;
  }
}

export function uploadHttpError(
  res: Response,
  data: { error?: string },
  fallback = "Falha no upload"
) {
  if (data.error) return data.error;
  if (res.status === 413) {
    return "Arquivo grande demais para o servidor (máx. 120 MB).";
  }
  if (res.status === 401) {
    return "Sessão expirada. Entre de novo no admin.";
  }
  return `${fallback} (HTTP ${res.status}).`;
}
