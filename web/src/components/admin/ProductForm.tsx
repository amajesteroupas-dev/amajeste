"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Category = { id: string; name: string };

export function ProductForm({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/admin/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        description: form.get("description"),
        price: Number(form.get("price")),
        costPrice: Number(form.get("costPrice") || 0),
        categoryId: form.get("categoryId"),
        featured: form.get("featured") === "on",
        size: form.get("size"),
        color: form.get("color"),
        stock: Number(form.get("stock") || 0),
        sku: form.get("sku"),
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Erro ao salvar");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <div>
      <button type="button" className="btn btn-primary" onClick={() => setOpen((v) => !v)}>
        {open ? "Fechar" : "Novo produto"}
      </button>
      {open && (
        <form onSubmit={onSubmit} className="mt-4 grid gap-3 md:grid-cols-2 border border-line bg-surface p-5">
          <input name="name" required placeholder="Nome" className="input" />
          <select name="categoryId" required className="input">
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input name="price" type="number" step="0.01" required placeholder="Preço" className="input" />
          <input name="costPrice" type="number" step="0.01" placeholder="Custo" className="input" />
          <textarea name="description" required placeholder="Descrição" className="input md:col-span-2 min-h-24" />
          <input name="sku" required placeholder="SKU inicial" className="input" />
          <input name="size" required placeholder="Tamanho" className="input" defaultValue="M" />
          <input name="color" required placeholder="Cor" className="input" defaultValue="Preto" />
          <input name="stock" type="number" placeholder="Estoque" className="input" defaultValue={10} />
          <label className="flex items-center gap-2 text-sm">
            <input name="featured" type="checkbox" /> Destaque na home
          </label>
          {error && <p className="text-sm text-rose-dark md:col-span-2">{error}</p>}
          <button type="submit" className="btn btn-gold md:col-span-2" disabled={loading}>
            {loading ? "Salvando..." : "Salvar produto"}
          </button>
        </form>
      )}
    </div>
  );
}
