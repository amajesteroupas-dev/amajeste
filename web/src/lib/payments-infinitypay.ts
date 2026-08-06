import { getPaymentSettings } from "@/lib/payment-settings";
import { checkoutSuccessPath } from "@/lib/order-access";

function toCents(reais: number) {
  return Math.round(Number(reais) * 100);
}

/** Gera link de checkout InfinitePay / Infinity Pay. */
export async function createInfinityPayCheckout(params: {
  orderId: string;
  orderNumber: string;
  email: string;
  name: string;
  phone?: string | null;
  items: { title: string; quantity: number; unitPrice: number }[];
  shippingCost?: number;
}) {
  const s = await getPaymentSettings();
  const handle = s.infinitypay.handle.replace(/^\$/, "");
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const success = `${baseUrl}${checkoutSuccessPath(params.orderNumber)}`;

  if (!handle) {
    return {
      mock: true,
      id: `mock-ip-${params.orderId}`,
      redirectUrl: `${success}&mock=1`,
    };
  }

  const items = params.items.map((item) => ({
    quantity: item.quantity,
    price: toCents(item.unitPrice),
    description: item.title.slice(0, 120),
  }));

  if (params.shippingCost && params.shippingCost > 0) {
    items.push({
      quantity: 1,
      price: toCents(params.shippingCost),
      description: "Frete",
    });
  }

  const payload = {
    handle,
    order_nsu: params.orderNumber,
    redirect_url: success,
    webhook_url: `${baseUrl}/api/webhooks/infinitypay`,
    customer: {
      name: params.name,
      email: params.email,
      ...(params.phone
        ? {
            phone_number: `+55${params.phone.replace(/\D/g, "").replace(/^55/, "")}`,
          }
        : {}),
    },
    items,
  };

  const endpoints = [
    "https://api.checkout.infinitepay.io/links",
    "https://api.infinitepay.io/invoices/public/checkout/links",
  ];

  let lastError = "Infinity Pay indisponível";
  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as {
        url?: string;
        checkout_url?: string;
        link?: string;
        message?: string;
        error?: string;
      };
      if (!res.ok) {
        lastError = data.message || data.error || `Infinity Pay HTTP ${res.status}`;
        continue;
      }
      const redirectUrl = data.url || data.checkout_url || data.link;
      if (!redirectUrl) {
        lastError = "Infinity Pay não retornou URL de checkout";
        continue;
      }
      return {
        mock: false,
        id: params.orderNumber,
        redirectUrl,
      };
    } catch (e) {
      lastError = e instanceof Error ? e.message : lastError;
    }
  }

  throw new Error(lastError);
}
