import { prisma } from "@/lib/prisma";
import { formatBRL } from "@/lib/utils";
import { StockManager } from "@/components/admin/StockManager";
import { effectiveUnitCost } from "@/lib/inventory-cost";

export const dynamic = "force-dynamic";

export default async function StockPage() {
  const [variants, categories, movements] = await Promise.all([
    prisma.productVariant.findMany({
      include: {
        product: { include: { category: true } },
      },
      orderBy: [{ stock: "asc" }, { sku: "asc" }],
    }),
    prisma.category.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.inventoryMovement.findMany({
      take: 30,
      orderBy: { createdAt: "desc" },
      include: { variant: { include: { product: true } } },
    }),
  ]);

  const categoryOpts = categories.map((c) => ({ id: c.id, name: c.name }));

  const rows = variants.map((v) => {
    const avgCost = effectiveUnitCost(v.avgCost, v.product.costPrice);
    return {
      id: v.id,
      sku: v.sku,
      size: v.size,
      color: v.color,
      stock: v.stock,
      minStock: v.minStock,
      avgCost,
      productName: v.product.name,
      categoryName: v.product.category.name,
      categoryId: v.product.categoryId,
    };
  });

  const totalValue = rows.reduce((s, r) => s + r.stock * r.avgCost, 0);
  const totalUnits = rows.reduce((s, r) => s + r.stock, 0);

  return (
    <div>
      <h1 className="text-3xl mb-2" style={{ fontFamily: "var(--font-display)" }}>
        Estoque
      </h1>
      <p className="text-sm text-muted mb-2">
        Registre compras ou clique em <strong>Editar</strong> na lista para
        alterar quantidade, custo médio e estoque mínimo. Use esta tela no dia a
        dia — <strong>Salvar produto</strong> (nome/preço/fotos) não muda
        estoque.
      </p>
      <p className="text-sm font-medium mb-6">
        {totalUnits} unidades · valor total em estoque{" "}
        <span className="text-ink">{formatBRL(totalValue)}</span>
      </p>

      <StockManager
        categories={categoryOpts}
        rows={rows}
        variants={variants.map((v) => ({
          id: v.id,
          label: `${v.product.name} — ${v.size}/${v.color} (${v.sku}) · ${v.stock}`,
          productName: v.product.name,
          categoryId: v.product.categoryId,
          categoryName: v.product.category.name,
          sku: v.sku,
          avgCost: effectiveUnitCost(v.avgCost, v.product.costPrice),
          stock: v.stock,
          minStock: v.minStock,
        }))}
      />

      <h2
        className="text-xl mt-10 mb-3"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Movimentações recentes
      </h2>
      <div className="border border-line bg-surface overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Compra</th>
              <th>Produto</th>
              <th>Tipo</th>
              <th>Qtd</th>
              <th>Custo un.</th>
              <th>Total</th>
              <th>Nota</th>
            </tr>
          </thead>
          <tbody>
            {movements.map((m) => (
              <tr key={m.id}>
                <td>{m.createdAt.toLocaleString("pt-BR")}</td>
                <td>
                  {m.purchaseDate
                    ? m.purchaseDate.toLocaleDateString("pt-BR")
                    : "—"}
                </td>
                <td>
                  {m.variant.product.name} ({m.variant.sku})
                </td>
                <td>{m.type}</td>
                <td>{m.quantity}</td>
                <td>
                  {m.unitCost != null ? formatBRL(Number(m.unitCost)) : "—"}
                </td>
                <td>
                  {m.totalCost != null ? formatBRL(Number(m.totalCost)) : "—"}
                </td>
                <td>{m.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
