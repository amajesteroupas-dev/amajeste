import { prisma } from "@/lib/prisma";
import { StockAdjustForm } from "@/components/admin/StockAdjustForm";

export const dynamic = "force-dynamic";

export default async function StockPage() {
  const variants = await prisma.productVariant.findMany({
    include: { product: true },
    orderBy: [{ stock: "asc" }, { sku: "asc" }],
  });

  const movements = await prisma.inventoryMovement.findMany({
    take: 20,
    orderBy: { createdAt: "desc" },
    include: { variant: { include: { product: true } } },
  });

  return (
    <div>
      <h1 className="text-3xl mb-6" style={{ fontFamily: "var(--font-display)" }}>
        Estoque
      </h1>
      <StockAdjustForm
        variants={variants.map((v) => ({
          id: v.id,
          label: `${v.product.name} — ${v.size}/${v.color} (${v.sku}) · ${v.stock}`,
        }))}
      />
      <div className="mt-8 border border-line bg-surface overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Produto</th>
              <th>Var</th>
              <th>Estoque</th>
              <th>Mín</th>
            </tr>
          </thead>
          <tbody>
            {variants.map((v) => (
              <tr key={v.id} className={v.stock <= v.minStock ? "bg-rose/5" : ""}>
                <td>{v.sku}</td>
                <td>{v.product.name}</td>
                <td>
                  {v.size} / {v.color}
                </td>
                <td>{v.stock}</td>
                <td>{v.minStock}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h2 className="text-xl mt-10 mb-3" style={{ fontFamily: "var(--font-display)" }}>
        Movimentações recentes
      </h2>
      <div className="border border-line bg-surface overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Produto</th>
              <th>Tipo</th>
              <th>Qtd</th>
              <th>Nota</th>
            </tr>
          </thead>
          <tbody>
            {movements.map((m) => (
              <tr key={m.id}>
                <td>{m.createdAt.toLocaleString("pt-BR")}</td>
                <td>
                  {m.variant.product.name} ({m.variant.sku})
                </td>
                <td>{m.type}</td>
                <td>{m.quantity}</td>
                <td>{m.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
