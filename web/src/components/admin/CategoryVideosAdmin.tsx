"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Library, Trash2, Video } from "lucide-react";
import { resolveVideoPlayback } from "@/lib/videos";
import { VideoBankAdmin } from "@/components/admin/VideoBankAdmin";

type CategoryOpt = {
  id: string;
  name: string;
  parentId: string | null;
};

type VideoRow = {
  id: string;
  categoryId: string;
  url: string;
  title: string | null;
  active: boolean;
  categoryLabel: string;
};

type Props = {
  categories: CategoryOpt[];
};

function categoryLabel(c: CategoryOpt, all: CategoryOpt[]) {
  const parent = c.parentId ? all.find((x) => x.id === c.parentId) : null;
  return parent ? `${parent.name} › ${c.name}` : c.name;
}

export function CategoryVideosAdmin({ categories }: Props) {
  const [categoryId, setCategoryId] = useState(categories[0]?.id || "");
  const [videos, setVideos] = useState<VideoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [titleInput, setTitleInput] = useState("");
  const [bankOpen, setBankOpen] = useState(false);

  const options = useMemo(
    () =>
      [...categories]
        .sort((a, b) =>
          categoryLabel(a, categories).localeCompare(
            categoryLabel(b, categories),
            "pt-BR"
          )
        )
        .map((c) => ({
          id: c.id,
          label: categoryLabel(c, categories),
        })),
    [categories]
  );

  const filtered = useMemo(
    () => videos.filter((v) => v.categoryId === categoryId),
    [videos, categoryId]
  );

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/videos");
    setLoading(false);
    if (!res.ok) return;
    const data = await res.json();
    setVideos(data.videos || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function attachFromBank(url: string, title: string | null) {
    if (!categoryId) return;
    setBusy(true);
    setStatus("Vinculando vídeo do banco…");
    try {
      const res = await fetch("/api/admin/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId,
          url,
          title: title || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao vincular");
      setBankOpen(false);
      setStatus("Vídeo do banco adicionado à categoria");
      await load();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Erro ao vincular");
    } finally {
      setBusy(false);
    }
  }

  async function onUploadFile(file: File | null) {
    if (!file || !categoryId) return;
    setBusy(true);
    setStatus(`Enviando ${file.name}…`);
    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("categoryId", categoryId);
      if (titleInput.trim()) fd.set("title", titleInput.trim());
      const res = await fetch("/api/admin/videos", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha no upload");
      setTitleInput("");
      setStatus("Vídeo adicionado à categoria");
      await load();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Erro no upload");
    } finally {
      setBusy(false);
    }
  }

  async function onAddUrl(e: FormEvent) {
    e.preventDefault();
    if (!categoryId || !urlInput.trim()) return;
    if (!resolveVideoPlayback(urlInput.trim())) {
      setStatus("URL inválida. Use YouTube, Vimeo ou link de MP4.");
      return;
    }
    setBusy(true);
    setStatus("Salvando link…");
    try {
      const res = await fetch("/api/admin/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId,
          url: urlInput.trim(),
          title: titleInput.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao salvar");
      setUrlInput("");
      setTitleInput("");
      setStatus("Link adicionado à categoria");
      await load();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(v: VideoRow) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/videos/${v.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !v.active }),
      });
      if (!res.ok) throw new Error("Falha ao atualizar");
      await load();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Erro");
    } finally {
      setBusy(false);
    }
  }

  async function remove(v: VideoRow) {
    if (!confirm("Remover este vídeo da categoria?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/videos/${v.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Falha ao excluir");
      setVideos((prev) => prev.filter((x) => x.id !== v.id));
      setStatus("Vídeo removido");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Erro ao excluir");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1
          className="text-2xl md:text-3xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Vídeos do catálogo
        </h1>
        <p className="text-sm text-muted mt-1">
          Vincule vídeos do{" "}
          <a href="/admin/banco-videos" className="underline">
            Banco de vídeos
          </a>{" "}
          (ou envie/cole link) por categoria ou em{" "}
          <strong>Página principal</strong>. No catálogo, o ícone “Ao Vivo”
          sorteia aleatoriamente.
        </p>
      </div>

      <label className="block text-xs uppercase tracking-wider text-muted">
        Categoria
        <select
          className="input mt-1"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          disabled={busy || options.length === 0}
        >
          {options.length === 0 ? (
            <option value="">Nenhuma categoria</option>
          ) : (
            options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))
          )}
        </select>
      </label>

      <section className="border border-black/10 bg-white p-5 space-y-4">
        <h2 className="text-lg font-medium text-[#2a2420]">Adicionar vídeo</h2>
        <label className="block text-xs uppercase tracking-wider text-muted">
          Título (opcional)
          <input
            className="input mt-1"
            value={titleInput}
            onChange={(e) => setTitleInput(e.target.value)}
            placeholder="Ex.: Look preto no espelho"
            disabled={busy}
          />
        </label>

        <div className="flex flex-wrap gap-2 items-end">
          <button
            type="button"
            className="btn btn-primary !py-2 inline-flex items-center gap-1.5"
            disabled={busy || !categoryId}
            onClick={() => setBankOpen(true)}
          >
            <Library size={14} />
            Escolher do banco
          </button>
          <label className="btn btn-outline !py-2 cursor-pointer">
            Upload MP4 / WebM / MOV
            <input
              type="file"
              accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov,.m4v"
              className="hidden"
              disabled={busy || !categoryId}
              onChange={(e) => {
                void onUploadFile(e.target.files?.[0] || null);
                e.target.value = "";
              }}
            />
          </label>
          <span className="text-xs text-muted self-center">ou link</span>
        </div>

        <form onSubmit={onAddUrl} className="flex flex-wrap gap-2">
          <input
            className="input flex-1 min-w-[200px]"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://youtube.com/... ou URL do vídeo"
            disabled={busy}
          />
          <button
            type="submit"
            className="btn btn-outline !py-2"
            disabled={busy || !urlInput.trim()}
          >
            Adicionar link
          </button>
        </form>
        {status ? (
          <p className="text-sm text-[var(--rose)]">
            {busy ? "…" : ""}
            {status}
          </p>
        ) : null}
      </section>

      <section className="border border-black/10 bg-white p-5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-medium text-[#2a2420]">
            Vídeos nesta categoria
          </h2>
          <span className="text-xs text-muted">{filtered.length} vídeo(s)</span>
        </div>

        {loading ? (
          <p className="text-sm text-muted">Carregando…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted">
            Nenhum vídeo ainda. Escolha do banco, faça upload ou cole um link.
          </p>
        ) : (
          <ul className="space-y-3">
            {filtered.map((v) => {
              const play = resolveVideoPlayback(v.url);
              const isFile =
                play?.kind === "file" &&
                (v.url.startsWith("/uploads/") ||
                  /\.(mp4|webm|mov|m4v)(\?|$)/i.test(v.url));
              return (
                <li
                  key={v.id}
                  className={`flex flex-wrap gap-3 items-start border border-black/8 p-3 ${
                    v.active ? "bg-[#faf7f3]" : "bg-[#f0ece8] opacity-70"
                  }`}
                >
                  <div className="w-36 aspect-video bg-black shrink-0 overflow-hidden">
                    {isFile ? (
                      // eslint-disable-next-line jsx-a11y/media-has-caption
                      <video
                        src={v.url}
                        className="h-full w-full object-contain"
                        muted
                        playsInline
                        preload="metadata"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-white/70">
                        <Video size={22} />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-sm font-medium text-[#2a2420]">
                      {v.title || "Sem título"}
                    </p>
                    <p className="text-xs text-muted break-all">{v.url}</p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        className="btn btn-outline !py-1.5 !px-2 text-xs"
                        disabled={busy}
                        onClick={() => toggleActive(v)}
                      >
                        {v.active ? "Desativar" : "Ativar"}
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline !py-1.5 !px-2 text-xs text-red-700 border-red-200"
                        disabled={busy}
                        onClick={() => remove(v)}
                      >
                        <Trash2 size={12} />
                        Excluir
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {bankOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Banco de vídeos"
          onClick={() => setBankOpen(false)}
        >
          <div
            className="w-full max-w-3xl bg-white my-8 p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 mb-4">
              <h3
                className="text-xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Banco de vídeos
              </h3>
              <button
                type="button"
                className="btn btn-outline !py-1.5 !px-3 text-sm"
                onClick={() => setBankOpen(false)}
              >
                Fechar
              </button>
            </div>
            <VideoBankAdmin
              pickMode
              onPick={(v) => {
                void attachFromBank(v.url, v.title);
              }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
