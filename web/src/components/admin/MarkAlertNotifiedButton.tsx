"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function MarkAlertNotifiedButton({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function mark() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/stock-alerts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notified: true }),
      });
      if (res.ok) router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={mark}
      disabled={loading}
      className="text-xs uppercase tracking-wider text-[#5c4336] underline underline-offset-2 disabled:opacity-50"
    >
      {loading ? "…" : "Marcar avisado"}
    </button>
  );
}
