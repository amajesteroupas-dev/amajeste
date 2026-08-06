"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatBRL } from "@/lib/utils";

export type ManualSaleVariant = {
  id: string;
  productName: string;
  size: string;
  color: string;
  sku: string;
  stock: number;
  price: number;
};

type Line = {
  key: string;
  variantId: string;
  quantity: number;
  unitPrice: string;
};

type Props = {
  variants: ManualSaleVariant[];
};

export function ManualSaleForm({ variants }: Props) {
  const router = useRouter();
  const [channel, setChannel] = useState("WhatsApp");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Line[]>([
    { key: "1", variantId: "", quantity: 1, unitPrice: "" },
  ]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const byId = useMemo(() => {
    const m = new Map<string, ManualSaleVariant>();
    for (const v of variants) m.set(v.id, v);
    return m;
  }, [variants]);

  const total = useMemo(() => {
    return lines.reduce((sum, line) => {
      const v = byId.get(line.variantId);
      if (!v) return sum;
      const price =
        line.unitPrice !== ""
          ? Number(line.unitPrice)
          : v.price;
      if (!Number.isFinite(price)) return sum;
      return sum + price * Math.max(0, line.quantity);
    }, 0);
  }, [lines, byId]);

  function addLine() {
    setLines((prev) => [
      ...prev,
      {
        key: String(Date.now()),
        variantId: "",
        quantity: 1,
        unitPrice: "",
      },
    ]);
  }

  function updateLine(key: string, patch: Partial<Line>) {
    setLines((prev) =>
      prev.map((l) => (l.key === key ? { ...l, ...patch } : l))
    );
  }

  function removeLine(key: string) {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((l) => l.key !== key)));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);

    const items = lines
      .filter((l) => l.variantId)
      .map((l) => ({
        variantId: l.variantId,
        quantity: l.quantity,
        unitPrice: l.unitPrice === "" ? undefined : Number(l.unitPrice),
      }));

    if (items.length === 0) {
      setErr("Selecione pelo menos um produto");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/admin/finance/manual-sale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel,
          customerName: customerName || undefined,
          customerPhone: customerPhone || undefined,
          date,
          notes: notes || undefined,
          items,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data.error || "Não foi possível registrar");
        setBusy(false);
        return;
      }
      setMsg(
        `Venda ${data.orderNumber} registrada · ${formatBRL(Number(data.total))} · estoque atualizado`
      );
      setLines([{ key: String(Date.now()), variantId: "", quantity: 1, unitPrice: "" }]);
      setCustomerName("");
      setCustomerPhone("");
      setNotes("");
      router.refresh();
    } catch {
      setErr("Erro de conexão");
    }
    setBusy(false);
  }

  return (
    <form
      onSubmit={onSubmit}
      className="border border-line bg-surface p-5 space-y-4 mt-6"
    >
      <div>
        <h2 className="font-semibold text-[#2a2420]">Venda manual (WhatsApp)</h2>
        <p className="text-sm text-muted mt-1">
          Lança a venda no financeiro, cria o pedido como pago e dá baixa no
          estoque automaticamente.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <div>
          <label className="text-xs uppercase tracking-wider text-muted">
            Canal
          </label>
          <select
            className="input mt-1"
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
          >
            <option value="WhatsApp">WhatsApp</option>
            <option value="Presencial">Presencial</option>
            <option value="Instagram">Instagram</option>
            <option value="Outro">Outro</option>
          </select>
        </div>
        <div>
          <label className="text-xs uppercase tracking-wider text-muted">
            Data
          </label>
          <input
            type="date"
            className="input mt-1"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wider text-muted">
            Cliente (opcional)
          </label>
          <input
            className="input mt-1"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Nome"
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wider text-muted">
            Telefone (opcional)
          </label>
          <input
            className="input mt-1"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            placeholder="WhatsApp"
          />
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-xs uppercase tracking-wider text-muted">Itens</p>
        {lines.map((line) => {
          const v = byId.get(line.variantId);
          return (
            <div
              key={line.key}
              className="grid gap-2 md:grid-cols-[1fr_100px_120px_auto] items-end"
            >
              <div>
                <select
                  className="input"
                  value={line.variantId}
                  required
                  onChange={(e) => {
                    const id = e.target.value;
                    const meta = byId.get(id);
                    updateLine(line.key, {
                      variantId: id,
                      unitPrice: meta ? String(meta.price) : "",
                    });
                  }}
                >
                  <option value="">Selecione produto / tamanho / cor</option>
                  {variants.map((opt) => (
                    <option key={opt.id} value={opt.id} disabled={opt.stock < 1}>
                      {opt.productName} · {opt.size} / {opt.color} · estoque{" "}
                      {opt.stock} · {formatBRL(opt.price)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-muted">Qtd</label>
                <input
                  type="number"
                  min={1}
                  max={v?.stock || 999}
                  className="input"
                  value={line.quantity}
                  required
                  onChange={(e) =>
                    updateLine(line.key, {
                      quantity: Math.max(1, Number(e.target.value) || 1),
                    })
                  }
                />
              </div>
              <div>
                <label className="text-[10px] text-muted">Preço un.</label>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  className="input"
                  value={line.unitPrice}
                  onChange={(e) =>
                    updateLine(line.key, { unitPrice: e.target.value })
                  }
                  placeholder={v ? String(v.price) : "0"}
                />
              </div>
              <button
                type="button"
                className="text-xs text-red-700 hover:underline pb-2"
                onClick={() => removeLine(line.key)}
              >
                Remover
              </button>
            </div>
          );
        })}
        <button
          type="button"
          className="btn btn-outline !py-1.5 !px-3 text-xs"
          onClick={addLine}
        >
          + Outro produto
        </button>
      </div>

      <div>
        <label className="text-xs uppercase tracking-wider text-muted">
          Observação
        </label>
        <input
          className="input mt-1"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Ex: Pix na hora, frete à parte…"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <p className="text-sm">
          Total: <strong>{formatBRL(total)}</strong>
        </p>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? "Registrando…" : "Registrar venda e baixar estoque"}
        </button>
      </div>

      {err ? <p className="text-sm text-red-700">{err}</p> : null}
      {msg ? (
        <p className="text-sm text-[#5a7a4a] bg-[#eef5ea] border border-[#c5d9bc] px-3 py-2">
          {msg}
        </p>
      ) : null}
    </form>
  );
}
