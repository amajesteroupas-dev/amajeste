import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatBRL, formatDateTimeBR } from "@/lib/utils";
import { ensureSequentialOrderNumbers } from "@/lib/order-number";
import {
  orderStatusLabel,
  paymentMethodLabel,
  paymentStatusLabel,
} from "@/lib/order-labels";
import { OrderStatusForm } from "@/components/admin/OrderStatusForm";
import { OrderMelhorEnvioPanel } from "@/components/admin/OrderMelhorEnvioPanel";
import { OrderReceipt } from "@/components/store/OrderReceipt";
import {
  isLocalShippingId,
  localShippingWhatsAppUrl,
} from "@/lib/shipping";
import { checkoutSuccessPath } from "@/lib/order-access";
import QRCode from "qrcode";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function OrderDetailPage({ params }: Props) {
  const { id } = await params;
  await ensureSequentialOrderNumbers();

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: true,
      payment: true,
      shipment: true,
      customer: true,
    },
  });
  if (!order) notFound();

  let pixQrDataUrl: string | null = null;
  const pixCode = order.payment?.pixQrCode?.trim() || "";
  if (pixCode) {
    if (order.payment?.pixQrCodeBase64) {
      pixQrDataUrl = order.payment.pixQrCodeBase64.startsWith("data:")
        ? order.payment.pixQrCodeBase64
        : `data:image/png;base64,${order.payment.pixQrCodeBase64}`;
    } else {
      try {
        pixQrDataUrl = await QRCode.toDataURL(pixCode, {
          margin: 1,
          width: 220,
        });
      } catch {
        pixQrDataUrl = null;
      }
    }
  }

  const localDeliveryWhatsapp = isLocalShippingId(order.shippingServiceId)
    ? localShippingWhatsAppUrl(`Pedido ${order.orderNumber}.`)
    : null;

  const trackCode =
    order.shipment?.trackingCode || order.trackingCode || null;
  const receiptHref = checkoutSuccessPath(order.orderNumber);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl mb-2" style={{ fontFamily: "var(--font-display)" }}>
          Pedido {order.orderNumber}
        </h1>
        <p className="text-sm text-muted">
          {formatDateTimeBR(order.createdAt, { seconds: true })} ·{" "}
          {orderStatusLabel(order.status)}
        </p>
        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          <Link
            href={receiptHref}
            target="_blank"
            className="underline text-rose-dark"
          >
            Abrir comprovante do cliente
          </Link>
          {trackCode ? (
            <Link
              href={`/rastreio?codigo=${encodeURIComponent(trackCode)}&pedido=${encodeURIComponent(order.orderNumber)}`}
              target="_blank"
              className="underline text-muted hover:text-ink"
            >
              Rastrear
            </Link>
          ) : null}
        </div>
      </div>

      <OrderStatusForm
        orderId={order.id}
        status={order.status}
        trackingCode={order.trackingCode || ""}
      />

      <OrderMelhorEnvioPanel
        orderId={order.id}
        orderNumber={order.orderNumber}
        customerPhone={order.guestPhone || order.customer?.phone || null}
        shippingMethod={order.shippingMethod}
        shippingServiceId={order.shippingServiceId}
        local={isLocalShippingId(order.shippingServiceId)}
        melhorEnvioId={order.shipment?.melhorEnvioId || null}
        labelUrl={order.shipment?.labelUrl || null}
        trackingCode={trackCode}
      />

      <OrderReceipt
        variant="admin"
        order={{
          orderNumber: order.orderNumber,
          total: Number(order.total),
          status: order.status,
          paymentMethod: order.payment?.method,
          paymentStatus: order.payment?.status,
          pixCode: pixCode || null,
          pixQrDataUrl,
          boletoBarcode: order.payment?.boletoBarcode,
          boletoUrl: order.payment?.boletoUrl,
          localDeliveryWhatsapp,
          items: order.items.map((i) => ({
            productName: i.productName,
            size: i.size,
            color: i.color,
            quantity: i.quantity,
            total: Number(i.total),
          })),
        }}
      />

      <section className="border border-line bg-surface p-5 space-y-2 text-sm">
        <p>
          <strong>Cliente:</strong> {order.customer?.name || order.guestName} (
          {order.guestEmail || order.customer?.email})
        </p>
        <p>
          <strong>Telefone:</strong>{" "}
          {order.guestPhone || order.customer?.phone || "—"}
        </p>
        <p>
          <strong>Endereço:</strong> {order.shippingStreet},{" "}
          {order.shippingNumber} {order.shippingComplement} —{" "}
          {order.shippingNeighborhood}, {order.shippingCity}/
          {order.shippingState} — CEP {order.shippingZip}
        </p>
        <p>
          <strong>Frete:</strong> {order.shippingMethod} (
          {formatBRL(Number(order.shippingCost))})
        </p>
        <p>
          <strong>Pagamento:</strong>{" "}
          {paymentMethodLabel(order.payment?.method)} /{" "}
          {paymentStatusLabel(order.payment?.status)}
        </p>
        {trackCode ? (
          <p>
            <strong>Rastreio:</strong>{" "}
            <code className="font-mono">{trackCode}</code>
          </p>
        ) : null}
      </section>

      <table className="table border border-line bg-surface">
        <thead>
          <tr>
            <th>Item</th>
            <th>Qtd</th>
            <th>Unit</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item) => (
            <tr key={item.id}>
              <td>
                {item.productName} ({item.size}/{item.color})
              </td>
              <td>{item.quantity}</td>
              <td>{formatBRL(Number(item.unitPrice))}</td>
              <td>{formatBRL(Number(item.total))}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-right text-lg font-semibold">
        Total {formatBRL(Number(order.total))}
      </p>
    </div>
  );
}
