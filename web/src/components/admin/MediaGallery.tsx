"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type ReactNode,
} from "react";
import { ChevronLeft, ChevronRight, Trash2, Upload, X } from "lucide-react";
import { AssetNameEditor } from "@/components/admin/AssetNameEditor";

export type MediaGalleryItem = {
  id: string;
  url: string;
  thumbUrl: string;
  alt: string | null;
  source: string;
  /** Presente quando a foto veio de um produto */
  productId?: string | null;
  productName?: string | null;
  productSlug?: string | null;
};

export type MediaBank = "cutout" | "upload";

type Props = {
  items: MediaGalleryItem[];
  /** modo página inteira (admin/mídias) ou overlay */
  mode?: "page" | "modal";
  open?: boolean;
  onClose?: () => void;
  title?: string;
  subtitle?: string;
  search?: string;
  onSearchChange?: (q: string) => void;
  /** Upload em lote (1 ou várias imagens) */
  onUpload?: (files: File[]) => void | Promise<void>;
  uploadLabel?: string;
  /** Ação extra no cabeçalho (ex.: recortar com IA) */
  extraActions?: ReactNode;
  /** Abas dos dois bancos */
  banks?: MediaBank[];
  activeBank?: MediaBank;
  onBankChange?: (bank: MediaBank) => void;
  /** Selecionar para o banner/produto */
  onSelect?: (item: MediaGalleryItem) => void;
  selectLabel?: string;
  /** Excluir do banco (uploads/cutouts) */
  onDelete?: (item: MediaGalleryItem) => void | Promise<void>;
  /** Renomear nome exibido (`alt`) no banco */
  onRename?: (item: MediaGalleryItem, name: string) => void | Promise<void>;
  /** URLs já usadas (destaque) */
  selectedUrls?: string[];
  /** Upload em andamento (desabilita zona) */
  uploadBusy?: boolean;
  uploadProgress?: string;
};

const BANK_LABEL: Record<MediaBank, string> = {
  cutout: "Recortadas",
  upload: "Adicionadas",
};

const SOURCE_LABEL: Record<string, string> = {
  cutout: "Recortada",
  upload: "Adicionada",
  product: "Produto",
};

const IMAGE_EXT = /\.(jpe?g|png|webp|gif|heic|heif|avif|bmp|tiff?)$/i;

function isImageFile(file: File) {
  if (file.type.startsWith("image/")) return true;
  return IMAGE_EXT.test(file.name);
}

function filesFromList(list: FileList | File[] | null | undefined): File[] {
  if (!list) return [];
  return Array.from(list).filter(isImageFile);
}

async function filesFromDataTransfer(dt: DataTransfer): Promise<File[]> {
  const fromFiles = filesFromList(dt.files);
  if (fromFiles.length > 0) return fromFiles;

  const items = Array.from(dt.items || []);
  const out: File[] = [];
  for (const item of items) {
    if (item.kind === "file") {
      const f = item.getAsFile();
      if (f && isImageFile(f)) out.push(f);
    }
  }
  return out;
}

function canDelete(item: MediaGalleryItem) {
  return (
    item.source === "upload" ||
    item.source === "cutout" ||
    (!item.id.startsWith("product-") && item.url.includes("/uploads/media/"))
  );
}

