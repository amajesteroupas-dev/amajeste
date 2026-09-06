"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { formatBRL } from "@/lib/utils";
import {
  COUPON_KIND_INFLUENCER,
  COUPON_KIND_PROMO,
  couponKindLabel,
} from "@/lib/look-reward";

type PublicCoupon = {
  id: string;
  code: string;
  percent: number;
  kind: string;
  label: string | null;
  maxUses: number | null;
  minSubtotal: number | null;
  usageCount: number;
  active: boolean;
  used: boolean;
  expiresAt: string | null;
  createdAt: string;
};

type Props = {
  initialCoupons: PublicCoupon[];
};

export function InfluencerCouponAdmin({ initialCoupons }: Props) {
  const router = useRouter();
  const [coupons, setCoupons] = useState(initialCoupons);
  const [kind, setKind] = useState<string>(COUPON_KIND_PROMO);
  const [label, setLabel] = useState("");
  const [code, setCode] = useState("");
  const [percent, setPercent] = useState(20);
  const [minSubtotal, setMinSubtotal] = useState("199");
  const [maxUses, setMaxUses] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  const isPromo = kind === COUPON_KIND_PROMO;

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMsg("");
    try {
      const res = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          label: label.trim() || undefined,
          code: code.trim() || undefined,
          percent,
          minSubtotal: minSubtotal.trim() ? Number(minSubtotal) : null,
          maxUses: maxUses.trim() ? Number(maxUses) : null,
          expiresAt: expiresAt || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Não foi possível criar o cupom");
        return;
      }
      const c = data.coupon as PublicCoupon;
      const minNote =
        c.minSubtotal && c.minSubtotal > 0
          ? ` · mínimo ${formatBRL(c.minSubtotal)}`
          : "";
      setMsg(`Cupom ${c.code} criado (−${c.percent}%${minNote}).`);
      setLabel("");
      setCode("");
      setPercent(isPromo ? 20 : 10);
      setMinSubtotal(isPromo ? "199" : "");
      setMaxUses("");
      setExpiresAt("");
      setCoupons((prev) => [c, ...prev]);
      router.refresh();
    } catch {
      setError("Falha de rede ao criar cupom");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(c: PublicCoupon) {
    setError("");
    const res = await fetch(`/api/admin/coupons/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !c.active }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Não foi possível atualizar");
      return;
    }
    setCoupons((prev) =>
      prev.map((x) => (x.id === c.id ? { ...x, ...data.coupon } : x))
    );
    router.refresh();
  }

  async function removeCoupon(c: PublicCoupon) {
    if (!confirm(`Excluir o cupom ${c.code}?`)) return;
    setError("");
    const res = await fetch(`/api/admin/coupons/${c.id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Não foi possível excluir");
      return;
    }
    setCoupons((prev) => prev.filter((x) => x.id !== c.id));
    router.refresh();
  }

  return (
    <section className="mb-10 space-y-4">
      <div>
        <h2
          className="text-2xl mb-1"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Cupons públicos
        </h2>
        <p className="text-sm text-muted max-w-2xl">
          Crie códigos para <strong>promoção do site</strong> (ex.: 20% em
          compras acima de R$ 199) ou para <strong>influencer</strong> do
          Instagram. Qualquer cliente pode usar no checkout (não acumula com Pix
          nem promoção automática do site).
        </p>
      </div>

      <form
        onSubmit={onCreate}
        className="border border-line bg-surface p-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3"
      >
        <label className="block text-xs text-[#5c534c]">
          Tipo
          <select
            className="input mt-1.5"
            value={kind}
            onChange={(e) => {
              const next = e.target.value;
              setKind(next);
              if (next === COUPON_KIND_PROMO) {
                setPercent(20);
                setMinSubtotal("199");
              } else {
                setPercent(10);
                setMinSubtotal("");
              }
            }}
          >
            <option value={COUPON_KIND_PROMO}>Promoção do site</option>
            <option value={COUPON_KIND_INFLUENCER}>Influencer Instagram</option>
          </select>
        </label>
        <label className="block text-xs text-[#5c534c]">
          {isPromo ? "Nome da promoção" : "Nome / @ da influencer"}
          <input
            className="input mt-1.5"
            placeholder={
              isPromo ? "Ex.: Semana Majesté −20%" : "@nome.influencer"
            }
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        </label>
        <label className="block text-xs text-[#5c534c]">
          Código do cupom (opcional)
          <input
            className="input mt-1.5 uppercase"
            placeholder={
              isPromo
                ? "Ex.: MAJESTE20 (vazio = gera sozinho)"
                : "Ex.: MARIA10 (vazio = gera sozinho)"
            }
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
          />
        </label>
        <label className="block text-xs text-[#5c534c]">
          Desconto (%)
          <input
            className="input mt-1.5"
            type="number"
            min={1}
            max={90}
            step={0.5}
            value={percent}
            onChange={(e) => setPercent(Number(e.target.value) || 10)}
            required
          />
        </label>
        <label className="block text-xs text-[#5c534c]">
          Compra mínima (R$)
          <input
            className="input mt-1.5"
            type="number"
            min={0}
            step={0.01}
            placeholder="Sem mínimo"
            value={minSubtotal}
            onChange={(e) => setMinSubtotal(e.target.value)}
          />
          <span className="block mt-1 text-[11px] text-[#8a7468]">
            Ex.: 199 = cupom só vale se o subtotal for ≥ R$ 199,00
          </span>
        </label>
        <label className="block text-xs text-[#5c534c]">
          Limite de usos (opcional)
          <input
            className="input mt-1.5"
            type="number"
            min={1}
            placeholder="Ilimitado"
            value={maxUses}
            onChange={(e) => setMaxUses(e.target.value)}
          />
        </label>
        <label className="block text-xs text-[#5c534c]">
          Expira em (opcional)
          <input
            className="input mt-1.5"
            type="datetime-local"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
          />
        </label>
        <div className="flex items-end">
          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={saving}
          >
            {saving ? "Criando…" : "Criar cupom"}
          </button>
        </div>
        {error ? (
          <p className="text-sm text-[#8a3a3a] md:col-span-2 lg:col-span-3">
            {error}
          </p>
        ) : null}
        {msg ? (
          <p className="text-sm text-emerald-800 md:col-span-2 lg:col-span-3">
            {msg}
          </p>
        ) : null}
      </form>

      <div className="border border-line bg-surface overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Tipo</th>
              <th>Nome</th>
              <th>%</th>
              <th>Mínimo</th>
              <th>Usos</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {coupons.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-muted text-sm py-6 text-center">
                  Nenhum cupom público ainda. Crie o primeiro acima (ex.: 20%
                  acima de R$ 199).
                </td>
              </tr>
            ) : (
              coupons.map((c) => {
                const exhausted =
                  c.maxUses != null && c.usageCount >= c.maxUses;
                const expired =
                  c.expiresAt != null && new Date(c.expiresAt) < new Date();
                return (
                  <tr key={c.id}>
                    <td>
                      <code className="font-semibold">{c.code}</code>
                    </td>
                    <td>{couponKindLabel(c.kind)}</td>
                    <td>{c.label || "—"}</td>
                    <td>−{c.percent}%</td>
                    <td>
                      {c.minSubtotal && c.minSubtotal > 0
                        ? formatBRL(c.minSubtotal)
                        : "—"}
                    </td>
                    <td>
                      {c.usageCount}
                      {c.maxUses != null ? ` / ${c.maxUses}` : " · ilimitado"}
                    </td>
                    <td>
                      {!c.active ? (
                        <span className="badge bg-rose-50 text-rose-900 border border-rose-200">
                          Desativado
                        </span>
                      ) : exhausted ? (
                        <span className="badge">Esgotado</span>
                      ) : expired ? (
                        <span className="badge">Expirado</span>
                      ) : (
                        <span className="badge bg-emerald-50 text-emerald-900 border border-emerald-200">
                          Ativo
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="btn btn-outline text-xs py-1 px-2"
                          onClick={() => void toggleActive(c)}
                        >
                          {c.active ? "Desativar" : "Reativar"}
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline text-xs py-1 px-2 text-[#8a3a3a]"
                          onClick={() => void removeCoupon(c)}
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
