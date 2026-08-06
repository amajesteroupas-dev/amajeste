import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatBRL, formatDateTimeBR } from "@/lib/utils";
import {
  PermanentDeleteButton,
  RestoreProductButton,
} from "@/components/admin/DeleteProductButton";

export const dynamic = "force-dynamic";

export default async function ProductTrashPage() {
  const trashed = await prisma.product.findMany({
    where: { deletedAt: { not: null } },
    include: {
      category: true,
      variants: true,
      images: { take: 1, orderBy: { sortOrder: "asc" } },
    },
    orderBy: { deletedAt: "desc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl" style={{ fontFamily: "var(--font-display)" }}>
            Lixeira
          </h1>
          <p className="text-sm text-[#6b5f56] mt-1">
            Produtos excluídos. Restaure ou apague de vez.
          </p>
        </div>
        <Link href="/admin/produtos" className="text-sm text-rose-dark underline">
          ← Voltar aos produtos
        </Link>
      </div>

      <div className="admin-panel-card border border-black/10 bg-white overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Categoria</th>
              <th>Preço</th>
              <th>Visitas</th>
              <th>Excluído em</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {trashed.length === 0 && (
              <tr>
                <td colSpan={6} className="text-muted py-8 text-center">
                  Lixeira vazia.
                </td>
              </tr>
            )}
            {trashed.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{p.category.name}</td>
                <td>{formatBRL(Number(p.price))}</td>
                <td className="tabular-nums">{p.viewCount.toLocaleString("pt-BR")}</td>
                <td className="text-sm text-[#6b5f56] whitespace-nowrap">
                  {p.deletedAt ? formatDateTimeBR(p.deletedAt) : "—"}
                </td>
                <td className="whitespace-nowrap">
                  <div className="flex items-center gap-3 justify-end">
                    <RestoreProductButton
                      productId={p.id}
                      productName={p.name}
                    />
                    <PermanentDeleteButton
                      productId={p.id}
                      productName={p.name}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