export function MediaGallery({
  items,
  mode = "page",
  open = true,
  onClose,
  title = "Banco de imagens",
  subtitle,
  search = "",
  onSearchChange,
  onUpload,
  uploadLabel = "Adicionar fotos",
  extraActions,
  banks,
  activeBank,
  onBankChange,
  onSelect,
  selectLabel = "Selecionar",
  onDelete,
  onRename,
  selectedUrls = [],
  uploadBusy = false,
  uploadProgress,
}: Props) {
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [productFilter, setProductFilter] = useState("");
  const dragDepth = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [localBank, setLocalBank] = useState<MediaBank>(
    activeBank || banks?.[0] || "upload"
  );

  const bank = activeBank ?? localBank;

  useEffect(() => {
    if (activeBank) setLocalBank(activeBank);
  }, [activeBank]);

  function setBank(next: MediaBank) {
    setLocalBank(next);
    onBankChange?.(next);
    setIndex(0);
    if (next === "cutout") setProductFilter("");
  }

  const productOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of items) {
      if (m.productId && m.productName) {
        map.set(m.productId, m.productName);
      }
    }
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) =>
        a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" })
      );
  }, [items]);

  const bankItems = useMemo(() => {
    if (!banks?.length) return items;
    if (bank === "upload") {
      return items.filter(
        (m) => m.source === "upload" || m.source === "product"
      );
    }
    return items.filter((m) => m.source === "cutout");
  }, [items, banks, bank]);

  const filtered = useMemo(() => {
    let list = bankItems;

    if (productFilter) {
      list = list.filter((m) => m.productId === productFilter);
    }

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((m) => {
        const name = (m.alt || "").toLowerCase();
        const product = (m.productName || "").toLowerCase();
        return (
          name.includes(q) ||
          product.includes(q) ||
          m.url.toLowerCase().includes(q) ||
          m.source.toLowerCase().includes(q) ||
          (SOURCE_LABEL[m.source] || "").toLowerCase().includes(q)
        );
      });
      list = [...list].sort((a, b) => {
        const aKey = a.productName || a.alt || a.url;
        const bKey = b.productName || b.alt || b.url;
        return aKey.localeCompare(bKey, "pt-BR", { sensitivity: "base" });
      });
    } else if (productFilter) {
      list = [...list].sort((a, b) =>
        (a.alt || a.url).localeCompare(b.alt || b.url, "pt-BR", {
          sensitivity: "base",
        })
      );
    }

    return list;
  }, [bankItems, search, productFilter]);

  useEffect(() => {
    if (index >= filtered.length) setIndex(Math.max(0, filtered.length - 1));
  }, [filtered.length, index]);

  const submitFiles = useCallback(
    async (files: File[]) => {
      if (!onUpload || uploadBusy || files.length === 0) return;
      await onUpload(files);
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [onUpload, uploadBusy]
  );

  useEffect(() => {
    if (!onUpload || !open) return;
    const onPaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      const files = filesFromList(e.clipboardData?.files);
      const items = Array.from(e.clipboardData?.items || []);
      const fromItems: File[] = [];
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const f = item.getAsFile();
          if (f) fromItems.push(f);
        }
      }
      const all = files.length > 0 ? files : fromItems;
      if (all.length === 0) return;
      e.preventDefault();
      void submitFiles(all);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [onUpload, open, submitFiles]);

  useEffect(() => {
    if (mode !== "modal" || !open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose?.();
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
      if (e.key === "ArrowRight")
        setIndex((i) => Math.min(filtered.length - 1, i + 1));
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [mode, open, onClose, filtered.length]);

  if (mode === "modal" && !open) return null;

  const current = filtered[index] || null;
  const cutoutCount = items.filter((m) => m.source === "cutout").length;
  const uploadCount = items.filter(
    (m) => m.source === "upload" || m.source === "product"
  ).length;

  async function handleDelete(item: MediaGalleryItem) {
    if (!onDelete || !canDelete(item)) return;
    if (!confirm("Excluir esta imagem do banco?")) return;
    setBusy(true);
    try {
      await onDelete(item);
      setIndex((i) => Math.max(0, i - 1));
    } finally {
      setBusy(false);
    }
  }

  function onDragEnter(e: DragEvent) {
    if (!onUpload || uploadBusy) return;
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current += 1;
    setDragging(true);
  }

  function onDragLeave(e: DragEvent) {
    if (!onUpload) return;
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragging(false);
  }

  function onDragOver(e: DragEvent) {
    if (!onUpload || uploadBusy) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
  }

  async function onDrop(e: DragEvent) {
    if (!onUpload || uploadBusy) return;
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current = 0;
    setDragging(false);
    const files = await filesFromDataTransfer(e.dataTransfer);
    await submitFiles(files);
  }

  const shell = (
    <div
      className={
        mode === "modal"
          ? "fixed inset-0 z-[90] bg-[#f7f3ee] flex flex-col"
          : "min-h-[70vh] flex flex-col gap-4"
      }
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div
        className={`flex flex-wrap items-center justify-between gap-3 ${
          mode === "modal" ? "px-4 py-3 border-b border-black/10 bg-white" : ""
        }`}
      >
        <div className="flex items-center gap-3">
          {mode === "modal" && onClose ? (
            <button
              type="button"
              className="p-2 hover:bg-black/5"
              onClick={onClose}
              aria-label="Fechar"
            >
              <X size={20} />
            </button>
          ) : null}
          <div>
            <h2 className="text-xl font-semibold">{title}</h2>
            <p className="text-xs text-muted">
              {subtitle
                ? subtitle
                : `${filtered.length} foto(s)${
                    current ? ` · ${index + 1} de ${filtered.length}` : ""
                  }`}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          {onSearchChange ? (
            <input
              className="input !py-2 min-w-[200px]"
              type="search"
              placeholder="Filtrar por nome ou produto…"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              aria-label="Filtrar imagens por nome ou produto"
            />
          ) : null}
          {productOptions.length > 0 &&
          (!banks?.length || bank === "upload") ? (
            <select
              className="input !py-2 min-w-[200px] max-w-[280px]"
              value={productFilter}
              onChange={(e) => {
                setProductFilter(e.target.value);
                setIndex(0);
              }}
              aria-label="Filtrar por produto"
            >
              <option value="">Todos os produtos</option>
              {productOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          ) : null}
          {extraActions}
          {onUpload ? (
            <label
              className={`btn btn-primary !py-2 cursor-pointer inline-flex items-center gap-2 ${
                uploadBusy ? "opacity-50 pointer-events-none" : ""
              }`}
            >
              <Upload size={14} />
              {uploadLabel}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                disabled={uploadBusy}
                onChange={(e) => {
                  void submitFiles(filesFromList(e.target.files));
                }}
              />
            </label>
          ) : null}
        </div>
      </div>

      {banks && banks.length > 0 ? (
        <div
          className={`flex flex-wrap gap-2 ${mode === "modal" ? "px-4" : ""}`}
        >
          {banks.map((b) => {
            const count = b === "cutout" ? cutoutCount : uploadCount;
            const active = bank === b;
            return (
              <button
                key={b}
                type="button"
                onClick={() => setBank(b)}
                className={`px-4 py-2 text-sm border transition-colors ${
                  active
                    ? "bg-ink text-white border-ink"
                    : "bg-white border-black/15 text-ink hover:border-ink/40"
                }`}
              >
                {BANK_LABEL[b]}
                <span
                  className={`ml-2 text-xs ${active ? "opacity-80" : "text-muted"}`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      {banks?.includes("cutout") && bank === "cutout" ? (
        <p className={`text-xs text-muted ${mode === "modal" ? "px-4" : ""}`}>
          Modelos sem fundo para banners. Use “Recortar foto (IA)” ou envie um
          PNG já transparente.
        </p>
      ) : null}
      {banks?.includes("upload") && bank === "upload" ? (
        <p className={`text-xs text-muted ${mode === "modal" ? "px-4" : ""}`}>
          Fotos do banco e imagens dos produtos. Use o filtro de produto ou
          digite o nome (ex.: Conjunto Jade). Arraste várias fotos, escolha em
          lote ou cole com Ctrl+V.
        </p>
      ) : null}

      {onUpload ? (
        <div
          className={`${mode === "modal" ? "px-4" : ""} ${
            dragging
              ? "border-2 border-dashed border-ink bg-[#ebe4db]"
              : "border border-dashed border-black/15 bg-white/70"
          } px-4 py-5 text-center transition-colors`}
        >
          <p className="text-sm text-[#2a2420]">
            {uploadBusy
              ? uploadProgress || "Enviando…"
              : dragging
                ? "Solte as fotos aqui"
                : "Arraste fotos aqui · Ctrl+V para colar · ou use o botão Adicionar fotos"}
          </p>
          <p className="text-xs text-muted mt-1">
            JPEG, PNG, WebP e similares. Várias de uma vez.
          </p>
        </div>
      ) : null}

      <div
        className={`flex-1 grid gap-4 ${
          mode === "modal"
            ? "px-4 pb-4 md:grid-cols-[1fr_280px] min-h-0"
            : "md:grid-cols-[1fr_260px]"
        }`}
      >
        <div className="bg-[#f7f3ee] border border-black/10 flex flex-col min-h-[380px] md:min-h-[480px]">
          <div
            className={`relative flex-1 flex items-center justify-center min-h-[320px] md:min-h-[400px] ${
              bank === "cutout" || current?.source === "cutout"
                ? "bg-[length:16px_16px] bg-[linear-gradient(45deg,#ddd_25%,transparent_25%),linear-gradient(-45deg,#ddd_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#ddd_75%),linear-gradient(-45deg,transparent_75%,#ddd_75%)] bg-[position:0_0,0_8px,8px_-8px,-8px_0] bg-[#ebe4db]"
                : "bg-[#ebe4db]"
            }`}
          >
            {current ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={current.url}
                alt={current.alt || ""}
                className="max-h-[52vh] max-w-full object-contain"
              />
            ) : (
              <p className="text-muted text-sm">
                {banks
                  ? `Nenhuma imagem em ${BANK_LABEL[bank].toLowerCase()}`
                  : "Nenhuma imagem"}
              </p>
            )}
            {filtered.length > 1 ? (
              <>
                <button
                  type="button"
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 p-2 shadow disabled:opacity-30"
                  disabled={index <= 0}
                  onClick={() => setIndex((i) => i - 1)}
                  aria-label="Anterior"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 p-2 shadow disabled:opacity-30"
                  disabled={index >= filtered.length - 1}
                  onClick={() => setIndex((i) => i + 1)}
                  aria-label="Próxima"
                >
                  <ChevronRight size={20} />
                </button>
              </>
            ) : null}
          </div>

          {current ? (
            <div className="p-4 border-t border-black/8 flex flex-wrap gap-3 items-start justify-between">
              <div className="min-w-0 flex-1 space-y-2">
                <div className="text-xs text-muted uppercase tracking-wide">
                  {SOURCE_LABEL[current.source] || current.source}
                  {current.productName ? ` · ${current.productName}` : ""}
                  {selectedUrls.includes(current.url) ? " · em uso" : ""}
                </div>
                {onRename && canDelete(current) ? (
                  <AssetNameEditor
                    value={current.alt || ""}
                    placeholder="Nome da imagem"
                    disabled={busy || uploadBusy}
                    onSave={async (name) => {
                      setBusy(true);
                      try {
                        await onRename(current, name);
                      } finally {
                        setBusy(false);
                      }
                    }}
                  />
                ) : (
                  <p className="text-sm font-medium text-[#2a2420] line-clamp-2">
                    {current.alt ||
                      current.productName ||
                      "Sem nome"}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {onSelect ? (
                  <button
                    type="button"
                    className="btn btn-primary !py-2"
                    disabled={busy || uploadBusy}
                    onClick={() => onSelect(current)}
                  >
                    {selectLabel}
                  </button>
                ) : null}
                {onDelete && canDelete(current) ? (
                  <button
                    type="button"
                    className="btn btn-outline !py-2 text-red-700 border-red-200"
                    disabled={busy || uploadBusy}
                    onClick={() => handleDelete(current)}
                  >
                    <Trash2 size={14} />
                    Excluir
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        <div className="bg-white border border-black/10 p-3 overflow-auto max-h-[70vh]">
          <p className="text-xs uppercase tracking-wider text-muted mb-2">
            Galeria
          </p>
          <div className="grid grid-cols-3 gap-2">
            {filtered.map((m, i) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setIndex(i)}
                title={
                  m.productName
                    ? `${m.productName}${m.alt ? ` · ${m.alt}` : ""}`
                    : m.alt || undefined
                }
                className={`overflow-hidden border-2 text-left ${
                  m.source === "cutout"
                    ? "bg-[length:10px_10px] bg-[linear-gradient(45deg,#e8e8e8_25%,transparent_25%),linear-gradient(-45deg,#e8e8e8_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#e8e8e8_75%),linear-gradient(-45deg,transparent_75%,#e8e8e8_75%)] bg-[position:0_0,0_5px,5px_-5px,-5px_0] bg-white"
                    : "bg-[#f3eee8]"
                } ${
                  i === index
                    ? "border-ink"
                    : selectedUrls.includes(m.url)
                      ? "border-[var(--rose)]"
                      : "border-transparent"
                }`}
              >
                <div className="aspect-square overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={m.thumbUrl || m.url}
                    alt=""
                    className="w-full h-full object-contain"
                  />
                </div>
                <p className="px-1 py-1 text-[10px] leading-tight text-[#2a2420] truncate border-t border-black/5">
                  {m.productName || m.alt?.trim() || "Sem nome"}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return shell;
}
