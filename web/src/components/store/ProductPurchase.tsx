"use client";

import { useMemo, useState } from "react";
import { useCart } from "@/store/cart";
import { formatBRL } from "@/lib/utils";

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
    images: { url: string; alt: string | null }[];
    variants: Variant[];
  };
};

export function ProductPurchase({ product }: Props) {
  const addItem = useCart((s) => s.addItem);
  const sizes = useMemo(
    () => [...new Set(product.variants.map((v) => v.size))],
    [product.variants]
  );
  const [size, setSize] = useState(sizes[0] || "");
  const colorsForSize = product.variants.filter((v) => v.size === size);
  const [color, setColor] = useState(colorsForSize[0]?.color || "");
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const selected =
    product.variants.find((v) => v.size === size && v.color === color) ||
    colorsForSize[0];

  const price = Number(selected?.price || product.price);

  function onSelectSize(next: string) {
    setSize(next);
    const nextColors = product.variants.filter((v) => v.size === next);
    setColor(nextColors[0]?.color || "");
  }

  function handleAdd() {
    if (!selected || selected.stock < 1) return;
    addItem({
      variantId: selected.id,
      productId: product.id,
      productName: product.name,
      slug: product.slug,
      size: selected.size,
      color: selected.color,
      price,
      imageUrl: product.images[0]?.url || "",
      maxStock: selected.stock,
      quantity: qty,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        {sizes.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onSelectSize(s)}
            className={`px-3 py-2 text-xs uppercase tracking-wider border ${
              size === s
                ? "border-ink bg-ink text-white"
                : "border-line bg-white"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {colorsForSize.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => setColor(v.color)}
            title={v.color}
            className={`h-9 w-9 border-2 ${
              color === v.color ? "border-ink" : "border-transparent"
            }`}
            style={{ background: v.colorHex || "#ccc" }}
          />
        ))}
      </div>

      <p className="text-2xl font-semibold mb-2">{formatBRL(price)}</p>
      <p className="text-sm text-muted mb-6">
        {selected && selected.stock > 0
          ? `${selected.stock} em estoque — ${selected.color}`
          : "Esgotado nesta combinação"}
      </p>

      <div className="flex items-center gap-3 mb-4">
        <label className="text-xs uppercase tracking-wider text-muted">
          Qtd
        </label>
        <input
          type="number"
          min={1}
          max={selected?.stock || 1}
          value={qty}
          onChange={(e) => setQty(Number(e.target.value))}
          className="input w-20"
        />
      </div>

      <button
        type="button"
        className="btn btn-primary w-full md:w-auto"
        disabled={!selected || selected.stock < 1}
        onClick={handleAdd}
      >
        {added ? "Adicionado!" : "Adicionar ao carrinho"}
      </button>
    </div>
  );
}
