"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Minus, Plus, ShoppingBag, Trash2, ArrowLeft } from "lucide-react";
import { useCart } from "@/store/cart";
import { formatBRL } from "@/lib/utils";

export default function CartPage() {
  const { items, updateQty, removeItem, subtotal, totalItems } = useCart();
  const [stockAlerts, setStockAlerts] = useState<Record<string, string>>({});

  useEffect(() => {
    // Limpa alertas de itens removidos
    setStockAlerts((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const id of Object.keys(next)) {
        if (!items.some((i) => i.variantId === id)) {
          delete next[id];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [items]);

  function clearAlert(variantId: string) {
    setStockAlerts((prev) => {
      if (!prev[variantId]) return prev;
      const next = { ...prev };
      delete next[variantId];
      return next;
    });
  }

  function setQuantity(variantId: string, quantity: number, maxStock: number) {
    const stock = Math.max(0, maxStock || 0);
    if (quantity > stock) {
      setStockAlerts((prev) => ({
        ...prev,
        [variantId]:
          stock <= 0
            ? "Esta peça está sem estoque no momento."
            : stock === 1
              ? "Só há 1 unidade disponível em estoque."
              : `Quantidade indisponível. Há apenas ${stock} unidades em estoque.`,
      }));
      updateQty(variantId, Math.max(1, stock));
      return;
    }
    clearAlert(variantId);
    updateQty(variantId, quantity);
  }

  if (items.length === 0) {
    return (
      <div className="container-maj py-16 md:py-24">
        <div className="mx-auto max-w-md text-center">
          <span className="inline-flex h-14 w-14 items-center justify-center bg-[#f0e8df] text-[#a85f64] mb-5">
            <ShoppingBag size={26} strokeWidth={1.5} />
          </span>
          <h1
            className="text-3xl md:text-4xl text-[#2a2420] mb-3"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Seu carrinho
          </h1>
          <p className="text-sm text-[#5c534c] mb-8 leading-relaxed">
            Ainda não há peças por aqui. Explore a coleção e encontre o look
            ideal para o seu treino.
          </p>
          <Link href="/" className="btn btn-primary">
            Continuar comprando
          </Link>
        </div>
      </div>
    );
  }

  const count = totalItems();

  return (
    <div className="container-maj py-10 md:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8 md:mb-10">
        <div>
          <h1
            className="text-3xl md:text-4xl text-[#2a2420]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Carrinho
          </h1>
          <p className="mt-1.5 text-sm text-[#8a7468]">
            {count} {count === 1 ? "peça" : "peças"} selecionada
            {count === 1 ? "" : "s"}
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-[#a85f64] hover:text-[#8a4a4f] transition-colors"
        >
          <ArrowLeft size={16} strokeWidth={1.75} />
          Continuar comprando
        </Link>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)] lg:items-start">
        <section className="border border-[#2a2420]/10 bg-white divide-y divide-[#2a2420]/08">
          {items.map((item) => {
            const stock = Math.max(0, item.maxStock || 0);
            const lineTotal = item.price * item.quantity;
            const alert = stockAlerts[item.variantId];
            const atMax = item.quantity >= stock;

            return (
              <article
                key={item.variantId}
                className="flex gap-3 sm:gap-5 p-4 sm:p-5"
              >
                <Link
                  href={`/produto/${item.slug}`}
                  className="relative h-28 w-[5.5rem] sm:h-32 sm:w-24 shrink-0 overflow-hidden bg-[#ebe4db]"
                >
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.imageUrl}
                      alt={item.productName}
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </Link>

                <div className="min-w-0 flex-1 flex flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/produto/${item.slug}`}
                        className="block text-[15px] font-medium text-[#2a2420] hover:text-[#a85f64] transition-colors truncate"
                      >
                        {item.productName}
                      </Link>
                      <p className="mt-0.5 text-xs text-[#8a7468]">
                        {item.size} · {item.color}
                      </p>
                      <p className="mt-1 text-sm text-[#2a2420]">
                        {formatBRL(item.price)}
                        <span className="text-[#8a7468]"> / un.</span>
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-[#2a2420] tabular-nums">
                      {formatBRL(lineTotal)}
                    </p>
                  </div>

                  <div className="mt-auto pt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase tracking-[0.14em] text-[#8a7468]">
                        Qtd
                      </span>
                      <div className="inline-flex items-center border border-[#2a2420]/15 bg-[#faf7f3]">
                        <button
                          type="button"
                          aria-label="Diminuir quantidade"
                          className="flex h-8 w-8 items-center justify-center text-[#2a2420] hover:bg-black/5 disabled:opacity-40"
                          disabled={item.quantity <= 1}
                          onClick={() =>
                            setQuantity(
                              item.variantId,
                              item.quantity - 1,
                              stock
                            )
                          }
                        >
                          <Minus size={14} strokeWidth={2} />
                        </button>
                        <input
                          type="number"
                          min={1}
                          max={stock}
                          value={item.quantity}
                          aria-label="Quantidade"
                          className="h-8 w-10 border-x border-[#2a2420]/15 bg-transparent text-center text-sm tabular-nums outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          onChange={(e) => {
                            const raw = e.target.value;
                            if (raw === "") return;
                            setQuantity(
                              item.variantId,
                              Number(raw),
                              stock
                            );
                          }}
                        />
                        <button
                          type="button"
                          aria-label="Aumentar quantidade"
                          className="flex h-8 w-8 items-center justify-center text-[#2a2420] hover:bg-black/5 disabled:opacity-40"
                          disabled={stock <= 0 || atMax}
                          onClick={() =>
                            setQuantity(
                              item.variantId,
                              item.quantity + 1,
                              stock
                            )
                          }
                        >
                          <Plus size={14} strokeWidth={2} />
                        </button>
                      </div>
                    </div>

                    <p
                      className={`text-xs ${
                        stock <= 0
                          ? "text-rose-700"
                          : stock <= 3
                            ? "text-[#a67c6a]"
                            : "text-[#8a7468]"
                      }`}
                    >
                      {stock <= 0
                        ? "Sem estoque"
                        : stock === 1
                          ? "1 unidade em estoque"
                          : `${stock} em estoque`}
                    </p>

                    <button
                      type="button"
                      className="ml-auto inline-flex items-center gap-1.5 text-xs text-[#a85f64] hover:text-[#8a4a4f] transition-colors"
                      onClick={() => removeItem(item.variantId)}
                    >
                      <Trash2 size={13} strokeWidth={1.75} />
                      Remover
                    </button>
                  </div>

                  {alert ? (
                    <p
                      role="alert"
                      className="mt-2.5 text-xs text-[#8a3a3a] bg-[#f8ecec] border border-[#e8c8c8] px-2.5 py-2"
                    >
                      {alert}
                    </p>
                  ) : null}
                </div>
              </article>
            );
          })}
        </section>

        <aside className="border border-[#2a2420]/10 bg-white p-5 sm:p-6 lg:sticky lg:top-24">
          <h2
            className="text-lg text-[#2a2420] mb-4"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Resumo
          </h2>

          <div className="space-y-2.5 text-sm text-[#5c534c]">
            <div className="flex justify-between gap-3">
              <span>
                Subtotal ({count} {count === 1 ? "item" : "itens"})
              </span>
              <span className="tabular-nums text-[#2a2420]">
                {formatBRL(subtotal())}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span>Frete</span>
              <span className="text-[#8a7468]">Calculado no checkout</span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-[#2a2420]/10 flex justify-between items-baseline gap-3">
            <span className="text-sm font-medium text-[#2a2420]">Total</span>
            <span className="text-xl font-semibold tabular-nums text-[#2a2420]">
              {formatBRL(subtotal())}
            </span>
          </div>

          <Link
            href="/checkout"
            className="btn btn-primary w-full mt-5 text-center"
          >
            Finalizar compra
          </Link>
          <Link
            href="/"
            className="btn btn-outline w-full mt-2.5 text-center"
          >
            Continuar comprando
          </Link>

          <p className="mt-4 text-[11px] leading-relaxed text-[#8a7468]">
            Pagamento seguro. O frete e o cupom, se houver, são aplicados na
            próxima etapa.
          </p>
        </aside>
      </div>
    </div>
  );
}
