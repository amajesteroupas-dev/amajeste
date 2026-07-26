import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatBRL } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ order?: string }> };

export default async function CheckoutSuccessPage({ searchParams }: Props) {
  const { order: orderNumber } = await searchParams;
  const order = orderNumber
    ? await prisma.order.findUnique({
        where: { orderNumber },
        include: { payment: true },
      })
    : null;

  return (
    <div className="container-maj py-20 max-w-xl text-center">
      <h1
        className="text-4xl mb-4"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Pedido recebido
      </h1>
      {order ? (
        <div className="space-y-3 text-left border border-line bg-surface p-6 mb-8">
          <p>
            Número: <strong>{order.orderNumber}</strong>
          </p>
          <p>Total: {formatBRL(Number(order.total))}</p>
          <p>Status: {order.status}</p>
          {order.payment?.pixQrCode && (
            <div className="mt-4">
              <p className="text-sm mb-2">Pix copia e cola:</p>
              <code className="block break-all text-xs bg-background p-3">
                {order.payment.pixQrCode}
              </code>
            </div>
          )}
        </div>
      ) : (
        <p className="text-muted mb-8">Obrigada pela compra!</p>
      )}
      <Link href="/" className="btn btn-primary">
        Voltar à loja
      </Link>
    </div>
  );
}
