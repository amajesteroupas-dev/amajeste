"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link2, Trash2, Upload, Video } from "lucide-react";
import { AssetNameEditor } from "@/components/admin/AssetNameEditor";
import {
  postBinaryFile,
  readJsonSafe,
  uploadHttpError,
} from "@/lib/binary-upload";

type VideoRow = {
  id: string;
  url: string;
  thumbUrl: string | null;
  title: string | null;
  sourceUrl: string | null;
  platform: string;
  durationSec: number | null;
  bytes: number | null;
  active: boolean;
  createdAt: string;
};

function formatBytes(n: number | null) {
  if (!n) return "—";
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function platformLabel(p: string) {
  switch (p) {
    case "youtube":
      return "YouTube";
    case "tiktok":
      return "TikTok";
    case "instagram":
      return "Instagram";
    case "upload":
      return "Upload";
    default:
      return p;
  }
}

type Props = {
  /** Se true, clique no vídeo chama onPick em vez de só listar. */
  pickMode?: boolean;
  onPick?: (video: VideoRow) => void;
};

export function VideoBankAdmin({ pickMode = false, onPick }: Props) {
  const [videos, setVideos] = useState<VideoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [titleInput, setTitleInput] = useState("");
  const [q, setQ] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/video-bank");
      if (!res.ok) return;
      const data = await res.json();
      setVideos(data.videos || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = !term
      ? videos
      : videos.filter(
          (v) =>
            (v.title || "").toLowerCase().includes(term) ||
            (v.sourceUrl || "").toLowerCase().includes(term) ||
            v.platform.toLowerCase().includes(term)
        );
    if (!term) return list;
    return [...list].sort((a, b) =>
      (a.title || "").localeCompare(b.title || "", "pt-BR", {
        sensitivity: "base",
      })
    );
  }, [videos, q]);

  async function onImportUrl(e: FormEvent) {
    e.preventDefault();
    if (!urlInput.trim()) return;
    setBusy(true);
    setStatus("Baixando vídeo… isso pode levar até 1–2 minutos.");
    try {
      const res = await fetch("/api/admin/video-bank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: urlInput.trim(),
          title: titleInput.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha no download");
      setUrlInput("");
      setTitleInput("");
      setStatus("Vídeo baixado e salvo no banco");
      await load();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Erro ao importar");
    } finally {
      setBusy(false);
    }
  }

  async function onUploadFile(file: File | null) {
    if (!file) return;
    const max = 120 * 1024 * 1024;
    if (file.size > max) {
      setStatus(
        "Vídeo muito grande (máx. 120 MB). Comprima ou envie um arquivo menor."
      );
      return;
    }
    setBusy(true);
    setStatus(
      `Enviando ${file.name} (${(file.size / (1024 * 1024)).toFixed(1)} MB)… pode levar alguns minutos para converter`
    );
    try {
      // Lê o arquivo no aparelho antes de enviar (iPhone + evita corte do middleware)
      const res = await postBinaryFile("/api/admin/video-bank", file, {
        title: titleInput.trim() || undefined,
      });
      const data = await readJsonSafe<{ error?: string }>(res);
      if (!res.ok) {
        throw new Error(uploadHttpError(res, data, "Falha no upload"));
      }
      setTitleInput("");
      setStatus("Vídeo adicionado ao banco (convertido para iPhone e Android)");
      await load();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Erro no upload");
    } finally {
      setBusy(false);
    }
  }

  async function remove(v: VideoRow) {
    if (!confirm("Remover este vídeo do banco?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/video-bank?id=${encodeURIComponent(v.id)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Falha ao excluir");
      setVideos((prev) => prev.filter((x) => x.id !== v.id));
      setStatus("Vídeo removido");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Erro ao excluir");
    } finally {
      setBusy(false);
    }
  }

  async function rename(v: VideoRow, title: string) {
    const res = await fetch("/api/admin/video-bank", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: v.id, title }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data.error || "Não foi possível renomear");
      throw new Error(data.error || "rename failed");
    }
    const next = data.video?.title ?? title;
    setVideos((prev) =>
      prev.map((x) => (x.id === v.id ? { ...x, title: next } : x))
    );
  }

  return (
    <div className={pickMode ? "space-y-4" : "space-y-6 max-w-4xl"}>
      {!pickMode ? (
        <div>
          <h1
            className="text-2xl md:text-3xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Banco de vídeos
          </h1>
          <p className="text-sm text-muted mt-1">
            Banco exclusivo de vídeos. Cole um link do YouTube, TikTok ou
            Instagram para baixar e salvar, ou envie um arquivo MP4. Depois use
            em{" "}
            <a href="/admin/videos" className="underline">
              Vídeos por categoria
            </a>
            . Para vídeo só com o corpo (fundo removido), use o{" "}
            <a href="/admin/banco-videos-recortados" className="underline">
              banco de vídeos recortados
            </a>
            .
          </p>
        </div>
      ) : null}

      <section className="border border-black/10 bg-white p-5 space-y-4">
        <h2 className="text-lg font-medium text-[#2a2420]">
          Importar de rede social
        </h2>
        <p className="text-xs text-muted">
          Links públicos de YouTube, TikTok e Instagram (Reels/post). Vídeos
          privados ou que exigem login podem falhar.
        </p>
        <label className="block text-xs uppercase tracking-wider text-muted">
          Título (opcional)
          <input
            className="input mt-1"
            value={titleInput}
            onChange={(e) => setTitleInput(e.target.value)}
            placeholder="Ex.: Look preto — Reels"
            disabled={busy}
          />
        </label>
        <form onSubmit={onImportUrl} className="flex flex-wrap gap-2">
          <input
            className="input flex-1 min-w-[220px]"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://youtube.com/... ou tiktok.com/... ou instagram.com/reel/..."
            disabled={busy}
          />
          <button
            type="submit"
            className="btn btn-primary !py-2 inline-flex items-center gap-1.5"
            disabled={busy || !urlInput.trim()}
          >
            <Link2 size={14} />
            Baixar e salvar
          </button>
        </form>

        <div className="flex flex-wrap gap-2 items-center pt-1 border-t border-black/5">
          <label className="btn btn-outline !py-2 cursor-pointer inline-flex items-center gap-1.5">
            <Upload size={14} />
            Upload MP4 / WebM / MOV
            <input
              type="file"
              accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov,.m4v"
              className="hidden"
              disabled={busy}
              onChange={(e) => {
                void onUploadFile(e.target.files?.[0] || null);
                e.target.value = "";
              }}
            />
          </label>
          <span className="text-xs text-muted">máx. 120 MB</span>
        </div>

        {status ? (
          <p className="text-sm text-[var(--rose)]">
            {busy ? "…" : ""}
            {status}
          </p>
        ) : null}
      </section>

      <section className="border border-black/10 bg-white p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-medium text-[#2a2420]">
            {pickMode ? "Escolher vídeo" : "Vídeos no banco"}
          </h2>
          <input
            className="input !py-1.5 max-w-[240px] text-sm"
            type="search"
            placeholder="Filtrar por nome…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Filtrar vídeos por nome"
          />
        </div>
        <p className="text-xs text-muted">{filtered.length} vídeo(s)</p>

        {loading ? (
          <p className="text-sm text-muted">Carregando…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted">
            Nenhum vídeo ainda. Importe um link ou faça upload.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {filtered.map((v) => (
              <li
                key={v.id}
                className={`border border-black/8 p-3 bg-[#faf7f3] flex gap-3 ${
                  pickMode ? "cursor-pointer hover:border-[var(--rose)]" : ""
                }`}
                onClick={() => {
                  if (pickMode && onPick) onPick(v);
                }}
              >
                <div className="w-28 aspect-video bg-black shrink-0 overflow-hidden relative">
                  {v.thumbUrl && !v.thumbUrl.match(/\.(mp4|webm|mov|m4v)(\?|$)/i) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={v.thumbUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    // eslint-disable-next-line jsx-a11y/media-has-caption
                    <video
                      src={v.url}
                      className="h-full w-full object-contain"
                      muted
                      playsInline
                      preload="metadata"
                    />
                  )}
                  <span className="absolute bottom-1 left-1 text-[10px] uppercase tracking-wide bg-black/70 text-white px-1.5 py-0.5">
                    {platformLabel(v.platform)}
                  </span>
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  {pickMode ? (
                    <p className="text-sm font-medium text-[#2a2420] line-clamp-2">
                      {v.title || "Sem título"}
                    </p>
                  ) : (
                    <AssetNameEditor
                      value={v.title || ""}
                      placeholder="Nome do vídeo"
                      disabled={busy}
                      onSave={(title) => rename(v, title)}
                    />
                  )}
                  <p className="text-xs text-muted">
                    {formatBytes(v.bytes)}
                    {v.durationSec ? ` · ${v.durationSec}s` : ""}
                  </p>
                  {v.sourceUrl ? (
                    <p className="text-[11px] text-muted break-all line-clamp-1">
                      {v.sourceUrl}
                    </p>
                  ) : null}
                  {!pickMode ? (
                    <button
                      type="button"
                      className="btn btn-outline !py-1 !px-2 text-xs text-red-700 border-red-200 mt-1"
                      disabled={busy}
                      onClick={(e) => {
                        e.stopPropagation();
                        void remove(v);
                      }}
                    >
                      <Trash2 size={12} />
                      Excluir
                    </button>
                  ) : (
                    <p className="text-xs text-[var(--rose)] pt-1 inline-flex items-center gap-1">
                      <Video size={12} />
                      Clique para usar
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
