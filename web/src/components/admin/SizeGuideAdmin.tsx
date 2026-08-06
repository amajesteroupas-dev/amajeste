"use client";

import { useEffect, useState } from "react";
import {
  MediaGallery,
  type MediaBank,
  type MediaGalleryItem,
} from "@/components/admin/MediaGallery";

export function SizeGuideAdmin() {
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [library, setLibrary] = useState<MediaGalleryItem[]>([]);
  const [bank, setBank] = useState<MediaBank>("cutout");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings/size-guide")
      .then((r) => r.json())
      .then((d) => setUrl(d.url || ""))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!pickerOpen) return;
    const q = new URLSearchParams({
      source: bank,
      includeProducts: bank === "upload" ? "1" : "0",
    });
    fetch(`/api/admin/media?${q}`)
      .then((r) => r.json())
      .then((d) =>
        setLibrary(
          Array.isArray(d.library)
            ? d.library
            : Array.isArray(d.items)
              ? d.items
              : Array.isArray(d)
                ? d
                : []
        )
      )
      .catch(() => setLibrary([]));
  }, [pickerOpen, bank]);

  async function save(next: string) {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/settings/size-guide", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: next }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "Falha ao salvar");
        return;
      }
      setUrl(data.url);
      setMessage("Foto do guia de medidas atualizada.");
      setPickerOpen(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-panel-card border border-black/10 bg-white p-5 space-y-4">
      <div>
        <h2
          className="text-xl text-[#2a2420]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Guia de medidas
        </h2>
        <p className="text-sm text-[#6b5f56] mt-1">
          Escolha uma foto do banco (preferência: recortada, corpo inteiro) para
          aparecer no modal da página do produto.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-6">
        <div className="relative h-52 w-36 bg-[#f3ebe3] border border-[#e0d4c8] overflow-hidden flex items-end justify-center">
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url}
              alt="Prévia guia de medidas"
              className="max-h-full max-w-full object-contain object-bottom"
            />
          ) : (
            <span className="text-xs text-[#6b5f56] p-3 text-center">
              Nenhuma foto
            </span>
          )}
        </div>
        <div className="space-y-3">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setPickerOpen(true)}
            disabled={saving}
          >
            Escolher no banco de imagens
          </button>
          {message && <p className="text-sm text-[#5c4336]">{message}</p>}
        </div>
      </div>

      <MediaGallery
        mode="modal"
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Foto do guia de medidas"
        subtitle="Selecione uma modelo recortada em pé — fica ótimo com as linhas de busto, cintura e quadril."
        items={library}
        banks={["cutout", "upload"]}
        activeBank={bank}
        onBankChange={setBank}
        search={search}
        onSearchChange={setSearch}
        selectedUrls={url ? [url] : []}
        selectLabel={saving ? "Salvando…" : "Usar no guia"}
        onSelect={(item) => save(item.url)}
      />
    </div>
  );
}
