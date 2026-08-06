import { prisma } from "@/lib/prisma";
import {
  buildCampaignHtml,
  isMailConfigured,
  sendMarketingEmail,
} from "@/lib/mail";
import { customerWhatsAppUrl } from "@/lib/site";
import { formatBRL } from "@/lib/utils";

function siteBase() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXTAUTH_URL ||
    "https://equilibra.tech"
  ).replace(/\/$/, "");
}

export function trackingPageUrl(opts: {
  orderNumber?: string | null;
  trackingCode?: string | null;
}) {
  const base = siteBase();
  const params = new URLSearchParams();
  if (opts.trackingCode) params.set("codigo", opts.trackingCode);
  if (opts.orderNumber) params.set("pedido", opts.orderNumber);
  const q = params.toString();
  return q ? `${base}/rastreio?${q}` : `${base}/rastreio`;
}

/** E-mail + link WhatsApp ao marcar pedido como enviado. */
export async function notifyOrderShipped(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      customer: { select: { name: true, email: true, phone: true } },
      shipment: true,
      items: true,
    },
  });
  if (!order) {
    return { ok: false as const, error: "Pedido não encontrado" };
  }

  const tracking =
    order.trackingCode || order.shipment?.trackingCode || null;
  const email = order.guestEmail || order.customer?.email || null;
  const phone = order.guestPhone || order.customer?.phone || null;
  const name = order.guestName || order.customer?.name || "Cliente";
  const trackUrl = trackingPageUrl({
    orderNumber: order.orderNumber,
    trackingCode: tracking,
  });

  const bodyLines = [
    `Olá, ${name}!`,
    "",
    `Seu pedido #${order.orderNumber} da Majesté foi despachado.`,
    tracking
      ? `Código de rastreio: ${tracking}`
      : "Em breve o código de rastreio estará disponível.",
    "",
    `Acompanhe em: ${trackUrl}`,
    "",
    `Total: ${formatBRL(Number(order.total))}`,
  ];

  let emailSent = false;
  let emailError: string | null = null;
  if (email && isMailConfigured()) {
    try {
      const html = buildCampaignHtml({
        title: `Pedido #${order.orderNumber} enviado`,
        body: bodyLines.join("\n"),
        ctaLabel: "Rastrear pedido",
        ctaHref: trackUrl,
        siteUrl: siteBase(),
      });
      await sendMarketingEmail({
        to: email,
        subject: `Majesté — Pedido #${order.orderNumber} enviado${
          tracking ? ` · ${tracking}` : ""
        }`,
        html,
      });
      emailSent = true;
    } catch (e) {
      emailError = e instanceof Error ? e.message : "Falha no e-mail";
    }
  } else if (email && !isMailConfigured()) {
    emailError = "SMTP não configurado";
  }

  const waText = [
    `Olá, ${name}! 👋`,
    ``,
    `Seu pedido *#${order.orderNumber}* da Majesté foi despachado.`,
    tracking ? `📦 Rastreio: *${tracking}*` : null,
    ``,
    `Acompanhe aqui: ${trackUrl}`,
  ]
    .filter(Boolean)
    .join("\n");

  const whatsappUrl = customerWhatsAppUrl(phone, waText);

  return {
    ok: true as const,
    emailSent,
    emailError,
    whatsappUrl,
    tracking,
    trackUrl,
    orderNumber: order.orderNumber,
  };
}
