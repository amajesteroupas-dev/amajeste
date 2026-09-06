/**
 * Lê File como base64 (sem prefixo data:...).
 * Necessário no Safari/iPhone: FormData/multipart frequentemente chega vazio no servidor.
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file || !file.size) {
      reject(
        new Error(
          "Arquivo vazio neste aparelho. No iPhone, use JPG ou “Mais compatíveis” nas Ajustes da Câmera."
        )
      );
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const comma = result.indexOf(",");
      const b64 = comma >= 0 ? result.slice(comma + 1) : result;
      if (!b64) {
        reject(new Error("Não foi possível ler a foto no aparelho."));
        return;
      }
      resolve(b64);
    };
    reader.onerror = () =>
      reject(reader.error || new Error("Falha ao ler a foto no aparelho"));
    reader.readAsDataURL(file);
  });
}

type UploadAdminMediaOpts = {
  file: File;
  mode?: "upload" | "cutout";
  alt?: string;
};

/**
 * Upload para /api/admin/media via JSON base64 (iPhone/Android/web).
 */
export async function uploadAdminMediaFile(opts: UploadAdminMediaOpts) {
  const dataBase64 = await fileToBase64(opts.file);
  const res = await fetch("/api/admin/media", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      dataBase64,
      fileName: opts.file.name || "photo.jpg",
      mimeType: opts.file.type || "application/octet-stream",
      mode: opts.mode || "upload",
      alt: opts.alt,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      (data as { error?: string }).error ||
        `Falha no upload (HTTP ${res.status})`
    );
  }
  return data as {
    id: string;
    url: string;
    thumbUrl?: string;
    alt?: string;
  };
}
