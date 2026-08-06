"use client";

import { useRouter } from "next/navigation";

const OPTIONS = [
  { value: "PENDING", label: "Pendente" },
  { value: "APPROVED", label: "Aprovado" },
  { value: "REJECTED", label: "Rejeitado" },
] as const;

export function ReviewStatusForm({
  id,
  status,
}: {
  id: string;
  status: string;
}) {
  const router = useRouter();

  async function update(next: string) {
    await fetch(`/api/admin/reviews/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    router.refresh();
  }

  async function remove() {
    if (!confirm("Excluir esta avaliação permanentemente?")) return;
    await fetch(`/api/admin/reviews/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        className="input !py-1 !text-xs"
        defaultValue={status}
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
        className="text-xs text-red-700 hover:underline"
      >
        Excluir
      </button>
    </div>
  );
}
