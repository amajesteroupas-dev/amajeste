"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type InfluencerCoupon = {
  id: string;
  code: string;
  percent: number;
  label: string | null;
  maxUses: number | null;
  usageCount: number;
  active: boolean;
  used: boolean;
  expiresAt: string | null;
  createdAt: string;
};

type Props = {
  initialCoupons: InfluencerCoupon[];
};

export function InfluencerCouponAdmin({ initialCoupons }: Props) {
  const router = useRouter();
  const [coupons, setCoupons] = useState(initialCoupons);
  const [label, setLabel] = useState("");
  const [code, setCode] = useState("");
  const [percent, setPercent] = useState(10);
  const [maxUses, setMaxUses] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

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
          label: label.trim() || undefined,
          code: code.trim() || undefined,
          percent,
          maxUses: maxUses.trim() ? Number(maxUses) : null,
          expiresAt: expiresAt || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Não foi possível criar o cupom");
        return;
      }
      setMsg(`Cupom ${data.coupon.code} criado (−${data.coupon.percent}%).`);
      setLabel("");
      setCode("");
      setPercent(10);
      setMaxUses("");
      setExpiresAt("");
      setCoupons((prev) => [data.coupon, ...prev]);
      router.refresh();
    } catch {
      setError("Falha de rede ao criar cupom");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(c: InfluencerCoupon) {
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

  async function removeCoupon(c: InfluencerCoupon) {
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
          Cupons de influencer (Instagram)
        </h2>
        <p className="text-sm text-muted max-w-2xl">
          Crie um código para a influencer divulgar no Instagram. Qualquer
          seguidora pode usar no checkout (não acumula com Pix nem promoção do
          site). Deixe o limite de usos em branco para usos ilimitados.
        </p>
      </div>

      <form
        onSubmit={onCreate}
        className="border border-line bg-surface p-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3"
      >
        <label className="block text-xs text-[#5c534c]">
          Nome / @ da influencer
          <input
            className="input mt-1.5"
            placeholder="@nome.influencer"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        </label>
        <label className="block text-xs text-[#5c534c]">
          Código do cupom (opcional)
          <input
            className="input mt-1.5 uppercase"
            placeholder="Ex.: MARIA10 (vazio = gera sozinho)"
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
              <th>Influencer</th>
              <th>%</th>
              <th>Usos</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {coupons.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-muted text-sm py-6 text-center">
                  Nenhum cupom de influencer ainda. Crie o primeiro acima.
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
                    <td>{c.label || "—"}</td>
                    <td>−{c.percent}%</td>
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
