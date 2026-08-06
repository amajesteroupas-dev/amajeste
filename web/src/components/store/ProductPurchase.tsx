"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus } from "lucide-react";
import { useCart } from "@/store/cart";
import { formatBRL } from "@/lib/utils";
import { formatCep } from "@/lib/cep";
import type { ShippingQuote } from "@/lib/shipping";
import { colorToHex, normalizeColor, pickImageForColor, swatchBackground } from "@/lib/colors";
import { PaymentOffer } from "@/components/store/PaymentOffer";
import { SizeGuideModal } from "@/components/store/SizeGuideModal";
import { StockAlertForm } from "@/components/store/StockAlertForm";
import { useSitePromo } from "@/components/store/SitePromoContext";
import { applyPriceAdjust, promoPrice } from "@/lib/promotion-pricing";

type Variant = {
  id: string;
  size: string;
  color: string;
  colorHex: string | null;
  stock: number;
  price: string | null;
};

type Props = {
  product: {
    id: string;
    name: string;
    slug: string;
    description: string;
    price: string;
    compareAt?: string | null;
    images: { url: string; alt: string | null }[];
    variants: Variant[];
    installmentsMax?: number;
    interestFree?: boolean;
    pixDiscountPercent?: number;
    showPaymentFlags?: boolean;
    /** Ajuste de preço da categoria (%). */
    priceAdjustPercent?: number;
  };
  selectedColor: string;
  onColorChange: (color: string) => void;
  sizeGuideImageUrl?: string | null;
};

