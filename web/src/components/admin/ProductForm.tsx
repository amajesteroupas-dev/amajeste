"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ColorMultiSwatchPicker } from "@/components/admin/ColorMultiSwatchPicker";
import { HelpTip } from "@/components/admin/HelpTip";
import { MetaCatalogSyncButtons } from "@/components/admin/MetaCatalogSyncButtons";
import { colorToHex, normalizeColor, swatchBackground } from "@/lib/colors";
import { flattenCategoryOptions } from "@/lib/categories";

type Category = { id: string; name: string; parentId?: string | null };

const SIZE_OPTIONS = ["PP", "P", "M", "G", "GG", "XG", "Único"];

function skuSlug(part: string) {
  return part
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-zA-Z0-9]+/g, "")
    .toUpperCase()
    .slice(0, 12);
}

export function ProductForm({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const categoryOptions = useMemo(
    () => flattenCategoryOptions(categories),
    [categories]
  );  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [skuPrefix, setSkuPrefix] = useState("");
  const [sizes, setSizes] = useState<string[]>(["M"]);
  const [colors, setColors] = useState<{ name: string; hex: string }[]>([]);
  const [stock, setStock] = useState("10");

  const previewVariants = useMemo(() => {
    const prefix = skuPrefix.trim() || skuSlug(name) || "SKU";
    const list: { sku: string; size: string; color: string; hex: string }[] =
      [];
    for (const size of sizes) {
      for (const c of colors) {
        const colorName = normalizeColor(c.name);
        list.push({
          sku: `${prefix}-${skuSlug(size) || size}-${skuSlug(colorName) || "COR"}`,
          size,
          color: colorName,
          hex: c.hex || colorToHex(colorName),
        });
      }
    }
    return list;
  }, [sizes, colors, skuPrefix, name]);

  function toggleSize(s: string) {
    setSizes((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(e.currentTarget);

    if (sizes.length === 0) {
      setLoading(false);
      setError("Selecione ao menos um tamanho");
      return;
    }
    if (colors.length === 0) {
      setLoading(false);
      setError("Selecione ao menos uma cor");
      return;
    }

    const res = await fetch("/api/admin/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        description: form.get("description"),
        price: Number(form.get("price")),
        costPrice: Number(form.get("costPrice") || 0),
        categoryId: form.get("categoryId"),
        featured: form.get("featured") === "on",
        destaque: form.get("destaque") === "on",
        skuPrefix: skuPrefix.trim() || undefined,
        sizes,
        colors: colors.map((c) => ({
          name: normalizeColor(c.name),
          hex: c.hex,
        })),
        stock: Number(stock || 0),
        installmentsMax: Number(form.get("installmentsMax") || 2),
        interestFree: form.get("interestFree") === "on",
        pixDiscountPercent: Number(form.get("pixDiscountPercent") || 5),
        showPaymentFlags: form.get("showPaymentFlags") === "on",
        weightKg: Number(form.get("weightKg") || 0) || null,
        lengthCm: Number(form.get("lengthCm") || 0) || null,
        widthCm: Number(form.get("widthCm") || 0) || null,
        heightCm: Number(form.get("heightCm") || 0) || null,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Erro ao salvar");
      return;
    }
    setOpen(false);
    setName("");
    setSkuPrefix("");
    setSizes(["M"]);
    setColors([]);
    setStock("10");
    setError("");
    router.refresh();
    if (data.id) {
      router.push(`/admin/produtos/${data.id}?novo=1`);
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start gap-2">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Fechar" : "Novo produto"}
        </button>
        <MetaCatalogSyncButtons />
      </div>
      {open && (
        <form
          onSubmit={onSubmit}
          className="mt-4 grid gap-4 md:grid-cols-2 border border-line bg-surface p-5"
        >
          <label className="block text-xs uppercase tracking-wider text-muted">
            Nome do produto
            <input
              name="name"
              required
              className="input mt-1"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!skuPrefix) {
                  /* prefix suggested on blur via empty — keep manual */
                }
              }}
              placeholder="Ex: Corta Vento"
            />
          </label>

          <label className="block text-xs uppercase tracking-wider text-muted">
            Categoria
            <select name="categoryId" required className="input mt-1">
              <option value="">Selecione…</option>
              {categoryOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-xs uppercase tracking-wider text-muted">
            Preço de venda (R$)
            <input
              name="price"
              type="number"
              step="0.01"
              min="0"
              required
              className="input mt-1"
              placeholder="99.90"
            />
          </label>

          <label className="block text-xs uppercase tracking-wider text-muted">
            Custo (R$) — só admin
            <input
              name="costPrice"
              type="number"
              step="0.01"
              min="0"
              className="input mt-1"
              placeholder="0.00"
            />
          </label>

          <label className="block text-xs uppercase tracking-wider text-muted md:col-span-2">
            Descrição
            <textarea
              name="description"
              required
              className="input mt-1 min-h-24"
              placeholder="Detalhes do produto, material, cuidados…"
            />
          </label>

          <label className="block text-xs uppercase tracking-wider text-muted">
            Prefixo do SKU
            <input
              className="input mt-1"
              value={skuPrefix}
              onChange={(e) => setSkuPrefix(e.target.value.toUpperCase())}
              placeholder={skuSlug(name) || "Ex: CV"}
            />
            <span className="block normal-case tracking-normal text-[11px] mt-1 font-normal">
              Usado para gerar o código de cada variante (ex: CV-M-PRETO).
            </span>
          </label>

          <label className="block text-xs uppercase tracking-wider text-muted">
            Estoque inicial (por variante)
            <input
              type="number"
              min="0"
              className="input mt-1"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              placeholder="10"
            />
            <span className="block normal-case tracking-normal text-[11px] mt-1 font-normal">
              Quantidade aplicada em cada combinação tamanho + cor.
            </span>
          </label>

          <div className="md:col-span-2 space-y-2">
            <p className="text-xs uppercase tracking-wider text-muted">
              Tamanhos
            </p>
            <div className="flex flex-wrap gap-2">
              {SIZE_OPTIONS.map((s) => {
                const active = sizes.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSize(s)}
                    className={`min-w-[2.75rem] px-3 py-2 text-sm border ${
                      active
                        ? "bg-ink text-white border-ink"
                        : "bg-white border-black/15 hover:border-ink/40"
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-muted">
              Selecione um ou mais tamanhos. Pode marcar vários.
            </p>
          </div>

          <div className="md:col-span-2">
            <ColorMultiSwatchPicker
              label="Cores"
              values={colors}
              onChange={setColors}
            />
          </div>

          {previewVariants.length > 0 ? (
            <div className="md:col-span-2 border border-black/8 bg-[#faf7f3] p-3">
              <p className="text-xs uppercase tracking-wider text-muted mb-2">
                Variantes que serão criadas ({previewVariants.length})
              </p>
              <div className="overflow-x-auto max-h-40 overflow-y-auto">
                <table className="table text-sm">
                  <thead>
                    <tr>
                      <th>SKU</th>
                      <th>Tamanho</th>
                      <th>Cor</th>
                      <th>Estoque</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewVariants.map((v) => (
                      <tr key={v.sku}>
                        <td className="font-mono text-xs">{v.sku}</td>
                        <td>{v.size}</td>
                        <td>
                          <span className="inline-flex items-center gap-1.5">
                            <span
                              className="h-3 w-3 rounded-full border border-black/20"
                              style={{ background: swatchBackground(v.hex) }}
                            />
                            {v.color}
                          </span>
                        </td>
                        <td>{stock || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <p className="md:col-span-2 text-sm text-muted">
              Escolha tamanho(s) e cor(es) para ver as variantes.
            </p>
          )}

          <div className="md:col-span-2 space-y-2">
            <p className="text-xs uppercase tracking-wider text-muted">
              Seções da home
            </p>
            <div className="flex flex-wrap gap-2">
              <label className="inline-flex items-center gap-2 border border-black/15 bg-white px-3 py-2 text-sm cursor-pointer has-[:checked]:border-[#c2a45b] has-[:checked]:bg-[#fbf6eb]">
                <input
                  name="featured"
                  type="checkbox"
                  className="accent-[#c2a45b]"
                />
                <span>
                  <span className="font-medium text-[#9a782f]">Majesté</span>
                  <span className="text-muted text-xs block">
                    Grade superior da home
                  </span>
                </span>
              </label>
              <label className="inline-flex items-center gap-2 border border-black/15 bg-white px-3 py-2 text-sm cursor-pointer has-[:checked]:border-[#a85f64] has-[:checked]:bg-[#faf3f3]">
                <input
                  name="destaque"
                  type="checkbox"
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

          <div className="md:col-span-2 border-t border-line pt-3 space-y-3">
            <p className="text-xs uppercase tracking-wider text-muted font-semibold">
              Frete (Melhor Envio / Manda Bem)
            </p>
            <p className="text-[11px] text-muted">
              Peso e medidas da embalagem — mesmos dados para Melhor Envio e
              Manda Bem no checkout.
            </p>
            <label className="block text-xs uppercase tracking-wider text-muted">
              Peso (kg)
              <HelpTip text="Peso do produto embalado, em quilogramas. Ex.: conjunto 0,4 kg." />
              <input
                name="weightKg"
                type="number"
                min={0}
                step="0.01"
                defaultValue={0.4}
                className="input mt-1"
              />
            </label>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted mb-1">
                Dimensões (cm)
                <HelpTip text="Comprimento, largura e altura da embalagem em centímetros (Melhor Envio e Manda Bem)." />
              </p>
              <div className="grid grid-cols-3 gap-2">
                <input
                  name="lengthCm"
                  type="number"
                  min={0}
                  step="0.1"
                  placeholder="Comprimento"
                  defaultValue={30}
                  className="input"
                />
                <input
                  name="widthCm"
                  type="number"
                  min={0}
                  step="0.1"
                  placeholder="Largura"
                  defaultValue={25}
                  className="input"
                />
                <input
                  name="heightCm"
                  type="number"
                  min={0}
                  step="0.1"
                  placeholder="Altura"
                  defaultValue={5}
                  className="input"
                />
              </div>
            </div>
          </div>

          <div className="md:col-span-2 border-t border-line pt-3 space-y-3">
            <p className="text-xs uppercase tracking-wider text-muted font-semibold">
              Pagamento e descontos
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs uppercase tracking-wider text-muted">
                Parcelas (até)
                <input
                  name="installmentsMax"
                  type="number"
                  min={1}
                  max={12}
                  defaultValue={2}
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
                  defaultValue={5}
                  className="input mt-1"
                />
              </label>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input name="interestFree" type="checkbox" defaultChecked />{" "}
              Parcelas sem juros
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input name="showPaymentFlags" type="checkbox" defaultChecked />{" "}
              Mostrar bandeiras de cartão
            </label>
          </div>

          {error ? (
            <p className="text-sm text-rose-dark md:col-span-2">{error}</p>
          ) : null}
          <button
            type="submit"
            className="btn btn-gold md:col-span-2"
            disabled={loading}
          >
            {loading
              ? "Salvando..."
              : `Salvar produto (${previewVariants.length || 0} variante(s))`}
          </button>
        </form>
      )}
    </div>
  );
}
