"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PaymentFlagsRow } from "@/components/store/PaymentFlags";
import { MediaGallery, type MediaGalleryItem } from "@/components/admin/MediaGallery";
import { ColorSwatchPicker } from "@/components/admin/ColorSwatchPicker";
import { HelpTip } from "@/components/admin/HelpTip";
import { FinanceCollapse as AdminCollapse } from "@/components/admin/FinanceCollapse";
import { colorToHex, normalizeColor, swatchBackground } from "@/lib/colors";
import { flattenCategoryOptions } from "@/lib/categories";
import {
  evaluateProductReadiness,
  type ReadinessIssue,
} from "@/lib/product-readiness";

type Props = {
  product: {
    id: string;
    name: string;
    description: string;
    price: number;
    costPrice: number;
    categoryId: string;
    featured: boolean;
    destaque: boolean;
    active: boolean;
    installmentsMax: number;
    interestFree: boolean;
    pixDiscountPercent: number;
    showPaymentFlags: boolean;
    weightKg: number | null;
    lengthCm: number | null;
    widthCm: number | null;
    heightCm: number | null;
    videoUrl: string | null;
  };
  categories: { id: string; name: string; parentId?: string | null }[];
  variants: {
    id: string;
    sku: string;
    size: string;
    color: string;
    colorHex: string | null;
    stock: number;
    active: boolean;
  }[];
  images: { id: string; url: string; alt: string | null }[];
};

