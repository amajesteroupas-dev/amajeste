"use client";

import { useEffect, useMemo, useState } from "react";
import { Scissors, Trash2, Upload, Video } from "lucide-react";
import { AssetNameEditor } from "@/components/admin/AssetNameEditor";
import {
  cutoutVideoFromFile,
  cutoutVideoFromUrl,
} from "@/lib/video-cutout-client";
import {
  postBinaryFile,
  readJsonSafe,
  uploadHttpError,
} from "@/lib/binary-upload";

export type VideoCutoutRow = {
  id: string;
  url: string;
  thumbUrl: string | null;
  title: string | null;
  sourceUrl: string | null;
  platform: string;
  kind?: string;
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

type Props = {
  pickMode?: boolean;
  onPick?: (video: VideoCutoutRow) => void;
};

export function VideoCutoutBankAdmin({ pickMode = false, onPick }: Props) {
  const [videos, setVideos] = useState<VideoCutoutRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [titleInput, setTitleInput] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [q, setQ] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/video-cutout-bank");
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
            (v.sourceUrl || "").toLowerCase().includes(term)
        );
    if (!term) return list;
    return [...list].sort((a, b) =>
      (a.title || "").localeCompare(b.title || "", "pt-BR", {
        sensitivity: "base",
      })
    );
  }, [videos, q]);

  async function onCutoutFile(file: File | null) {
    if (!file) {
      setStatus("Nenhum arquivo escolhido. Selecione um MP4/WebM para recortar.");
      return;
    }
    setBusy(true);
    setStatus(
      `Recortando “${file.name}” com IA (só o corpo)… não feche a página.`
    );
    try {
      const video = await cutoutVideoFromFile(file, setStatus);
      setTitleInput("");
      setStatus("Vídeo recortado salvo neste banco (separado dos outros).");
      setVideos((prev) => [
        {
          id: video.id,
          url: video.url,
          thumbUrl: video.thumbUrl,
          title: video.title,
          sourceUrl: null,
          platform: "cutout",
          kind: "cutout",
          durationSec: video.durationSec,
          bytes: null,
          active: true,
          createdAt: new Date().toISOString(),
        },
        ...prev.filter((x) => x.id !== video.id),
      ]);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Erro ao recortar");
    } finally {
      setBusy(false);
    }
  }

  async function onCutoutFromBankUrl() {
    const url = sourceUrl.trim();
    if (!url) return;
    setBusy(true);
    setStatus("Recortando vídeo com IA…");
    try {
      const video = await cutoutVideoFromUrl(url, setStatus, {
        title: titleInput.trim() || undefined,
      });
      setSourceUrl("");
      setStatus("Vídeo recortado salvo no banco");
      await load();
      void video;
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Erro ao recortar");
    } finally {
      setBusy(false);
    }
  }

  async function onUploadReady(file: File | null) {
    if (!file) return;
    setBusy(true);
    setStatus("Enviando vídeo já recortado…");
    try {
      const res = await postBinaryFile("/api/admin/video-cutout-bank", file, {
        title: titleInput.trim() || undefined,
      });
      const data = await readJsonSafe<{ error?: string }>(res);
      if (!res.ok) {
        throw new Error(uploadHttpError(res, data, "Falha no upload"));
      }
      setTitleInput("");
      setStatus("Arquivo adicionado ao banco de recortados");
      await load();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Erro no upload");
    } finally {
      setBusy(false);
    }
  }

  async function remove(v: VideoCutoutRow) {
    if (!confirm("Remover este vídeo recortado do banco?")) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/admin/video-cutout-bank?id=${encodeURIComponent(v.id)}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Falha ao excluir");
      setVideos((prev) => prev.filter((x) => x.id !== v.id));
      setStatus("Vídeo removido");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Erro ao excluir");
    } finally {
      setBusy(false);
    }
  }

  async function rename(v: VideoCutoutRow, title: string) {
    const res = await fetch("/api/admin/video-cutout-bank", {
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
      {busy ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 p-4"
          role="alertdialog"
          aria-live="assertive"
          aria-busy="true"
        >
          <div className="w-full max-w-md border border-white/20 bg-[#1a1612] text-[#f4efe8] p-5 shadow-xl space-y-3">
            <p className="text-xs uppercase tracking-[0.2em] text-[#c9a24a]">
              Banco de vídeos recortados
            </p>
            <p className="text-lg font-medium leading-snug">
              {status || "Recortando vídeo (só o corpo)…"}
            </p>
            <p className="text-sm text-white/70">
              Não feche esta página. A IA processa quadro a quadro e pode levar
              alguns minutos.
            </p>
            <div className="h-1.5 w-full overflow-hidden bg-white/15">
              <div className="h-full w-1/3 animate-pulse bg-[var(--rose)]" />
            </div>
          </div>
        </div>
      ) : null}
      {!pickMode ? (
        <div>
          <h1
            className="text-2xl md:text-3xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Banco de vídeos recortados
          </h1>
          <p className="text-sm text-muted mt-1">
            Banco <strong>separado</strong> do banco de vídeos e do banco de
            imagens. A IA remove o fundo e deixa só o corpo (~6s por vídeo).
            Depois use no editor de banner em “Adicionar recortado”.
          </p>
          <p className="text-xs text-muted mt-2 space-x-3">
            <a href="/admin/banco-videos" className="underline">
              Banco de vídeos (completos)
            </a>
            <a href="/admin/midias" className="underline">
              Banco de imagens
            </a>
          </p>
        </div>
      ) : null}

      <section className="border border-black/10 bg-white p-5 space-y-4">
        <h2 className="text-lg font-medium text-[#2a2420]">
          Recortar com IA (só o corpo)
        </h2>
        <label className="block text-xs uppercase tracking-wider text-muted">
          Título (opcional)
          <input
            className="input mt-1"
            value={titleInput}
            onChange={(e) => setTitleInput(e.target.value)}
            placeholder="Ex.: Modelo preto — recorte"
            disabled={busy}
          />
        </label>
        <div className="flex flex-wrap gap-2 items-center">
          <label className="btn btn-primary !py-2 cursor-pointer inline-flex items-center gap-1.5">
            <Scissors size={14} />
            Recortar arquivo (IA)
            <input
              type="file"
              accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov,.m4v"
              className="hidden"
              disabled={busy}
              onChange={(e) => {
                void onCutoutFile(e.target.files?.[0] || null);
                e.target.value = "";
              }}
            />
          </label>
          <label className="btn btn-outline !py-2 cursor-pointer inline-flex items-center gap-1.5">
            <Upload size={14} />
            Upload já recortado
            <input
              type="file"
              accept="video/webm,image/webp,video/mp4,.webm,.webp,.mp4"
              className="hidden"
              disabled={busy}
              onChange={(e) => {
                void onUploadReady(e.target.files?.[0] || null);
                e.target.value = "";
              }}
            />
          </label>
        </div>

        <div className="pt-2 border-t border-black/5 space-y-2">
          <p className="text-xs text-muted">
            Ou cole a URL de um vídeo já no site (/uploads/…) para recortar:
          </p>
          <div className="flex flex-wrap gap-2">
            <input
              className="input flex-1 min-w-[220px]"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="/uploads/video-bank/.../playable.mp4"
              disabled={busy}
            />
            <button
              type="button"
              className="btn btn-outline !py-2"
              disabled={busy || !sourceUrl.trim()}
              onClick={() => void onCutoutFromBankUrl()}
            >
              Recortar URL
            </button>
          </div>
        </div>

        {status ? (
          <p
            className={`text-sm ${
              busy ? "text-[var(--rose)] font-medium" : "text-[var(--rose)]"
            }`}
          >
            {busy ? "⏳ " : ""}
            {status}
          </p>
        ) : null}
      </section>

      <section className="border border-black/10 bg-white p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-medium text-[#2a2420]">
            {pickMode ? "Escolher recortado" : "Vídeos recortados"}
          </h2>
          <input
            className="input !py-1.5 max-w-[240px] text-sm"
            type="search"
            placeholder="Filtrar por nome…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Filtrar vídeos recortados por nome"
          />
        </div>
        <p className="text-xs text-muted">{filtered.length} vídeo(s)</p>

        {loading ? (
          <p className="text-sm text-muted">Carregando…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted">
            Nenhum vídeo recortado ainda. Use a IA ou envie um arquivo.
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
                <div
                  className="w-28 aspect-[3/4] shrink-0 overflow-hidden relative"
                  style={{
                    background:
                      "linear-gradient(45deg,#ddd 25%,transparent 25%),linear-gradient(-45deg,#ddd 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#ddd 75%),linear-gradient(-45deg,transparent 75%,#ddd 75%)",
                    backgroundSize: "12px 12px",
                    backgroundPosition: "0 0,0 6px,6px -6px,-6px 0",
                    backgroundColor: "#eee",
                  }}
                >
                  {v.thumbUrl &&
                  !v.thumbUrl.match(/\.(mp4|webm|mov|m4v)(\?|$)/i) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={v.thumbUrl}
                      alt=""
                      className="h-full w-full object-contain"
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
                    Recorte
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
