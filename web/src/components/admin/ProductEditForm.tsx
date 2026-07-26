"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  product: {
    id: string;
    name: string;
    description: string;
    price: number;
    costPrice: number;
    categoryId: string;
    featured: boolean;
    active: boolean;
  };
  categories: { id: string; name: string }[];
  variants: { id: string; sku: string; size: string; color: string; stock: number }[];
  images: { id: string; url: string; alt: string | null }[];
};

export function ProductEditForm({ product, categories, variants, images }: Props) {
  const router = useRouter();
  const [msg, setMsg] = useState("");

  async function saveProduct(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const res = await fetch(`/api/admin/products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        description: form.get("description"),
        price: Number(form.get("price")),
        costPrice: Number(form.get("costPrice")),
        categoryId: form.get("categoryId"),
        featured: form.get("featured") === "on",
        active: form.get("active") === "on",
      }),
    });
    setMsg(res.ok ? "Produto salvo" : "Erro ao salvar");
    router.refresh();
  }

  async function addVariant(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await fetch(`/api/admin/products/${product.id}/variants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sku: form.get("sku"),
        size: form.get("size"),
        color: form.get("color"),
        stock: Number(form.get("stock") || 0),
      }),
    });
    router.refresh();
  }

  async function uploadImage(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    data.set("productId", product.id);
    await fetch("/api/upload", { method: "POST", body: data });
    setMsg("Imagem enviada e otimizada");
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <form onSubmit={saveProduct} className="grid gap-3 md:grid-cols-2 border border-line bg-surface p-5">
        <input name="name" defaultValue={product.name} className="input" required />
        <select name="categoryId" defaultValue={product.categoryId} className="input">
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <input name="price" type="number" step="0.01" defaultValue={product.price} className="input" />
        <input name="costPrice" type="number" step="0.01" defaultValue={product.costPrice} className="input" />
        <textarea name="description" defaultValue={product.description} className="input md:col-span-2 min-h-28" />
        <label className="flex items-center gap-2 text-sm">
          <input name="featured" type="checkbox" defaultChecked={product.featured} /> Destaque
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input name="active" type="checkbox" defaultChecked={product.active} /> Ativo
        </label>
        <button type="submit" className="btn btn-primary md:col-span-2">
          Salvar
        </button>
        {msg && <p className="text-sm text-muted md:col-span-2">{msg}</p>}
      </form>

      <section className="border border-line bg-surface p-5">
        <h2 className="font-semibold mb-3">Variantes</h2>
        <table className="table mb-4">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Tam</th>
              <th>Cor</th>
              <th>Estoque</th>
            </tr>
          </thead>
          <tbody>
            {variants.map((v) => (
              <tr key={v.id}>
                <td>{v.sku}</td>
                <td>{v.size}</td>
                <td>{v.color}</td>
                <td>{v.stock}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <form onSubmit={addVariant} className="grid gap-2 md:grid-cols-4">
          <input name="sku" placeholder="SKU" className="input" required />
          <input name="size" placeholder="Tamanho" className="input" required />
          <input name="color" placeholder="Cor" className="input" required />
          <input name="stock" type="number" placeholder="Estoque" className="input" defaultValue={0} />
          <button type="submit" className="btn btn-outline md:col-span-4">
            Adicionar variante
          </button>
        </form>
      </section>

      <section className="border border-line bg-surface p-5">
        <h2 className="font-semibold mb-3">Imagens</h2>
        <div className="flex flex-wrap gap-3 mb-4">
          {images.map((img) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={img.id} src={img.url} alt={img.alt || ""} className="h-24 w-20 object-cover bg-[#ebe4db]" />
          ))}
        </div>
        <form onSubmit={uploadImage} className="flex flex-wrap gap-3 items-center">
          <input name="file" type="file" accept="image/*" required />
          <button type="submit" className="btn btn-gold">
            Upload (WebP/AVIF)
          </button>
        </form>
      </section>
    </div>
  );
}