export function ProductEditForm({
  product,
  categories: initialCategories,
  variants,
  images,
}: Props) {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [saveIssues, setSaveIssues] = useState<ReadinessIssue[]>([]);
  const [imageMsg, setImageMsg] = useState("");
  const [imageBusy, setImageBusy] = useState(false);
  const [imageErrorDetail, setImageErrorDetail] = useState("");
  const [videoUrl, setVideoUrl] = useState(product.videoUrl || "");
  const [videoBusy, setVideoBusy] = useState(false);
  const [videoMsg, setVideoMsg] = useState("");
  const [categories, setCategories] = useState(initialCategories);
  const [categoryId, setCategoryId] = useState(product.categoryId);
  const [price, setPrice] = useState(product.price);
  const [activeChecked, setActiveChecked] = useState(product.active);
  const [weightKg, setWeightKg] = useState(product.weightKg ?? 0.4);
  const [lengthCm, setLengthCm] = useState(product.lengthCm ?? 30);
  const [widthCm, setWidthCm] = useState(product.widthCm ?? 25);
  const [heightCm, setHeightCm] = useState(product.heightCm ?? 5);
  const [newCat, setNewCat] = useState("");
  const [creatingCat, setCreatingCat] = useState(false);
  const [library, setLibrary] = useState<MediaGalleryItem[]>([]);
  const [galleryOpen, setGalleryOpen] = useState(true);
  const categoryOptions = useMemo(
    () => flattenCategoryOptions(categories),
    [categories]
  );
  const [q, setQ] = useState("");
  const [variantColor, setVariantColor] = useState("");
  const [variantHex, setVariantHex] = useState("#cccccc");
  const [variantSku, setVariantSku] = useState("");
  const [variantSize, setVariantSize] = useState("");
  const [variantStock, setVariantStock] = useState("");
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);
  const [variantBusy, setVariantBusy] = useState(false);

  const productColors = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const v of variants) {
      const n = normalizeColor(v.color);
      if (!n || seen.has(n)) continue;
      seen.add(n);
      out.push(n);
    }
    return out;
  }, [variants]);

  const readiness = useMemo(
    () =>
      evaluateProductReadiness({
        price,
        categoryId,
        weightKg,
        lengthCm,
        widthCm,
        heightCm,
        variants,
        images,
      }),
    [
      price,
      categoryId,
      weightKg,
      lengthCm,
      widthCm,
      heightCm,
      variants,
      images,
    ]
  );

  useEffect(() => {
    if (readiness.ok) setSaveIssues([]);
  }, [readiness.ok]);

  useEffect(() => {
    (async () => {
      const res = await fetch(
        "/api/admin/media?source=upload&includeProducts=1"
      );
      if (!res.ok) return;
      const data = await res.json();
      setLibrary(data.library || []);
    })();
  }, []);

  async function saveProduct(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const payload = {
      name: form.get("name"),
      description: form.get("description"),
      price: Number(form.get("price")),
      costPrice: Number(form.get("costPrice")),
      categoryId,
      featured: form.get("featured") === "on",
      destaque: form.get("destaque") === "on",
      active: form.get("active") === "on",
      installmentsMax: Number(form.get("installmentsMax") || 2),
      interestFree: form.get("interestFree") === "on",
      pixDiscountPercent: Number(form.get("pixDiscountPercent") || 0),
      showPaymentFlags: form.get("showPaymentFlags") === "on",
      weightKg: Number(form.get("weightKg") || 0) || null,
      lengthCm: Number(form.get("lengthCm") || 0) || null,
      widthCm: Number(form.get("widthCm") || 0) || null,
      heightCm: Number(form.get("heightCm") || 0) || null,
    };

    if (payload.active) {
      const check = evaluateProductReadiness({
        price: payload.price,
        categoryId: payload.categoryId,
        weightKg: payload.weightKg,
        lengthCm: payload.lengthCm,
        widthCm: payload.widthCm,
        heightCm: payload.heightCm,
        variants,
        images,
      });
      if (!check.ok) {
        setSaveIssues(check.issues);
        const titles = check.issues.map((i) => i.message).join(" · ");
        setMsg(
          titles
            ? `Não deu para ativar — ${titles}`
            : "Não deu para ativar — complete o checklist abaixo."
        );
        return;
      }
    }

    const res = await fetch(`/api/admin/products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const issues = Array.isArray(data.issues) ? data.issues : [];
      setSaveIssues(issues);
      setMsg(data.error || "Erro ao salvar");
      return;
    }
    setSaveIssues([]);
    setMsg(
      payload.active
        ? "Produto salvo e ativo na loja"
        : "Produto salvo como rascunho (inativo)"
    );
    router.refresh();
  }

  async function createCategory() {
    const name = newCat.trim();
    if (!name) return;
    setCreatingCat(true);
    const res = await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    setCreatingCat(false);
    if (!res.ok) {
      alert(data.error || "Falha ao criar categoria");
      return;
    }
    setCategories((prev) => [
      ...prev,
      { id: data.id, name: data.name, parentId: data.parentId ?? null },
    ]);
    setCategoryId(data.id);
    setNewCat("");
    setMsg(`Categoria "${data.name}" criada`);
  }

  function resetVariantForm() {
    setEditingVariantId(null);
    setVariantSku("");
    setVariantSize("");
    setVariantStock("");
    setVariantColor("");
    setVariantHex("#cccccc");
  }

  function startEditVariant(v: Props["variants"][number]) {
    setEditingVariantId(v.id);
    setVariantSku(v.sku);
    setVariantSize(v.size);
    setVariantStock(String(v.stock));
    setVariantColor(v.color);
    setVariantHex(v.colorHex || colorToHex(v.color));
    setMsg(`Editando variante ${v.sku}`);
  }

  async function saveVariant(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const color = variantColor.trim();
    if (!variantSku.trim() || !variantSize.trim() || !color) {
      alert("Preencha SKU, tamanho e cor");
      return;
    }
    setVariantBusy(true);
    const payload: {
      id?: string;
      sku: string;
      size: string;
      color: string;
      colorHex: string;
      stock?: number;
    } = {
      id: editingVariantId || undefined,
      sku: variantSku.trim(),
      size: variantSize.trim(),
      color: normalizeColor(color),
      colorHex: variantHex || colorToHex(color),
    };
    const stockRaw = variantStock.trim();
    if (editingVariantId) {
      // Em edição: campo vazio NÃO zera — mantém o estoque atual no servidor
      if (stockRaw !== "") {
        const n = Math.floor(Number(stockRaw));
        if (!Number.isFinite(n) || n < 0) {
          setVariantBusy(false);
          alert("Estoque inválido");
          return;
        }
        payload.stock = n;
      }
    } else {
      payload.stock = Math.max(0, Math.floor(Number(stockRaw || 0)) || 0);
    }
    const res = await fetch(`/api/admin/products/${product.id}/variants`, {
      method: editingVariantId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    setVariantBusy(false);
    if (!res.ok) {
      alert(data.error || "Falha ao salvar variante");
      return;
    }
    setMsg(editingVariantId ? "Variante atualizada" : "Variante adicionada");
    resetVariantForm();
    router.refresh();
  }

  async function deleteVariant(variantId: string) {
    if (!confirm("Excluir esta variante?")) return;
    setVariantBusy(true);
    const res = await fetch(
      `/api/admin/products/${product.id}/variants?variantId=${encodeURIComponent(variantId)}`,
      { method: "DELETE" }
    );
    const data = await res.json().catch(() => ({}));
    setVariantBusy(false);
    if (!res.ok) {
      alert(data.error || "Não foi possível excluir");
      return;
    }
    if (editingVariantId === variantId) resetVariantForm();
    setMsg(
      data.deactivated
        ? "Variante desativada (já usada em pedidos). Estoque mantido — use Reativar se precisar."
        : "Variante excluída"
    );
    router.refresh();
  }

  async function setVariantActive(variantId: string, active: boolean) {
    setVariantBusy(true);
    const res = await fetch(`/api/admin/products/${product.id}/variants`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: variantId, active }),
    });
    const data = await res.json().catch(() => ({}));
    setVariantBusy(false);
    if (!res.ok) {
      alert(data.error || "Não foi possível alterar o status");
      return;
    }
    setMsg(active ? "Variante reativada na loja" : "Variante desativada (some da loja)");
    router.refresh();
  }

  async function setImageColor(imageId: string, colorName: string | null) {
    const res = await fetch(`/api/admin/products/${product.id}/images`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imageId,
        alt: colorName,
      }),
    });
    if (!res.ok) {
      alert("Não foi possível vincular a cor à foto");
      return;
    }
    setMsg(
      colorName
        ? `Foto vinculada à cor “${colorName}”`
        : "Vínculo de cor removido da foto"
    );
    router.refresh();
  }

  async function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result || "");
        const comma = result.indexOf(",");
        resolve(comma >= 0 ? result.slice(comma + 1) : result);
      };
      reader.onerror = () =>
        reject(reader.error || new Error("Falha ao ler a foto no aparelho"));
      reader.readAsDataURL(file);
    });
  }

  async function uploadImage(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const input = form.elements.namedItem("file") as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) {
      setImageMsg("Selecione uma foto primeiro.");
      setImageErrorDetail("");
      return;
    }
    if (!file.size) {
      setImageMsg("O arquivo selecionado está vazio no iPhone. Escolha outra foto.");
      setImageErrorDetail(`nome=${file.name}; tipo=${file.type}`);
      return;
    }

    setImageBusy(true);
    setImageMsg("Lendo e enviando imagem…");
    setImageErrorDetail("");
    setMsg("Enviando imagem…");

    try {
      // Base64 JSON — único modo confiável no Safari/iPhone (body binário chega vazio)
      const dataBase64 = await fileToBase64(file);
      if (!dataBase64) {
        setImageMsg("Não foi possível ler a foto no aparelho.");
        setImageErrorDetail(`nome=${file.name}; size=${file.size}`);
        return;
      }

      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          fileName: file.name || "photo.jpg",
          mimeType: file.type || "image/jpeg",
          dataBase64,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        detail?: string;
        url?: string;
        receivedVia?: string;
      };
      if (!res.ok) {
        const err =
          json.error ||
          `Falha ao enviar imagem (HTTP ${res.status}). Tente JPG/PNG.`;
        setImageMsg(err);
        setImageErrorDetail(
          [
            `status=${res.status}`,
            `tipo=${file.type || "desconhecido"}`,
            `nome=${file.name}`,
            `tamanho=${Math.round(file.size / 1024)}KB`,
            json.detail ? `servidor=${json.detail}` : "",
            json.receivedVia ? `via=${json.receivedVia}` : "",
          ]
            .filter(Boolean)
            .join("; ")
        );
        setMsg(err);
        return;
      }
      setImageMsg("Imagem enviada com sucesso.");
      setImageErrorDetail("");
      setMsg("Imagem enviada");
      form.reset();
      router.refresh();
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      const errText = `Falha ao enviar imagem: ${detail}`;
      setImageMsg(errText);
      setImageErrorDetail(detail);
      setMsg(errText);
    } finally {
      setImageBusy(false);
    }
  }

  async function onUploadLibrary(files: File[]) {
    let ok = 0;
    let fail = 0;
    let lastError = "";
    setImageBusy(true);
    setImageMsg("Enviando para o banco…");
    for (const file of files) {
      try {
        const dataBase64 = await fileToBase64(file);
        const res = await fetch("/api/admin/media", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: file.name || "photo.jpg",
            mimeType: file.type || "image/jpeg",
            mode: "upload",
            dataBase64,
          }),
        });
        const asset = await res.json().catch(() => ({}));
        if (!res.ok) {
          fail++;
          lastError =
            (asset as { error?: string }).error || `Erro ${res.status}`;
          continue;
        }
        ok++;
        setLibrary((prev) => [
          {
            id: (asset as { id: string }).id,
            url: (asset as { url: string }).url,
            thumbUrl:
              (asset as { thumbUrl?: string }).thumbUrl ||
              (asset as { url: string }).url,
            alt: (asset as { alt?: string | null }).alt ?? null,
            source: "upload",
          },
          ...prev,
        ]);
      } catch (err) {
        fail++;
        lastError = err instanceof Error ? err.message : "Falha de rede";
      }
    }
    setImageBusy(false);
    if (ok && !fail) {
      setImageMsg(`${ok} imagem(ns) adicionada(s) ao banco`);
      setImageErrorDetail("");
      setMsg(`${ok} imagem(ns) adicionada(s) ao banco`);
    } else if (ok && fail) {
      const t = `${ok} ok, ${fail} falhou. ${lastError}`;
      setImageMsg(t);
      setImageErrorDetail(lastError);
      setMsg(t);
    } else if (fail) {
      const t = `Não foi possível enviar: ${lastError || "erro desconhecido"}`;
      setImageMsg(t);
      setImageErrorDetail(lastError);
      setMsg(t);
    }
  }

  async function attachFromLibrary(item: MediaGalleryItem) {
    const res = await fetch(`/api/admin/products/${product.id}/images`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: item.url, alt: item.alt || product.name }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 409) {
      alert(
        data.error ||
          "Esta foto já está no produto. Só escolha a cor na miniatura existente."
      );
      return;
    }
    if (!res.ok) {
      alert(data.error || "Não foi possível anexar a imagem");
      return;
    }
    setMsg("Imagem do banco adicionada ao produto");
    router.refresh();
  }

  async function dedupeProductImages() {
    if (
      !confirm(
        "Remover fotos repetidas (mesma imagem várias vezes) neste produto?\n\nFica só uma cópia de cada foto."
      )
    ) {
      return;
    }
    setImageBusy(true);
    const res = await fetch(
      `/api/admin/products/${product.id}/images?dedupe=1`,
      { method: "DELETE" }
    );
    const data = await res.json().catch(() => ({}));
    setImageBusy(false);
    if (!res.ok) {
      alert(data.error || "Falha ao limpar duplicatas");
      return;
    }
    setMsg(data.message || "Duplicatas removidas");
    router.refresh();
  }

  async function removeImage(imageId: string) {
    if (!confirm("Remover esta imagem do produto?")) return;
    await fetch(
      `/api/admin/products/${product.id}/images?imageId=${encodeURIComponent(imageId)}`,
      { method: "DELETE" }
    );
    router.refresh();
  }

  async function uploadVideo(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    setVideoBusy(true);
    setVideoMsg("");
    const res = await fetch(`/api/admin/products/${product.id}/video`, {
      method: "POST",
      body: data,
    });
    const json = await res.json().catch(() => ({}));
    setVideoBusy(false);
    if (!res.ok) {
      setVideoMsg(json.error || "Erro ao enviar vídeo");
      return;
    }
    setVideoUrl(json.videoUrl || "");
    setVideoMsg("Vídeo enviado");
    form.reset();
    router.refresh();
  }

  async function saveVideoUrl(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const url = videoUrl.trim();
    if (!url) {
      setVideoMsg("Informe a URL do vídeo");
      return;
    }
    setVideoBusy(true);
    setVideoMsg("");
    const res = await fetch(`/api/admin/products/${product.id}/video`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const json = await res.json().catch(() => ({}));
    setVideoBusy(false);
    if (!res.ok) {
      setVideoMsg(json.error || "URL inválida");
      return;
    }
    setVideoUrl(json.videoUrl || url);
    setVideoMsg("Link de vídeo salvo");
    router.refresh();
  }

  async function removeVideo() {
    if (!confirm("Remover o vídeo deste produto?")) return;
    setVideoBusy(true);
    await fetch(`/api/admin/products/${product.id}/video`, { method: "DELETE" });
    setVideoBusy(false);
    setVideoUrl("");
    setVideoMsg("Vídeo removido");
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <form onSubmit={saveProduct} className="space-y-2">
        <div className="sticky top-0 z-20 flex flex-wrap items-center gap-3 border border-black/8 bg-white px-3 py-2.5">
          <button type="submit" className="btn btn-primary">
            Salvar produto
          </button>
          {msg ? (
            <p className="text-sm text-[#5c534c]">{msg}</p>
          ) : (
            <p className="text-xs text-[#7a7168]">
              Salva nome, preço, frete e pagamento (não altera estoque).
            </p>
          )}
        </div>

        {(saveIssues.length > 0 || !readiness.ok) && (
          <div
            className={`border px-3 py-3 text-sm ${
              saveIssues.length > 0
                ? "border-rose-dark/40 bg-[#fdf6f4]"
                : "border-black/10 bg-[#faf7f3]"
            }`}
          >
            <p className="text-xs uppercase tracking-wider text-muted mb-2">
              Para ativar na loja
            </p>
            <ul className="space-y-2">
              {(saveIssues.length > 0 ? saveIssues : readiness.issues).map(
                (issue) => (
                  <li key={issue.code} className="leading-snug">
                    <span className="font-medium text-[#2a2420]">
                      {issue.message}
                    </span>
                    <span className="block text-xs text-muted mt-0.5">
                      {issue.hint}
                    </span>
                  </li>
                )
              )}
            </ul>
            {readiness.ok ? (
              <p className="text-xs text-emerald-800 mt-2">
                Checklist ok — pode marcar “Ativo na loja” e salvar.
              </p>
            ) : null}
          </div>
        )}

        {readiness.ok && saveIssues.length === 0 ? (
          <div className="border border-emerald-800/20 bg-[#f4faf5] px-3 py-2.5 text-sm">
            <p className="text-xs uppercase tracking-wider text-muted mb-1">
              Para ativar na loja
            </p>
            <p className="text-[#2a2420]">
              Tudo certo: preço, categoria, frete, variante ativa e foto por
              cor. Pode ativar na loja.
            </p>
          </div>
        ) : null}

        <AdminCollapse
          title="Dados do produto"
          defaultOpen
          summary={`${product.name} · R$ ${Number(price).toFixed(2).replace(".", ",")}`}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-xs uppercase tracking-wider text-muted">
              Nome do produto
              <input
                name="name"
                defaultValue={product.name}
                className="input mt-1"
                required
              />
            </label>

            <div className="space-y-2">
              <label className="block text-xs uppercase tracking-wider text-muted">
                Categoria
                <select
                  className="input mt-1"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                >
                  {categoryOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex gap-2">
                <input
                  className="input !py-2 flex-1"
                  placeholder="Nova categoria…"
                  value={newCat}
                  onChange={(e) => setNewCat(e.target.value)}
                />
                <button
                  type="button"
                  className="btn btn-outline !py-2 shrink-0"
                  disabled={creatingCat || !newCat.trim()}
                  onClick={createCategory}
                >
                  {creatingCat ? "…" : "Criar"}
                </button>
              </div>
              <p className="text-[11px] text-muted">
                Gerencie subcategorias em{" "}
                <a
                  href="/admin/categorias"
                  className="underline underline-offset-2"
                >
                  Categorias
                </a>
                .
              </p>
            </div>

            <label className="block text-xs uppercase tracking-wider text-muted">
              Preço (R$)
              <input
                name="price"
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="input mt-1"
              />
            </label>
            <label className="block text-xs uppercase tracking-wider text-muted">
              Custo / custo médio (R$) — só admin
              <input
                name="costPrice"
                type="number"
                step="0.01"
                defaultValue={product.costPrice}
                className="input mt-1"
              />
              <span className="block normal-case tracking-normal text-[11px] text-muted mt-1 font-normal">
                Não aparece na loja. Atualiza nas entradas de estoque. Use o
                menu Estoque para compras.
              </span>
            </label>

            <label className="block text-xs uppercase tracking-wider text-muted md:col-span-2">
              Descrição
              <textarea
                name="description"
                defaultValue={product.description}
                className="input mt-1 min-h-28"
              />
            </label>

            <div className="md:col-span-2 space-y-2">
              <p className="text-xs uppercase tracking-wider text-muted">
                Seções da home
              </p>
              <div className="flex flex-wrap gap-2">
                <label className="inline-flex items-center gap-2 border border-black/15 bg-white px-3 py-2 text-sm cursor-pointer">
                  <input
                    name="featured"
                    type="checkbox"
                    defaultChecked={product.featured}
                    className="accent-[#c2a45b]"
                  />
                  <span>
                    <span className="font-medium text-[#9a782f]">Majesté</span>
                    <span className="text-muted text-xs block">
                      Grade superior da home
                    </span>
                  </span>
                </label>
                <label className="inline-flex items-center gap-2 border border-black/15 bg-white px-3 py-2 text-sm cursor-pointer">
                  <input
                    name="destaque"
                    type="checkbox"
                    defaultChecked={product.destaque}
                    className="accent-[#a85f64]"
                  />
                  <span>
                    <span className="font-medium text-[#a85f64]">Destaques</span>
                    <span className="text-muted text-xs block">
                      Grade inferior da home
                    </span>
                  </span>
                </label>
              </div>
            </div>
            <label className="flex items-start gap-2 text-sm md:col-span-2">
              <input
                name="active"
                type="checkbox"
                className="mt-1"
                checked={activeChecked}
                onChange={(e) => setActiveChecked(e.target.checked)}
              />
              <span>
                <span className="font-medium">Ativo na loja</span>
                <span className="block text-xs text-muted mt-0.5 normal-case tracking-normal">
                  Só marque quando fotos reais, frete, variantes e vínculo de
                  cor por foto estiverem ok. Rascunho incompleto pode ficar
                  inativo.
                </span>
                {activeChecked && !readiness.ok ? (
                  <span className="block text-xs text-rose-dark mt-1 normal-case tracking-normal">
                    Checklist incompleto — o salvamento será bloqueado até
                    corrigir.
                  </span>
                ) : null}
              </span>
            </label>
          </div>
        </AdminCollapse>

        <AdminCollapse
          title="Frete (Melhor Envio / Manda Bem)"
          defaultOpen={false}
          summary={`Peso ${weightKg} kg · ${lengthCm}×${widthCm}×${heightCm} cm`}
        >
          <p className="text-[11px] text-muted">
            Peso e medidas da embalagem — usados no cálculo de frete do
            checkout.
          </p>
          <label className="block text-xs uppercase tracking-wider text-muted">
            Peso (kg)
            <HelpTip text="Peso do produto embalado, em quilogramas. Ex.: conjunto 0,4 kg." />
            <input
              name="weightKg"
              type="number"
              min={0}
              step="0.01"
              value={weightKg}
              onChange={(e) => setWeightKg(Number(e.target.value))}
              className="input mt-1"
            />
          </label>
          <div>
            <p className="text-xs uppercase tracking-wider text-muted mb-1">
              Dimensões (cm)
              <HelpTip text="Comprimento, largura e altura da embalagem em centímetros." />
            </p>
            <div className="grid grid-cols-3 gap-2">
              <input
                name="lengthCm"
                type="number"
                min={0}
                step="0.1"
                placeholder="Comprimento"
                value={lengthCm}
                onChange={(e) => setLengthCm(Number(e.target.value))}
                className="input"
              />
              <input
                name="widthCm"
                type="number"
                min={0}
                step="0.1"
                placeholder="Largura"
                value={widthCm}
                onChange={(e) => setWidthCm(Number(e.target.value))}
                className="input"
              />
              <input
                name="heightCm"
                type="number"
                min={0}
                step="0.1"
                placeholder="Altura"
                value={heightCm}
                onChange={(e) => setHeightCm(Number(e.target.value))}
                className="input"
              />
            </div>
          </div>
        </AdminCollapse>

        <AdminCollapse
          title="Pagamento e descontos"
          defaultOpen={false}
          summary={`Até ${product.installmentsMax}x · Pix ${product.pixDiscountPercent}%`}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs uppercase tracking-wider text-muted">
              Parcelas (até)
              <input
                name="installmentsMax"
                type="number"
                min={1}
                max={12}
                defaultValue={product.installmentsMax}
                className="input mt-1"
              />
            </label>
            <label className="block text-xs uppercase tracking-wider text-muted">
              Desconto Pix (%)
              <input
                name="pixDiscountPercent"
                type="number"
                min={0}
                max={30}
                step="0.5"
                defaultValue={product.pixDiscountPercent}
                className="input mt-1"
              />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              name="interestFree"
              type="checkbox"
              defaultChecked={product.interestFree}
            />
            Parcelas sem juros
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              name="showPaymentFlags"
              type="checkbox"
              defaultChecked={product.showPaymentFlags}
            />
            Mostrar bandeiras de cartão na página do produto
          </label>
          <div className="pt-1">
            <p className="text-[11px] text-muted mb-2">Prévia das bandeiras:</p>
            <PaymentFlagsRow />
          </div>
        </AdminCollapse>
      </form>

      <AdminCollapse
        title="Variantes (tamanho + cor)"
        defaultOpen
        summary={`${variants.length} opção(ões) · ${variants.filter((v) => v.active).length} ativa(s) · estoque total ${variants.reduce((s, v) => s + v.stock, 0)}`}
      >
        <p className="text-sm text-muted max-w-2xl leading-relaxed">
          Cada combinação de tamanho e cor deste produto (ex.: M / Rosa). Para
          compras do dia a dia, use o menu <strong>Estoque</strong>. Variantes
          inativas ficam no admin mas <strong>não aparecem na loja</strong>.
        </p>
        <div className="overflow-x-auto">
          <table className="table mb-4">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Tamanho</th>
                <th>Cor</th>
                <th>Estoque</th>
                <th>Status</th>
                <th className="w-[1%] whitespace-nowrap">Ações</th>
              </tr>
            </thead>
            <tbody>
              {variants.map((v) => (
                <tr
                  key={v.id}
                  className={
                    editingVariantId === v.id
                      ? "bg-[var(--cream)]"
                      : !v.active
                        ? "opacity-60"
                        : undefined
                  }
                >
                  <td>{v.sku}</td>
                  <td>{v.size}</td>
                  <td>
                    <span className="inline-flex items-center gap-2">
                      <span
                        className="inline-block h-3.5 w-3.5 rounded-full border border-black/20 shrink-0"
                        style={{
                          background: swatchBackground(
                            colorToHex(v.color, v.colorHex)
                          ),
                        }}
                      />
                      {v.color}
                    </span>
                  </td>
                  <td>{v.stock}</td>
                  <td>
                    {v.active ? (
                      <span className="text-xs font-medium text-emerald-800">
                        Ativa
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-rose-800">
                        Inativa
                      </span>
                    )}
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        className="btn btn-outline !py-1 !px-2 text-xs"
                        disabled={variantBusy}
                        onClick={() => startEditVariant(v)}
                      >
                        Editar
                      </button>
                      {v.active ? (
                        <button
                          type="button"
                          className="btn btn-outline !py-1 !px-2 text-xs"
                          disabled={variantBusy}
                          onClick={() => {
                            if (
                              confirm(
                                "Desativar esta variante? Ela some da loja, mas o estoque fica."
                              )
                            ) {
                              void setVariantActive(v.id, false);
                            }
                          }}
                        >
                          Desativar
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-outline !py-1 !px-2 text-xs text-emerald-800 border-emerald-200"
                          disabled={variantBusy}
                          onClick={() => void setVariantActive(v.id, true)}
                        >
                          Reativar
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn btn-outline !py-1 !px-2 text-xs text-red-700 border-red-200"
                        disabled={variantBusy}
                        onClick={() => deleteVariant(v.id)}
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {variants.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-muted text-sm">
                    Nenhuma variante ainda.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <form onSubmit={saveVariant} className="grid gap-3 md:grid-cols-4">
          <div className="md:col-span-4">
            <p className="text-xs uppercase tracking-wider text-muted">
              {editingVariantId ? "Editando variante" : "Nova variante"}
            </p>
          </div>
          <input
            name="sku"
            placeholder="SKU"
            className="input"
            required
            value={variantSku}
            onChange={(e) => setVariantSku(e.target.value)}
          />
          <input
            name="size"
            placeholder="Tam (P/M/G)"
            className="input"
            required
            value={variantSize}
            onChange={(e) => setVariantSize(e.target.value)}
          />
          <input
            name="stock"
            type="number"
            min={0}
            placeholder={
              editingVariantId ? "Estoque (vazio = manter)" : "Estoque inicial"
            }
            className="input"
            value={variantStock}
            onChange={(e) => setVariantStock(e.target.value)}
          />
          {editingVariantId ? (
            <p className="md:col-span-4 text-xs text-[#7a7168] -mt-1">
              Deixe o estoque em branco para <strong>não alterar</strong> a
              quantidade atual. Para zerar de propósito, digite 0.
            </p>
          ) : null}
          <div className="md:col-span-4">
            <ColorSwatchPicker
              value={variantColor}
              hex={variantHex}
              extraColors={productColors}
              imageUrls={images.map((i) => i.url)}
              onChange={({ name, hex }) => {
                setVariantColor(name);
                setVariantHex(hex);
              }}
            />
          </div>
          <div className="md:col-span-4 flex flex-wrap gap-2">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={variantBusy}
            >
              {editingVariantId ? "Salvar alterações" : "Adicionar variante"}
            </button>
            {editingVariantId ? (
              <button
                type="button"
                className="btn btn-outline"
                disabled={variantBusy}
                onClick={resetVariantForm}
              >
                Cancelar
              </button>
            ) : null}
          </div>
        </form>
      </AdminCollapse>

      <AdminCollapse
        title="Fotos do produto"
        defaultOpen={false}
        summary={`${images.length} foto(s)`}
        actions={
          <button
            type="button"
            className="btn btn-outline !py-1 !px-2 text-[11px]"
            onClick={() => setGalleryOpen((v) => !v)}
          >
            {galleryOpen ? "Ocultar banco" : "Banco"}
          </button>
        }
      >
        <p className="text-sm text-muted">
          Em cada foto, escolha a <strong>cor</strong> correspondente para a
          loja trocar a imagem ao clicar nas bolinhas.{" "}
          <strong>Não adicione a mesma foto várias vezes</strong> — uma foto, uma
          cor.
        </p>

        {images.length > 1 ? (
          <div className="mb-2">
            <button
              type="button"
              className="btn btn-outline !py-1.5 !px-3 text-xs"
              disabled={imageBusy}
              onClick={() => void dedupeProductImages()}
            >
              Remover fotos repetidas neste produto
            </button>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-4">
          {images.map((img) => {
            const linked = img.alt ? normalizeColor(img.alt) : null;
            const isColorLink =
              linked &&
              (productColors.includes(linked) ||
                linked.toLowerCase() !== product.name.toLowerCase());
            return (
              <div key={img.id} className="w-[7.5rem] space-y-2">
                <div className="relative group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.url}
                    alt={img.alt || ""}
                    className="h-28 w-full object-cover border border-black/10 bg-[#eee]"
                    onError={(e) => {
                      const el = e.currentTarget;
                      if (el.dataset.failed === "1") return;
                      el.dataset.failed = "1";
                      el.src =
                        "data:image/svg+xml," +
                        encodeURIComponent(
                          `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><rect fill="#eee" width="100%" height="100%"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#999" font-size="11">Sem preview</text></svg>`
                        );
                    }}
                  />
                  <button
                    type="button"
                    className="absolute inset-x-0 bottom-0 bg-black/70 text-white text-[10px] uppercase py-1 opacity-0 group-hover:opacity-100"
                    onClick={() => removeImage(img.id)}
                  >
                    Remover
                  </button>
                </div>
                <p className="text-[10px] text-muted uppercase tracking-wide">
                  Cor desta foto
                </p>
                <div className="flex flex-wrap gap-1 items-center">
                  <button
                    type="button"
                    title="Remover vínculo de cor"
                    onClick={() => setImageColor(img.id, null)}
                    className={`h-5 px-1.5 rounded-sm border text-[9px] uppercase tracking-wide ${
                      !isColorLink
                        ? "border-ink bg-ink text-white"
                        : "border-black/20 bg-white text-muted"
                    }`}
                  >
                    Sem
                  </button>
                  {productColors.map((c) => {
                    const active = linked === c;
                    const hex = colorToHex(c);
                    const light =
                      (0.299 * parseInt(hex.slice(1, 3), 16) +
                        0.587 * parseInt(hex.slice(3, 5), 16) +
                        0.114 * parseInt(hex.slice(5, 7), 16)) /
                        255 >
                      0.82;
                    return (
                      <button
                        key={c}
                        type="button"
                        title={c}
                        aria-label={c}
                        onClick={() => setImageColor(img.id, c)}
                        className={`h-5 w-5 rounded-full border ${
                          active
                            ? "border-ink ring-1 ring-ink ring-offset-1"
                            : light
                              ? "border-black/40"
                              : "border-black/20"
                        }`}
                        style={{ background: hex }}
                      />
                    );
                  })}
                </div>
                {isColorLink ? (
                  <p className="text-[10px] text-ink truncate">{linked}</p>
                ) : (
                  <p className="text-[10px] text-muted">Não vinculada</p>
                )}
              </div>
            );
          })}
          {images.length === 0 ? (
            <p className="text-sm text-muted">Nenhuma foto ainda.</p>
          ) : null}
        </div>

        {productColors.length === 0 ? (
          <p className="text-xs text-muted">
            Cadastre variantes com cores acima para poder vincular cada foto.
          </p>
        ) : null}

        <form onSubmit={uploadImage} className="flex flex-wrap gap-2 items-center">
          <input
            type="file"
            name="file"
            accept="image/*,.heic,.heif,.jpg,.jpeg,.png,.webp"
            required
            disabled={imageBusy}
          />
          <button type="submit" className="btn btn-dark" disabled={imageBusy}>
            {imageBusy ? "Enviando…" : "Enviar nova imagem"}
          </button>
          <p className="w-full text-[11px] text-muted">
            Escolha a foto e toque em Enviar.
          </p>
        </form>

        {imageMsg ? (
          <div
            className={`w-full border px-3 py-2 text-sm ${
              imageMsg.toLowerCase().includes("sucesso") ||
              imageMsg.toLowerCase().includes("enviada")
                ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                : imageMsg.includes("Enviando")
                  ? "border-black/10 bg-[#f7f3ee] text-ink"
                  : "border-red-300 bg-red-50 text-red-900"
            }`}
            role="status"
          >
            <p className="font-medium">{imageMsg}</p>
            {imageErrorDetail ? (
              <p className="mt-1 text-[11px] break-all opacity-80">
                Detalhe técnico: {imageErrorDetail}
              </p>
            ) : null}
          </div>
        ) : null}

        {galleryOpen ? (
          <div className="border-t border-black/8 pt-4">
            <MediaGallery
              mode="page"
              title="Banco — imagens adicionadas"
              subtitle="Fotos completas do banco (não usa recortes de banner)"
              items={library}
              search={q}
              onSearchChange={setQ}
              onUpload={onUploadLibrary}
              uploadLabel="Adicionar ao banco"
              selectLabel="Usar neste produto"
              selectedUrls={images.map((i) => i.url)}
              onSelect={attachFromLibrary}
            />
          </div>
        ) : null}
      </AdminCollapse>

      <AdminCollapse
        title="Vídeo do produto"
        defaultOpen={false}
        summary={videoUrl ? "Com vídeo" : "Sem vídeo"}
      >
        <p className="text-sm text-muted">
          Prefira vários vídeos por categoria em{" "}
          <a href="/admin/videos" className="underline">
            Admin → Vídeos
          </a>
          . Aqui define um vídeo só deste produto.
        </p>

        {videoUrl ? (
          <div className="flex flex-wrap items-start gap-4">
            <div className="w-full max-w-sm overflow-hidden border border-black/10 bg-black aspect-video">
              {/\.(mp4|webm|mov|m4v)(\?|$)/i.test(videoUrl) ||
              videoUrl.startsWith("/uploads/") ? (
                <video
                  src={videoUrl}
                  controls
                  className="h-full w-full object-contain"
                />
              ) : (
                <p className="p-4 text-sm text-white/80 break-all">{videoUrl}</p>
              )}
            </div>
            <div className="space-y-2 text-sm">
              <p className="text-muted break-all max-w-md">{videoUrl}</p>
              <button
                type="button"
                className="btn btn-outline !py-2"
                disabled={videoBusy}
                onClick={removeVideo}
              >
                Remover vídeo
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted">Nenhum vídeo cadastrado.</p>
        )}

        <form
          onSubmit={uploadVideo}
          className="flex flex-wrap gap-2 items-center"
        >
          <input
            type="file"
            name="file"
            accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
            required
          />
          <button type="submit" className="btn btn-outline" disabled={videoBusy}>
            {videoBusy ? "Enviando…" : "Enviar vídeo"}
          </button>
        </form>

        <form
          onSubmit={saveVideoUrl}
          className="flex flex-wrap gap-2 items-end"
        >
          <label className="flex-1 min-w-[14rem] space-y-1">
            <span className="text-xs uppercase tracking-wide text-muted">
              Ou cole o link
            </span>
            <input
              type="url"
              className="input w-full"
              placeholder="https://youtu.be/… ou /uploads/videos/…"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
            />
          </label>
          <button type="submit" className="btn btn-primary" disabled={videoBusy}>
            Salvar link
          </button>
        </form>
        {videoMsg ? (
          <p className="text-sm text-emerald-800">{videoMsg}</p>
        ) : null}
      </AdminCollapse>
    </div>
  );
}
