import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatBRL } from "@/lib/utils";
import { ProductForm } from "@/components/admin/ProductForm";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      include: {
        category: true,
        variants: true,
        images: { take: 1, orderBy: { sortOrder: "asc" } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.category.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-4">
        <h1 className="text-3xl" style={{ fontFamily: "var(--font-display)" }}>
          Produtos
        </h1>
      </div>

      <ProductForm categories={categories.map((c) => ({ id: c.id, name: c.name }))} />

      <div className="mt-8 border border-line bg-surface overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Categoria</th>
              <th>Preço</th>
              <th>Variantes</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{p.category.name}</td>
                <td>{formatBRL(Number(p.price))}</td>
                <td>{p.variants.length}</td>
                <td>
                  <span className="badge">{p.active ? "Ativo" : "Inativo"}</span>
                </td>
                <td>
                  <Link href={`/admin/produtos/${p.id}`} className="text-sm text-rose-dark">
                    Editar
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
