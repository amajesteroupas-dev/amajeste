"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteProductButton({
  productId,
  productName,
}: {
  productId: string;
  productName: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onDelete() {
    const ok = window.confirm(
      `Mover "${productName}" para a lixeira?\n\nVocê poderá restaurar depois em Produtos → Lixeira.`
    );
    if (!ok) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/products/${productId}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || "Não foi possível excluir.");
        return;
      }
      if (data.message) alert(data.message);
      router.refresh();
      if (typeof window !== "undefined" && window.location.pathname.includes("/admin/produtos/")) {
        router.push("/admin/produtos");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onDelete}
      disabled={loading}
      className="text-sm text-red-700 hover:underline disabled:opacity-50"
    >
      {loading ? "…" : "Excluir"}
    </button>
  );
}

export function RestoreProductButton({
  productId,
  productName,
}: {
  productId: string;
  productName: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onRestore() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restore: true, active: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || "Não foi possível restaurar.");
        return;
      }
      if (data.message) alert(data.message);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onRestore}
      disabled={loading}
      className="text-sm text-emerald-700 hover:underline disabled:opacity-50"
    >
      {loading ? "…" : "Restaurar"}
    </button>
  );
}

export function PermanentDeleteButton({
  productId,
  productName,
}: {
  productId: string;
  productName: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onDelete() {
    const ok = window.confirm(
      `Apagar DEFINITIVAMENTE "${productName}"?\n\nEsta ação não pode ser desfeita.`
    );
    if (!ok) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/products/${productId}?permanent=1`,
        { method: "DELETE" }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || "Não foi possível excluir.");
        return;
      }
      if (data.message) alert(data.message);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onDelete}
      disabled={loading}
      className="text-sm text-red-800 hover:underline disabled:opacity-50"
    >
      {loading ? "…" : "Apagar de vez"}
    </button>
  );
}

export function CloneProductButton({
  productId,
  productName,
  redirectToClone = false,
}: {
  productId: string;
  productName: string;
  /** Se true, abre a página do clone após criar */
  redirectToClone?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onClone() {
    const ok = window.confirm(
      `Clonar "${productName}"?\n\nCópia inativa só com a ficha (preço, medidas, frete, pagamento).\nSem fotos e sem variantes (cores/tamanhos) — você cadastra depois.`
    );
    if (!ok) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/products/${productId}/clone`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || "Não foi possível clonar.");
        return;
      }
      if (data.message) alert(data.message);
      const newId = data.product?.id as string | undefined;
      if (redirectToClone && newId) {
        router.push(`/admin/produtos/${newId}`);
        router.refresh();
        return;
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onClone}
      disabled={loading}
      className="text-sm text-[#5c534c] hover:underline disabled:opacity-50"
    >
      {loading ? "…" : "Clonar"}
    </button>
  );
}
