"use client";

import { useEffect, useState } from "react";
import {
  MediaGallery,
  type MediaBank,
  type MediaGalleryItem,
} from "@/components/admin/MediaGallery";
import { cutoutFromFile } from "@/lib/cutout-client";

export function MediaLibraryAdmin() {
  const [items, setItems] = useState<MediaGalleryItem[]>([]);
  const [q, setQ] = useState("");
  const [bank, setBank] = useState<MediaBank>("upload");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  async function load() {
    const res = await fetch(
      "/api/admin/media?source=cutout,upload&includeProducts=1"
    );
    if (!res.ok) return;
    const data = await res.json();
    setItems(data.library || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function onUpload(files: File[]) {
    if (files.length === 0) return;
    setBusy(true);
    setStatus("");
    let ok = 0;
    let fail = 0;
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setStatus(`Enviando ${i + 1} de ${files.length}: ${file.name}`);
        try {
          const fd = new FormData();
          fd.set("file", file);
          fd.set("mode", bank === "cutout" ? "cutout" : "upload");
          const baseName = file.name.replace(/\.[^.]+$/, "").trim();
          fd.set(
            "alt",
            baseName || (bank === "cutout" ? "Modelo recortada" : file.name)
          );
          const res = await fetch("/api/admin/media", {
            method: "POST",
            body: fd,
          });
          if (!res.ok) throw new Error("falha");
          ok += 1;
        } catch {
          fail += 1;
        }
      }
      await load();
      if (fail === 0) {
        setStatus(
          ok === 1
            ? "1 foto adicionada ao banco"
            : `${ok} fotos adicionadas ao banco`
        );
      } else {
        setStatus(`${ok} enviada(s), ${fail} falhou(aram)`);
      }
    } finally {
      setBusy(false);
    }
  }

  async function onCutoutWithAi(file: File) {
    setBusy(true);
    setStatus("Recortando com IA…");
    try {
      const result = await cutoutFromFile(file, setStatus);
      setItems((prev) => [
        {
          id: result.id || `cutout-${Date.now()}`,
          url: result.url,
          thumbUrl: result.thumbUrl,
          alt: "Modelo recortada",
          source: "cutout",
        },
        ...prev.filter((m) => m.url !== result.url),
      ]);
      setBank("cutout");
      setStatus("Recorte salvo no banco de recortadas");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Falha ao recortar");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(item: MediaGalleryItem) {
    const res = await fetch(`/api/admin/media?id=${encodeURIComponent(item.id)}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "Não foi possível excluir");
      return;
    }
    setItems((prev) => prev.filter((m) => m.id !== item.id));
  }

  async function onRename(item: MediaGalleryItem, name: string) {
    const res = await fetch("/api/admin/media", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, alt: name }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data.error || "Não foi possível renomear");
      throw new Error(data.error || "rename failed");
    }
    const nextAlt = data.media?.alt ?? name;
    setItems((prev) =>
      prev.map((m) => (m.id === item.id ? { ...m, alt: nextAlt } : m))
    );
  }

  async function fixHdrPrints() {
    if (
      !confirm(
        "Corrigir fotos para print no iPhone?\n\nConverte as fotos dos produtos (HDR/Display P3) para sRGB SDR — evita print queimado. Pode levar alguns minutos; clique de novo se pedir."
      )
    ) {
      return;
    }
    setBusy(true);
    setStatus("Corrigindo fotos (HDR → sRGB)…");
    try {
      let rounds = 0;
      let total = 0;
      let runAgain = true;
      while (runAgain && rounds < 40) {
        rounds += 1;
        setStatus(`Corrigindo lote ${rounds}…`);
        const res = await fetch("/api/admin/media/fix-hdr", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scope: "products", limit: 80 }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          alert(data.error || "Falha na correção HDR");
          setStatus("");
          return;
        }
        total += Number(data.products?.fixed || 0);
        runAgain = Boolean(data.runAgain);
        setStatus(
          data.message ||
            `${total} foto(s) corrigida(s)${runAgain ? " — continuando…" : ""}`
        );
      }
      await load();
      setStatus(
        total > 0
          ? `${total} foto(s) corrigida(s). Peça às clientes para atualizar a página (puxe para baixo) antes de printar.`
          : "Fotos já estavam corrigidas ou não havia arquivo local."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {busy ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 p-4"
          role="alertdialog"
          aria-live="assertive"
          aria-busy="true"
        >
          <div className="w-full max-w-md border border-white/20 bg-[#1a1612] text-[#f4efe8] p-5 shadow-xl space-y-3">
            <p className="text-xs uppercase tracking-[0.2em] text-[#c9a24a]">
              Banco de imagens
            </p>
            <p className="text-lg font-medium leading-snug">
              {status || "Processando…"}
            </p>
            <p className="text-sm text-white/70">
              Não feche esta página enquanto o recorte estiver em andamento.
            </p>
            <div className="h-1.5 w-full overflow-hidden bg-white/15">
              <div className="h-full w-1/3 animate-pulse bg-[var(--rose)]" />
            </div>
          </div>
        </div>
      ) : null}
      <div>
        <h1
          className="text-2xl md:text-3xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Banco de imagens
        </h1>
        <p className="text-sm text-muted mt-1 max-w-2xl">
          Só fotos. Dois bancos: <strong>Adicionadas</strong> e{" "}
          <strong>Recortadas</strong> (modelos sem fundo). Vídeos ficam em{" "}
          <a href="/admin/banco-videos" className="underline">
            Banco de vídeos
          </a>{" "}
          e{" "}
          <a href="/admin/banco-videos-recortados" className="underline">
            Banco de vídeos recortados
          </a>
          .
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-outline !py-2"
            disabled={busy}
            onClick={() => void fixHdrPrints()}
          >
            Corrigir print iPhone (HDR)
          </button>
        </div>
        <p className="text-xs text-muted mt-2 max-w-2xl">
          Use se o print da loja no iPhone sair branco/queimado. Converte as
          fotos dos produtos para sRGB SDR (sem perfil HDR do iPhone).
        </p>
        {status ? (
          <p className="text-sm mt-2 text-[var(--rose)] font-medium">
            {busy ? "⏳ " : ""}
            {status}
          </p>
        ) : null}
      </div>

      <MediaGallery
        mode="page"
        title={bank === "cutout" ? "Recortadas" : "Adicionadas"}
        items={items}
        search={q}
        onSearchChange={setQ}
        banks={["upload", "cutout"]}
        activeBank={bank}
        onBankChange={setBank}
        onUpload={onUpload}
        uploadBusy={busy}
        uploadProgress={busy ? status : undefined}
        uploadLabel={
          bank === "cutout" ? "Upload PNG recortado" : "Adicionar fotos"
        }
        extraActions={
          <label
            className={`btn btn-outline !py-2 cursor-pointer ${
              busy ? "opacity-50 pointer-events-none" : ""
            }`}
          >
            Recortar foto (IA)
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={busy}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onCutoutWithAi(f);
                e.target.value = "";
              }}
            />
          </label>
        }
        onDelete={onDelete}
        onRename={onRename}
      />
    </div>
  );
}
