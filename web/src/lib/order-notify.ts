import { prisma } from "@/lib/prisma";
import {
  buildCampaignHtml,
  isMailConfigured,
  sendMarketingEmail,
} from "@/lib/mail";
import { getNotifyConfig } from "@/lib/notify-settings";
import { customerWhatsAppUrl } from "@/lib/site";
import { formatBRL } from "@/lib/utils";
import { sendWhatsappText } from "@/lib/whatsapp-send";

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

/** E-mail + WhatsApp de agradecimento ao finalizar o pedido no checkout. */
export async function notifyOrderPlaced(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      customer: { select: { name: true, email: true, phone: true } },
      items: true,
      payment: { select: { status: true, method: true } },
    },
  });
  if (!order) {
    return { ok: false as const, error: "Pedido não encontrado" };
  }

  const cfg = await getNotifyConfig();
  const email = order.guestEmail || order.customer?.email || null;
  const phone = order.guestPhone || order.customer?.phone || null;
  const name = (order.guestName || order.customer?.name || "Maravilhosa")
    .trim()
    .split(/\s+/)[0];
  const paid =
    order.status === "PAID" || order.payment?.status === "APPROVED";
  const accountUrl = `${siteBase()}/conta/pedidos`;
  const itemsLine = order.items
    .map((i) => `• ${i.productName} (${i.size}/${i.color}) x${i.quantity}`)
    .join("\n");

  const thanks = paid
    ? "Pagamento confirmado — já estamos separando as peças com carinho."
    : "Recebemos o seu pedido. Assim que o pagamento for confirmado, preparamos o envio.";

  let emailSent = false;
  let emailError: string | null = null;
  if (cfg.emailOnOrder && email && isMailConfigured()) {
    try {
      const html = buildCampaignHtml({
        title: `${name}, obrigada pelo seu pedido`,
        body: [
          `Pedido #${order.orderNumber} na Majesté.`,
          thanks,
          itemsLine,
          `Total: ${formatBRL(Number(order.total))}`,
          "Qualquer dúvida, é só responder este e-mail ou chamar no WhatsApp da loja.",
        ]
          .filter(Boolean)
          .join("\n\n"),
        ctaLabel: "Ver meu pedido",
        ctaHref: accountUrl,
        siteUrl: siteBase(),
      });
      await sendMarketingEmail({
        to: email,
        subject: `Majesté — Pedido #${order.orderNumber} recebido. Obrigada!`,
        html,
      });
      emailSent = true;
    } catch (e) {
      emailError = e instanceof Error ? e.message : "Falha no e-mail";
    }
  } else if (cfg.emailOnOrder && email && !isMailConfigured()) {
    emailError = "SMTP não configurado";
  }

  const waText = [
    `Olá, ${name}! 💛`,
    ``,
    `Recebemos o seu pedido *#${order.orderNumber}* na Majesté. Obrigada por comprar com a gente!`,
    ``,
    thanks,
    itemsLine ? `` : null,
    itemsLine || null,
    ``,
    `Total: *${formatBRL(Number(order.total))}*`,
    ``,
    `Qualquer dúvida, é só responder esta mensagem.`,
  ]
    .filter((line) => line !== null)
    .join("\n");

  let whatsappSent = false;
  let whatsappError: string | null = null;
  if (cfg.whatsappOnOrder) {
    const sent = await sendWhatsappText({ phone, message: waText });
    whatsappSent = sent.ok;
    whatsappError = sent.ok ? null : sent.error;
  }

  return {
    ok: true as const,
    emailSent,
    emailError,
    whatsappSent,
    whatsappError,
    orderNumber: order.orderNumber,
  };
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