export function ProductPurchase({
  product,
  selectedColor,
  onColorChange,
  sizeGuideImageUrl,
}: Props) {
  const router = useRouter();
  const sitePromo = useSitePromo();
  const addItem = useCart((s) => s.addItem);
  const shippingZip = useCart((s) => s.shippingZip);
  const setShippingZip = useCart((s) => s.setShippingZip);
  const variants = useMemo(
    () =>
      product.variants.map((v) => ({
        ...v,
        color: normalizeColor(v.color),
      })),
    [product.variants]
  );
  const sizes = useMemo(
    () => [...new Set(variants.map((v) => v.size))],
    [variants]
  );

  const initialSize = useMemo(() => {
    const inStock = variants.find((v) => v.stock > 0);
    if (inStock) return inStock.size;
    return sizes[0] || "";
  }, [variants, sizes]);
  const [size, setSize] = useState(initialSize);
  const colorsForSize = variants.filter((v) => v.size === size);
  const color =
    colorsForSize.find((v) => v.color === selectedColor && v.stock > 0)
      ?.color ||
    colorsForSize.find((v) => v.color === selectedColor)?.color ||
    colorsForSize.find((v) => v.stock > 0)?.color ||
    colorsForSize[0]?.color ||
    selectedColor;
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [buying, setBuying] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [stockAlert, setStockAlert] = useState("");
  const [cepInput, setCepInput] = useState("");
  const [freightLoading, setFreightLoading] = useState(false);
  const [freightError, setFreightError] = useState("");
  const [freightQuotes, setFreightQuotes] = useState<ShippingQuote[]>([]);

  useEffect(() => {
    if (shippingZip && !cepInput) {
      setCepInput(formatCep(shippingZip));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shippingZip]);

  const selected =
    variants.find((v) => v.size === size && v.color === color) ||
    colorsForSize[0];

  const inStock = Boolean(selected && selected.stock > 0);
  const stock = selected?.stock || 0;
  const rawPrice = Number(selected?.price || product.price);
  const price = applyPriceAdjust(rawPrice, product.priceAdjustPercent);
  const compareAtRaw = product.compareAt ? Number(product.compareAt) : null;
  const compareAt =
    compareAtRaw != null && Number.isFinite(compareAtRaw)
      ? applyPriceAdjust(compareAtRaw, product.priceAdjustPercent)
      : null;
  const hasSitePromo =
    Math.max(
      sitePromo.active ? sitePromo.percent : 0,
      sitePromo.pixOfferPercent,
      sitePromo.card1xOfferPercent
    ) > 0;
  const displayPercent = Math.max(
    sitePromo.active ? sitePromo.percent : 0,
    sitePromo.pixOfferPercent,
    sitePromo.card1xOfferPercent
  );
  const displayPrice = hasSitePromo
    ? promoPrice(price, displayPercent)
    : price;
  const strikePrice = hasSitePromo
    ? price
    : compareAt && compareAt > price
      ? compareAt
      : null;

  function onSelectSize(next: string) {
    setSize(next);
    const nextColors = variants.filter((v) => v.size === next);
    const keepInStock = nextColors.find(
      (v) => v.color === selectedColor && v.stock > 0
    )?.color;
    const keep = nextColors.find((v) => v.color === selectedColor)?.color;
    const firstStock = nextColors.find((v) => v.stock > 0)?.color;
    onColorChange(keepInStock || firstStock || keep || nextColors[0]?.color || "");
    setQty(1);
    setStockAlert("");
  }

  function changeQty(next: number) {
    if (!selected) return;
    if (next > selected.stock) {
      setStockAlert(
        selected.stock === 1
          ? "Só há 1 unidade disponível em estoque."
          : `Quantidade indisponível. Há apenas ${selected.stock} unidades em estoque.`
      );
      setQty(Math.max(1, selected.stock));
      return;
    }
    setStockAlert("");
    setQty(Math.max(1, next));
  }

  function buildCartPayload() {
    if (!selected || selected.stock < 1) return null;
    const imageUrl =
      pickImageForColor(product.images, selected.color) ||
      product.images[0]?.url ||
      "";
    const safeQty = Math.min(Math.max(1, qty), selected.stock);
    return {
      variantId: selected.id,
      productId: product.id,
      productName: product.name,
      slug: product.slug,
      size: selected.size,
      color: selected.color,
      price,
      imageUrl,
      maxStock: selected.stock,
      quantity: safeQty,
    };
  }

  function persistCep() {
    const digits = cepInput.replace(/\D/g, "");
    if (digits.length === 8) setShippingZip(formatCep(digits));
  }

  function handleAdd() {
    const payload = buildCartPayload();
    if (!payload) return;
    if (qty > stock) {
      changeQty(qty);
      return;
    }
    persistCep();
    addItem(payload);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  }

  function handleBuyNow() {
    const payload = buildCartPayload();
    if (!payload) return;
    if (qty > stock) {
      changeQty(qty);
      return;
    }
    persistCep();
    setBuying(true);
    addItem(payload);
    router.push("/checkout");
  }

  async function calcFreight() {
    setFreightError("");
    setFreightQuotes([]);
    if (!selected) {
      setFreightError("Selecione tamanho e cor.");
      return;
    }
    const digits = cepInput.replace(/\D/g, "");
    if (digits.length !== 8) {
      setFreightError("Informe um CEP válido.");
      return;
    }
    setShippingZip(formatCep(digits));
    setFreightLoading(true);
    try {
      const res = await fetch("/api/shipping/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toZip: digits,
          items: [{ variantId: selected.id, quantity: qty }],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFreightError(data.error || "Não foi possível calcular o frete.");
        return;
      }
      setFreightQuotes(Array.isArray(data.quotes) ? data.quotes : []);
      if (!data.quotes?.length) {
        setFreightError("Nenhuma opção de frete para este CEP.");
      }
    } catch {
      setFreightError("Falha ao calcular o frete. Tente de novo.");
    } finally {
      setFreightLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-baseline gap-2.5 flex-wrap">
          <p className="text-2xl md:text-[1.75rem] font-semibold tracking-tight">
            {formatBRL(displayPrice)}
          </p>
          {strikePrice ? (
            <p className="text-muted line-through text-sm">
              {formatBRL(strikePrice)}
            </p>
          ) : null}
          {hasSitePromo ? (
            <span className="text-xs font-semibold uppercase tracking-wide text-[#a85f64]">
              −{displayPercent}%
            </span>
          ) : null}
        </div>
        <p className="text-xs text-muted mt-1">
          {inStock
            ? `${selected!.stock} em estoque`
            : "Esgotado nesta combinação"}
        </p>
        <div className="mt-3">
          <PaymentOffer
            price={price}
            installmentsMax={product.installmentsMax ?? 2}
            interestFree={product.interestFree ?? true}
            pixDiscountPercent={product.pixDiscountPercent ?? 5}
            showCardFlags={product.showPaymentFlags ?? true}
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between gap-3 mb-1.5">
          <p className="text-[10px] uppercase tracking-[0.14em] text-muted">
            Tamanho
          </p>
          <button
            type="button"
            onClick={() => setGuideOpen(true)}
            className="text-[11px] text-ink underline underline-offset-4 decoration-ink/35 hover:decoration-ink transition-colors"
          >
            Guia de medidas
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {sizes.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onSelectSize(s)}
              className={`min-w-11 px-3 py-2 text-[11px] uppercase tracking-wider border transition-colors ${
                size === s
                  ? "border-ink bg-ink text-white"
                  : "border-line bg-white hover:border-ink"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-[10px] uppercase tracking-[0.14em] text-muted mb-1.5">
          Cor —{" "}
          <span className="text-ink normal-case tracking-normal">{color}</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {colorsForSize.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => {
                onColorChange(v.color);
                setQty(1);
                setStockAlert("");
              }}
              title={v.color}
              className={`flex items-center gap-2 border px-2.5 py-1.5 text-[11px] ${
                color === v.color ? "border-ink" : "border-line"
              }`}
            >
              <span
                className="h-4 w-4 rounded-full border border-black/10"
                style={{
                  background: swatchBackground(
                    colorToHex(v.color, v.colorHex)
                  ),
                }}
              />
              {v.color}
            </button>
          ))}
        </div>
      </div>

      {inStock ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.14em] text-muted mb-1.5">
                Qtd
              </p>
              <div className="inline-flex items-center border border-line bg-white">
                <button
                  type="button"
                  aria-label="Diminuir quantidade"
                  className="flex h-9 w-8 items-center justify-center hover:bg-black/5 disabled:opacity-40"
                  disabled={qty <= 1}
                  onClick={() => changeQty(qty - 1)}
                >
                  <Minus size={14} strokeWidth={2} />
                </button>
                <input
                  type="number"
                  min={1}
                  max={stock}
                  value={qty}
                  aria-label="Quantidade"
                  className="h-9 w-9 border-x border-line bg-transparent text-center text-sm tabular-nums outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === "") return;
                    changeQty(Number(raw));
                  }}
                />
                <button
                  type="button"
                  aria-label="Aumentar quantidade"
                  className="flex h-9 w-8 items-center justify-center hover:bg-black/5 disabled:opacity-40"
                  disabled={qty >= stock}
                  onClick={() => changeQty(qty + 1)}
                >
                  <Plus size={14} strokeWidth={2} />
                </button>
              </div>
            </div>

            <div className="min-w-[11.5rem] flex-1 max-w-xs">
              <p className="text-[10px] uppercase tracking-[0.14em] text-muted mb-1.5">
                Frete
              </p>
              <div className="flex border border-line bg-white">
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="postal-code"
                  placeholder="CEP"
                  value={cepInput}
                  onChange={(e) => {
                    const formatted = formatCep(e.target.value);
                    setCepInput(formatted);
                    setFreightError("");
                    const digits = formatted.replace(/\D/g, "");
                    if (digits.length === 8) setShippingZip(formatted);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void calcFreight();
                    }
                  }}
                  className="h-9 w-full min-w-0 bg-transparent px-2.5 text-sm outline-none"
                  aria-label="CEP para calcular frete"
                />
                <button
                  type="button"
                  className="h-9 shrink-0 border-l border-line px-3 text-[11px] uppercase tracking-wider text-ink hover:bg-black/5 disabled:opacity-40"
                  disabled={freightLoading || !selected}
                  onClick={() => void calcFreight()}
                >
                  {freightLoading ? "…" : "OK"}
                </button>
              </div>
            </div>
          </div>

          {stockAlert ? (
            <p
              role="alert"
              className="text-xs text-[#8a3a3a] bg-[#f8ecec] border border-[#e8c8c8] px-2.5 py-2"
            >
              {stockAlert}
            </p>
          ) : null}

          {freightError ? (
            <p className="text-xs text-[#8a3a3a]">{freightError}</p>
          ) : null}

          {freightQuotes.length > 0 ? (
            <ul className="border border-line divide-y divide-line">
              {freightQuotes.map((q) => (
                <li
                  key={q.id}
                  className="flex items-start justify-between gap-3 px-2.5 py-2 text-xs text-ink"
                >
                  <span className="min-w-0">
                    {q.local
                      ? `${q.company}: ${q.name}`
                      : `${q.company} ${q.name}`}
                    {!q.local ? (
                      <span className="text-muted">
                        {" "}
                        · {q.deliveryDays} dia(s)
                      </span>
                    ) : null}
                    {q.note ? (
                      <span className="block text-[11px] text-muted mt-0.5">
                        {q.note}
                      </span>
                    ) : null}
                  </span>
                  <span className="shrink-0 font-medium tabular-nums">
                    {q.local ? "A combinar" : formatBRL(q.price)}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="grid gap-2 sm:grid-cols-2 pt-0.5">
            <button
              type="button"
              className="btn btn-primary w-full"
              disabled={!selected || selected.stock < 1}
              onClick={handleAdd}
            >
              {added ? "Adicionado!" : "Adicionar ao carrinho"}
            </button>
            <button
              type="button"
              className="btn btn-outline w-full"
              disabled={!selected || selected.stock < 1 || buying}
              onClick={handleBuyNow}
            >
              {buying ? "Redirecionando…" : "Finalizar compra"}
            </button>
          </div>
        </div>
      ) : (
        <StockAlertForm
          productId={product.id}
          productName={product.name}
          variantId={selected?.id}
          size={selected?.size || size}
          color={selected?.color || color}
        />
      )}

      <SizeGuideModal
        open={guideOpen}
        onClose={() => setGuideOpen(false)}
        imageUrl={sizeGuideImageUrl}
      />
    </div>
  );
}
