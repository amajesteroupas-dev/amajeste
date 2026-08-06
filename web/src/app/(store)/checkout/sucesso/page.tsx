import Link from "next/link";
import { prisma } from "@/lib/prisma";
import QRCode from "qrcode";
import { OrderReceipt } from "@/components/store/OrderReceipt";
import { verifyOrderAccess } from "@/lib/order-access";
import { auth } from "@/lib/auth";
import {
  isLocalShippingId,
  localShippingWhatsAppUrl,
} from "@/lib/shipping";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ order?: string; t?: string }>;
};

export default async function CheckoutSuccessPage({ searchParams }: Props) {
  const { order: orderNumber, t } = await searchParams;
  const session = await auth();
  const isStaff =
    session?.user?.role === "ADMIN" || session?.user?.role === "STAFF";

  let order =
    orderNumber
      ? await prisma.order.findUnique({
          where: { orderNumber },
          include: { payment: true, items: true, customer: true },
        })
      : null;

  if (order && orderNumber) {
    const tokenOk = verifyOrderAccess(orderNumber, t);
    const ownerOk =
      session?.user?.role === "CUSTOMER" &&
      Boolean(
        (session.user.email &&
          order.guestEmail &&
          session.user.email.toLowerCase() === order.guestEmail.toLowerCase()) ||
          (order.customer?.userId && order.customer.userId === session.user.id)
      );
    if (!tokenOk && !isStaff && !ownerOk) {
      order = null;
    }
  }

  let pixQrDataUrl: string | null = null;
  const pixCode = order?.payment?.pixQrCode?.trim() || "";
  if (pixCode) {
    if (order?.payment?.pixQrCodeBase64) {
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

  const localDeliveryWhatsapp =
    order && isLocalShippingId(order.shippingServiceId)
      ? localShippingWhatsAppUrl(`Pedido ${order.orderNumber}.`)
      : null;

  return (
    <div className="container-maj py-16 md:py-20 max-w-xl">
      {order ? (
        <OrderReceipt
          showStoreCta
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
      ) : (
        <div className="text-center mb-8 space-y-4">
          <h1
            className="text-4xl mb-3"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {orderNumber ? "Comprovante indisponível" : "Pedido recebido"}
          </h1>
          <p className="text-muted">
            {orderNumber
              ? "Este link é inválido ou expirou. Acesse pela sua conta ou use o link enviado no fim da compra."
              : "Obrigada pela compra — volte sempre!"}
          </p>
          <Link href="/" className="btn btn-outline inline-flex">
            Continuar me sentindo poderosa
          </Link>
        </div>
      )}
    </div>
  );
}
