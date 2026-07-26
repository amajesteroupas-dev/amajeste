"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/store/cart";
import { formatBRL } from "@/lib/utils";
import type { ShippingQuote } from "@/lib/shipping";

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, clear } = useCart();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [zip, setZip] = useState("");
  const [quotes, setQuotes] = useState<ShippingQuote[]>([]);
  const [shippingId, setShippingId] = useState("");
  const [method, setMethod] = useState<"pix" | "checkout">("pix");

  useEffect(() => {
    if (items.length === 0) router.replace("/carrinho");
  }, [items.length, router]);

  async function quoteFreight() {
    setError("");
    const res = await fetch("/api/shipping/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toZip: zip, weightKg: Math.max(0.5, items.length * 0.4) }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Erro ao cotar frete");
      return;
    }
    setQuotes(data.quotes);
    if (data.quotes?.[0]) setShippingId(data.quotes[0].id);
  }

  const selectedShipping = quotes.find((q) => q.id === shippingId);
  const shippingCost = selectedShipping?.price || 0;
  const total = subtotal() + shippingCost;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(e.currentTarget);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestName: form.get("name"),
          guestEmail: form.get("email"),
          guestPhone: form.get("phone"),
          shippingStreet: form.get("street"),
          shippingNumber: form.get("number"),
          shippingComplement: form.get("complement"),
          shippingNeighborhood: form.get("neighborhood"),
          shippingCity: form.get("city"),
          shippingState: form.get("state"),
          shippingZip: zip,
          shippingMethod: selectedShipping
            ? `${selectedShipping.company} ${selectedShipping.name}`
            : "A combinar",
          shippingCost,
          paymentMethod: method,
          items: items.map((i) => ({
            variantId: i.variantId,
            quantity: i.quantity,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha no pedido");
      clear();
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else {
        router.push(`/checkout/sucesso?order=${data.orderNumber}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  if (items.length === 0) return null;

  return (
    <div className="container-maj py-12">
      <h1
        className="text-4xl mb-8"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Checkout
      </h1>
      <form onSubmit={onSubmit} className="grid gap-10 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <section className="border border-line bg-surface p-6 space-y-3">
            <h2 className="text-lg font-semibold mb-2">Seus dados</h2>
            <input name="name" required placeholder="Nome completo" className="input" />
            <input name="email" type="email" required placeholder="E-mail" className="input" />
            <input name="phone" required placeholder="WhatsApp" className="input" />
          </section>

          <section className="border border-line bg-surface p-6 space-y-3">
            <h2 className="text-lg font-semibold mb-2">Entrega</h2>
            <div className="flex gap-2">
              <input
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                placeholder="CEP"
                className="input"
                required
              />
              <button type="button" className="btn btn-outline" onClick={quoteFreight}>
                Calcular frete
              </button>
            </div>
            {quotes.length > 0 && (
              <div className="space-y-2">
                {quotes.map((q) => (
                  <label
                    key={q.id}
                    className="flex items-center justify-between gap-3 border border-line p-3 cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="shipping"
                        checked={shippingId === q.id}
                        onChange={() => setShippingId(q.id)}
                      />
                      {q.company} {q.name} · {q.deliveryDays} dias
                    </span>
                    <strong>{formatBRL(q.price)}</strong>
                  </label>
                ))}
              </div>
            )}
            <input name="street" required placeholder="Rua" className="input" />
            <div className="grid grid-cols-2 gap-3">
              <input name="number" required placeholder="Número" className="input" />
              <input name="complement" placeholder="Complemento" className="input" />
            </div>
            <input name="neighborhood" required placeholder="Bairro" className="input" />
            <div className="grid grid-cols-2 gap-3">
              <input name="city" required placeholder="Cidade" className="input" />
              <input name="state" required placeholder="UF" maxLength={2} className="input" />
            </div>
          </section>

          <section className="border border-line bg-surface p-6 space-y-3">
            <h2 className="text-lg font-semibold mb-2">Pagamento</h2>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={method === "pix"}
                onChange={() => setMethod("pix")}
              />
              Pix
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={method === "checkout"}
                onChange={() => setMethod("checkout")}
              />
              Cartão / Mercado Pago
            </label>
          </section>
        </div>

        <aside className="border border-line bg-surface p-6 h-fit space-y-3">
          {items.map((i) => (
            <div key={i.variantId} className="flex justify-between text-sm gap-2">
              <span>
                {i.productName} × {i.quantity}
              </span>
              <span>{formatBRL(i.price * i.quantity)}</span>
            </div>
          ))}
          <div className="border-t border-line pt-3 flex justify-between text-sm">
            <span>Frete</span>
            <span>{formatBRL(shippingCost)}</span>
          </div>
          <div className="flex justify-between text-lg font-semibold">
            <span>Total</span>
            <span>{formatBRL(total)}</span>
          </div>
          {error && <p className="text-sm text-rose-dark">{error}</p>}
          <button type="submit" className="btn btn-primary w-full" disabled={loading}>
            {loading ? "Processando..." : "Confirmar pedido"}
          </button>
        </aside>
      </form>
    </div>
  );
}
