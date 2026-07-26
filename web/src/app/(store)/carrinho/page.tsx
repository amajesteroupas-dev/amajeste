"use client";

import Link from "next/link";
import { useCart } from "@/store/cart";
import { formatBRL } from "@/lib/utils";

export default function CartPage() {
  const { items, updateQty, removeItem, subtotal } = useCart();

  if (items.length === 0) {
    return (
      <div className="container-maj py-20 text-center">
        <h1
          className="text-4xl mb-4"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Carrinho
        </h1>
        <p className="text-muted mb-6">Seu carrinho está vazio.</p>
        <Link href="/" className="btn btn-primary">
          Continuar comprando
        </Link>
      </div>
    );
  }

  return (
    <div className="container-maj py-12">
      <h1
        className="text-4xl mb-8"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Carrinho
      </h1>
      <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          {items.map((item) => (
            <div
              key={item.variantId}
              className="flex gap-4 border border-line bg-surface p-4"
            >
              <div className="h-24 w-20 shrink-0 bg-[#ebe4db]">
                {item.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.imageUrl}
                    alt={item.productName}
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
              <div className="flex-1">
                <Link
                  href={`/produto/${item.slug}`}
                  className="font-medium hover:text-rose-dark"
                >
                  {item.productName}
                </Link>
                <p className="text-sm text-muted">
                  {item.size} · {item.color}
                </p>
                <p className="mt-1 font-semibold">{formatBRL(item.price)}</p>
                <div className="mt-2 flex items-center gap-3">
                  <input
                    type="number"
                    min={1}
                    max={item.maxStock}
                    value={item.quantity}
                    onChange={(e) =>
                      updateQty(item.variantId, Number(e.target.value))
                    }
                    className="input w-16"
                  />
                  <button
                    type="button"
                    className="text-sm text-rose-dark"
                    onClick={() => removeItem(item.variantId)}
                  >
                    Remover
                  </button>
                </div>
              </div>
              <div className="font-semibold">
                {formatBRL(item.price * item.quantity)}
              </div>
            </div>
          ))}
        </div>
        <aside className="border border-line bg-surface p-6 h-fit">
          <p className="text-sm text-muted mb-2">Subtotal</p>
          <p className="text-2xl font-semibold mb-6">
            {formatBRL(subtotal())}
          </p>
          <Link href="/checkout" className="btn btn-primary w-full">
            Finalizar compra
          </Link>
        </aside>
      </div>
    </div>
  );
}
