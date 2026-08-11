"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const OPTIONS = [
  { value: "PENDING", label: "Pendente" },
  { value: "APPROVED", label: "Aprovar (publicar na galeria)" },
  { value: "REJECTED", label: "Rejeitar" },
] as const;

export function LookStatusForm({
  id,
  status,
}: {
  id: string;
  status: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(status);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function update(next: string) {
    setError("");
    setBusy(true);
    const prev = value;
    setValue(next);
    try {
      const res = await fetch(`/api/admin/looks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setValue(prev);
        setError(data.error || "Não foi possível atualizar o status.");
        return;
      }
      if (next === "APPROVED") {
        alert(
          data.message ||
            (data.couponCode
              ? `Aprovado e publicado em /looks. Cupom: ${data.couponCode}`
              : "Look aprovado e publicado na Galeria Majesté (/looks).")
        );
      }
      router.refresh();
    } catch {
      setValue(prev);
      setError("Falha de rede ao atualizar. Tente de novo.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm("Excluir este look permanentemente?")) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/looks/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Não foi possível excluir.");
        return;
      }
      router.refresh();
    } catch {
      setError("Falha de rede ao excluir.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <select
          className="input !py-1 !text-xs"
          value={value}
          disabled={busy}
          onChange={(e) => update(e.target.value)}
        >
          {OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={remove}
          disabled={busy}
          className="text-xs text-red-700 hover:underline disabled:opacity-50"
        >
          Excluir
        </button>
      </div>
      {error ? <p className="text-[11px] text-red-700 max-w-[14rem]">{error}</p> : null}
    </div>
  );
}
